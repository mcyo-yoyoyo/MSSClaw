// 第 3 期资产表：快照拆行写入、读回原样、校验与删除约束。全部跑在临时 PG schema 上。
import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PersistenceService } from '../dist/persistence/persistence.service.js';
import { CenterRecordService } from '../dist/centers/center-record.service.js';
import { PortalAnalyticsService } from '../dist/persistence/portal-analytics.service.js';
import { prepareAssets, readAssets, replaceAssets } from '../dist/persistence/asset-catalog.js';
import { ensureWorkspace } from '../dist/workspaces/workspace-setting.js';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';

const WS = 'ws-cn-marketing';
let database;
let prisma;

before(async () => {
  database = await createTestDatabase('asset_tables');
  prisma = new PrismaClient({ datasourceUrl: database.url });
});

after(async () => {
  await prisma?.$disconnect();
  await database?.drop();
});

beforeEach(async () => {
  for (const table of ['agent_skill', 'skill_version', 'agent', 'skill', 'tool', 'automation', 'kb_document', 'center_record', 'app_setting']) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
  await ensureWorkspace(prisma);
});

const skill = (id, extra = {}) => ({
  id, name: id, desc: '', category: 'office', command: `/${id}`, author: 't',
  version: '1.0', connector: '', published: false, invokes: 0, icon: 'fa-puzzle-piece', tags: [], ...extra,
});
const agent = (id, skillIds = [], extra = {}) => ({
  id, name: id, desc: '', category: 'office', bizLine: '', homeTag: 'mkt', author: 't',
  published: true, invokes: 0, skillIds, chatId: `chat-${id}`, icon: 'fa-robot', color: 'rose', ...extra,
});
const tool = (id, extra = {}) => ({
  id, name: id, desc: '', category: 'external', author: 't', published: true, invokes: 0, icon: 'fa-cube', tags: [], ...extra,
});

test('快照写入后原样读回：顺序、详情、版本、编排都保留，空值不输出', async () => {
  const skills = [
    skill('skill-b', {
      cases: [{ title: '案例' }],
      envInfo: { framework: 'node' },
      versions: [
        { version: '2.0', status: 'active', packageBlob: { id: 'b2', url: '/api/v1/blobs/b2', name: 'b2.zip', size: 2, uploadedAt: 'x' } },
        { version: '1.0', status: 'retired' },
      ],
      createdAt: '2026-09-01',
      ownerRegionId: null,
    }),
    skill('skill-a'),
  ];
  const agents = [agent('agent-1', ['skill-a', 'skill-b', 'skill-a'], { capabilities: ['写作'], systemPrompt: '人设' })];
  await prisma.$transaction(async (tx) => {
    await replaceAssets(tx, 'skill', skills);
    await replaceAssets(tx, 'agent', agents);
  });

  const storedSkills = await readAssets(prisma, 'skill');
  assert.deepEqual(storedSkills.map((item) => item.id), ['skill-b', 'skill-a']);
  const { ownerRegionId: _dropped, ...expectedB } = skills[0];
  assert.deepEqual(storedSkills[0], expectedB);
  assert.equal('ownerRegionId' in storedSkills[0], false);

  const [storedAgent] = await readAssets(prisma, 'agent');
  assert.deepEqual(storedAgent.skillIds, ['skill-a', 'skill-b'], '编排去重，保留首次出现的顺序');
  assert.deepEqual(storedAgent.capabilities, ['写作']);
  assert.equal(storedAgent.systemPrompt, '人设');
});

test('只重写有变化的行；从快照里去掉的行连同子表一起删除', async () => {
  await replaceAssets(prisma, 'skill', [skill('keep'), skill('drop', { versions: [{ version: '1.0' }] })]);
  const before = await prisma.skill.findUnique({ where: { id: 'keep' } });
  await new Promise((resolve) => setTimeout(resolve, 20));
  await replaceAssets(prisma, 'skill', [skill('keep')]);
  const after = await prisma.skill.findUnique({ where: { id: 'keep' } });
  assert.equal(after.updatedAt.getTime(), before.updatedAt.getTime(), '内容和位置都没变的行不重写');
  assert.equal(await prisma.skill.count({ where: { id: 'drop' } }), 0);
  assert.equal(await prisma.skillVersion.count(), 0, 'Skill 删除时版本级联删除');
});

test('校验：未知字段、必填缺失、类型不符、重复 id、重复版本号都在写库前拒绝', () => {
  assert.throws(() => prepareAssets('tool', [tool('t1', { surprise: 1 })]), /invalid_tool:t1:unknown_field_surprise/);
  const { author: _author, ...noAuthor } = tool('t2');
  assert.throws(() => prepareAssets('tool', [noAuthor]), /invalid_tool:t2:author_required/);
  assert.throws(() => prepareAssets('tool', [tool('t3', { externalSortOrder: '3' })]), /externalSortOrder_must_be_int/);
  assert.throws(() => prepareAssets('tool', [tool('t4'), tool('t4')]), /duplicate_id/);
  assert.throws(
    () => prepareAssets('skill', [skill('s1', { versions: [{ version: '1.0' }, { version: '1.0' }] })]),
    /duplicate_version_1\.0/,
  );
});

test('货架删掉 Agent 后，中心接口和看板目录都不再有它；省略的列表保持不变', async () => {
  const service = new PersistenceService(prisma);
  await service.putMarketplace(WS, { agents: [agent('agent-keep'), agent('agent-drop')], skills: [], automations: [], kbDocs: [] });
  await service.putMarketplace(WS, { agents: [agent('agent-keep')] });

  const centers = new CenterRecordService(prisma);
  assert.deepEqual((await centers.list(WS, 'agent')).map((item) => item.id), ['agent-keep']);
  const catalog = await new PortalAnalyticsService(prisma).readAssetCatalog(WS);
  assert.equal(catalog.some((row) => row.contentId === 'agent-drop'), false);

  await service.putMarketplace(WS, { skills: [skill('skill-new')] });
  assert.deepEqual((await readAssets(prisma, 'agent')).map((item) => item.id), ['agent-keep'], '没带 agents 列表时不动 Agent');
});

test('删除下架 Skill：同时从 Agent 编排摘掉，审批记录不动', async () => {
  const service = new PersistenceService(prisma);
  await service.putMarketplace(WS, {
    skills: [skill('skill-delete'), skill('skill-other')],
    agents: [agent('agent-keep', ['skill-delete', 'skill-other'])],
  });
  await prisma.centerRecord.create({
    data: {
      id: `doc-asset-approvals-${WS}`,
      kind: 'doc:asset-approvals',
      payload: { items: [{ kind: 'skill', assetId: 'skill-delete', status: 'approved' }] },
    },
  });

  await service.putMarketplace(WS, { skills: [skill('skill-other')] });

  assert.deepEqual((await readAssets(prisma, 'skill')).map((item) => item.id), ['skill-other']);
  assert.deepEqual((await readAssets(prisma, 'agent'))[0].skillIds, ['skill-other']);
  const approvals = await prisma.centerRecord.findUnique({ where: { id: `doc-asset-approvals-${WS}` } });
  assert.equal(approvals.payload.items.length, 1);
  assert.deepEqual(await new CenterRecordService(prisma).list(WS, 'skill').then((items) => items.map((item) => item.id)), ['skill-other']);
});

for (const state of [{ published: true }, { pending: true }]) {
  test(`拒绝删除 ${JSON.stringify(state)} 的 Skill，原记录不变`, async () => {
    const service = new PersistenceService(prisma);
    await service.putMarketplace(WS, { skills: [skill('skill-delete', { published: Boolean(state.published) })] });
    if (state.pending) {
      await prisma.centerRecord.create({
        data: {
          id: `doc-asset-approvals-${WS}`,
          kind: 'doc:asset-approvals',
          payload: { items: [{ kind: 'skill', assetId: 'skill-delete', status: 'pending' }] },
        },
      });
    }
    await assert.rejects(service.putMarketplace(WS, { skills: [] }), /仅可删除已下架/);
    assert.deepEqual((await readAssets(prisma, 'skill')).map((item) => item.id), ['skill-delete']);
  });
}

test('旧版 Agent Studio：改人设写回系统提示词，推进状态提示去货架运营', async () => {
  await replaceAssets(prisma, 'agent', [agent('agent-1')]);
  const centers = new CenterRecordService(prisma);
  const updated = await centers.updatePayload(WS, 'agent', 'agent-1', { persona: '新的人设' });
  assert.equal(updated.persona, '新的人设');
  assert.equal((await readAssets(prisma, 'agent'))[0].systemPrompt, '新的人设');
  await assert.rejects(centers.updatePayload(WS, 'agent', 'agent-1', { status: 'online' }), /货架运营/);
  await assert.rejects(centers.advanceAgentStatus(WS, 'agent-1'), /货架运营/);
});

test('全新库第一次读取工具目录：用内置清单播种，且每条都通过资产表校验', async () => {
  const service = new PersistenceService(prisma);
  const catalog = await service.getGlobalTools();
  assert.ok(catalog.tools.length > 50);
  assert.equal(catalog.initialized, false);
  assert.ok(catalog.externalCatalogVersion);
  // 再读一次不重复播种
  assert.equal((await service.getGlobalTools()).tools.length, catalog.tools.length);
});

test('PUT /tools 整份替换并标记已初始化，GET /marketplace 的 tools 来自工具表', async () => {
  const service = new PersistenceService(prisma);
  const saved = await service.putGlobalTools({ tools: [tool('tool-b'), tool('tool-a'), tool('tool-b')] });
  assert.deepEqual(saved.tools.map((item) => item.id), ['tool-b', 'tool-a'], '重复 id 只保留第一条');
  assert.equal(saved.initialized, true);
  const marketplace = await service.getMarketplace(WS);
  assert.deepEqual(marketplace.tools.map((item) => item.id), ['tool-b', 'tool-a']);
});
