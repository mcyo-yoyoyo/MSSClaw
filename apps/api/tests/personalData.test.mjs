// 第 5 期个人数据：收藏 / 最近浏览 / 隐藏按登录人逐条读写，收藏数与收藏表同一事务更新。跑在临时 PG schema 上。
import assert from 'node:assert/strict';
import test, { after, before, beforeEach } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { MeController } from '../dist/persistence/me.controller.js';
import { PersistenceService, MAX_FAVORITES } from '../dist/persistence/persistence.service.js';
import { PlatformDocsController } from '../dist/persistence/platform-docs.controller.js';
import { PlatformDocsService } from '../dist/persistence/platform-docs.service.js';
import { replaceAssets } from '../dist/persistence/asset-catalog.js';
import { ensureWorkspace } from '../dist/workspaces/workspace-setting.js';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';

let database;
let prisma;
const TOOL_COUNT = MAX_FAVORITES + 2;

before(async () => {
  database = await createTestDatabase('personal_data');
  prisma = new PrismaClient({ datasourceUrl: database.url });
  await ensureWorkspace(prisma);
  await replaceAssets(prisma, 'tool', Array.from({ length: TOOL_COUNT }, (_, index) => ({
    id: `tool-${index}`, name: `工具 ${index}`, desc: '', category: 'external', author: 't',
    published: true, icon: 'fa-cube', tags: [],
  })));
});

after(async () => {
  await prisma?.$disconnect();
  await database?.drop();
});

beforeEach(async () => {
  for (const table of ['market_favorite', 'market_recent_view', 'market_hidden_item', 'market_engagement_stat', 'market_engagement_event']) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
});

/** 按 token 认人的控制器：token 就是成员 id */
function controllerFor() {
  const docs = { me: async (token) => (token ? { ok: true, user: { id: token } } : { ok: false, error: '未登录' }) };
  return new MeController(prisma, new PersistenceService(prisma), docs);
}
const as = (memberId) => `Bearer ${memberId}`;
const favoriteBody = (id, extra = {}) => ({ id, kind: 'external', assetType: 'tool', title: `工具 ${id}`, ...extra });
const favoritesCount = async (contentId) =>
  (await prisma.marketEngagement.findUnique({ where: { contentId } }))?.favorites ?? 0;

test('收藏一次计一次：重复收藏不加数，取消减一，行为事实只记状态变化', async () => {
  const me = controllerFor();
  const first = await me.favorite(favoriteBody('tool-0'), as('u-a'));
  assert.deepEqual(first.items.map((item) => item.id), ['tool-0']);
  assert.equal(first.engagement.favorites, 1);
  await me.favorite(favoriteBody('tool-0'), as('u-a'));
  assert.equal(await favoritesCount('tool-0'), 1);

  const removed = await me.unfavorite('external', 'tool-0', 'tool', as('u-a'));
  assert.deepEqual(removed.items, []);
  assert.equal(await favoritesCount('tool-0'), 0);
  const actions = (await prisma.marketEngagementEvent.findMany({ orderBy: { occurredAt: 'asc' } })).map((event) => event.action);
  assert.deepEqual(actions, ['favorite', 'request:favorite', 'favorite_cancel']);
});

test('各人的收藏互不可见；未登录读写都被拒绝', async () => {
  const me = controllerFor();
  await me.favorite(favoriteBody('tool-1'), as('u-a'));
  assert.deepEqual((await me.favorites(as('u-b'))).items, []);
  await assert.rejects(me.favorites(undefined), { name: 'UnauthorizedException' });
  await assert.rejects(me.favorite(favoriteBody('tool-1'), undefined), { name: 'UnauthorizedException' });
});

test('旧收藏没有资产类型时，带类型收藏同一资产视为同一条，保留备注和收藏时间', async () => {
  const createdAt = new Date('2026-01-01T00:00:00Z');
  await prisma.marketFavorite.create({
    data: { memberId: 'u-a', shelfKind: 'external', assetType: '', assetId: 'tool-2', contentId: 'tool-2', title: '旧', note: '常用', createdAt },
  });
  const result = await controllerFor().favorite(favoriteBody('tool-2'), as('u-a'));
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].assetType, 'tool');
  assert.equal(result.items[0].note, '常用');
  assert.equal(result.items[0].at, createdAt.getTime());
});

test(`收藏超过 ${MAX_FAVORITES} 条时淘汰最早的，计数随之减一`, async () => {
  const me = controllerFor();
  for (let index = 0; index <= MAX_FAVORITES; index += 1) {
    await me.favorite(favoriteBody(`tool-${index}`), as('u-a'));
  }
  const items = (await me.favorites(as('u-a'))).items;
  assert.equal(items.length, MAX_FAVORITES);
  assert.equal(items.some((item) => item.id === 'tool-0'), false, '最早的被淘汰');
  assert.equal(await favoritesCount('tool-0'), 0);
  assert.equal(await favoritesCount(`tool-${MAX_FAVORITES}`), 1);
});

test('资产已下架删除后，收藏清单里的旧条目仍能移除', async () => {
  await prisma.marketFavorite.create({
    data: { memberId: 'u-a', shelfKind: 'external', assetType: 'tool', assetId: 'tool-gone', contentId: 'tool-gone', title: '已删除工具' },
  });
  const result = await controllerFor().unfavorite('external', 'tool-gone', 'tool', as('u-a'));
  assert.deepEqual(result.items, []);
});

test('改备注只改这一条，不动计数', async () => {
  const me = controllerFor();
  await me.favorite(favoriteBody('tool-3'), as('u-a'));
  const result = await me.note({ id: 'tool-3', kind: 'external', assetType: 'tool', note: '写周报用' }, as('u-a'));
  assert.equal(result.items[0].note, '写周报用');
  assert.equal(await favoritesCount('tool-3'), 1);
});

test('最近浏览：同一资产只留一条且最新在前，最多 12 条', async () => {
  const me = controllerFor();
  for (let index = 0; index < 14; index += 1) {
    await me.view({ id: `tool-${index}`, kind: 'external', assetType: 'tool', title: `工具 ${index}` }, as('u-a'));
  }
  await me.view({ id: 'tool-5', kind: 'external', assetType: 'tool', title: '工具 5' }, as('u-a'));
  const items = (await me.recent(as('u-a'))).items;
  assert.equal(items.length, 12);
  assert.equal(items[0].id, 'tool-5');
  assert.equal(items.filter((item) => item.id === 'tool-5').length, 1);
});

test('隐藏：重复隐藏只留一条', async () => {
  const me = controllerFor();
  await me.hide('external', 'tool-4', as('u-a'));
  const result = await me.hide('external', 'tool-4', as('u-a'));
  assert.deepEqual(result.keys, ['external:tool-4']);
});

test('Skill 评价只读：读取来自评价表，整份写入被拒绝', async () => {
  await prisma.skillReview.create({
    data: { id: 'rev-1', skillId: 'skill-1', memberId: 'u-a', memberName: 'A', rating: 5, content: '好用', createdAt: new Date() },
  });
  const docs = new PlatformDocsService(prisma, {});
  const doc = await docs.getDoc('ws-cn-marketing', 'skill-reviews');
  assert.equal(doc.payload.bySkillId['skill-1'][0].text, '好用');
  const controller = new PlatformDocsController({ me: async () => ({ ok: true, user: { id: 'u-a', platformRole: 'super_admin' } }) });
  await assert.rejects(controller.putOne('skill-reviews', { payload: {} }, 'Bearer t'), /skill_reviews_legacy_read_only/);
});
