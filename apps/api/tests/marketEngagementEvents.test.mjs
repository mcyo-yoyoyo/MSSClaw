import assert from 'node:assert/strict';
import test from 'node:test';
import { PersistenceService } from '../dist/persistence/persistence.service.js';

function engagementHarness(
  initialInteraction = null,
  { metricExists = true, knownContent = true, workspaceExists = true, centerRows } = {},
) {
  let metric = metricExists ? {
    workspaceId: 'ws-test',
    contentId: 'tool-1',
    views: 0,
    uses: 0,
    likes: 0,
    dislikes: 0,
    downloads: 0,
    favorites: 0,
    updatedAt: new Date(),
  } : null;
  let interaction = initialInteraction;
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
    marketUserInteraction: {
      findUnique: async () => interaction,
      upsert: async ({ create, update }) => {
        interaction = interaction ? { ...interaction, ...update } : { ...create };
        return interaction;
      },
    },
    marketEngagementEvent: {
      updateMany: async ({ where, data }) => {
        const event = events.find(
          (item) => item.workspaceId === where.workspaceId && item.eventId === where.eventId,
        );
        if (event) Object.assign(event, data);
        return { count: event ? 1 : 0 };
      },
    },
    $executeRaw: async (_strings, ...values) => {
      const [id, workspaceId, eventId, contentId, action, dateKey, visitorHash, occurredAt] = values;
      if (eventIds.has(`${workspaceId}:${eventId}`)) return 0;
      eventIds.add(`${workspaceId}:${eventId}`);
      events.push({ id, workspaceId, eventId, contentId, action, dateKey, visitorHash, occurredAt });
      return 1;
    },
  };
  const prisma = {
    workspace: { findUnique: async () => workspaceExists ? ({ id: 'ws-test' }) : null },
    centerRecord: {
      findUnique: async () => null,
      findMany: async () => centerRows ?? (knownContent
        ? [{ id: 'marketplace-ws-test', kind: 'marketplace', payload: { tools: [{ id: 'tool-1' }] } }]
        : []),
    },
    marketEngagement: { findUnique: async () => metric && ({ ...metric }) },
    marketEngagementEvent: { deleteMany: async () => ({ count: 0 }) },
    $transaction: async (operation) => operation(tx),
  };

  return {
    service: new PersistenceService(prisma),
    getMetric: () => metric,
    events,
    getInteraction: () => interaction,
  };
}

test('view and use counters write matching behavior facts in the same workspace', async () => {
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
  assert.ok(harness.events.every((event) => event.workspaceId === 'ws-test'));
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
  });
  await harness.service.mutateMarketEngagement('ws-test', 'tool-1', {
    action: 'favorite',
    userId: 'user-1',
    active: true,
    eventId: 'event-favorite-2',
  });
  await harness.service.mutateMarketEngagement('ws-test', 'tool-1', {
    action: 'favorite',
    userId: 'user-1',
    active: false,
    eventId: 'event-favorite-3',
  });

  assert.equal(harness.getMetric().favorites, 0);
  assert.deepEqual(harness.events.map((event) => event.action), [
    'favorite',
    'request:favorite',
    'request:favorite',
  ]);
  assert.equal(harness.getInteraction().favorited, false);
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
  assert.equal(harness.getInteraction().vote, 'dislike');
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

test('legacy JSON migration imports only current catalog content and ignores forged keys', async () => {
  const upserts = [];
  let normalizedPayload = null;
  const legacyRow = {
    id: 'doc-content-engagement-ws-test',
    payload: {
      byId: {
        'tool-1': { views: 7, likes: 2 },
        forged: { views: 999999, likes: 999999 },
      },
    },
  };
  const prisma = {
    workspace: { findUnique: async () => ({ id: 'ws-test' }) },
    centerRecord: {
      findUnique: async () => legacyRow,
      findMany: async () => [
        {
          id: 'marketplace-ws-test',
          kind: 'marketplace',
          payload: { tools: [{ id: 'tool-1' }] },
        },
      ],
      update: async ({ data }) => {
        normalizedPayload = data.payload;
        return { ...legacyRow, payload: data.payload };
      },
    },
    marketEngagement: {
      upsert: async (input) => {
        upserts.push(input);
        return input.create;
      },
    },
    $transaction: async (operations) => Promise.all(operations),
  };

  await new PersistenceService(prisma).ensureLegacyMarketEngagementMigrated('ws-test');

  assert.deepEqual(upserts.map((input) => input.create.contentId), ['tool-1']);
  assert.equal(upserts[0].create.views, 7);
  assert.equal(upserts[0].create.likes, 2);
  assert.match(normalizedPayload.normalizedAt, /^\d{4}-\d{2}-\d{2}T/);
});
