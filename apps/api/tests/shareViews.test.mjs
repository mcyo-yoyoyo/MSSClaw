// 分享链接第 2 期：详情页直达（detail_direct）埋点、案例接入埋点、看板「详情浏览数 / 分享浏览数」。全部跑在临时 PG schema 上。
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { PersistenceController } from '../dist/persistence/persistence.controller.js';
import { PersistenceService } from '../dist/persistence/persistence.service.js';
import { PortalAnalyticsService } from '../dist/persistence/portal-analytics.service.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { replaceAssets } from '../dist/persistence/asset-catalog.js';
import { portalAnalyticsDateKey, shiftPortalAnalyticsDateKey } from '../dist/persistence/portal-analytics-time.js';
import { ensureWorkspace } from '../dist/workspaces/workspace-setting.js';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';

const WS = 'ws-cn-marketing';
const TOOL_ID = 'tool-share-ext';
const CASE_PUBLISHED = '11111111-1111-4111-8111-111111111111';
const CASE_DRAFT = '22222222-2222-4222-8222-222222222222';
const CASE_DELETED = '33333333-3333-4333-8333-333333333333';
let database;
let previousDatabaseUrl;
let prisma;
let controller;
let eventSeq = 0;

before(async () => {
  database = await createTestDatabase('share_views');
  previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = database.url;
  prisma = new PrismaService();
  await prisma.onModuleInit();
  await ensureWorkspace(prisma);
  await replaceAssets(prisma, 'tool', [
    { id: TOOL_ID, name: '外部工具', desc: '', category: 'external', marketShelf: 'external', author: 'test', published: true, icon: 'fa-cube', tags: [] },
  ]);
  const article = (id, extra) => ({
    id, title: `草稿-${id.slice(0, 4)}`, domainIds: [], tags: [], draftMarkdown: '', ...extra,
  });
  await prisma.caseInsightArticle.createMany({
    data: [
      article(CASE_PUBLISHED, { status: 'published', publishedTitle: '线上案例', publishedHtml: '<p>x</p>', publishedAt: new Date() }),
      article(CASE_DRAFT, { status: 'draft' }),
      article(CASE_DELETED, { status: 'published', publishedTitle: '已删案例', publishedHtml: '<p>x</p>', deletedAt: new Date(), deletedFromStatus: 'published' }),
    ],
  });
  // 游客：会话校验一律未登录
  controller = new PersistenceController(new PersistenceService(prisma), {}, { me: async () => ({ ok: false }) });
});

after(async () => {
  await prisma?.$disconnect().catch(() => undefined);
  if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousDatabaseUrl;
  await database?.drop();
});

/** 每次换一个游客，避开单访客限流 */
function guestRecord(contentId, action, assetType) {
  eventSeq += 1;
  const n = String(eventSeq).padStart(12, '0');
  return controller.mutateMarketEngagement(contentId, {
    action,
    assetType,
    eventId: `event-share-${n}`,
    visitorId: `guest:00000000-0000-4000-8000-${n}`,
  });
}

test('游客可以记 detail_direct；分享浏览也是一次浏览', async () => {
  const result = await guestRecord(TOOL_ID, 'detail_direct', 'tool');
  assert.equal(result.engagement.views, 1);
  const events = await prisma.marketEngagementEvent.findMany({ where: { contentId: TOOL_ID } });
  assert.deepEqual(events.map((e) => [e.action, e.assetType, e.visitorType]), [['detail_direct', 'tool', 'guest']]);
});

test('案例接入埋点：已发布的案例可记，未发布、已删除的案例拒绝', async () => {
  await guestRecord(CASE_PUBLISHED, 'detail', 'case');
  assert.equal(await prisma.marketEngagementEvent.count({ where: { contentId: CASE_PUBLISHED, action: 'detail', assetType: 'case' } }), 1);
  for (const id of [CASE_DRAFT, CASE_DELETED]) {
    await assert.rejects(guestRecord(id, 'detail_direct', 'case'), (error) => error?.getStatus?.() === 404, id);
  }
});

test('看板资产明细：详情浏览数 = detail + detail_direct，分享浏览数 = detail_direct，只算所选区间；案例单独成行', async () => {
  await guestRecord(TOOL_ID, 'detail', 'tool');
  await guestRecord(TOOL_ID, 'detail', 'tool');
  await guestRecord(CASE_PUBLISHED, 'detail_direct', 'case');
  // 区间外的分享浏览不计；历史累计再大也不参与取较大值
  const today = portalAnalyticsDateKey();
  await prisma.marketEngagementEvent.create({
    data: { contentId: TOOL_ID, assetType: 'tool', action: 'detail_direct', dateKey: shiftPortalAnalyticsDateKey(today, -10), visitorType: 'guest' },
  });
  await prisma.marketEngagement.update({ where: { contentId: TOOL_ID }, data: { views: 500 } });

  const report = await new PortalAnalyticsService(prisma).getReport(WS, 7);
  const row = (id) => report.assets.rows.find((item) => item.contentId === id);
  // 工具：第 1 条测试的 1 次直达 + 2 次平台内
  assert.equal(row(TOOL_ID).detailPv, 3);
  assert.equal(row(TOOL_ID).sharePv, 1);
  assert.equal(row(CASE_PUBLISHED).assetType, 'case');
  assert.equal(row(CASE_PUBLISHED).name, '线上案例');
  assert.equal(row(CASE_PUBLISHED).detailPv, 2);
  assert.equal(row(CASE_PUBLISHED).sharePv, 1);
  assert.equal(row(CASE_DRAFT), undefined);
  assert.equal(row(CASE_DELETED), undefined);
  // 资产数以货架为准，不含案例；总览趋势照旧只算工具 / Skill / Agent，直达计入浏览
  assert.equal(report.assets.summary.total, 1);
  assert.equal(report.behavior.totals.views, 3);
});
