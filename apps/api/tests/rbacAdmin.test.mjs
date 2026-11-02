import assert from 'node:assert/strict';
import test, { after, before, beforeEach } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { PlatformDocsService } from '../dist/persistence/platform-docs.service.js';
import { MenuGuard } from '../dist/persistence/menu.guard.js';
import { AdminController, OrgController } from '../dist/persistence/admin.controller.js';
import { ensureSuperAdmin, menuAccessForRole, menuIdsForRole } from '../dist/persistence/rbac-store.js';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';

process.env.JWT_SECRET = 'test-jwt-secret';

let database;
let prisma;

before(async () => {
  database = await createTestDatabase('rbac_admin');
  prisma = new PrismaClient({ datasourceUrl: database.url });
});

after(async () => {
  await prisma?.$disconnect();
  await database?.drop();
});

beforeEach(async () => {
  for (const table of ['refresh_token', 'member_credential', 'member_domain', 'member', 'collection_revision', 'app_setting']) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
  await prisma.$executeRawUnsafe(`DELETE FROM "role" WHERE NOT "is_system"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "region" WHERE "id" = 'oceania'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "role_menu" WHERE "role_id" = 'viewer' AND "menu_id" LIKE 'org-%'`);
});

const docs = () => new PlatformDocsService(prisma, { recordDailyLogin: async () => {} });
const admin = () => new AdminController(prisma);

async function bootstrapAdmin() {
  await ensureSuperAdmin(prisma, { email: 'Admin@Huawei.com', password: 'admin654321' });
  return prisma.member.findUniqueOrThrow({ where: { email: 'admin@huawei.com' } });
}

async function tokenFor(email, password) {
  const result = await docs().login({ email, password });
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.token;
}

/** 跑一遍守卫：返回 { status } 或放进请求的 authUser */
async function guard(token, handler) {
  const request = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => AdminController,
  };
  try {
    await new MenuGuard(new Reflector(), docs(), prisma).canActivate(context);
    return request.authUser;
  } catch (error) {
    return { status: error.getStatus(), message: error.message };
  }
}

const reason = (promise) =>
  promise.then(
    () => 'resolved',
    (error) => `${error.getStatus?.()}:${error.message}`,
  );

test('启动引导：按邮箱建出唯一超管并设初始密码，原超管降为能力开发', async () => {
  await prisma.member.create({ data: { id: 'u-mcyo', name: 'Mcyo', email: 'mcyo@huawei.com', roleId: 'super_admin' } });
  const first = await ensureSuperAdmin(prisma, { email: 'Admin@Huawei.com', password: 'admin654321' });
  assert.deepEqual({ ...first, memberId: undefined }, { memberId: undefined, created: true, demoted: ['mcyo@huawei.com'], passwordSet: true });
  const members = await prisma.member.findMany({ orderBy: { email: 'asc' } });
  assert.deepEqual(members.map((m) => [m.email, m.roleId]), [['admin@huawei.com', 'super_admin'], ['mcyo@huawei.com', 'capability_ops']]);
  assert.equal((await docs().login({ email: 'admin@huawei.com', password: 'admin654321' })).user.platformRole, 'super_admin');

  // 页面上改过密码后重启，不会被环境变量改回去
  const adminId = first.memberId;
  await admin().setPassword(adminId, { password: 'changed-later' });
  const again = await ensureSuperAdmin(prisma, { email: 'admin@huawei.com', password: 'admin654321' });
  assert.deepEqual(again, { memberId: adminId, created: false, demoted: [], passwordSet: false });
  assert.equal((await docs().login({ email: 'admin@huawei.com', password: 'admin654321' })).ok, false);
  assert.equal((await docs().login({ email: 'admin@huawei.com', password: 'changed-later' })).ok, true);
});

test('菜单：两层结构，超管拿全部二级菜单，其他角色按 role_menu 加固定菜单；登录响应带菜单', async () => {
  await bootstrapAdmin();
  const { menus } = await admin().menus();
  const groups = menus.filter((m) => !m.parentId).map((m) => m.id);
  assert.deepEqual(groups, ['group-top', 'group-workspace', 'group-platform', 'group-ops', 'group-system', 'group-org']);
  assert.deepEqual(menus.filter((m) => m.parentId === 'group-org').map((m) => m.id), ['org-members', 'org-roles', 'org-depts', 'org-audit']);
  assert.ok(!menus.some((m) => ['admin', 'presentation'].includes(m.id)));

  const all = await menuIdsForRole(prisma, 'super_admin');
  assert.ok(all.includes('org-members') && all.includes('portal-ops') && !all.includes('group-org'));
  const viewer = await menuIdsForRole(prisma, 'viewer');
  assert.ok(viewer.includes('home') && viewer.includes('me') && viewer.includes('messages'));
  assert.ok(!viewer.includes('tools') && !viewer.includes('org-members'));

  // 普通用户：顶部五个菜单 + 固定菜单，没有管理后台菜单
  assert.deepEqual(
    (await menuIdsForRole(prisma, 'member')).sort(),
    ['ai-brief', 'home', 'market-external', 'market-internal', 'market-projects', 'market-tool', 'me', 'messages'],
  );

  const login = await docs().withMenus(await docs().login({ email: 'admin@huawei.com', password: 'admin654321' }));
  assert.deepEqual(login.menus, all);
  assert.deepEqual(login.editableMenus, all);
});

test('普通用户：新成员默认角色，系统角色不能删', async () => {
  await bootstrapAdmin();
  const created = await admin().createUser({ name: 'N', email: 'n@huawei.com' });
  assert.equal(created.roleId, 'member');
  const role = (await admin().roles()).roles.find((r) => r.id === 'member');
  assert.deepEqual([role.name, role.isSystem, role.memberCount], ['普通用户', true, 1]);
  assert.equal(await reason(admin().deleteRole('member')), '400:system_role_cannot_be_deleted');
});

test('守卫：未登录 401，没有成员菜单 403；只读能看不能改，可编辑才能改', async () => {
  await bootstrapAdmin();
  await admin().createUser({ name: 'V', email: 'v@huawei.com', roleId: 'viewer', password: 'viewer-pass' });
  const list = AdminController.prototype.users;
  const create = AdminController.prototype.createUser;
  assert.equal((await guard(undefined, list)).status, 401);
  const viewerToken = await tokenFor('v@huawei.com', 'viewer-pass');
  assert.deepEqual(await guard(viewerToken, list), { status: 403, message: 'menu_forbidden:org-members' });

  const viewerMenus = (await menuAccessForRole(prisma, 'viewer')).menus.filter((id) => !['me', 'messages', 'market-tool'].includes(id));
  await admin().setRoleMenus('viewer', { menuIds: [...viewerMenus, 'org-members'], editMenuIds: viewerMenus });
  assert.equal((await guard(viewerToken, list)).email, 'v@huawei.com');
  assert.deepEqual(await guard(viewerToken, create), { status: 403, message: 'menu_forbidden:org-members:edit' });
  // 角色列表成员页也要用；菜单清单只给角色页
  assert.equal((await guard(viewerToken, AdminController.prototype.roles)).email, 'v@huawei.com');
  assert.equal((await guard(viewerToken, AdminController.prototype.menus)).status, 403);
  assert.equal((await guard(viewerToken, AdminController.prototype.taxonomy)).email, 'v@huawei.com');
  assert.equal((await guard(viewerToken, AdminController.prototype.createRegion)).status, 403);

  await admin().setRoleMenus('viewer', { menuIds: viewerMenus, editMenuIds: ['org-members'] });
  assert.equal((await guard(viewerToken, create)).email, 'v@huawei.com');
  assert.deepEqual((await menuAccessForRole(prisma, 'viewer')).editableMenus.includes('org-members'), true);
  assert.equal((await guard(await tokenFor('admin@huawei.com', 'admin654321'), create)).platformRole, 'super_admin');
});

test('成员：邮箱不分大小写去重，不能直接设成超管，密码至少 8 位', async () => {
  await bootstrapAdmin();
  const created = await admin().createUser({ name: 'Jacky', email: 'Jacky@huawei.com', roleId: 'capability_ops', regionId: 'apac', domainIds: ['mkt', 'hr'] });
  assert.deepEqual(
    { ...created, id: undefined },
    {
      id: undefined, name: 'Jacky', email: 'jacky@huawei.com', roleId: 'capability_ops', status: 'active', regionId: 'apac',
      domainIds: ['mkt', 'hr'], avatar: 'bg-zinc-600', hasPassword: false, lastLoginAt: null, externalId: null, postName: null, orgPath: null,
    },
  );
  assert.equal(await reason(admin().createUser({ name: 'J2', email: 'JACKY@huawei.com' })), '409:member_email_exists');
  assert.equal(await reason(admin().createUser({ name: 'X', email: 'x@huawei.com', roleId: 'super_admin' })), '400:super_admin_via_transfer_only');
  assert.equal(await reason(admin().createUser({ name: 'X', email: 'x@huawei.com', regionId: 'mars' })), '400:unknown_region_mars');
  assert.equal(await reason(admin().createUser({ name: 'X', email: 'x@huawei.com', password: 'short' })), '400:password_min_length_8');
  assert.equal(await reason(admin().updateUser(created.id, { email: 'admin@HUAWEI.com' }, { id: 'actor' })), '409:member_email_exists');
});

test('成员：改资料、改密码都会让旧登录失效，停用同时作废刷新令牌', async () => {
  const superAdmin = await bootstrapAdmin();
  const member = await admin().createUser({ name: 'B', email: 'b@huawei.com', password: 'bbbbbbbb' });
  const login = await docs().login({ email: 'b@huawei.com', password: 'bbbbbbbb' });
  assert.equal((await docs().me(login.token)).ok, true);

  await admin().updateUser(member.id, { name: 'B2' }, superAdmin);
  assert.equal((await docs().me(login.token)).ok, false);
  const afterName = await docs().login({ email: 'b@huawei.com', password: 'bbbbbbbb' });
  assert.equal(afterName.ok, true);

  await admin().setPassword(member.id, { password: 'cccccccc' });
  assert.equal((await docs().me(afterName.token)).ok, false);
  const afterPassword = await docs().login({ email: 'b@huawei.com', password: 'cccccccc' });
  assert.equal(afterPassword.ok, true);

  await admin().updateUser(member.id, { roleId: 'viewer' }, superAdmin);
  assert.equal((await docs().me(afterPassword.token)).ok, false);
  const relogin = await docs().login({ email: 'b@huawei.com', password: 'cccccccc' });
  assert.equal(relogin.user.platformRole, 'viewer');

  await admin().updateUser(member.id, { status: 'suspended' }, superAdmin);
  assert.equal((await docs().me(relogin.token)).ok, false);
  assert.equal(await prisma.refreshToken.count({ where: { memberId: member.id, revokedAt: null } }), 0);
});

test('成员：超管不能被改角色、停用、删除；不能删自己；强制下线', async () => {
  const superAdmin = await bootstrapAdmin();
  const other = await admin().createUser({ name: 'C', email: 'c@huawei.com', roleId: 'capability_ops', password: 'cccccccc' });
  assert.equal(await reason(admin().updateUser(superAdmin.id, { roleId: 'viewer' }, other)), '400:super_admin_via_transfer_only');
  assert.equal(await reason(admin().updateUser(superAdmin.id, { status: 'suspended' }, other)), '400:super_admin_cannot_be_suspended');
  assert.equal(await reason(admin().deleteUser(superAdmin.id, other)), '400:super_admin_cannot_be_deleted');
  assert.equal(await reason(admin().deleteUser(other.id, other)), '400:cannot_delete_self');

  const token = await tokenFor('c@huawei.com', 'cccccccc');
  await admin().logoutUser(other.id);
  assert.equal((await docs().me(token)).ok, false);
  await admin().deleteUser(other.id, superAdmin);
  assert.equal(await prisma.member.count(), 1);
});

test('超管移交：只有超管本人能移交，移交后自己降为能力开发', async () => {
  const superAdmin = await bootstrapAdmin();
  const target = await admin().createUser({ name: 'D', email: 'd@huawei.com', roleId: 'capability_ops' });
  assert.equal(await reason(admin().transfer({ memberId: superAdmin.id }, target)), '403:super_admin_required');
  const { users } = await admin().transfer({ memberId: target.id }, superAdmin);
  assert.deepEqual(
    users.map((u) => [u.email, u.roleId]).sort(),
    [['admin@huawei.com', 'capability_ops'], ['d@huawei.com', 'super_admin']],
  );
});

test('角色：自定义角色可增改删，内置角色不能删，有成员的角色不能删，超管菜单不可改', async () => {
  const superAdmin = await bootstrapAdmin();
  const role = await admin().createRole({ id: 'auditor', name: '审计员' });
  assert.deepEqual([role.id, role.isSystem, role.menuIds, role.editMenuIds, role.memberCount], ['auditor', false, [], [], 0]);
  const generated = await admin().createRole({ name: '自动编号', menuIds: ['home', 'skills'], editMenuIds: ['home'] });
  assert.match(generated.id, /^role-[0-9a-f]{8}$/);
  assert.deepEqual([generated.menuIds, generated.editMenuIds], [['home', 'skills'], ['home']]);
  assert.equal(await reason(admin().createRole({ id: 'auditor', name: 'x' })), '409:role_exists');
  assert.equal(await reason(admin().createRole({ id: 'Bad Id', name: 'x' })), '400:role_id_invalid');
  const withMenus = await admin().setRoleMenus('auditor', { menuIds: ['home', 'portal-dashboard', 'home', 'me'] });
  assert.deepEqual(withMenus.menuIds.sort(), ['home', 'portal-dashboard']);
  assert.deepEqual(withMenus.editMenuIds.sort(), ['home', 'portal-dashboard']);
  // 可编辑自动算可见
  const editOnly = await admin().setRoleMenus('auditor', { menuIds: ['home'], editMenuIds: ['skills'] });
  assert.deepEqual([editOnly.menuIds, editOnly.editMenuIds], [['home', 'skills'], ['skills']]);
  assert.equal(await reason(admin().setRoleMenus('auditor', { menuIds: ['nope'] })), '400:unknown_menu_nope');
  assert.equal(await reason(admin().setRoleMenus('auditor', { menuIds: ['group-org'] })), '400:menu_is_group_group-org');
  assert.equal(await reason(admin().setRoleMenus('super_admin', { menuIds: [] })), '400:super_admin_has_all_menus');

  const member = await admin().createUser({ name: 'E', email: 'e@huawei.com', roleId: 'auditor' });
  assert.equal(await reason(admin().deleteRole('auditor')), '409:role_in_use');
  assert.equal(await reason(admin().deleteRole('viewer')), '400:system_role_cannot_be_deleted');
  await admin().deleteUser(member.id, superAdmin);
  await admin().deleteRole('auditor');
  assert.equal((await admin().roles()).roles.some((r) => r.id === 'auditor'), false);
});

test('字典：新增区域、停用后公开接口不再返回，被成员引用时不能删', async () => {
  const superAdmin = await bootstrapAdmin();
  const region = await admin().createRegion({ id: 'oceania', name: '大洋洲' });
  assert.equal(region.sort, 7);
  assert.equal(await reason(admin().createRegion({ id: 'oceania', name: 'x' })), '409:region_exists');
  const public1 = await new OrgController(prisma).taxonomy();
  assert.ok(public1.regions.some((r) => r.id === 'oceania'));

  await admin().updateRegion('oceania', { enabled: false });
  assert.ok(!(await new OrgController(prisma).taxonomy()).regions.some((r) => r.id === 'oceania'));
  assert.ok((await admin().taxonomy()).regions.some((r) => r.id === 'oceania' && !r.enabled));

  const member = await admin().createUser({ name: 'F', email: 'f@huawei.com', regionId: 'oceania', domainIds: ['finance'] });
  assert.equal(await reason(admin().deleteRegion('oceania')), '409:region_in_use');
  assert.equal(await reason(admin().deleteDomain('finance')), '409:domain_in_use');
  await admin().deleteUser(member.id, superAdmin);
  await admin().deleteRegion('oceania');
  assert.equal(await reason(admin().deleteRegion('oceania')), '404:region_not_found');
});

test('批量导入：整批校验，有错一行不写并逐行报错；名称或编号都能识别，已有邮箱按更新处理', async () => {
  const superAdmin = await bootstrapAdmin();
  const existing = await admin().createUser({ name: 'Old', email: 'old@huawei.com', roleId: 'viewer', regionId: 'apac', password: 'old-password' });
  const oldToken = await tokenFor('old@huawei.com', 'old-password');

  const bad = await admin()
    .importUsers({
      rows: [
        { row: 2, name: '甲', email: 'A@huawei.com', role: '能力开发', region: '亚太', domains: 'mkt、HR' },
        { row: 3, name: '', email: 'b@huawei.com' },
        { row: 4, name: '丙', email: 'a@huawei.com', role: '不存在', domains: 'mkt,火星' },
        { row: 5, name: '丁', email: 'admin@huawei.com' },
        { row: 6, name: '戊', email: 'e@huawei.com', password: 'short' },
      ],
    })
    .then(
      () => null,
      (error) => error.getResponse(),
    );
  assert.equal(bad.message, 'import_invalid');
  assert.deepEqual(
    bad.errors.map((e) => [e.row, e.field]),
    [[3, 'name'], [4, 'email'], [4, 'role'], [4, 'domains'], [5, 'email'], [6, 'password']],
  );
  assert.equal(await prisma.member.count(), 2);

  const result = await admin().importUsers({
    rows: [
      { name: '甲', email: 'A@huawei.com', role: 'capability_ops', region: '亚太', domains: 'mkt、HR', password: 'a-password' },
      { name: '乙', email: 'b@huawei.com' },
      { email: 'OLD@huawei.com', role: '普通用户' },
    ],
  });
  assert.deepEqual(result, { created: 2, updated: 1, total: 3 });
  const users = new Map((await admin().users()).users.map((u) => [u.email, u]));
  assert.deepEqual(
    ['roleId', 'regionId', 'domainIds', 'hasPassword'].map((k) => users.get('a@huawei.com')[k]),
    ['capability_ops', 'apac', ['mkt', 'hr'], true],
  );
  assert.deepEqual(
    ['roleId', 'regionId', 'hasPassword'].map((k) => users.get('b@huawei.com')[k]),
    ['member', null, true],
  );
  assert.equal((await docs().login({ email: 'b@huawei.com', password: 'b@huawei.com123456' })).ok, true);
  assert.equal((await docs().login({ email: 'old@huawei.com', password: 'old-password' })).ok, true);
  // 已有成员：空单元格保留原值，改角色让旧令牌失效
  assert.deepEqual(['name', 'roleId', 'regionId'].map((k) => users.get('old@huawei.com')[k]), ['Old', 'member', 'apac']);
  assert.equal((await docs().me(oldToken)).ok, false);
  assert.equal((await docs().login({ email: 'a@huawei.com', password: 'a-password' })).ok, true);
  assert.equal(await reason(admin().importUsers({ rows: [] })), '400:rows_empty');
  assert.ok(superAdmin && existing);
});
