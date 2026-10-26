import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Prisma } from '@prisma/client';
import { CaseInsightsService } from '../dist/persistence/case-insights.service.js';
import { CaseInsightsController } from '../dist/persistence/case-insights.controller.js';
import { portalAnalyticsDateKey, shiftPortalAnalyticsDateKey } from '../dist/persistence/portal-analytics-time.js';

test('published case reads use the single-platform event shape and retain idempotency', async () => {
  const events = new Map();
  const service = new CaseInsightsService({
    caseInsightArticle: { findFirst: async () => ({ publishedHtml: '<article>Case</article>' }) },
    marketEngagementEvent: { create: async ({ data }) => {
      if (events.has(data.eventId)) throw new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' });
      events.set(data.eventId, data);
    } },
  });
  await service.recordRead('article-a', 'reader-a', 'event-0001');
  await service.recordRead('article-a', 'reader-a', 'event-0001');
  await service.recordRead('article-a', 'reader-a', 'event-0002');
  assert.equal(events.size, 2);
  const event = events.get('case-read:event-0001');
  assert.equal(event.contentId, 'article-a');
  assert.equal(event.assetType, 'case-insight');
  assert.equal(event.action, 'case_read');
  assert.equal(event.dateKey, portalAnalyticsDateKey());
  assert.equal(event.visitorHash.length, 64);
  assert.equal('workspaceId' in event, false);
  assert.equal(event.visitorHash, events.get('case-read:event-0002').visitorHash);
});

test('invalid events and unavailable articles cannot create read events', async () => {
  let created = 0;
  const service = new CaseInsightsService({
    caseInsightArticle: { findFirst: async ({ where }) => {
      assert.deepEqual(where, { id: 'missing', status: 'published', deletedAt: null });
      return null;
    } },
    marketEngagementEvent: { create: async () => { created++; } },
  });
  await assert.rejects(service.recordRead('missing', 'reader', 'bad'), error => error.getStatus() === 400);
  await assert.rejects(service.recordRead('missing', 'reader', 'event-0001'), error => error.getStatus() === 404);
  assert.equal(created, 0);
});

test('read report deduplicates readers, preserves lifetime counts, and fills empty days', async () => {
  const end = portalAnalyticsDateKey();
  const start = shiftPortalAnalyticsDateKey(end, -2);
  const old = shiftPortalAnalyticsDateKey(start, -1);
  const groups = [
    { contentId: 'a', dateKey: old, visitorHash: 'u1', _count: { _all: 3 } },
    { contentId: 'a', dateKey: start, visitorHash: 'u1', _count: { _all: 2 } },
    { contentId: 'a', dateKey: end, visitorHash: 'u1', _count: { _all: 1 } },
    { contentId: 'b', dateKey: end, visitorHash: 'u1', _count: { _all: 1 } },
    { contentId: 'b', dateKey: end, visitorHash: 'u2', _count: { _all: 1 } },
  ];
  const service = new CaseInsightsService({ marketEngagementEvent: {
    groupBy: async ({ where }) => {
      assert.deepEqual(where, { assetType: 'case-insight', action: 'case_read' });
      return groups;
    },
    findFirst: async () => ({ occurredAt: new Date(old + 'T00:00:00Z') }),
  } });
  const report = await service.readReport(start, end);
  assert.deepEqual(report.totals, { pv: 5, uv: 2, articles: 2 });
  assert.equal(report.timezone, 'Asia/Shanghai');
  assert.equal(report.series.length, 3);
  assert.deepEqual(report.series[1], { date: shiftPortalAnalyticsDateKey(start, 1), pv: 0, uv: 0 });
  const article = report.items.find(item => item.id === 'a');
  assert.equal(article.pv, 3);
  assert.equal(article.uv, 1);
  assert.deepEqual(article.lifetime, { pv: 6, uv: 1 });
});

test('invalid report dates are rejected before querying storage', async () => {
  const service = new CaseInsightsService({});
  const today = portalAnalyticsDateKey();
  for (const [from, to] of [
    ['2026-02-30', today], ['bad', today], [today, 'bad'],
    [today, shiftPortalAnalyticsDateKey(today, 1)],
    [shiftPortalAnalyticsDateKey(today, 1), today],
    [shiftPortalAnalyticsDateKey(today, -90), today],
  ]) await assert.rejects(service.readReport(from, to), error => error.getStatus() === 400);
});

test('read reports require an admin and recording requires a logged-in user', async () => {
  let calls = 0;
  const articles = { readReport: async () => { calls++; return {}; }, recordRead: async () => { calls++; return { ok: true }; } };
  const anonymous = new CaseInsightsController(articles, { me: async () => ({ ok: false }) });
  await assert.rejects(anonymous.reads(undefined, undefined), error => error.getStatus() === 401);
  await assert.rejects(anonymous.recordRead('a', { eventId: 'event-0001' }), error => error.getStatus() === 401);
  const member = new CaseInsightsController(articles, { me: async () => ({ ok: true, user: { id: 'u', platformRole: 'user' } }) });
  await assert.rejects(member.reads(undefined, undefined), error => error.getStatus() === 403);
  await member.recordRead('a', { eventId: 'event-0001' });
  const admin = new CaseInsightsController(articles, { me: async () => ({ ok: true, user: { id: 'u', platformRole: 'super_admin' } }) });
  await admin.reads(undefined, undefined);
  assert.equal(calls, 2);
});
