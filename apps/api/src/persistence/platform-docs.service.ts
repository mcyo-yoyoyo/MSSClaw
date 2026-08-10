import { Injectable, BadRequestException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildCatalogPayload, WORKSPACE_CATALOGS } from '../data/workspace-catalogs';

/** 允许持久化的平台文档 kind（对应原前端 localStorage 配置） */
export const PLATFORM_DOC_KINDS = [
  'members',
  'auth-credentials',
  'nav-presentation',
  'workspace-config',
  'ai-news',
  'ai-brief-email-copy',
  'station-announcements',
  'plaza-howto',
  'mss-build-stats',
  'business-scenario-catalog',
  'external-taxonomy',
  'internal-office-scenes',
  'org-taxonomy',
  'market-featured',
  'market-favorites',
  'market-recent',
  'content-engagement',
  'audit-log',
  'ai-news-prefs',
  'asset-approvals',
  'llm-config',
  'inbox',
  'warroom-webhook',
  'security-policy',
  'auth-sessions',
  'demo-content',
] as const;

export type PlatformDocKind = (typeof PLATFORM_DOC_KINDS)[number];

const SEED_MEMBERS = [
  {
    id: 'u-mcyo',
    name: 'Mcyo',
    email: 'mcyo@huawei.com',
    role: 'super_admin',
    avatar: 'bg-indigo-600',
    lastActive: '刚刚',
    status: 'active',
    deptIds: ['quality'],
    regionId: null,
  },
  {
    id: 'u-jacky',
    name: 'Jacky',
    email: 'jacky@huawei.com',
    role: 'capability_ops',
    avatar: 'bg-teal-600',
    lastActive: '1 小时前',
    status: 'active',
    deptIds: ['quality'],
    regionId: null,
  },
  {
    id: 'u-dickson',
    name: 'Dickson',
    email: 'dickson@huawei.com',
    role: 'business_user',
    avatar: 'bg-amber-500',
    lastActive: '今天',
    status: 'active',
    deptIds: ['mkt'],
    regionId: null,
  },
];

function isDocKind(kind: string): kind is PlatformDocKind {
  return (PLATFORM_DOC_KINDS as readonly string[]).includes(kind);
}

function docId(workspaceId: string, kind: string) {
  return `doc-${kind}-${workspaceId}`;
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function hashPassword(password: string, salt: string): string {
  return sha256Hex(`${salt}:${password}`);
}

function randomSalt(): string {
  return randomBytes(16).toString('hex');
}

@Injectable()
export class PlatformDocsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDoc(workspaceId: string, kind: string): Promise<{ kind: string; payload: unknown }> {
    if (!isDocKind(kind)) throw new BadRequestException(`unsupported_doc_kind:${kind}`);
    await this.ensureWorkspace(workspaceId);

    const row = await this.prisma.centerRecord.findUnique({
      where: { id: docId(workspaceId, kind) },
    });
    if (row) return { kind, payload: row.payload };

    const seeded = await this.seedIfNeeded(workspaceId, kind);
    return { kind, payload: seeded };
  }

  async putDoc(workspaceId: string, kind: string, payload: unknown) {
    if (!isDocKind(kind)) throw new BadRequestException(`unsupported_doc_kind:${kind}`);
    await this.ensureWorkspace(workspaceId);
    const id = docId(workspaceId, kind);
    await this.prisma.centerRecord.upsert({
      where: { id },
      create: {
        id,
        workspaceId,
        kind: `doc:${kind}`,
        payload: (payload ?? {}) as Prisma.InputJsonValue,
      },
      update: {
        payload: (payload ?? {}) as Prisma.InputJsonValue,
      },
    });
    return { kind, payload };
  }

  async listDocs(workspaceId: string) {
    await this.ensureWorkspace(workspaceId);
    const rows = await this.prisma.centerRecord.findMany({
      where: { workspaceId, kind: { startsWith: 'doc:' } },
    });
    const byKind: Record<string, unknown> = {};
    for (const kind of PLATFORM_DOC_KINDS) {
      const row = rows.find((r) => r.id === docId(workspaceId, kind));
      byKind[kind] = row ? row.payload : await this.seedIfNeeded(workspaceId, kind);
    }
    return { docs: byKind };
  }

  async login(body: { email?: string; password?: string; workspaceId?: string }) {
    const email = (body.email ?? '').trim().toLowerCase().replace(/@company\.com$/i, '@huawei.com');
    const password = body.password ?? '';
    const workspaceId = body.workspaceId || 'ws-mss-ai';
    if (!email || !password) throw new BadRequestException('email_and_password_required');

    const membersDoc = await this.getDoc(workspaceId, 'members');
    const members = Array.isArray((membersDoc.payload as { members?: unknown })?.members)
      ? ((membersDoc.payload as { members: Array<Record<string, unknown>> }).members)
      : Array.isArray(membersDoc.payload)
        ? (membersDoc.payload as Array<Record<string, unknown>>)
        : SEED_MEMBERS;

    const member = members.find(
      (m) => String(m.email ?? '').toLowerCase().replace(/@company\.com$/i, '@huawei.com') === email,
    );
    if (!member || member.status === 'suspended') {
      return { ok: false, error: '账号不存在或已停用' };
    }

    const credsDoc = await this.getDoc(workspaceId, 'auth-credentials');
    const credPayload = (credsDoc.payload ?? {}) as {
      policy?: { allowDemoPassword?: boolean };
      credentials?: Record<string, { salt: string; hash: string; updatedAt: string }>;
    };
    const allowDemo = credPayload.policy?.allowDemoPassword !== false;
    const cred = credPayload.credentials?.[email];

    let valid = false;
    if (cred?.salt && cred?.hash) {
      valid = hashPassword(password, cred.salt) === cred.hash;
    } else if (allowDemo && password === 'mssclaw') {
      valid = true;
    }

    if (!valid) {
      return { ok: false, error: cred ? '密码错误' : '该账号尚未设置密码，请联系平台运营' };
    }

    const user = {
      id: String(member.id),
      name: String(member.name),
      email,
      platformRole: String(member.role ?? 'business_user'),
      avatar: String(member.avatar ?? 'bg-zinc-600'),
      deptIds: Array.isArray(member.deptIds) ? member.deptIds : [],
      regionId: (member.regionId as string | null) ?? null,
      workspaceId,
    };

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await this.putSession(workspaceId, token, { user, expiresAt });

    return { ok: true, user, token, expiresAt };
  }

  async me(token: string | undefined, workspaceId = 'ws-mss-ai') {
    if (!token) return { ok: false as const, error: '未登录' };
    const session = await this.getSession(workspaceId, token);
    if (!session) return { ok: false as const, error: '会话已失效，请重新登录' };
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await this.deleteSession(workspaceId, token);
      return { ok: false as const, error: '会话已过期，请重新登录' };
    }
    return { ok: true as const, user: session.user, token, expiresAt: session.expiresAt };
  }

  async logout(token: string | undefined, workspaceId = 'ws-mss-ai') {
    if (token) await this.deleteSession(workspaceId, token);
    return { ok: true as const };
  }

  private async getSession(
    workspaceId: string,
    token: string,
  ): Promise<{ user: Record<string, unknown>; expiresAt: string } | null> {
    const doc = await this.getDoc(workspaceId, 'auth-sessions');
    const sessions =
      ((doc.payload as { sessions?: Record<string, { user: Record<string, unknown>; expiresAt: string }> })
        ?.sessions ?? {}) as Record<string, { user: Record<string, unknown>; expiresAt: string }>;
    return sessions[token] ?? null;
  }

  private async putSession(
    workspaceId: string,
    token: string,
    entry: { user: Record<string, unknown>; expiresAt: string },
  ) {
    const doc = await this.getDoc(workspaceId, 'auth-sessions');
    const sessions = {
      ...(((doc.payload as { sessions?: Record<string, unknown> })?.sessions ?? {}) as Record<
        string,
        unknown
      >),
    };
    // prune expired
    const now = Date.now();
    for (const [k, v] of Object.entries(sessions)) {
      const exp = (v as { expiresAt?: string })?.expiresAt;
      if (exp && new Date(exp).getTime() < now) delete sessions[k];
    }
    sessions[token] = entry;
    await this.putDoc(workspaceId, 'auth-sessions', { sessions });
  }

  private async deleteSession(workspaceId: string, token: string) {
    const doc = await this.getDoc(workspaceId, 'auth-sessions');
    const sessions = {
      ...(((doc.payload as { sessions?: Record<string, unknown> })?.sessions ?? {}) as Record<
        string,
        unknown
      >),
    };
    delete sessions[token];
    await this.putDoc(workspaceId, 'auth-sessions', { sessions });
  }

  private async ensureWorkspace(workspaceId: string) {
    const row = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (row) return;

    // 本地/首次启动：缺少工作区时自动补齐，避免 login/docs 直接 404
    const catalog = WORKSPACE_CATALOGS.find((c) => c.workspace.id === workspaceId);
    if (catalog) {
      await this.prisma.workspace.create({
        data: {
          id: catalog.workspace.id,
          name: catalog.workspace.name,
          namespace: catalog.workspace.namespace,
          description: catalog.workspace.description,
          memberCount: catalog.workspace.memberCount,
          defaultChatId: catalog.defaultChatId,
          catalogJson: buildCatalogPayload(catalog) as Prisma.InputJsonValue,
        },
      });
      return;
    }

    await this.prisma.workspace.create({
      data: {
        id: workspaceId,
        name: workspaceId,
        namespace: workspaceId,
        description: 'Auto-provisioned workspace',
        memberCount: 0,
        defaultChatId: 'default',
        catalogJson: {} as Prisma.InputJsonValue,
      },
    });
  }

  private async seedIfNeeded(workspaceId: string, kind: PlatformDocKind): Promise<unknown> {
    let payload: unknown = {};
    if (kind === 'members') {
      payload = { members: SEED_MEMBERS };
    } else if (kind === 'auth-credentials') {
      const credentials: Record<string, { salt: string; hash: string; updatedAt: string }> = {};
      const now = new Date().toISOString();
      for (const m of SEED_MEMBERS) {
        const salt = randomSalt();
        credentials[m.email] = {
          salt,
          hash: hashPassword('mssclaw', salt),
          updatedAt: now,
        };
      }
      payload = {
        policy: { allowDemoPassword: true },
        credentials,
      };
    } else if (kind === 'ai-news') {
      payload = { items: [] };
    } else if (kind === 'station-announcements') {
      payload = { items: [] };
    } else if (kind === 'plaza-howto') {
      payload = { records: [] };
    } else if (kind === 'audit-log') {
      payload = { logs: [] };
    } else if (kind === 'market-featured') {
      payload = { pins: [] };
    } else if (kind === 'market-favorites') {
      payload = { items: [] };
    } else if (kind === 'market-recent') {
      payload = { items: [] };
    } else if (kind === 'content-engagement') {
      payload = { map: {}, votes: {} };
    } else if (kind === 'ai-news-prefs') {
      payload = { byUser: {} };
    } else if (kind === 'asset-approvals') {
      payload = { items: [] };
    } else if (kind === 'auth-sessions') {
      payload = { sessions: {} };
    } else if (kind === 'demo-content') {
      payload = { demoContentOff: false };
    } else {
      payload = {};
    }

    const id = docId(workspaceId, kind);
    await this.prisma.centerRecord.upsert({
      where: { id },
      create: {
        id,
        workspaceId,
        kind: `doc:${kind}`,
        payload: payload as Prisma.InputJsonValue,
      },
      update: {},
    });
    return payload;
  }
}
