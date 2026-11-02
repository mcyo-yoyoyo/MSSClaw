import assert from 'node:assert/strict';
import test, { after, before, beforeEach } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { orgScopeWhere, readAssets, replaceAssets } from '../dist/persistence/asset-catalog.js';
import { PersistenceService } from '../dist/persistence/persistence.service.js';
import { PlatformDocsService } from '../dist/persistence/platform-docs.service.js';
import { CatalogController } from '../dist/persistence/catalog.controller.js';
import { AdminController } from '../dist/persistence/admin.controller.js';
import { ensureSuperAdmin } from '../dist/persistence/rbac-store.js';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';

process.env.JWT_SECRET = 'test-jwt-secret';

const TAG_MIGRATION = '20261030020000_asset_org_tags';

let database;
let prisma;

before(async () => {
  database = await createTestDatabase('asset_org_tags');
  prisma = new PrismaClient({ datasourceUrl: database.url });
});

after(async () => {
  await prisma?.$disconnect();
  await database?.drop();
});

beforeEach(async () => {
  for (const table of ['agent', 'skill', 'refresh_token', 'member_credential', 'member_domain', 'member', 'collection_revision']) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
});

const skill = (id, extra = {}) => ({
  id, name: id, desc: '', category: 'office', command: `/${id}`, author: 't',
  version: '1.0', connector: '', published: true, invokes: 0, icon: 'fa-puzzle-piece', tags: [], ...extra,
});
const agent = (id, extra = {}) => ({
  id, name: id, desc: '', category: 'office', bizLine: '', homeTag: 'mkt', author: 't',
  published: true, invokes: 0, skillIds: [], chatId: `chat-${id}`, icon: 'fa-robot', color: 'rose', ...extra,
});

const reason = (promise) =>
  promise.then(
    () => 'resolved',
    (error) => `${error.getStatus?.()}:${error.message}`,
  );

async function saveSkills(skills) {
  await prisma.$transaction((tx) => replaceAssets(tx, 'skill', skills));
}

test('迁移：JSON 标签搬进关联表，区域数组优先、空数组回落单值，字典缺的补进字典', async () => {
  const legacy = await createTestDatabase('asset_org_tags_migrate', { stopBefore: TAG_MIGRATION });
  const db = new PrismaClient({ datasourceUrl: legacy.url });
  try {
    const insertSkill = (id, position, regionIds, regionId, deptIds) =>
      db.$executeRawUnsafe(
        `INSERT INTO "skill" ("id", "position", "name", "description", "category", "command", "author", "version", "connector",
           "published", "icon", "tags", "owner_region_ids", "owner_region_id", "owner_dept_ids", "updated_at")
         VALUES ($1, $2, $1, '', 'office', '/x', 't', '1.0', '', true, 'fa', '[]', $3::jsonb, $4, $5::jsonb, now())`,
        id, position, regionIds === null ? null : JSON.stringify(regionIds), regionId, deptIds === null ? null : JSON.stringify(deptIds),
      );
    await insertSkill('s-array', 0, ['apac', 'atlantis', ' apac '], 'europe', ['mkt', '', 'mkt', 'hr']);
    await insertSkill('s-single', 1, [], 'europe', null);
    await insertSkill('s-none', 2, null, '  ', []);
    await db.$executeRawUnsafe(
      `INSERT INTO "agent" ("id", "position", "name", "description", "category", "biz_line", "home_tag", "author", "published",
         "chat_id", "icon", "color", "owner_region_ids", "owner_dept_ids", "updated_at")
       VALUES ('a-1', 0, 'a', '', 'office', '', 'mkt', 't', true, 'c', 'fa', 'rose', '["latam"]', '["legal"]', now())`,
    );

    assert.equal(legacy.applyRemaining(), null);
    const skills = await readAssets(db, 'skill');
    assert.deepEqual(
      skills.map((s) => [s.id, s.ownerRegionIds, s.ownerRegionId, s.ownerDeptIds]),
      [
        ['s-array', ['apac', 'atlantis'], 'apac', ['mkt', 'hr']],
        ['s-single', ['europe'], 'europe', undefined],
        ['s-none', undefined, undefined, undefined],
      ],
    );
    const [agentRow] = await readAssets(db, 'agent');
    assert.deepEqual([agentRow.ownerRegionIds, agentRow.ownerDeptIds], [['latam'], ['legal']]);
    assert.equal((await db.region.findUnique({ where: { id: 'atlantis' } }))?.name, 'atlantis');
    assert.equal((await db.domain.findUnique({ where: { id: 'legal' } }))?.name, 'legal');
    const columns = await db.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name IN ('skill', 'agent') AND column_name LIKE 'owner_%'`,
    );
    assert.deepEqual(columns, []);
  } finally {
    await db.$disconnect();
    await legacy.drop();
  }
});

test('读写：标签按顺序读回，同一份快照再写不重写行，未知区域领域 400', async () => {
  await saveSkills([
    skill('s-1', { ownerRegionIds: ['europe', 'apac', 'europe'], ownerDeptIds: ['hr', 'mkt'] }),
    skill('s-2', { ownerRegionId: 'latam', ownerRegionIds: [] }),
    skill('s-3', { ownerRegionIds: null, ownerDeptIds: null }),
  ]);
  const stored = await readAssets(prisma, 'skill');
  assert.deepEqual(
    stored.map((s) => [s.id, s.ownerRegionIds, s.ownerRegionId, s.ownerDeptIds]),
    [
      ['s-1', ['europe', 'apac'], 'europe', ['hr', 'mkt']],
      ['s-2', ['latam'], 'latam', undefined],
      ['s-3', undefined, undefined, undefined],
    ],
  );

  const stamps = async () => (await prisma.skill.findMany({ orderBy: { id: 'asc' } })).map((s) => s.updatedAt.getTime());
  const beforeStamps = await stamps();
  await saveSkills(stored);
  assert.deepEqual(await stamps(), beforeStamps);

  await prisma.$transaction((tx) => replaceAssets(tx, 'agent', [agent('a-1', { ownerRegionIds: ['mea'], ownerDeptIds: ['service'] })]));
  const [storedAgent] = await readAssets(prisma, 'agent');
  assert.deepEqual([storedAgent.ownerRegionIds, storedAgent.ownerRegionId, storedAgent.ownerDeptIds], [['mea'], undefined, ['service']]);

  assert.equal(await reason(saveSkills([skill('s-x', { ownerRegionIds: ['mars'] })])), '400:invalid_skill:s-x:unknown_region_mars');
  assert.equal(await reason(saveSkills([skill('s-x', { ownerDeptIds: ['ghost'] })])), '400:invalid_skill:s-x:unknown_domain_ghost');
  assert.equal(await reason(saveSkills([skill('s-x', { ownerDeptIds: [1] })])), '400:invalid_skill:s-x:ownerDeptIds_must_be_strings');
  assert.equal(await reason(saveSkills([skill('s-x', { ownerRegionId: 3 })])), '400:invalid_skill:s-x:ownerRegionId_must_be_string');
});

/** 过滤矩阵用的资产：id 说明它的标签 */
const MATRIX = [
  skill('any'),
  skill('apac', { ownerRegionIds: ['apac'] }),
  skill('europe', { ownerRegionIds: ['europe'] }),
  skill('mkt', { ownerDeptIds: ['mkt'] }),
  skill('apac+mkt', { ownerRegionIds: ['apac', 'europe'], ownerDeptIds: ['hr', 'mkt'] }),
  skill('apac+legal', { ownerRegionIds: ['apac'], ownerDeptIds: ['legal'] }),
  skill('private-any', { visibility: 'private' }),
  skill('own-europe-private', { ownerRegionIds: ['europe'], visibility: 'private', publisherUserId: 'u-me' }),
  skill('org-any', { visibility: 'org' }),
];

async function visibleIds(viewer) {
  return (await readAssets(prisma, 'skill', orgScopeWhere(viewer))).map((s) => s.id).sort();
}

test('过滤：区域、领域都要命中，没打标签的不限；私有只给发布方；没区域没领域只看不限的', async () => {
  await prisma.domain.upsert({ where: { id: 'legal' }, create: { id: 'legal', name: '法务' }, update: {} });
  await saveSkills(MATRIX);
  assert.deepEqual(
    await visibleIds({ id: 'u-me', regionId: 'apac', domainIds: ['mkt'] }),
    ['any', 'apac', 'apac+mkt', 'mkt', 'org-any', 'own-europe-private'],
  );
  assert.deepEqual(await visibleIds({ id: 'u-other', regionId: 'europe', domainIds: ['hr'] }), ['any', 'apac+mkt', 'europe', 'org-any']);
  assert.deepEqual(await visibleIds({ id: 'u-other', regionId: null, domainIds: ['mkt'] }), ['any', 'mkt', 'org-any']);
  assert.deepEqual(await visibleIds({ id: 'u-other', regionId: 'apac', domainIds: [] }), ['any', 'apac', 'org-any']);
  assert.deepEqual(await visibleIds(null), ['any', 'org-any']);
});

test('目录接口：按登录人过滤、超管不过滤、带了无效令牌 401；写要有对应配置菜单', async () => {
  await prisma.domain.upsert({ where: { id: 'legal' }, create: { id: 'legal', name: '法务' }, update: {} });
  await saveSkills(MATRIX);
  await prisma.$transaction((tx) =>
    replaceAssets(tx, 'agent', [agent('a-apac', { ownerRegionIds: ['apac'] }), agent('a-europe', { ownerRegionIds: ['europe'] })]),
  );
  await ensureSuperAdmin(prisma, { email: 'admin@huawei.com', password: 'admin654321' });
  await new AdminController(prisma).createUser({
    name: 'U', email: 'u@huawei.com', roleId: 'business_user', regionId: 'apac', domainIds: ['mkt'], password: 'user-pass',
  });

  const docs = new PlatformDocsService(prisma, { recordDailyLogin: async () => {} });
  const login = async (email, password) => `Bearer ${(await docs.login({ email, password })).token}`;
  const userAuth = await login('u@huawei.com', 'user-pass');
  const adminAuth = await login('admin@huawei.com', 'admin654321');
  const catalog = new CatalogController(new PersistenceService(prisma), docs, prisma);
  const ids = (result, key) => result[key].map((item) => item.id).sort();

  assert.deepEqual(ids(await catalog.list('skills', userAuth), 'skills'), ['any', 'apac', 'apac+mkt', 'mkt', 'org-any']);
  assert.deepEqual(ids(await catalog.list('agents', userAuth), 'agents'), ['a-apac']);
  assert.deepEqual(ids(await catalog.list('skills'), 'skills'), ['any', 'org-any']);
  assert.equal((await catalog.list('skills', adminAuth)).skills.length, MATRIX.length);
  assert.equal(await reason(catalog.getOne('skills', 'europe', userAuth)), '404:catalog_not_found');
  assert.equal((await catalog.getOne('skills', 'europe', adminAuth)).id, 'europe');
  assert.equal(await reason(catalog.list('skills', 'Bearer not.a.jwt')), '401:会话已过期，请重新登录');

  assert.equal(await reason(catalog.create('skills', skill('new'))), '401:unauthorized');
  // 业务用户默认没有能力配置菜单；给了只读也不能写
  const menus = (await prisma.roleMenu.findMany({ where: { roleId: 'business_user' } })).map((m) => m.menuId);
  assert.equal(await reason(catalog.create('skills', skill('new'), userAuth)), '403:menu_forbidden:skills');
  await new AdminController(prisma).setRoleMenus('business_user', { menuIds: [...menus, 'skills', 'kb'], editMenuIds: menus });
  assert.equal(await reason(catalog.create('skills', skill('new'), userAuth)), '403:menu_forbidden:skills');
  assert.equal(await reason(catalog.remove('kb-docs', 'x', userAuth)), '403:menu_forbidden:kb');
  const created = await catalog.create('skills', skill('new', { ownerRegionIds: ['europe'] }), adminAuth);
  assert.deepEqual(created.ownerRegionIds, ['europe']);
  await new AdminController(prisma).setRoleMenus('business_user', { menuIds: menus });
});
