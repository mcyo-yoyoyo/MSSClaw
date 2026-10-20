import assert from 'node:assert/strict';
import test from 'node:test';
import { PersistenceService } from '../dist/persistence/persistence.service.js';

/** 资产在资产表里：用例仍用 marketplace 形状描述内容，这里转成各资产表的替身 */
function assetModels(rows) {
  const marketplace = rows.find((row) => row.kind === 'marketplace')?.payload ?? {};
  const model = (key) => ({
    findMany: async () => (marketplace[key] ?? []).map((item) => ({ id: item.id })),
  });
  return {
    tool: model('tools'),
    skill: model('skills'),
    agent: model('agents'),
    automation: model('automations'),
    kbDocument: model('kbDocs'),
  };
}

function engagementHarness(
  initialVote = null,
  { metricExists = true, knownContent = true, workspaceExists = true, centerRows } = {},
) {
  let metric = metricExists ? {
    contentId: 'tool-1',
    views: 0,
    uses: 0,
    likes: 0,
    dislikes: 0,
    downloads: 0,
    favorites: 0,
    updatedAt: new Date(),
  } : null;
  let vote = initialVote;
  let favorites = [];
  const matches = (row, where) => Object.entries(where).every(([key, value]) =>
    value && typeof value === 'object' && 'in' in value ? value.in.includes(row[key]) : row[key] === value);
  const events = [];
  const eventIds = new Set();

  const tx = {
    marketEngagement: {
      findUnique: async () => metric && ({ ...metric }),
      upsert: async ({ create }) => {
        if (!metric) {
          metric = {
            ...create,
            views: 0,
            uses: 0,
            likes: 0,
            dislikes: 0,
            downloads: 0,
            favorites: 0,
            updatedAt: new Date(),
          };
        }
        return { ...metric };
      },
      update: async ({ data }) => {
        for (const [field, operation] of Object.entries(data)) {
          if (operation && typeof operation === 'object' && 'increment' in operation) {
            metric[field] += operation.increment;
          }
        }
        metric.updatedAt = new Date();
        return { ...metric };
      },
    },
    marketUserVote: {
      findUnique: async () => vote,
      upsert: async ({ create, update }) => {
        vote = vote ? { ...vote, ...update } : { ...create };
        return vote;
      },
    },
    marketFavorite: {
      count: async ({ where }) => favorites.filter((row) => matches(row, where)).length,
      findFirst: async ({ where }) => favorites.find((row) => matches(row, where)) ?? null,
      findMany: async ({ where, skip = 0 }) => favorites.filter((row) => matches(row, where)).slice(skip),
      deleteMany: async ({ where }) => {
        favorites = favorites.filter((row) => !matches(row, where));
      },
      create: async ({ data }) => favorites.push({ ...data }),
      update: async ({ where, data }) => {
        const key = where.memberId_shelfKind_assetType_assetId;
        const row = favorites.find((item) => matches(item, key));
        Object.assign(row, data);
        return row;
      },
    },
    marketEngagementEvent: {
      updateMany: async ({ where, data }) => {
        const event = events.find((item) => item.eventId === where.eventId);
        if (event) Object.assign(event, data);
        return { count: event ? 1 : 0 };
      },
      count: async ({ where }) => events.filter((item) => item.visitorHash === where.visitorHash).length,
      createMany: async ({ data: [row] }) => {
        if (eventIds.has(row.eventId)) return { count: 0 };
        eventIds.add(row.eventId);
        events.push({ ...row });
        return { count: 1 };
      },
    },
  };
  const contentRows = centerRows ?? (knownContent
    ? [{ id: 'marketplace-ws-test', kind: 'marketplace', payload: { tools: [{ id: 'tool-1' }] } }]
    : []);
  const prisma = {
    appSetting: { findUnique: async () => workspaceExists ? ({ value: { catalog: {} } }) : null },
    // 门户内容、办公场景、中心资源、案例在各自的表里；这些用例只用资产
    portalContent: { findMany: async () => [] },
    officeScene: { findMany: async () => [] },
    centerResource: { findMany: async () => [] },
    caseInsightArticle: { findMany: async () => [] },
    ...assetModels(contentRows),
    marketEngagement: { findUnique: async () => metric && ({ ...metric }) },
    marketEngagementEvent: { deleteMany: async () => ({ count: 0 }) },
    $transaction: async (operation) => operation(tx),
  };

  return {
    service: new PersistenceService(prisma),
    getMetric: () => metric,
    events,
    getVote: () => vote,
    getFavorites: () => favorites,
  };
}

test('view and use counters write matching behavior facts', async () => {
  const harness = engagementHarness();
  await harness.service.mutateMarketEngagement('ws-test', 'tool-1', {
    action: 'view',
    userId: '',
    eventId: 'event-view-1',
    visitorId: '00000000-0000-4000-8000-000000000001',
  });
  await harness.service.mutateMarketEngagement('ws-test', 'tool-1', {
    action: 'use',
    userId: '',
    eventId: 'event-use-01',
    visitorId: '00000000-0000-4000-8000-000000000001',
  });

  assert.equal(harness.getMetric().views, 1);
  assert.equal(harness.getMetric().uses, 1);
  assert.deepEqual(harness.events.map((event) => event.action), ['view', 'use']);
  assert.ok(harness.events.every((event) => event.contentId === 'tool-1'));
  assert.ok(harness.events.every((event) => /^\d{4}-\d{2}-\d{2}$/.test(event.dateKey)));
});

test('favorite facts count only transitions into the active state', async () => {
  const harness = engagementHarness();
  await harness.service.mutateMarketEngagement('ws-test', 'tool-1', {
    action: 'favorite',
    userId: 'user-1',
    active: true,
    eventId: 'event-favorite-1',
    favorite: { shelfKind: 'external', assetType: 'tool', assetId: 'tool-1', title: '工具 1' },
  });
  await harness.service.mutateMarketEngagement('ws-test', 'tool-1', {
    action: 'favorite',
    userId: 'user-1',
    active: true,
    eventId: 'event-favorite-2',
    favorite: { shelfKind: 'external', assetType: 'tool', assetId: 'tool-1', title: '工具 1' },
  });
  await harness.service.mutateMarketEngagement('ws-test', 'tool-1', {
    action: 'favorite',
    userId: 'user-1',
    active: false,
    eventId: 'event-favorite-3',
    favorite: { shelfKind: 'external', assetType: 'tool', assetId: 'tool-1', title: '工具 1' },
  });

  assert.equal(harness.getMetric().favorites, 0);
  assert.deepEqual(harness.events.map((event) => event.action), [
    'favorite',
    'request:favorite',
    'request:favorite',
  ]);
  assert.deepEqual(harness.getFavorites(), [], '取消后收藏表里不再有这一行');
});

test('vote facts count activation and switching, but not cancellation', async () => {
  const harness = engagementHarness();
  await harness.service.mutateMarketEngagement('ws-test', 'tool-1', {
    action: 'like',
    userId: 'user-1',
    eventId: 'event-like-001',
  });
  await harness.service.mutateMarketEngagement('ws-test', 'tool-1', {
    action: 'like',
    userId: 'user-1',
    eventId: 'event-like-002',
  });
  await harness.service.mutateMarketEngagement('ws-test', 'tool-1', {
    action: 'like',
    userId: 'user-1',
    eventId: 'event-like-003',
  });
  await harness.service.mutateMarketEngagement('ws-test', 'tool-1', {
    action: 'dislike',
    userId: 'user-1',
    eventId: 'event-dislike1',
  });

  assert.equal(harness.getMetric().likes, 0);
  assert.equal(harness.getMetric().dislikes, 1);
  assert.deepEqual(harness.events.map((event) => event.action), [
    'like',
    'request:like',
    'like',
    'dislike',
  ]);
  assert.equal(harness.getVote().vote, 'dislike');
});

test('replaying the same event id does not increment or append a second fact', async () => {
  const harness = engagementHarness(null, { metricExists: false });
  const input = {
    action: 'view',
    userId: '',
    eventId: 'event-replay-1',
    visitorId: '00000000-0000-4000-8000-000000000001',
  };

  await harness.service.mutateMarketEngagement('ws-test', 'tool-1', input);
  await harness.service.mutateMarketEngagement('ws-test', 'tool-1', input);

  assert.equal(harness.getMetric().views, 1);
  assert.equal(harness.events.length, 1);
  assert.equal(harness.events[0].action, 'view');
});

test('unknown workspace content is rejected before a metric or event row is created', async () => {
  const harness = engagementHarness(null, { metricExists: false, knownContent: false });
  await assert.rejects(
    harness.service.mutateMarketEngagement('ws-test', 'made-up-content', {
      action: 'view',
      userId: '',
      eventId: 'event-unknown-1',
      visitorId: '00000000-0000-4000-8000-000000000001',
    }),
    (error) => error?.getStatus?.() === 404,
  );
  assert.equal(harness.getMetric(), null);
  assert.equal(harness.events.length, 0);
});

test('malformed event dimensions return bad requests instead of throwing type errors', async () => {
  for (const [field, value, errorCode] of [
    ['assetType', {}, 'invalid_market_engagement_asset_type'],
    ['errorCode', [], 'invalid_market_engagement_error_code'],
    ['visitorId', 42, 'invalid_guest_visitor_id'],
  ]) {
    const harness = engagementHarness();
    await assert.rejects(
      harness.service.mutateMarketEngagement('ws-test', 'tool-1', {
        action: 'view',
        userId: '',
        eventId: `event-invalid-${field}`,
        visitorId: '00000000-0000-4000-8000-000000000001',
        [field]: value,
      }),
      (error) => {
        assert.equal(error?.getStatus?.(), 400);
        assert.equal(error?.getResponse?.().message, errorCode);
        return true;
      },
    );
    assert.equal(harness.events.length, 0);
  }
});

test('bundled static scenarios remain valid in a clean workspace before any metric exists', async () => {
  const harness = engagementHarness(null, { metricExists: false, knownContent: false });
  await harness.service.mutateMarketEngagement('ws-test', 'marketing-intel', {
    action: 'view',
    userId: '',
    eventId: 'event-static-01',
    visitorId: '00000000-0000-4000-8000-000000000001',
  });
  assert.equal(harness.getMetric().views, 1);
  assert.equal(harness.events[0].contentId, 'marketing-intel');
});

test('nested package blob ids are not accepted as marketplace content', async () => {
  const harness = engagementHarness(null, {
    metricExists: false,
    centerRows: [{
      id: 'marketplace-ws-test',
      kind: 'marketplace',
      payload: {
        agents: [{ id: 'agent-1', packageBlob: { id: 'blob-private-1' } }],
      },
    }],
  });

  await assert.rejects(
    harness.service.mutateMarketEngagement('ws-test', 'blob-private-1', {
      action: 'view',
      userId: '',
      eventId: 'event-blob-denied-1',
      visitorId: '00000000-0000-4000-8000-000000000001',
    }),
    (error) => error?.getStatus?.() === 404,
  );
  assert.equal(harness.getMetric(), null);
  assert.equal(harness.events.length, 0);
});

