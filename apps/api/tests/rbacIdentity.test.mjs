import assert from 'node:assert/strict';
import test, { after, before, beforeEach } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { readMembersDoc, writeMembersDoc } from '../dist/persistence/identity-store.js';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';

const RBAC_MIGRATION = '20261030000000_rbac_identity';

/** 旧表结构上造成员（此时 prisma client 已是新结构，只能写 SQL） */
async function legacyDatabase(label, members, orgTaxonomy) {
  const database = await createTestDatabase(label, { stopBefore: RBAC_MIGRATION });
  const prisma = new PrismaClient({ datasourceUrl: database.url });
  for (const [position, member] of members.entries()) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "member" ("id", "email", "display_name", "role", "dept_ids", "region_id", "position", "updated_at")
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, now())`,
      member.id,
      member.email ?? null,
      member.id,
      member.role ?? 'business_user',
      JSON.stringify(member.deptIds ?? []),
      member.regionId ?? null,
      position,
    );
  }
  if (orgTaxonomy) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "app_setting" ("setting_key", "value", "updated_at") VALUES ('org-taxonomy', $1::jsonb, now())`,
      JSON.stringify(orgTaxonomy),
    );
  }
  return { database, prisma };
}

test('迁移：邮箱转小写、旧角色归一、领域进关联表、字典缺的 id 补进字典', async () => {
  const { database, prisma } = await legacyDatabase(
    'rbac_migrate',
    [
      { id: 'u-a', email: ' Alice@Huawei.com ', role: 'workspace_admin', deptIds: ['mkt', 'legal', 'mkt'], regionId: 'apac' },
      { id: 'u-b', email: 'bob@huawei.com', role: 'developer', deptIds: [], regionId: 'oceania' },
      { id: 'u-c', email: 'carol@huawei.com', role: 'someone_else', regionId: '' },
    ],
    { regions: [{ id: 'apac', label: '亚太区' }, { id: 'hq', label: '机关' }], depts: [] },
  );
  try {
    assert.equal(database.applyRemaining(), null);
    const members = await prisma.member.findMany({ include: { domains: { orderBy: { position: 'asc' } } }, orderBy: { position: 'asc' } });
    assert.deepEqual(
      members.map((m) => [m.id, m.email, m.roleId, m.regionId, m.domains.map((d) => d.domainId), m.tokenVersion]),
      [
        ['u-a', 'alice@huawei.com', 'super_admin', 'apac', ['mkt', 'legal'], 0],
        ['u-b', 'bob@huawei.com', 'capability_ops', 'oceania', [], 0],
        ['u-c', 'carol@huawei.com', 'business_user', null, [], 0],
      ],
    );

    // 组织字典文档里有区域就以文档为准；成员引用的 oceania 补进字典
    const regions = await prisma.region.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] });
    assert.deepEqual(regions.map((r) => [r.id, r.name]), [['apac', '亚太区'], ['hq', '机关'], ['oceania', 'oceania']]);
    // 文档里领域是空数组，用默认字典；legal 补进字典
    const domains = await prisma.domain.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] });
    assert.equal(domains.length, 10);
    assert.ok(domains.some((d) => d.id === 'legal' && d.name === 'legal'));

    const roles = await prisma.role.findMany({ orderBy: { id: 'asc' } });
    assert.deepEqual(roles.map((r) => r.id), ['business_user', 'capability_ops', 'member', 'super_admin', 'viewer']);
    const viewerMenus = (await prisma.roleMenu.findMany({ where: { roleId: 'viewer' } })).map((r) => r.menuId);
    assert.ok(viewerMenus.includes('home'));
    assert.ok(!viewerMenus.includes('tools'));
    assert.ok(!viewerMenus.some((id) => id.startsWith('org-')));
    assert.equal(await prisma.roleMenu.count({ where: { roleId: 'super_admin' } }), 0);
    assert.ok((await prisma.roleMenu.findMany({ where: { roleId: 'capability_ops' } })).some((r) => r.menuId === 'approvals'));
  } finally {
    await prisma.$disconnect();
    await database.drop();
  }
});

test('迁移前检查：缺邮箱、邮箱大小写重复、多个超管都会停下并说明原因', async () => {
  const cases = [
    [[{ id: 'u-x', email: null }], /成员缺少邮箱.*u-x/],
    [[{ id: 'u-x', email: 'Same@huawei.com' }, { id: 'u-y', email: 'same@huawei.com' }], /邮箱转小写后重复.*same@huawei\.com/],
    [[{ id: 'u-x', email: 'x@huawei.com', role: 'super_admin' }, { id: 'u-y', email: 'y@huawei.com', role: 'workspace_admin' }], /超级管理员只能有一个/],
  ];
  for (const [index, [members, message]] of cases.entries()) {
    const { database, prisma } = await legacyDatabase(`rbac_preflight_${index}`, members);
    try {
      assert.match(database.applyRemaining() ?? '', message);
    } finally {
      await prisma.$disconnect();
      await database.drop();
    }
  }
});

let database;
let prisma;

before(async () => {
  database = await createTestDatabase('rbac_members');
  prisma = new PrismaClient({ datasourceUrl: database.url });
});

after(async () => {
  await prisma?.$disconnect();
  await database?.drop();
});

beforeEach(async () => {
  for (const table of ['member_domain', 'member', 'collection_revision']) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
});

const member = (over = {}) => ({ id: 'u-a', name: 'A', email: 'a@huawei.com', role: 'business_user', deptIds: [], regionId: null, ...over });

test('数据库层：可以有多个超管，大写邮箱写不进去', async () => {
  await prisma.member.create({ data: { id: 'u-a', name: 'A', email: 'a@huawei.com', roleId: 'super_admin' } });
  await prisma.member.create({ data: { id: 'u-b', name: 'B', email: 'b@huawei.com', roleId: 'super_admin' } });
  await assert.rejects(prisma.member.create({ data: { id: 'u-c', name: 'C', email: 'C@huawei.com' } }), /member_email_lowercase/);
});

test('成员表保存：领域走关联表，返回形状不变', async () => {
  const saved = await writeMembersDoc(prisma, {
    revision: 0,
    members: [member({ deptIds: ['hr', 'mkt', 'hr'], regionId: 'europe', role: 'viewer' })],
  });
  assert.equal(saved.revision, 1);
  assert.deepEqual(
    saved.members.map(({ lastActive: _lastActive, ...rest }) => rest),
    [{ id: 'u-a', name: 'A', email: 'a@huawei.com', role: 'viewer', avatar: 'bg-zinc-600', status: 'active', deptIds: ['hr', 'mkt'], regionId: 'europe' }],
  );
  assert.deepEqual((await readMembersDoc(prisma)).members[0].deptIds, ['hr', 'mkt']);
});

test('成员表保存：字典外的角色 / 区域 / 领域、缺邮箱都拒绝；可以保存多个超管', async () => {
  const rejects = async (members, message) =>
    assert.rejects(writeMembersDoc(prisma, { revision: 0, members }), (error) => {
      assert.match(String(error.response?.message ?? error.message), message);
      return true;
    });
  await rejects([member({ role: 'boss' })], /unknown_role_boss/);
  await rejects([member({ regionId: 'mars' })], /unknown_region_mars/);
  await rejects([member({ deptIds: ['legal'] })], /unknown_domain_legal/);
  await rejects([member({ email: '' })], /email_required/);
  assert.equal(await prisma.member.count(), 0);
  await writeMembersDoc(prisma, {
    revision: 0,
    members: [member({ role: 'super_admin' }), member({ id: 'u-b', email: 'b@huawei.com', role: 'super_admin' })],
  });
  assert.equal(await prisma.member.count({ where: { roleId: 'super_admin' } }), 2);
});

test('成员表保存：一次保存里交接超管、互换邮箱都能成功，改角色的成员令牌版本加一', async () => {
  await writeMembersDoc(prisma, {
    revision: 0,
    members: [member({ role: 'super_admin' }), member({ id: 'u-b', name: 'B', email: 'b@huawei.com' })],
  });
  const saved = await writeMembersDoc(prisma, {
    revision: 1,
    members: [
      member({ email: 'b@huawei.com', role: 'capability_ops' }),
      member({ id: 'u-b', name: 'B', email: 'a@huawei.com', role: 'super_admin' }),
    ],
  });
  assert.deepEqual(saved.members.map((m) => [m.id, m.email, m.role]), [
    ['u-a', 'b@huawei.com', 'capability_ops'],
    ['u-b', 'a@huawei.com', 'super_admin'],
  ]);
  const versions = await prisma.member.findMany({ select: { id: true, tokenVersion: true }, orderBy: { id: 'asc' } });
  assert.deepEqual(versions.map((m) => m.tokenVersion), [1, 1]);
});
