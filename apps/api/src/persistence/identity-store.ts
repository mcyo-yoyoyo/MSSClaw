import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * 第 4 期身份表 ↔ 原文档形状。接口不变：
 *   /docs/members           { members: [...], revision }
 *   /docs/auth-credentials  { policy: { allowDemoPassword }, credentials: { [email]: { salt, hash, updatedAt } }, revision }
 * 整份替换靠 collection_revision 做乐观锁；会话表只存令牌的 SHA-256。
 */

type Db = PrismaService | Prisma.TransactionClient;
type JsonRecord = Record<string, unknown>;
type MemberRow = Prisma.MemberGetPayload<object>;

export const SEED_MEMBERS = [
  { id: 'u-mcyo', name: 'Mcyo', email: 'mcyo@huawei.com', role: 'super_admin', avatar: 'bg-indigo-600', status: 'active', deptIds: ['quality'], regionId: null },
  { id: 'u-jacky', name: 'Jacky', email: 'jacky@huawei.com', role: 'capability_ops', avatar: 'bg-teal-600', status: 'active', deptIds: ['quality'], regionId: null },
  { id: 'u-dickson', name: 'Dickson', email: 'dickson@huawei.com', role: 'business_user', avatar: 'bg-amber-500', status: 'active', deptIds: ['mkt'], regionId: null },
];

export function normalizedAccountEmail(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/@company\.com$/i, '@huawei.com');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// 集合版本号

/** 期望版本一致才加一；不一致抛 409（错误体与原文档 CAS 相同）。 */
export async function bumpRevision(tx: Prisma.TransactionClient, collection: string, expected: number): Promise<number> {
  return bumpCollectionRevision(tx, collection, expected, `${collection.replace(/-/g, '_')}_revision_conflict`);
}

export async function bumpCollectionRevision(
  tx: Prisma.TransactionClient,
  collection: string,
  expected: number,
  conflictError: string,
): Promise<number> {
  const updated = await tx.collectionRevision.updateMany({
    where: { collection, revision: expected },
    data: { revision: { increment: 1 } },
  });
  if (updated.count === 1) return expected + 1;
  const current = await tx.collectionRevision.findUnique({ where: { collection } });
  if (!current && expected === 0) {
    await tx.collectionRevision.create({ data: { collection, revision: 1 } });
    return 1;
  }
  throw new ConflictException({
    error: conflictError,
    expectedRevision: expected,
    currentRevision: current?.revision ?? 0,
  });
}

/** 成员表被 OAuth 登录改动时无条件加一，让管理员手里的旧快照写入时撞 409。 */
async function touchRevision(tx: Prisma.TransactionClient, collection: string): Promise<void> {
  await tx.collectionRevision.upsert({
    where: { collection },
    create: { collection, revision: 1 },
    update: { revision: { increment: 1 } },
  });
}

export async function readRevision(db: Db, collection: string): Promise<number> {
  return (await db.collectionRevision.findUnique({ where: { collection } }))?.revision ?? 0;
}

export function expectedRevisionOf(payload: unknown): number {
  const revision = isRecord(payload) ? payload.revision : undefined;
  return typeof revision === 'number' && Number.isSafeInteger(revision) && revision >= 0 ? revision : 0;
}

// ---------------------------------------------------------------------------
// 成员

/** 「最近活跃」以前是手填文案（刚刚 / 今天），现在由最后登录时间生成。 */
function lastActiveLabel(at: Date | null): string {
  return at
    ? at.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
    : '未登录';
}

export function memberToJson(row: MemberRow): JsonRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? '',
    role: row.role,
    avatar: row.avatar,
    lastActive: lastActiveLabel(row.lastLoginAt),
    status: row.status,
    deptIds: Array.isArray(row.deptIds) ? row.deptIds : [],
    regionId: row.regionId ?? null,
    ...(row.externalId ? { externalId: row.externalId } : {}),
    ...(row.postName ? { postName: row.postName } : {}),
    ...(row.orgPath ? { orgPath: row.orgPath } : {}),
  };
}

export async function readMembers(db: Db): Promise<MemberRow[]> {
  return db.member.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] });
}

export async function readMembersDoc(db: Db) {
  const [members, revision] = await Promise.all([readMembers(db), readRevision(db, 'members')]);
  return { members: members.map(memberToJson), revision };
}

/** 全新库：成员表为空且从没保存过时，播种演示成员（与旧版首次读取成员文档一致）。 */
export async function ensureMembersSeeded(db: Db): Promise<void> {
  if (await db.collectionRevision.findUnique({ where: { collection: 'members' } })) return;
  if (await db.member.count()) return;
  await db.member.createMany({
    data: SEED_MEMBERS.map((member, position) => ({ ...member, position })),
    skipDuplicates: true,
  });
}

/**
 * 管理员可编辑的字段。externalId / postName / orgPath 由统一身份登录回写、平台不提供编辑入口，
 * 保存成员表时一律沿用库里的值；lastActive 由最后登录时间生成，写入时忽略。
 */
const MEMBER_FIELDS = new Set(['id', 'name', 'email', 'role', 'avatar', 'status', 'deptIds', 'regionId']);
const MEMBER_IGNORED_FIELDS = new Set(['lastActive', 'externalId', 'postName', 'orgPath']);

function invalidMember(id: string, reason: string): never {
  throw new BadRequestException(`invalid_member:${id || '(无 id)'}:${reason}`);
}

export function prepareMembers(payload: unknown) {
  const raw = isRecord(payload) && Array.isArray(payload.members) ? payload.members : null;
  if (!raw) throw new BadRequestException('members_array_required');
  const ids = new Set<string>();
  const emails = new Set<string>();
  return raw.map((item, position) => {
    if (!isRecord(item)) invalidMember('', 'not_an_object');
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    if (!id) invalidMember(id, 'id_required');
    for (const key of Object.keys(item)) {
      if (!MEMBER_FIELDS.has(key) && !MEMBER_IGNORED_FIELDS.has(key)) invalidMember(id, `unknown_field_${key}`);
    }
    for (const key of ['name', 'email', 'role', 'avatar', 'status'] as const) {
      if (item[key] !== undefined && typeof item[key] !== 'string') invalidMember(id, `${key}_must_be_string`);
    }
    if (typeof item.name !== 'string' || !item.name.trim()) invalidMember(id, 'name_required');
    if (item.deptIds !== undefined && (!Array.isArray(item.deptIds) || item.deptIds.some((d) => typeof d !== 'string'))) {
      invalidMember(id, 'deptIds_must_be_strings');
    }
    if (item.regionId !== undefined && item.regionId !== null && typeof item.regionId !== 'string') {
      invalidMember(id, 'regionId_must_be_string');
    }
    if (ids.has(id)) invalidMember(id, 'duplicate_id');
    ids.add(id);
    const email = normalizedAccountEmail(item.email) || null;
    if (email) {
      if (emails.has(email)) invalidMember(id, `duplicate_email_${email}`);
      emails.add(email);
    }
    return {
      id,
      name: item.name,
      email,
      role: typeof item.role === 'string' && item.role ? item.role : 'business_user',
      avatar: typeof item.avatar === 'string' && item.avatar ? item.avatar : 'bg-zinc-600',
      status: typeof item.status === 'string' && item.status ? item.status : 'active',
      deptIds: (item.deptIds as string[] | undefined) ?? [],
      regionId: (item.regionId as string | null | undefined) ?? null,
      position,
    };
  });
}

/** PUT /docs/members：版本一致才整份替换；从表里去掉的成员连同密码、会话一起删除（外键级联）。 */
export async function writeMembersDoc(prisma: PrismaService, payload: unknown) {
  const prepared = prepareMembers(payload);
  const expected = expectedRevisionOf(payload);
  await prisma.$transaction(async (tx) => {
    await bumpRevision(tx, 'members', expected);
    const existing = new Map((await tx.member.findMany({ select: { id: true, email: true } })).map((row) => [row.id, row.email]));
    await tx.member.deleteMany({ where: { id: { notIn: prepared.map((member) => member.id) } } });
    // 先清掉要换邮箱的成员的旧邮箱，两个成员互换邮箱时才不会撞唯一键
    const emailChanged = prepared.filter((member) => existing.has(member.id) && existing.get(member.id) !== member.email);
    if (emailChanged.length) {
      await tx.member.updateMany({ where: { id: { in: emailChanged.map((member) => member.id) } }, data: { email: null } });
    }
    for (const member of prepared) {
      await tx.member.upsert({ where: { id: member.id }, create: member, update: member });
    }
  });
  return readMembersDoc(prisma);
}

/** 统一身份登录：建号或回写上游属性，成员表版本加一。 */
export async function saveOAuthMember(
  prisma: PrismaService,
  member: { id: string; name: string; email: string | null; externalId: string | null; postName: string | null; orgPath: string | null },
  create: boolean,
): Promise<MemberRow> {
  return prisma.$transaction(async (tx) => {
    await touchRevision(tx, 'members');
    if (!create) {
      const { id, ...data } = member;
      return tx.member.update({ where: { id }, data });
    }
    const last = await tx.member.findFirst({ orderBy: { position: 'desc' }, select: { position: true } });
    return tx.member.create({ data: { ...member, position: (last?.position ?? -1) + 1 } });
  });
}

// ---------------------------------------------------------------------------
// 密码与口令策略

export async function readAuthPolicy(db: Db): Promise<{ allowDemoPassword: boolean }> {
  const row = await db.appSetting.findUnique({ where: { settingKey: 'auth-policy' } });
  const value = isRecord(row?.value) ? row.value : {};
  return { allowDemoPassword: value.allowDemoPassword !== false };
}

export async function readCredentialsDoc(db: Db) {
  const [policy, revision, rows] = await Promise.all([
    readAuthPolicy(db),
    readRevision(db, 'auth-credentials'),
    db.memberCredential.findMany({ include: { member: { select: { email: true } } } }),
  ]);
  const credentials: Record<string, { salt: string; hash: string; updatedAt: string }> = {};
  for (const row of rows) {
    if (!row.member.email) continue;
    credentials[row.member.email] = {
      salt: row.salt,
      hash: row.passwordHash,
      updatedAt: row.passwordUpdatedAt.toISOString(),
    };
  }
  return { policy, credentials, revision };
}

/** 历史 key 有大小写与 @company.com，统一归一化；同一邮箱多条时取最新。 */
export function normalizeCredentialMap(raw: unknown): Map<string, { salt: string; hash: string; updatedAt: string }> {
  const out = new Map<string, { salt: string; hash: string; updatedAt: string }>();
  if (!isRecord(raw)) return out;
  for (const [key, value] of Object.entries(raw)) {
    if (!isRecord(value) || typeof value.salt !== 'string' || typeof value.hash !== 'string') continue;
    const email = normalizedAccountEmail(key);
    if (!email) continue;
    const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : '';
    const previous = out.get(email);
    if (previous && previous.updatedAt >= updatedAt) continue;
    out.set(email, { salt: value.salt, hash: value.hash, updatedAt });
  }
  return out;
}

/**
 * PUT /docs/auth-credentials：版本一致才整份替换。密码挂在成员上，
 * 邮箱找不到成员的条目跳过（返回给调用方记日志），所以前端必须先保存成员再设密码。
 */
export async function writeCredentialsDoc(prisma: PrismaService, payload: unknown) {
  const input = isRecord(payload) ? payload : {};
  const policyInput = isRecord(input.policy) ? input.policy : {};
  const credentials = normalizeCredentialMap(input.credentials);
  const expected = expectedRevisionOf(payload);
  const skipped: string[] = [];
  await prisma.$transaction(async (tx) => {
    await bumpRevision(tx, 'auth-credentials', expected);
    const members = await tx.member.findMany({
      where: { email: { in: [...credentials.keys()] } },
      select: { id: true, email: true },
    });
    const memberIdByEmail = new Map(members.map((member) => [member.email as string, member.id]));
    const kept: string[] = [];
    for (const [email, credential] of credentials) {
      const memberId = memberIdByEmail.get(email);
      if (!memberId) {
        skipped.push(email);
        continue;
      }
      kept.push(memberId);
      const parsed = Date.parse(credential.updatedAt);
      const data = {
        salt: credential.salt,
        passwordHash: credential.hash,
        passwordUpdatedAt: Number.isFinite(parsed) ? new Date(parsed) : new Date(),
      };
      await tx.memberCredential.upsert({ where: { memberId }, create: { memberId, ...data }, update: data });
    }
    await tx.memberCredential.deleteMany({ where: { memberId: { notIn: kept } } });
    const value = { allowDemoPassword: policyInput.allowDemoPassword !== false };
    await tx.appSetting.upsert({
      where: { settingKey: 'auth-policy' },
      create: { settingKey: 'auth-policy', value },
      update: { value, revision: { increment: 1 } },
    });
  });
  return { doc: await readCredentialsDoc(prisma), skipped };
}

// ---------------------------------------------------------------------------
// 会话

export type AuthMethod = 'password' | 'demo' | 'oauth';

export async function createSession(
  prisma: PrismaService,
  input: { token: string; memberId: string; authMethod: AuthMethod; expiresAt: Date },
): Promise<void> {
  await prisma.$transaction([
    prisma.authSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    prisma.authSession.create({
      data: {
        tokenHash: hashToken(input.token),
        memberId: input.memberId,
        authMethod: input.authMethod,
        expiresAt: input.expiresAt,
      },
    }),
    prisma.member.update({ where: { id: input.memberId }, data: { lastLoginAt: new Date() } }),
  ]);
}

export async function findSession(db: Db, token: string) {
  return db.authSession.findUnique({ where: { tokenHash: hashToken(token) }, include: { member: true } });
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}
