import {
  MEMBERS_BY_WORKSPACE,
  type PlatformRole,
  type WorkspaceMember,
} from '@/domain/rbac';

/** 演示环境统一密码（对接成员权限管理账号） */
export const DEMO_PASSWORD = 'mssclaw';

export interface LoginAccount {
  id: string;
  name: string;
  email: string;
  platformRole: PlatformRole;
  avatar: string;
  status: WorkspaceMember['status'];
  /** 所属工作区（用于提示） */
  workspaceIds: string[];
}

const ROLE_RANK: Record<PlatformRole, number> = {
  super_admin: 5,
  workspace_admin: 4,
  developer: 3,
  business_user: 2,
  viewer: 1,
};

/** 平台级超级管理员邮箱（可管理租户配置） */
const SUPER_ADMIN_EMAILS = new Set(['mcyo@company.com']);

function loadPersistedMembers(): WorkspaceMember[] {
  const out: WorkspaceMember[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith('mssclaw_members_')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        parsed.forEach((row) => {
          if (row && typeof row === 'object' && 'email' in row && 'id' in row) {
            out.push(row as WorkspaceMember);
          }
        });
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

/** 从成员权限管理数据构建可登录账号目录 */
export function buildLoginAccounts(): LoginAccount[] {
  const byEmail = new Map<string, LoginAccount>();

  const pushMember = (member: WorkspaceMember, workspaceId?: string) => {
    const email = member.email.trim().toLowerCase();
    if (!email) return;

    const platformRole: PlatformRole = SUPER_ADMIN_EMAILS.has(email)
      ? 'super_admin'
      : member.role;

    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, {
        id: member.id,
        name: member.name,
        email: member.email.trim(),
        platformRole,
        avatar: member.avatar,
        status: member.status,
        workspaceIds: workspaceId ? [workspaceId] : [],
      });
      return;
    }

    // 合并：优先 active；角色取更高权限；保留主 id（latam m1 优先）
    if (member.status === 'active' && existing.status !== 'active') {
      existing.status = 'active';
    }
    if (ROLE_RANK[platformRole] > ROLE_RANK[existing.platformRole]) {
      existing.platformRole = platformRole;
    }
    if (workspaceId && !existing.workspaceIds.includes(workspaceId)) {
      existing.workspaceIds.push(workspaceId);
    }
    // 默认工作区成员 id 优先（m1 而非 g2）
    if (workspaceId === 'ws-3c-latam') {
      existing.id = member.id;
      existing.name = member.name;
      existing.avatar = member.avatar;
    }
  };

  Object.entries(MEMBERS_BY_WORKSPACE).forEach(([wsId, members]) => {
    members.forEach((m) => pushMember(m, wsId));
  });
  loadPersistedMembers().forEach((m) => pushMember(m));

  return [...byEmail.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

export type AuthResult =
  | { ok: true; account: LoginAccount }
  | { ok: false; error: string };

export function authenticate(emailInput: string, password: string): AuthResult {
  const email = emailInput.trim().toLowerCase();
  if (!email) return { ok: false, error: '请输入邮箱账号' };
  if (!password) return { ok: false, error: '请输入密码' };

  const account = buildLoginAccounts().find((a) => a.email.toLowerCase() === email);
  if (!account) {
    return { ok: false, error: '账号不存在，请使用成员权限管理中的邮箱登录' };
  }
  if (account.status === 'invited') {
    return { ok: false, error: '该成员尚未激活，请联系管理员完成邀请' };
  }
  if (account.status === 'suspended') {
    return { ok: false, error: '账号已停用，无法登录' };
  }
  if (password !== DEMO_PASSWORD) {
    return { ok: false, error: '密码错误（演示密码：mssclaw）' };
  }
  return { ok: true, account };
}

/** 登录页展示的演示账号提示 */
export function getDemoAccountHints(): { email: string; name: string; role: PlatformRole }[] {
  return buildLoginAccounts()
    .filter((a) => a.status === 'active')
    .slice(0, 4)
    .map((a) => ({ email: a.email, name: a.name, role: a.platformRole }));
}
