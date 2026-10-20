// 第 6 期：会话按登录人隔离、模型 Key 加密落库、审计保留期、快讯归档，以及 migrate:remaining 端到端。跑在临时 PG schema 上。
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after, before, beforeEach } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { importChats, readChats, writeChats } from '../dist/persistence/chat-session-store.js';
import { readLlmConfigDoc, writeLlmConfigDoc } from '../dist/persistence/llm-config-store.js';
import { appendAuditDoc } from '../dist/persistence/operations-store.js';
import { readAiNewsArchive, writeAiNewsArchive } from '../dist/persistence/ai-news-archive.service.js';
import { PersistenceController } from '../dist/persistence/persistence.controller.js';
import { PersistenceService } from '../dist/persistence/persistence.service.js';
import { replaceAssets } from '../dist/persistence/asset-catalog.js';
import { ensureWorkspace } from '../dist/workspaces/workspace-setting.js';
import { centerRecord, centerRecordTableExists, ensureCenterRecordTable } from '../scripts/lib/center-record.mjs';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';

const API_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SECRET = 'remaining-tables-test-secret';
process.env.LLM_KEY_SECRET = SECRET;

let database;
let prisma;

before(async () => {
  database = await createTestDatabase('remaining_tables');
  prisma = new PrismaClient({ datasourceUrl: database.url });
});

after(async () => {
  await prisma?.$disconnect();
  await database?.drop();
});

beforeEach(async () => {
  for (const table of [
    'chat_session', 'llm_model_config', 'audit_log', 'ai_news_feed_item', 'app_setting', 'collection_revision',
    'office_scene', 'execution', 'ai_knowledge_draft', 'market_engagement_stat', 'tool',
  ]) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS center_record');
});

const chat = (id, extra = {}) => ({
  id, title: id, type: 'bot', icon: 'fa-robot', color: 'rose', status: '', history: [], prompts: [], ...extra,
});
const warRoom = (id, memberIds) =>
  chat(id, { type: 'group', members: memberIds.map((memberId) => ({ id: memberId, name: memberId, role: 'member', canUseAi: true })) });

test('会话：个人任务只见自己的，WarRoom 只见自己在成员里的；看不见的会话 PUT 也动不了', async () => {
  await writeChats(prisma, 'u-a', { p1: chat('p1'), w1: warRoom('w1', ['u-a', 'u-b']), w2: warRoom('w2', ['u-c']) });
  assert.deepEqual(Object.keys(await readChats(prisma, 'u-a')).sort(), ['p1', 'w1']);
  assert.deepEqual(Object.keys(await readChats(prisma, 'u-b')), ['w1']);

  // u-b 伪造 u-a 的个人任务、并且 body 里没带 w2：都不影响别人的数据
  await writeChats(prisma, 'u-b', { w1: warRoom('w1', ['u-a', 'u-b']), p1: chat('p1', { title: '伪造', ownerUserId: 'u-b' }) });
  const p1 = await prisma.chatSession.findUnique({ where: { id: 'p1' } });
  assert.equal(p1.ownerUserId, 'u-a');
  assert.equal(p1.title, 'p1');
  assert.notEqual(await prisma.chatSession.findUnique({ where: { id: 'w2' } }), null);

  // 看得见但 body 里没有的才删除
  await writeChats(prisma, 'u-a', { w1: warRoom('w1', ['u-a', 'u-b']) });
  assert.equal(await prisma.chatSession.findUnique({ where: { id: 'p1' } }), null);
  assert.equal(await prisma.chatSession.count(), 2);
});

test('会话：没有 owner 的旧个人任务谁先保存就归谁', async () => {
  await importChats(prisma, { legacy: chat('legacy') });
  assert.deepEqual(Object.keys(await readChats(prisma, 'u-b')), ['legacy']);
  await writeChats(prisma, 'u-a', await readChats(prisma, 'u-a'));
  assert.equal((await prisma.chatSession.findUnique({ where: { id: 'legacy' } })).ownerUserId, 'u-a');
  assert.deepEqual(await readChats(prisma, 'u-b'), {});
});

test('会话接口未登录读写都拒绝', async () => {
  const controller = new PersistenceController(new PersistenceService(prisma), {}, { me: async () => ({ ok: false }) });
  await assert.rejects(controller.getSessions(undefined), { name: 'UnauthorizedException' });
  await assert.rejects(controller.putSessions({ chats: {} }, undefined), { name: 'UnauthorizedException' });
});

test('模型 Key 加密落库、读出解密；没有 LLM_KEY_SECRET 时拒绝保存明文 Key', async () => {
  const config = {
    model: 'm1', defaultModelId: 'm1', baseUrl: 'https://llm.example/v1', apiKey: 'sk-top',
    platformModels: [{ id: 'm1', label: 'M1', baseUrl: 'https://llm.example/v1', apiKey: 'sk-m1', enabled: true }],
    customModels: [],
  };
  assert.deepEqual(await writeLlmConfigDoc(prisma, config), config);
  const row = await prisma.llmModelConfig.findFirst();
  assert.match(row.apiKey, /^enc:v1:/);
  assert.match((await prisma.appSetting.findUnique({ where: { settingKey: 'llm-selection' } })).value.apiKey, /^enc:v1:/);

  delete process.env.LLM_KEY_SECRET;
  try {
    await assert.rejects(
      writeLlmConfigDoc(prisma, { ...config, platformModels: [{ ...config.platformModels[0], apiKey: 'sk-new' }] }),
      /LLM_KEY_SECRET/,
    );
  } finally {
    process.env.LLM_KEY_SECRET = SECRET;
  }
  assert.equal((await readLlmConfigDoc(prisma)).platformModels[0].apiKey, 'sk-m1');
});

test('审计只收 180 天内的条目，写入时顺手清掉过期的', async () => {
  const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  await prisma.auditLog.create({
    data: { entryId: 'old-row', occurredAt: daysAgo(200), category: 'c', action: 'a', module: 'm', detail: '', actorName: 'x' },
  });
  const entry = (id, at) => ({ id, at: at.toISOString(), category: 'c', action: 'a', module: 'm', detail: '', userName: 'x' });
  const result = await appendAuditDoc(prisma, { logs: [entry('new', daysAgo(1)), entry('too-old', daysAgo(181)), entry('new', daysAgo(1))] });
  assert.deepEqual(result.logs.map((log) => log.id), ['new']);
});

test('快讯归档：条目进表、同步状态进设置；只记失败状态时条目不动', async () => {
  const item = { id: 'aihot-1', publishedAt: '2026-10-01T00:00:00.000Z', dateLabel: '10/1·周三', title: 't', summary: '', url: 'https://x', score: 8 };
  await writeAiNewsArchive(prisma, { items: [item], updatedAt: '2026-10-01T00:00:00.000Z', lastSyncAt: '2026-10-01T00:00:00.000Z', lastSyncVia: 'direct' });
  const archive = await readAiNewsArchive(prisma);
  await writeAiNewsArchive(prisma, { ...archive, lastSyncError: 'fetch failed' });
  const after = await readAiNewsArchive(prisma);
  assert.deepEqual(after.items, [item]);
  assert.equal(after.lastSyncError, 'fetch failed');
  assert.equal(after.lastSyncVia, 'direct');
});

function runMigration(...args) {
  const result = spawnSync(process.execPath, ['scripts/migrate-remaining.mjs', ...args], {
    cwd: API_DIR,
    env: { ...process.env, DATABASE_URL: database.url, LLM_KEY_SECRET: SECRET },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

test('migrate:remaining：预览不改数据；执行后全部入表、删掉 center_record；再跑一次无害', async () => {
  // 全新库上 migrate deploy 已把空的过渡表删掉，第 2 期脚本写入前会重建（这里模拟）
  assert.equal(await centerRecordTableExists(prisma), false);
  await ensureCenterRecordTable(prisma);
  await ensureWorkspace(prisma);
  const workspace = await prisma.appSetting.findUnique({ where: { settingKey: 'workspace' } });
  await prisma.appSetting.update({
    where: { settingKey: 'workspace' },
    data: { value: { ...workspace.value, catalog: { workspace: { id: 'ws' }, chats: { c1: chat('c1', { ownerUserId: 'u-a' }) } } } },
  });
  await replaceAssets(prisma, 'tool', [{ id: 'tool-1', name: '工具', desc: '', category: 'external', author: 't', published: true, icon: 'fa-cube', tags: [] }]);
  const doc = (kind, payload) => ({ id: `doc-${kind}-ws-cn-marketing`, kind: `doc:${kind}`, payload });
  await centerRecord(prisma).createMany({
    data: [
      doc('home-featured', { version: 1, revision: 2, channels: { external: ['tool-1'], internal: [], projects: [] } }),
      doc('internal-office-scenes', {
        version: 1, revision: 5,
        entries: [{ id: 'meeting', label: '会议', english: 'Meeting', description: 'd', icon: 'fa-calendar', visible: true, toolIds: ['tool-1'], toolBlurbs: { 'tool-1': '记纪要' } }],
      }),
      doc('llm-config', {
        model: 'm1', defaultModelId: 'm1', baseUrl: '', apiKey: '',
        platformModels: [{ id: 'm1', label: 'M1', baseUrl: 'https://llm.example/v1', apiKey: 'sk-m1', enabled: true }], customModels: [],
      }),
      doc('content-engagement', { byId: { 'tool-1': { views: 7, likes: 2 }, forged: { views: 999 } } }),
      doc('inbox', { messages: [{ id: 'old-msg', title: '旧通知', body: '', kind: 'system', fromName: 'x', toUserId: '*', createdAt: '2026-07-01T00:00:00.000Z' }] }),
      doc('ai-news-prefs', { byUser: {} }),
      {
        id: 'exec-1', kind: 'execution',
        payload: { id: 'exec-1', workspaceId: 'ws-cn-marketing', chatId: 'c1', message: 'hi', agentType: 'knowledge', agentName: 'A', status: 'done', source: 'llm', startedAt: '2026-10-01T00:00:00.000Z', usage: { inputTokens: 3, outputTokens: 4 } },
      },
      {
        id: 'ai-knowledge-draft:x:y:draft-1', kind: 'ai-knowledge-draft',
        payload: { id: 'draft-1', ownerKey: 'user:u-a', scenarioId: 'S1', originalQuestion: 'q', demand: {}, messages: [], clarificationCount: 0, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' },
      },
    ],
  });

  const preview = runMigration();
  assert.match(preview, /预览完成/);
  assert.doesNotMatch(preview, /不一致/);
  assert.equal(await centerRecordTableExists(prisma), true);
  assert.equal(await prisma.officeScene.count(), 0);

  const applied = runMigration('--apply');
  assert.match(applied, /center_record 已删除/);
  assert.equal(await centerRecordTableExists(prisma), false);
  assert.equal((await prisma.appSetting.findUnique({ where: { settingKey: 'home-featured' } })).value.revision, 2);
  assert.equal((await prisma.collectionRevision.findUnique({ where: { collection: 'internal-office-scenes' } })).revision, 5);
  assert.equal((await prisma.officeScene.findUnique({ where: { id: 'meeting' } })).toolBlurb, '记纪要');
  assert.match((await prisma.llmModelConfig.findFirst()).apiKey, /^enc:v1:/);
  assert.equal((await readLlmConfigDoc(prisma)).platformModels[0].apiKey, 'sk-m1');
  assert.equal((await prisma.marketEngagement.findUnique({ where: { contentId: 'tool-1' } })).views, 7);
  assert.equal(await prisma.marketEngagement.findUnique({ where: { contentId: 'forged' } }), null);
  assert.equal(await prisma.inboxMessageRecord.findUnique({ where: { id: 'old-msg' } }), null, '旧站内信文档只列出不并入');
  const execution = await prisma.execution.findUnique({ where: { id: 'exec-1' } });
  assert.equal(execution.assetId, 'chat:c1', '早期记录补上资产默认值');
  assert.equal(execution.inputTokens, 3);
  assert.equal((await prisma.aiKnowledgeDraft.findUnique({ where: { id: 'draft-1' } })).ownerMemberId, 'u-a');
  assert.equal((await prisma.chatSession.findUnique({ where: { id: 'c1' } })).ownerUserId, 'u-a');
  assert.equal('chats' in (await prisma.appSetting.findUnique({ where: { settingKey: 'workspace' } })).value.catalog, false);

  assert.match(runMigration('--apply'), /无需执行/);
});

test('migrate:remaining：有不认识的记录或目标表已有数据时停下，不改数据', async () => {
  await ensureCenterRecordTable(prisma);
  await centerRecord(prisma).createMany({ data: [{ id: 'mystery', kind: 'mystery-kind', payload: {} }] });
  let result = spawnSync(process.execPath, ['scripts/migrate-remaining.mjs', '--apply'], {
    cwd: API_DIR, env: { ...process.env, DATABASE_URL: database.url, LLM_KEY_SECRET: SECRET }, encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /不认识的记录/);

  await centerRecord(prisma).deleteMany({ where: { id: { in: ['mystery'] } } });
  await prisma.officeScene.create({ data: { id: 's', position: 0, label: 'l', english: 'e', description: 'd', icon: 'i', visible: true } });
  result = spawnSync(process.execPath, ['scripts/migrate-remaining.mjs', '--apply'], {
    cwd: API_DIR, env: { ...process.env, DATABASE_URL: database.url, LLM_KEY_SECRET: SECRET }, encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /目标表不是空的/);
  assert.equal(await centerRecordTableExists(prisma), true);
});
