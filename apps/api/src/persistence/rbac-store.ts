import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import type { PrismaService } from '../prisma/prisma.service';
import { MEMBER_INCLUDE, normalizedAccountEmail, SUPER_ADMIN_ROLE, touchRevision } from './identity-store';
import { hashPassword } from './password-hash';

/**
 * 角色 / 菜单 / 区域 / 领域字典与成员管理（/admin/*）。
 * 超级管理员全库唯一，只能由启动引导（SUPER_ADMIN_EMAIL）或移交接口产生。
 */

type Db = PrismaService | Prisma.TransactionClient;
type JsonRecord = Record<string, unknown>;

const MEMBER_STATUSES = new Set(['active', 'invited', 'suspended']);
/** 新成员默认角色：只有顶部五个菜单 */
export const DEFAULT_ROLE = 'member';
/** 超管被替换时降为能力开发：保留配置能力，去掉治理入口 */
const DEMOTED_ROLE = 'capability_ops';
export const MIN_PASSWORD_LENGTH = 8;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown, field: string, { required = false, max = 200 } = {}): string | undefined {
  if (value === undefined || value === null) {
    if (required) throw new BadRequestException(`${field}_required`);
    return undefined;
  }
  if (typeof value !== 'string') throw new BadRequestException(`${field}_must_be_string`);
  const trimmed = value.trim();
  if (required && !trimmed) throw new BadRequestException(`${field}_required`);
  if (trimmed.length > max) throw new BadRequestException(`${field}_too_long`);
  return trimmed;
}

function dictionaryId(value: unknown, field: string): string {
  const id = text(value, field, { required: true, max: 64 })!;
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) throw new BadRequestException(`${field}_invalid`);
  return id;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

// ---------------------------------------------------------------------------
// 菜单与角色

/** 一级分组（parentId 为空）和二级菜单平铺返回，前端按 parentId 拼树 */
export async function listMenus(db: Db) {
  return db.menu.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] });
}

const isLeaf = (menu: { parentId: string | null }) => menu.parentId !== null;

export interface MenuAccess {
  /** 能看到的二级菜单 */
  menus: string[];
  /** 其中可以新增、修改、删除的 */
  editableMenus: string[];
}

/** 超管不查 role_menu，全部二级菜单可编辑；固定菜单所有登录用户都有 */
export async function menuAccessForRole(db: Db, roleId: string): Promise<MenuAccess> {
  const leaves = (await listMenus(db)).filter(isLeaf);
  if (roleId === SUPER_ADMIN_ROLE) {
    const all = leaves.map((menu) => menu.id);
    return { menus: all, editableMenus: all };
  }
  const granted = new Map(
    (await db.roleMenu.findMany({ where: { roleId }, select: { menuId: true, canEdit: true } })).map((row) => [row.menuId, row.canEdit]),
  );
  const visible = leaves.filter((menu) => menu.fixed || granted.has(menu.id));
  return {
    menus: visible.map((menu) => menu.id),
    editableMenus: visible.filter((menu) => menu.fixed || granted.get(menu.id)).map((menu) => menu.id),
  };
}

export async function menuIdsForRole(db: Db, roleId: string): Promise<string[]> {
  return (await menuAccessForRole(db, roleId)).menus;
}

/** edit=true 时还要求这一项可编辑 */
export async function canAccessMenu(db: Db, roleId: string, menuId: string, edit = false): Promise<boolean> {
  if (roleId === SUPER_ADMIN_ROLE) return true;
  const [menu, grant] = await Promise.all([
    db.menu.findUnique({ where: { id: menuId }, select: { fixed: true } }),
    db.roleMenu.findUnique({ where: { roleId_menuId: { roleId, menuId } } }),
  ]);
  if (menu?.fixed) return true;
  return Boolean(grant && (!edit || grant.canEdit));
}

/** 角色拥有其中任一菜单即可；超级管理员不查表 */
export async function assertAnyMenu(db: Db, roleId: string, menuIds: readonly string[]): Promise<void> {
  for (const menuId of menuIds) {
    if (await canAccessMenu(db, roleId, menuId)) return;
  }
  throw new ForbiddenException(`menu_forbidden:${menuIds.join('|')}`);
}

export async function listRoles(db: Db) {
  const [roles, counts, menus] = await Promise.all([
    db.role.findMany({
      include: { menus: { select: { menuId: true, canEdit: true } } },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
    }),
    db.member.groupBy({ by: ['roleId'], _count: { _all: true } }),
    listMenus(db),
  ]);
  const memberCount = new Map(counts.map((row) => [row.roleId, row._count._all]));
  const order = new Map(menus.map((menu, index) => [menu.id, index]));
  const sorted = (ids: string[]) => ids.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  const allLeaves = menus.filter(isLeaf).map((menu) => menu.id);
  return roles.map(({ menus: grants, ...role }) => ({
    ...role,
    menuIds: role.id === SUPER_ADMIN_ROLE ? allLeaves : sorted(grants.map((grant) => grant.menuId)),
    editMenuIds: role.id === SUPER_ADMIN_ROLE ? allLeaves : sorted(grants.filter((grant) => grant.canEdit).map((grant) => grant.menuId)),
    memberCount: memberCount.get(role.id) ?? 0,
  }));
}

async function readRole(db: Db, id: string) {
  const role = (await listRoles(db)).find((item) => item.id === id);
  if (!role) throw new NotFoundException('role_not_found');
  return role;
}

/** 不传 id 时自动生成；可以带上初始菜单（复制角色时用） */
export async function createRole(prisma: PrismaService, body: unknown) {
  const input = isRecord(body) ? body : {};
  const id = input.id === undefined || input.id === '' ? `role-${randomBytes(4).toString('hex')}` : dictionaryId(input.id, 'role_id');
  try {
    await prisma.role.create({
      data: { id, name: text(input.name, 'name', { required: true })!, description: text(input.description, 'description', { max: 500 }) ?? null },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictException('role_exists');
    throw error;
  }
  if (input.menuIds !== undefined) return setRoleMenus(prisma, id, input);
  return readRole(prisma, id);
}

export async function updateRole(db: Db, id: string, body: unknown) {
  const input = isRecord(body) ? body : {};
  const updated = await db.role.updateMany({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: text(input.name, 'name', { required: true }) } : {}),
      ...(input.description !== undefined ? { description: text(input.description, 'description', { max: 500 }) ?? null } : {}),
    },
  });
  if (!updated.count) throw new NotFoundException('role_not_found');
  return readRole(db, id);
}

export async function deleteRole(db: Db, id: string): Promise<void> {
  const role = await db.role.findUnique({ where: { id } });
  if (!role) throw new NotFoundException('role_not_found');
  if (await db.member.count({ where: { roleId: id } })) throw new ConflictException('role_in_use');
  await db.role.delete({ where: { id } });
}

function idList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string')) throw new BadRequestException(`${field}_must_be_strings`);
  return [...new Set(value as string[])];
}

/**
 * 角色菜单整份替换；菜单在下次请求时生效，访问令牌里不带菜单。
 * editMenuIds 不传表示全部可编辑；可编辑的菜单自动算作可见。只能勾二级菜单，固定菜单不用勾。
 */
export async function setRoleMenus(prisma: PrismaService, roleId: string, body: unknown) {
  if (roleId === SUPER_ADMIN_ROLE) throw new BadRequestException('super_admin_has_all_menus');
  const input = isRecord(body) ? body : {};
  const menuIds = idList(input.menuIds, 'menuIds');
  const editMenuIds = input.editMenuIds === undefined ? menuIds : idList(input.editMenuIds, 'editMenuIds');
  const visible = [...new Set([...menuIds, ...editMenuIds])];
  const editable = new Set(editMenuIds);
  await prisma.$transaction(async (tx) => {
    if (!(await tx.role.findUnique({ where: { id: roleId } }))) throw new NotFoundException('role_not_found');
    const menus = new Map((await tx.menu.findMany()).map((menu) => [menu.id, menu]));
    for (const id of visible) {
      const menu = menus.get(id);
      if (!menu) throw new BadRequestException(`unknown_menu_${id}`);
      if (!isLeaf(menu)) throw new BadRequestException(`menu_is_group_${id}`);
    }
    const granted = visible.filter((id) => !menus.get(id)!.fixed);
    await tx.roleMenu.deleteMany({ where: { roleId } });
    if (granted.length) {
      await tx.roleMenu.createMany({ data: granted.map((menuId) => ({ roleId, menuId, canEdit: editable.has(menuId) })) });
    }
  });
  return readRole(prisma, roleId);
}

// ---------------------------------------------------------------------------
// 区域 / 领域字典

type DictionaryKind = 'region' | 'domain';

function dictionary(db: Db, kind: DictionaryKind) {
  return (kind === 'region' ? db.region : db.domain) as unknown as Prisma.RegionDelegate;
}

/** 所有人可读：前端卡片标签、侧栏筛选都靠它显示名称 */
export async function readTaxonomy(db: Db, includeDisabled = false) {
  const where = includeDisabled ? {} : { enabled: true };
  const orderBy = [{ sort: 'asc' as const }, { id: 'asc' as const }];
  const [regions, domains] = await Promise.all([
    db.region.findMany({ where, orderBy }),
    db.domain.findMany({ where, orderBy }),
  ]);
  const shape = (row: { id: string; name: string; enabled: boolean; sort: number }) => ({
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    sort: row.sort,
  });
  return { regions: regions.map(shape), domains: domains.map(shape) };
}

export async function createDictionaryEntry(db: Db, kind: DictionaryKind, body: unknown) {
  const input = isRecord(body) ? body : {};
  const id = dictionaryId(input.id, `${kind}_id`);
  const last = await dictionary(db, kind).findFirst({ orderBy: { sort: 'desc' }, select: { sort: true } });
  try {
    return await dictionary(db, kind).create({
      data: {
        id,
        name: text(input.name, 'name', { required: true })!,
        enabled: input.enabled !== false,
        sort: typeof input.sort === 'number' && Number.isSafeInteger(input.sort) ? input.sort : (last?.sort ?? -1) + 1,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictException(`${kind}_exists`);
    throw error;
  }
}

export async function updateDictionaryEntry(db: Db, kind: DictionaryKind, id: string, body: unknown) {
  const input = isRecord(body) ? body : {};
  if (input.enabled !== undefined && typeof input.enabled !== 'boolean') throw new BadRequestException('enabled_must_be_boolean');
  if (input.sort !== undefined && !(typeof input.sort === 'number' && Number.isSafeInteger(input.sort))) {
    throw new BadRequestException('sort_must_be_integer');
  }
  const updated = await dictionary(db, kind).updateMany({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: text(input.name, 'name', { required: true }) } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled as boolean } : {}),
      ...(input.sort !== undefined ? { sort: input.sort as number } : {}),
    },
  });
  if (!updated.count) throw new NotFoundException(`${kind}_not_found`);
  return dictionary(db, kind).findUniqueOrThrow({ where: { id } });
}

/** 还被成员或资产引用时不能删，只能停用 */
export async function deleteDictionaryEntry(db: Db, kind: DictionaryKind, id: string): Promise<void> {
  const inUse =
    kind === 'region'
      ? await db.member.count({ where: { regionId: id } })
      : await db.memberDomain.count({ where: { domainId: id } });
  if (inUse) throw new ConflictException(`${kind}_in_use`);
  try {
    const deleted = await dictionary(db, kind).deleteMany({ where: { id } });
    if (!deleted.count) throw new NotFoundException(`${kind}_not_found`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new ConflictException(`${kind}_in_use`);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 成员

type AdminMember = Prisma.MemberGetPayload<{ include: typeof MEMBER_INCLUDE & { credential: { select: { memberId: true } } } }>;

const ADMIN_MEMBER_INCLUDE = { ...MEMBER_INCLUDE, credential: { select: { memberId: true } } } satisfies Prisma.MemberInclude;

function adminMemberJson(row: AdminMember) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    roleId: row.roleId,
    status: row.status,
    regionId: row.regionId,
    domainIds: row.domains.map((domain) => domain.domainId),
    avatar: row.avatar,
    hasPassword: Boolean(row.credential),
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    externalId: row.externalId,
    postName: row.postName,
    orgPath: row.orgPath,
  };
}

export async function listMembers(db: Db) {
  const rows = await db.member.findMany({ include: ADMIN_MEMBER_INCLUDE, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] });
  return rows.map(adminMemberJson);
}

async function readMember(db: Db, id: string) {
  const row = await db.member.findUnique({ where: { id }, include: ADMIN_MEMBER_INCLUDE });
  if (!row) throw new NotFoundException('member_not_found');
  return adminMemberJson(row);
}

/** 创建 / 修改成员的公共校验；patch 时只校验传了的字段 */
async function memberFields(db: Db, input: JsonRecord, creating: boolean) {
  const data: { name?: string; email?: string; roleId?: string; status?: string; regionId?: string | null; avatar?: string } = {};
  if (creating || input.name !== undefined) data.name = text(input.name, 'name', { required: true });
  if (creating || input.email !== undefined) {
    const email = normalizedAccountEmail(text(input.email, 'email', { required: true }));
    if (!/^[^@\s]+@[^@\s]+$/.test(email)) throw new BadRequestException('email_invalid');
    data.email = email;
  }
  if (input.roleId !== undefined || creating) {
    const roleId = text(input.roleId, 'roleId') || DEFAULT_ROLE;
    if (!(await db.role.findUnique({ where: { id: roleId } }))) throw new BadRequestException(`unknown_role_${roleId}`);
    data.roleId = roleId;
  }
  if (input.status !== undefined) {
    const status = text(input.status, 'status')!;
    if (!MEMBER_STATUSES.has(status)) throw new BadRequestException('status_invalid');
    data.status = status;
  }
  if (input.avatar !== undefined) data.avatar = text(input.avatar, 'avatar', { max: 64 }) || 'bg-zinc-600';
  if (input.regionId !== undefined) {
    const regionId = text(input.regionId, 'regionId') || null;
    if (regionId && !(await db.region.findUnique({ where: { id: regionId } }))) throw new BadRequestException(`unknown_region_${regionId}`);
    data.regionId = regionId;
  }
  let domainIds: string[] | undefined;
  if (input.domainIds !== undefined) {
    if (!Array.isArray(input.domainIds) || input.domainIds.some((id) => typeof id !== 'string')) {
      throw new BadRequestException('domainIds_must_be_strings');
    }
    domainIds = [...new Set(input.domainIds as string[])];
    const known = new Set((await db.domain.findMany({ where: { id: { in: domainIds } }, select: { id: true } })).map((row) => row.id));
    const unknown = domainIds.find((id) => !known.has(id));
    if (unknown) throw new BadRequestException(`unknown_domain_${unknown}`);
  }
  return { data, domainIds };
}

async function writeDomains(tx: Prisma.TransactionClient, memberId: string, domainIds: string[] | undefined) {
  if (!domainIds) return;
  await tx.memberDomain.deleteMany({ where: { memberId } });
  if (domainIds.length) {
    await tx.memberDomain.createMany({ data: domainIds.map((domainId, position) => ({ memberId, domainId, position })) });
  }
}

async function setPassword(tx: Prisma.TransactionClient, memberId: string, password: string) {
  const data = { ...(await hashPassword(password)), passwordUpdatedAt: new Date() };
  await tx.memberCredential.upsert({ where: { memberId }, create: { memberId, ...data }, update: data });
}

function passwordInput(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new BadRequestException('password_must_be_string');
  if (value.length < MIN_PASSWORD_LENGTH) throw new BadRequestException(`password_min_length_${MIN_PASSWORD_LENGTH}`);
  return value;
}

function newMemberId(email: string): string {
  const local = email.split('@')[0].replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);
  return `u-${local || 'member'}-${randomBytes(3).toString('hex')}`;
}

export async function createMember(prisma: PrismaService, body: unknown) {
  const input = isRecord(body) ? body : {};
  const { data, domainIds } = await memberFields(prisma, input, true);
  const password = passwordInput(input.password);
  const id = newMemberId(data.email!);
  try {
    await prisma.$transaction(async (tx) => {
      const last = await tx.member.findFirst({ orderBy: { position: 'desc' }, select: { position: true } });
      await tx.member.create({
        data: { id, name: data.name!, email: data.email!, ...data, position: (last?.position ?? -1) + 1 },
      });
      await writeDomains(tx, id, domainIds);
      if (password) await setPassword(tx, id, password);
      await touchRevision(tx, 'members');
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictException('member_email_exists');
    throw error;
  }
  return readMember(prisma, id);
}

/** 作废该成员现有登录：访问令牌下次校验失败，刷新令牌不能再换新令牌 */
async function invalidateMemberSessions(tx: Prisma.TransactionClient, id: string) {
  await tx.refreshToken.updateMany({ where: { memberId: id, revokedAt: null }, data: { revokedAt: new Date() } });
}

/** 改资料或停用都让对方重新登录。停用、改角色仍额外受下面的限制。 */
export async function updateMember(prisma: PrismaService, id: string, body: unknown, actorId: string) {
  const input = isRecord(body) ? body : {};
  const before = await prisma.member.findUnique({ where: { id } });
  if (!before) throw new NotFoundException('member_not_found');
  if (before.roleId === SUPER_ADMIN_ROLE && input.status !== undefined && input.status !== 'active') {
    throw new BadRequestException('super_admin_cannot_be_suspended');
  }
  if (id === actorId && input.status !== undefined && input.status !== 'active') {
    throw new BadRequestException('cannot_suspend_self');
  }
  const { data, domainIds } = await memberFields(prisma, input, false);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id },
        data: { ...data, tokenVersion: { increment: 1 } },
      });
      await writeDomains(tx, id, domainIds);
      await invalidateMemberSessions(tx, id);
      await touchRevision(tx, 'members');
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictException('member_email_exists');
    throw error;
  }
  return readMember(prisma, id);
}

export const MAX_IMPORT_ROWS = 1000;

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

interface ImportPlan {
  row: number;
  existingId: string | null;
  data: { name?: string; email: string; roleId?: string; regionId?: string | null; status?: string };
  domainIds?: string[];
  password?: string;
}

function cell(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function splitCell(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(cell).filter(Boolean);
  return cell(value).split(/[,，、;；/\n]+/).map((item) => item.trim()).filter(Boolean);
}

/** 字典按编号或名称都能匹配，Excel 里填名称更顺手 */
function lookup<T extends { id: string; name: string }>(rows: T[]) {
  const byKey = new Map<string, T>();
  for (const row of rows) {
    byKey.set(row.name.toLowerCase(), row);
    byKey.set(row.id.toLowerCase(), row);
  }
  return (key: string) => byKey.get(key.toLowerCase());
}

/**
 * Excel 批量导入成员：整批校验，有一行出错就整批不写，逐行返回错误。
 * 邮箱已存在时按更新处理，空单元格保留原值；新成员没填角色时用默认角色，没填密码时用「邮箱+123456」。
 */
export async function importMembers(prisma: PrismaService, body: unknown) {
  const rows = isRecord(body) && Array.isArray(body.rows) ? body.rows : null;
  if (!rows) throw new BadRequestException('rows_required');
  if (!rows.length) throw new BadRequestException('rows_empty');
  if (rows.length > MAX_IMPORT_ROWS) throw new BadRequestException(`rows_max_${MAX_IMPORT_ROWS}`);

  const [roles, regions, domains, members] = await Promise.all([
    prisma.role.findMany({ select: { id: true, name: true } }),
    prisma.region.findMany({ select: { id: true, name: true } }),
    prisma.domain.findMany({ select: { id: true, name: true } }),
    prisma.member.findMany({ select: { id: true, email: true, roleId: true } }),
  ]);
  const findRole = lookup(roles);
  const findRegion = lookup(regions);
  const findDomain = lookup(domains);
  const memberByEmail = new Map(members.map((member) => [member.email, member]));

  const errors: ImportRowError[] = [];
  const plans: ImportPlan[] = [];
  const seenEmails = new Map<string, number>();
  rows.forEach((raw: unknown, index: number) => {
    const input = isRecord(raw) ? raw : {};
    const row = Number.isInteger(input.row) ? Number(input.row) : index + 1;
    const fail = (field: string, message: string) => errors.push({ row, field, message });
    const before = errors.length;

    const email = normalizedAccountEmail(cell(input.email));
    if (!email) fail('email', '邮箱必填');
    else if (!/^[^@\s]+@[^@\s]+$/.test(email)) fail('email', `邮箱格式不对：${email}`);
    else if (seenEmails.has(email)) fail('email', `与第 ${seenEmails.get(email)} 行邮箱重复`);
    if (email) seenEmails.set(email, seenEmails.get(email) ?? row);
    const existing = email ? memberByEmail.get(email) : undefined;
    if (existing?.roleId === SUPER_ADMIN_ROLE) fail('email', '超级管理员不能通过导入修改');

    const name = cell(input.name);
    if (!name && !existing) fail('name', '新成员姓名必填');
    if (name.length > 200) fail('name', '姓名不能超过 200 个字符');

    let roleId: string | undefined;
    const roleKey = cell(input.role);
    if (roleKey) {
      const role = findRole(roleKey);
      if (!role) fail('role', `角色不存在：${roleKey}`);
      else roleId = role.id;
    } else if (!existing) roleId = DEFAULT_ROLE;

    let regionId: string | null | undefined;
    const regionKey = cell(input.region);
    if (regionKey) {
      const region = findRegion(regionKey);
      if (!region) fail('region', `区域不存在：${regionKey}`);
      else regionId = region.id;
    } else if (!existing) regionId = null;

    let domainIds: string[] | undefined;
    const domainKeys = splitCell(input.domains);
    if (domainKeys.length) {
      const missing = domainKeys.filter((key) => !findDomain(key));
      if (missing.length) fail('domains', `领域不存在：${missing.join('、')}`);
      else domainIds = [...new Set(domainKeys.map((key) => findDomain(key)!.id))];
    }

    const givenPassword = cell(input.password);
    const password = givenPassword || (!existing && email ? `${email}123456` : undefined);
    if (givenPassword && givenPassword.length < MIN_PASSWORD_LENGTH) fail('password', `初始密码至少 ${MIN_PASSWORD_LENGTH} 位`);

    if (errors.length > before) return;
    plans.push({
      row,
      existingId: existing?.id ?? null,
      data: { email, ...(name ? { name } : {}), ...(roleId ? { roleId } : {}), ...(regionId !== undefined ? { regionId } : {}) },
      domainIds,
      password,
    });
  });
  if (errors.length) throw new BadRequestException({ message: 'import_invalid', errors });

  const hashes = new Map<number, Awaited<ReturnType<typeof hashPassword>>>();
  for (const plan of plans) if (plan.password) hashes.set(plan.row, await hashPassword(plan.password));

  let created = 0;
  let updated = 0;
  await prisma.$transaction(
    async (tx) => {
      const last = await tx.member.findFirst({ orderBy: { position: 'desc' }, select: { position: true } });
      let position = (last?.position ?? -1) + 1;
      for (const plan of plans) {
        let memberId = plan.existingId;
        if (memberId) {
          await tx.member.update({
            where: { id: memberId },
            data: { ...plan.data, tokenVersion: { increment: 1 } },
          });
          await invalidateMemberSessions(tx, memberId);
          updated += 1;
        } else {
          memberId = newMemberId(plan.data.email);
          await tx.member.create({ data: { id: memberId, name: plan.data.name!, ...plan.data, position: position++ } });
          created += 1;
        }
        await writeDomains(tx, memberId, plan.domainIds);
        const hash = hashes.get(plan.row);
        if (hash) {
          const data = { ...hash, passwordUpdatedAt: new Date() };
          await tx.memberCredential.upsert({ where: { memberId }, create: { memberId, ...data }, update: data });
        }
      }
      await touchRevision(tx, 'members');
    },
    { timeout: 60_000 },
  );
  return { created, updated, total: plans.length };
}

export async function deleteMember(prisma: PrismaService, id: string, actorId: string): Promise<void> {
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) throw new NotFoundException('member_not_found');
  if (member.roleId === SUPER_ADMIN_ROLE) throw new BadRequestException('super_admin_cannot_be_deleted');
  if (id === actorId) throw new BadRequestException('cannot_delete_self');
  await prisma.$transaction(async (tx) => {
    await tx.member.delete({ where: { id } });
    await touchRevision(tx, 'members');
  });
}

export async function setMemberPassword(prisma: PrismaService, id: string, body: unknown) {
  const password = passwordInput(isRecord(body) ? body.password : undefined);
  if (!password) throw new BadRequestException('password_required');
  if (!(await prisma.member.findUnique({ where: { id } }))) throw new NotFoundException('member_not_found');
  await prisma.$transaction(async (tx) => {
    await setPassword(tx, id, password);
    await tx.member.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
    await invalidateMemberSessions(tx, id);
    await touchRevision(tx, 'auth-credentials');
  });
  return readMember(prisma, id);
}

export async function clearMemberPassword(prisma: PrismaService, id: string) {
  if (!(await prisma.member.findUnique({ where: { id } }))) throw new NotFoundException('member_not_found');
  await prisma.$transaction(async (tx) => {
    await tx.memberCredential.deleteMany({ where: { memberId: id } });
    await tx.member.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
    await invalidateMemberSessions(tx, id);
    await touchRevision(tx, 'auth-credentials');
  });
  return readMember(prisma, id);
}

/** 强制下线：访问令牌下一次请求失效，刷新令牌全部作废 */
export async function forceLogout(prisma: PrismaService, id: string) {
  const updated = await prisma.member.updateMany({ where: { id }, data: { tokenVersion: { increment: 1 } } });
  if (!updated.count) throw new NotFoundException('member_not_found');
  await prisma.refreshToken.updateMany({ where: { memberId: id, revokedAt: null }, data: { revokedAt: new Date() } });
}

/** 超管把身份移交给另一位成员，自己降为能力开发 */
export async function transferSuperAdmin(prisma: PrismaService, actorId: string, body: unknown) {
  const targetId = text(isRecord(body) ? body.memberId : undefined, 'memberId', { required: true })!;
  await prisma.$transaction(async (tx) => {
    const actor = await tx.member.findUnique({ where: { id: actorId } });
    if (actor?.roleId !== SUPER_ADMIN_ROLE) throw new ForbiddenException('super_admin_required');
    if (targetId === actorId) throw new BadRequestException('already_super_admin');
    const target = await tx.member.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException('member_not_found');
    if (target.status !== 'active') throw new BadRequestException('target_member_not_active');
    await tx.member.update({ where: { id: actorId }, data: { roleId: DEMOTED_ROLE, tokenVersion: { increment: 1 } } });
    await tx.member.update({ where: { id: targetId }, data: { roleId: SUPER_ADMIN_ROLE, tokenVersion: { increment: 1 } } });
    await touchRevision(tx, 'members');
  });
  return listMembers(prisma);
}

// ---------------------------------------------------------------------------
// 启动引导

/**
 * SUPER_ADMIN_EMAIL 指定的成员成为超管：不存在就新建。已经是超管的其他成员保持不变。
 * SUPER_ADMIN_PASSWORD 只在该成员还没有密码时写入，之后在页面上改的密码不会被重启覆盖。
 */
export async function ensureSuperAdmin(
  prisma: PrismaService,
  config: { email?: string; name?: string; password?: string },
): Promise<{ memberId: string; created: boolean; demoted: string[]; passwordSet: boolean } | null> {
  const email = normalizedAccountEmail(config.email);
  if (!email) return null;
  const password = config.password?.trim() ? config.password : undefined;
  return prisma.$transaction(async (tx) => {
    let member = await tx.member.findUnique({ where: { email }, include: { credential: true } });
    const created = !member;
    const promoted = Boolean(member && (member.roleId !== SUPER_ADMIN_ROLE || member.status !== 'active'));
    if (!member) {
      const last = await tx.member.findFirst({ orderBy: { position: 'desc' }, select: { position: true } });
      member = await tx.member.create({
        data: {
          id: newMemberId(email),
          name: config.name?.trim() || email.split('@')[0],
          email,
          roleId: SUPER_ADMIN_ROLE,
          position: (last?.position ?? -1) + 1,
        },
        include: { credential: true },
      });
    } else if (promoted) {
      await tx.member.update({
        where: { id: member.id },
        data: { roleId: SUPER_ADMIN_ROLE, status: 'active', tokenVersion: { increment: 1 } },
      });
    }
    const passwordSet = Boolean(password && !member.credential);
    if (passwordSet) await setPassword(tx, member.id, password!);
    if (created || promoted || passwordSet) await touchRevision(tx, 'members');
    return { memberId: member.id, created, demoted: [], passwordSet };
  });
}
