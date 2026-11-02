import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PersistenceService } from '../dist/persistence/persistence.service.js';
import { diffOfficeScenes, listOperationLogs } from '../dist/persistence/operation-log.js';
import { ensureWorkspace } from '../dist/workspaces/workspace-setting.js';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';

const WS = 'ws-cn-marketing';
const actor = { name: 'Admin', email: 'admin@huawei.com', role: 'super_admin', deptIds: [], regionId: null };
let database;
let prisma;
let service;

const skill = (id, extra = {}) => ({
  id, name: id, desc: '', category: 'office', command: `/${id}`, author: 't',
  version: '1.0', connector: '', published: false, invokes: 0, icon: 'fa-puzzle-piece', tags: [], ...extra,
});

before(async () => {
  database = await createTestDatabase('operation_log');
  prisma = new PrismaClient({ datasourceUrl: database.url });
  service = new PersistenceService(prisma);
});

after(async () => {
  await prisma?.$disconnect();
  await database?.drop();
});

beforeEach(async () => {
  for (const table of ['agent_skill', 'skill_version', 'agent', 'skill', 'tool', 'automation', 'kb_document', 'audit_log']) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
  await ensureWorkspace(prisma);
});

test('目录增删改记下操作人和对象', async () => {
  await service.createCatalogItem('skills', skill('skill-a', { name: '评分采集' }), actor);
  await service.updateCatalogItem('skills', 'skill-a', skill('skill-a', { name: '评分采集 v2' }), actor);
  await service.deleteCatalogItem('skills', 'skill-a', actor);

  const logs = await listOperationLogs(prisma);
  assert.deepEqual(logs.map((item) => [item.action, item.targetName, item.userName, item.userEmail]), [
    ['delete', '评分采集 v2', 'Admin', 'admin@huawei.com'],
    ['update', '评分采集 v2', 'Admin', 'admin@huawei.com'],
    ['create', '评分采集', 'Admin', 'admin@huawei.com'],
  ]);

});

test('只调整顺序不记成修改；改名才记修改', async () => {
  const first = {
    skills: [skill('skill-a', { name: '甲' }), skill('skill-b', { name: '乙' })],
    agents: [],
    automations: [],
    kbDocs: [],
  };
  await service.putMarketplace(WS, first, actor);
  const created = (await listOperationLogs(prisma)).length;
  await service.putMarketplace(WS, first, actor);
  assert.equal((await listOperationLogs(prisma)).length, created, '内容没变时不追加日志');
  await service.putMarketplace(WS, {
    skills: [skill('skill-b', { name: '乙' }), skill('skill-a', { name: '甲' })],
    agents: [],
    automations: [],
    kbDocs: [],
  }, actor);
  assert.deepEqual((await listOperationLogs(prisma, { module: 'skill' })).map((item) => item.action), ['create', 'create']);

  await service.putMarketplace(WS, {
    skills: [skill('skill-b', { name: '乙改' }), skill('skill-a', { name: '甲' })],
    agents: [],
    automations: [],
    kbDocs: [],
  }, actor);
  const latest = (await listOperationLogs(prisma, { module: 'skill' }))[0];
  assert.equal(latest.detail, '修改了Skill「乙改」');
});

test('办公场景：增删改按条目记，只换顺序记一条', () => {
  const base = [
    { id: 'a', label: '写报告', visible: true },
    { id: 'b', label: '查制度', visible: true },
  ];
  assert.deepEqual(diffOfficeScenes(base, [...base].reverse()).map((item) => item.detail), ['调整了办公场景的排列顺序']);
  assert.deepEqual(
    diffOfficeScenes(base, [{ ...base[0], label: '写周报' }, base[1]]).map((item) => [item.action, item.name]),
    [['update', '写周报']],
  );
  assert.deepEqual(
    diffOfficeScenes(base, [base[0]]).map((item) => [item.action, item.name]),
    [['delete', '查制度']],
  );
});
