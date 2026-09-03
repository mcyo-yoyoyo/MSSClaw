import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
  AuthController,
} from '../dist/persistence/platform-docs.controller.js';
import { PortalAnalyticsController } from '../dist/persistence/portal-analytics.controller.js';
import { PortalAnalyticsService } from '../dist/persistence/portal-analytics.service.js';

const VISITOR_UUID = '9f7b6b5a-35cc-4a9d-8a4e-79ef76c7248d';
const GUEST_VISITOR_ID = `guest:${VISITOR_UUID}`;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function analyticsStub() {
  const calls = { pageViews: [], gateHits: [], reports: [] };
  return {
    calls,
    recordPageView: async (input) => {
      calls.pageViews.push(input);
      return { accepted: true, date: '2026-08-28' };
    },
    recordGateHit: async (input) => {
      calls.gateHits.push(input);
      return { accepted: true, date: '2026-08-28' };
    },
    getReport: async (workspaceId, days, from, to) => {
      calls.reports.push({ workspaceId, days, from, to });
      return { ok: true };
    },
  };
}

function controllerWith(session = { ok: false, error: '未登录' }) {
  const analytics = analyticsStub();
  const docsCalls = [];
  const docs = {
    me: async (token, workspaceId) => {
      docsCalls.push({ token, workspaceId });
      return session;
    },
  };
  return {
    analytics,
    docsCalls,
    controller: new PortalAnalyticsController(analytics, docs),
  };
}

function recordingPrisma(queryRows, centerRows = [], globalToolsRow = null) {
  const executeCalls = [];
  const queryCalls = [];
  return {
    executeCalls,
    queryCalls,
    prisma: {
      centerRecord: {
        findMany: async () => centerRows,
        findUnique: async ({ where } = {}) =>
          where?.id === 'global-tools' ? globalToolsRow : null,
      },
      $executeRaw: async (strings, ...values) => {
        executeCalls.push({ sql: strings.join('?'), values });
        return 1;
      },
      $queryRaw: async (strings, ...values) => {
        const call = { sql: strings.join('?'), values };
        queryCalls.push(call);
        return queryRows ? queryRows(call) : [];
      },
    },
  };
}

function pageInput(overrides = {}) {
  return {
    workspaceId: 'ws-test',
    eventId: 'event-0001',
    routeKey: 'home',
    visitorType: 'guest',
    rawVisitorId: VISITOR_UUID,
    journeyVisitorId: VISITOR_UUID,
    clientIp: '203.0.113.10',
    ...overrides,
  };
}

test('anonymous page views require guest:<uuid-v4> and never resolve a session', async () => {
  const { controller, analytics, docsCalls } = controllerWith();

  await controller.recordPageView(
    'ws-test',
    undefined,
    undefined,
    { eventId: 'event-0001', routeKey: 'home', visitorId: GUEST_VISITOR_ID },
    '203.0.113.10',
  );

  assert.equal(docsCalls.length, 0);
  assert.deepEqual(analytics.calls.pageViews, [
    {
      workspaceId: 'ws-test',
      eventId: 'event-0001',
      routeKey: 'home',
      visitorType: 'guest',
      rawVisitorId: VISITOR_UUID,
      journeyVisitorId: VISITOR_UUID,
      clientIp: '203.0.113.10',
    },
  ]);
});

test('anonymous page views reject missing, unprefixed and non-v4 visitor IDs', async () => {
  for (const visitorId of [undefined, VISITOR_UUID, 'guest:00000000-0000-1000-8000-000000000000']) {
    const { controller, analytics } = controllerWith();
    await assert.rejects(
      controller.recordPageView(
        'ws-test',
        undefined,
        undefined,
        { eventId: 'event-0001', routeKey: 'home', visitorId },
        '203.0.113.10',
      ),
      (error) => error?.getStatus?.() === 400,
    );
    assert.equal(analytics.calls.pageViews.length, 0);
  }
});

test('analytics inputs reject non-string values as bad requests', async () => {
  for (const field of ['eventId', 'routeKey', 'rawVisitorId', 'journeyVisitorId']) {
    const db = recordingPrisma();
    const service = new PortalAnalyticsService(db.prisma);
    await assert.rejects(
      service.recordPageView(
        pageInput({ [field]: {} }),
      ),
      (error) => error?.getStatus?.() === 400,
    );
    assert.equal(db.executeCalls.length, 0);
  }

  for (const field of ['eventId', 'action', 'routeKey', 'visitorId']) {
    const db = recordingPrisma();
    const service = new PortalAnalyticsService(db.prisma);
    await assert.rejects(
      service.recordGateHit({
        workspaceId: 'ws-test',
        eventId: 'gate-00001',
        action: 'favorite',
        routeKey: 'market-tool',
        visitorId: VISITOR_UUID,
        [field]: {},
      }),
      (error) => error?.getStatus?.() === 400,
    );
    assert.equal(db.executeCalls.length, 0);
  }
});

test('a supplied token keeps the authenticated account identity and browser journey', async () => {
  const session = { ok: true, user: { id: 'user-42', platformRole: 'business_user' } };
  const { controller, analytics, docsCalls } = controllerWith(session);

  await controller.recordPageView(
    'ws-test',
    'Bearer token-ok',
    undefined,
    { eventId: 'event-0002', routeKey: 'task', visitorId: GUEST_VISITOR_ID },
    '203.0.113.11',
  );

  assert.deepEqual(docsCalls, [{ token: 'token-ok', workspaceId: 'ws-test' }]);
  assert.deepEqual(analytics.calls.pageViews[0], {
    workspaceId: 'ws-test',
    eventId: 'event-0002',
    routeKey: 'task',
    visitorType: 'user',
    rawVisitorId: 'user-42',
    journeyVisitorId: VISITOR_UUID,
    clientIp: '203.0.113.11',
  });
});

test('an invalid supplied token is not downgraded to a guest request', async () => {
  const { controller, analytics } = controllerWith({ ok: false, error: 'expired' });
  await assert.rejects(
    controller.recordPageView(
      'ws-test',
      'Bearer expired-token',
      undefined,
      { eventId: 'event-0003', routeKey: 'home', visitorId: GUEST_VISITOR_ID },
      '203.0.113.12',
    ),
    (error) => error?.getStatus?.() === 401,
  );
  assert.equal(analytics.calls.pageViews.length, 0);
});

test('gate hit endpoint validates the guest identity and forwards action, route and IP', async () => {
  const { controller, analytics } = controllerWith();
  await controller.recordGateHit(
    'ws-test',
    {
      eventId: 'gate-00001',
      action: 'favorite',
      routeKey: 'market-tool',
      visitorId: GUEST_VISITOR_ID,
    },
    '203.0.113.20',
  );
  assert.deepEqual(analytics.calls.gateHits[0], {
    workspaceId: 'ws-test',
    eventId: 'gate-00001',
    action: 'favorite',
    routeKey: 'market-tool',
    visitorId: VISITOR_UUID,
    clientIp: '203.0.113.20',
  });
});

test('analytics report remains restricted to super_admin', async () => {
  const viewer = controllerWith({ ok: true, user: { id: 'u1', platformRole: 'business_user' } });
  await assert.rejects(
    viewer.controller.getReport('ws-test', 'Bearer token', undefined, '7'),
    (error) => error?.getStatus?.() === 403,
  );
  assert.equal(viewer.analytics.calls.reports.length, 0);

  const admin = controllerWith({ ok: true, user: { id: 'admin', platformRole: 'super_admin' } });
  await admin.controller.getReport('ws-test', 'Bearer token', undefined, '30');
  assert.deepEqual(admin.analytics.calls.reports, [
    { workspaceId: 'ws-test', days: '30', from: undefined, to: undefined },
  ]);

  await admin.controller.getReport(
    'ws-test',
    'Bearer token',
    undefined,
    undefined,
    '2026-08-01',
    '2026-08-31',
  );
  assert.deepEqual(admin.analytics.calls.reports[1], {
    workspaceId: 'ws-test',
    days: undefined,
    from: '2026-08-01',
    to: '2026-08-31',
  });
});

test('page-view writes hash guest/account separately and share one browser journey hash', async () => {
  const guestDb = recordingPrisma();
  const guestService = new PortalAnalyticsService(guestDb.prisma);
  const guestResponse = await guestService.recordPageView(pageInput());
  const guestValues = guestDb.executeCalls[0].values;

  assert.equal(guestValues[4], sha256(`ws-test:guest:${VISITOR_UUID}`));
  assert.equal(guestValues[5], 'guest');
  assert.equal(guestValues[6], sha256(`ws-test:visitor:${VISITOR_UUID}`));
  assert.equal(guestValues.at(-1), 500);
  assert.match(guestDb.executeCalls[0].sql, /SELECT COUNT\(\*\)[\s\S]+visitorHash/);
  assert.deepEqual(guestResponse, { accepted: true, date: guestResponse.date });

  const userDb = recordingPrisma();
  const userService = new PortalAnalyticsService(userDb.prisma);
  await userService.recordPageView(
    pageInput({
      eventId: 'event-0002',
      visitorType: 'user',
      rawVisitorId: 'user-42',
    }),
  );
  const userValues = userDb.executeCalls[0].values;
  assert.equal(
    userValues[4],
    sha256('mss-claw:portal-uv:v1:ws-test:account:user-42'),
  );
  assert.equal(userValues[5], 'user');
  assert.equal(userValues[6], guestValues[6]);
});

test('the 61st visitor request in one minute is silently accepted without a write', async () => {
  const db = recordingPrisma();
  const service = new PortalAnalyticsService(db.prisma);
  let response;
  for (let index = 0; index < 61; index += 1) {
    response = await service.recordPageView(
      pageInput({ eventId: `event-${String(index).padStart(4, '0')}` }),
    );
  }
  assert.equal(db.executeCalls.length, 60);
  assert.equal(response.accepted, true);
  assert.equal(Object.hasOwn(response, 'dropped'), false);
  assert.equal(Object.hasOwn(response, 'duplicate'), false);
});

test('the coarse IP limiter silently stops writes across distinct visitors', async () => {
  const db = recordingPrisma();
  const service = new PortalAnalyticsService(db.prisma);
  for (let index = 0; index < 301; index += 1) {
    const visitorId = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
    await service.recordPageView(
      pageInput({
        eventId: `ip-event-${String(index).padStart(4, '0')}`,
        rawVisitorId: visitorId,
        journeyVisitorId: visitorId,
        clientIp: '198.51.100.8',
      }),
    );
  }
  assert.equal(db.executeCalls.length, 300);
});

test('authenticated page views are not silently dropped by anonymous sliding windows', async () => {
  const db = recordingPrisma();
  const service = new PortalAnalyticsService(db.prisma);
  for (let index = 0; index < 61; index += 1) {
    await service.recordPageView(
      pageInput({
        eventId: `user-event-${String(index).padStart(4, '0')}`,
        visitorType: 'user',
        rawVisitorId: 'user-42',
      }),
    );
  }
  assert.equal(db.executeCalls.length, 61);
});

test('gate events are whitelisted, idempotent and use the same journey hash', async () => {
  const db = recordingPrisma();
  const service = new PortalAnalyticsService(db.prisma);
  await service.recordGateHit({
    workspaceId: 'ws-test',
    eventId: 'gate-00001',
    action: 'submit-skill',
    routeKey: 'market-internal',
    visitorId: VISITOR_UUID,
    clientIp: '203.0.113.20',
  });
  const call = db.executeCalls[0];
  assert.match(call.sql, /INSERT OR IGNORE INTO "PortalConversionEvent"/);
  assert.equal(call.values[3], 'guest_gate_hit');
  assert.equal(call.values[4], 'submit-skill');
  assert.equal(call.values[6], sha256(`ws-test:visitor:${VISITOR_UUID}`));

  await assert.rejects(
    service.recordGateHit({
      workspaceId: 'ws-test',
      eventId: 'gate-00002',
      action: 'unknown-action',
      routeKey: 'home',
      visitorId: VISITOR_UUID,
    }),
    (error) => error?.getStatus?.() === 400,
  );
});

test('successful logins preserve daily account dedupe and append journey conversion events', async () => {
  const db = recordingPrisma();
  const service = new PortalAnalyticsService(db.prisma);
  await service.recordDailyLogin({
    workspaceId: 'ws-test',
    userId: 'user-42',
    visitorId: GUEST_VISITOR_ID,
  });
  await service.recordDailyLogin({
    workspaceId: 'ws-test',
    userId: 'user-42',
    visitorId: GUEST_VISITOR_ID,
  });

  assert.equal(db.executeCalls.length, 4);
  const firstConversion = db.executeCalls[1];
  const secondConversion = db.executeCalls[3];
  assert.equal(firstConversion.values[3], 'login_success');
  assert.equal(firstConversion.values[6], sha256(`ws-test:visitor:${VISITOR_UUID}`));
  assert.equal(
    firstConversion.values[7],
    sha256('mss-claw:portal-uv:v1:ws-test:account:user-42'),
  );
  assert.notEqual(firstConversion.values[1], secondConversion.values[1]);
});

test('auth login forwards the stable visitor ID to the service', async () => {
  const calls = [];
  const controller = new AuthController({
    login: async (body) => {
      calls.push(body);
      return { ok: true };
    },
  });
  await controller.login({
    email: 'user@example.com',
    password: 'secret',
    workspaceId: 'ws-test',
    visitorId: GUEST_VISITOR_ID,
  });
  assert.equal(calls[0].visitorId, GUEST_VISITOR_ID);
});

test('reports expose guest/user splits and a time-ordered gate conversion funnel', async () => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const db = recordingPrisma(({ sql }) => {
    if (sql.includes('MAX("occurredAt")')) {
      return [{
        pv: 12,
        uv: 5,
        guestPv: 7,
        guestUv: 3,
        userPv: 5,
        userUv: 2,
        updatedAt: new Date('2026-08-28T00:00:00.000Z'),
      }];
    }
    if (sql.includes('GROUP BY p."dateKey"')) {
      return [{ date: today, pv: 12, uv: 5, guestPv: 7, guestUv: 3, userPv: 5, userUv: 2 }];
    }
    if (sql.includes('GROUP BY p."routeKey"')) {
      return [{ routeKey: 'home', pv: 12, uv: 5, guestPv: 7, guestUv: 3, userPv: 5, userUv: 2 }];
    }
    if (sql.includes('PortalDailyLogin')) return [{ users: 2 }];
    if (sql.includes('AS "convertedUv"')) {
      return [{ action: 'favorite', hits: 8, guestUv: 4, convertedUv: 1 }];
    }
    if (sql.includes('FROM "MarketEngagement" AS m')) {
      return [{
        views: 120,
        favorites: 18,
        likes: 42,
        dislikes: 6,
        redirects: 75,
        trackingStartedAt: new Date('2026-08-31T01:00:00.000Z'),
        updatedAt: new Date('2026-08-31T02:00:00.000Z'),
      }];
    }
    if (sql.includes('FROM "MarketEngagementEvent" AS e')) {
      return [{ date: today, views: 9, favorites: 2, likes: 3, dislikes: 1, redirects: 4 }];
    }
    throw new Error(`unexpected query: ${sql}`);
  });
  const report = await new PortalAnalyticsService(db.prisma).getReport('ws-test', 1);

  assert.deepEqual(report.totals, {
    pv: 12,
    uv: 5,
    guestPv: 7,
    guestUv: 3,
    userPv: 5,
    userUv: 2,
    todayLoginUsers: 2,
  });
  assert.equal(report.series[0].guestPv, 7);
  assert.equal(report.pages[0].userUv, 2);
  assert.deepEqual(report.gateFunnel, [
    { action: 'favorite', hits: 8, guestUv: 4, convertedUv: 1, conversionRate: 0.25 },
  ]);
  assert.deepEqual(report.behavior.totals, {
    views: 9,
    favorites: 2,
    likes: 3,
    dislikes: 1,
    redirects: 4,
    downloads: 0,
  });
  assert.deepEqual(report.behavior.currentTotals, {
    views: 120,
    favorites: 18,
    likes: 42,
    dislikes: 6,
    redirects: 75,
    downloads: 0,
  });
  assert.equal(report.behavior.series[0].date, today);
  assert.equal(report.behavior.trackingStartedAt, '2026-08-31T01:00:00.000Z');
  const funnelSql = db.queryCalls.find((call) => call.sql.includes('AS "convertedUv"')).sql;
  assert.match(funnelSql, /l\."occurredAt" >= g\."occurredAt"/);
  const totalSql = db.queryCalls.find((call) => call.sql.includes('MAX("occurredAt")')).sql;
  assert.match(totalSql, /p\."visitorType" = 'user' THEN p\."visitorHash"/);
  assert.match(totalSql, /l\."occurredAt" >= p\."occurredAt"/);
});

test('custom ranges are inclusive, bounded and reject invalid dates', async () => {
  const db = recordingPrisma(({ sql }) => {
    if (sql.includes('MAX("occurredAt")')) return [{}];
    if (sql.includes('PortalDailyLogin')) return [{ users: 0 }];
    if (sql.includes('FROM "MarketEngagement" AS m')) return [{}];
    return [];
  });
  const service = new PortalAnalyticsService(db.prisma);
  const report = await service.getReport(
    'ws-test',
    undefined,
    '2026-08-29',
    '2026-08-31',
  );
  assert.deepEqual(report.range, {
    days: 3,
    from: '2026-08-29',
    to: '2026-08-31',
  });
  assert.deepEqual(report.series.map((row) => row.date), [
    '2026-08-29',
    '2026-08-30',
    '2026-08-31',
  ]);
  assert.deepEqual(report.behavior.series.map((row) => row.date), [
    '2026-08-29',
    '2026-08-30',
    '2026-08-31',
  ]);

  for (const [from, to] of [
    ['2026-08-31', undefined],
    ['2026-08-31', '2026-08-30'],
    ['2026-02-30', '2026-03-01'],
    ['2026-05-01', '2026-08-31'],
    ['2026-08-31', '2999-01-01'],
  ]) {
    await assert.rejects(
      service.getReport('ws-test', undefined, from, to),
      (error) => error?.getStatus?.() === 400,
    );
  }
});

test('global tool singleton is authoritative for analytics inventory', async () => {
  const centerRows = [
    {
      id: 'tool-removed',
      kind: 'tool',
      payload: { id: 'tool-removed', name: '已删除工具', sourceType: 'external', published: true },
    },
    {
      id: 'marketplace-ws-test',
      kind: 'marketplace',
      payload: {
        tools: [
          { id: 'tool-live', name: '旧名称', sourceType: 'external', published: true },
          { id: 'tool-removed', name: '已删除工具', sourceType: 'external', published: true },
        ],
        agents: [{ id: 'agent-keep', name: '保留 Agent', published: true }],
      },
    },
  ];
  const globalToolsRow = {
    id: 'global-tools',
    kind: 'tool-catalog',
    payload: {
      initialized: true,
      tools: [{ id: 'tool-live', name: '新名称', sourceType: 'external', published: false }],
    },
  };
  const db = recordingPrisma(null, centerRows, globalToolsRow);
  const catalog = await new PortalAnalyticsService(db.prisma).readAssetCatalog('ws-test');

  assert.deepEqual(
    catalog.filter((row) => row.assetType === 'tool'),
    [{
      contentId: 'tool-live',
      assetType: 'tool',
      name: '新名称',
      published: false,
      external: true,
      company: false,
      officeScene: false,
      bound: false,
    }],
  );
  assert.equal(catalog.some((row) => row.contentId === 'tool-removed'), false);
  assert.equal(catalog.some((row) => row.contentId === 'agent-keep'), true);
});

test('analytics keeps workspace tool fallback before singleton migration', async () => {
  const centerRows = [
    {
      id: 'tool-legacy',
      kind: 'tool',
      payload: { id: 'tool-legacy', name: '旧工具', sourceType: 'external', published: true },
    },
  ];
  const db = recordingPrisma(null, centerRows);
  const catalog = await new PortalAnalyticsService(db.prisma).readAssetCatalog('ws-test');
  assert.deepEqual(catalog.map((row) => row.contentId), ['tool-legacy']);
});

test('black asset report excludes portal-content and treats only explicit redirect as redirect', async () => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const centerRows = [
    {
      id: 'tool-company',
      kind: 'tool',
      payload: { id: 'tool-company', name: '公司工具', sourceType: 'company', published: true },
    },
    {
      id: 'tool-other',
      kind: 'tool',
      payload: { id: 'tool-other', name: '其他工具', published: true },
    },
    {
      id: 'portal-only',
      kind: 'portal-content',
      payload: { items: [{ id: 'portal-only', name: '门户内容' }] },
    },
  ];
  const db = recordingPrisma(({ sql }) => {
    if (sql.includes('MAX("occurredAt")')) return [{}];
    if (sql.includes('GROUP BY p."dateKey"') || sql.includes('GROUP BY p."routeKey"')) return [];
    if (sql.includes('MIN("eventAt")')) {
      return [{ visitorHash: 'user-hash', firstDate: today, firstAt: new Date(), lastAt: new Date() }];
    }
    if (sql.includes('PortalDailyLogin')) return [{ users: 0 }];
    if (sql.includes('AS "convertedUv"')) return [];
    if (sql.includes('GROUP BY "dateKey", "visitorHash"')) return [];
    if (sql.includes('GROUP BY e."dateKey", e."contentId"')) {
      return [
        {
          date: today,
          contentId: 'tool-company',
          assetType: 'unknown',
          views: 2,
          favorites: 1,
          likes: 1,
          dislikes: 0,
          redirects: 3,
          downloads: 2,
        },
        {
          date: today,
          contentId: 'portal-only',
          assetType: 'tool',
          views: 200,
          favorites: 200,
          likes: 200,
          dislikes: 0,
          redirects: 200,
          downloads: 200,
        },
        {
          date: today,
          contentId: 'tool-company',
          assetType: 'agent',
          views: 500,
          favorites: 500,
          likes: 500,
          dislikes: 500,
          redirects: 500,
          downloads: 500,
        },
      ];
    }
    if (sql.includes('m."contentId" AS "contentId"')) {
      return [
        {
          contentId: 'tool-company',
          views: 10,
          favorites: 2,
          likes: 3,
          dislikes: 1,
          redirects: 4,
          downloads: 5,
          updatedAt: new Date(),
        },
        {
          contentId: 'portal-only',
          views: 1000,
          favorites: 1000,
          likes: 1000,
          dislikes: 0,
          redirects: 1000,
          downloads: 1000,
          updatedAt: new Date(),
        },
      ];
    }
    if (sql.includes('AS "events"')) {
      return [
        { contentId: 'tool-company', assetType: 'unknown', action: 'use', events: 50, uv: 50 },
        { contentId: 'tool-company', assetType: 'unknown', action: 'redirect', events: 2, uv: 2 },
        { contentId: 'tool-company', assetType: 'agent', action: 'redirect', events: 500, uv: 500 },
        { contentId: 'portal-only', assetType: 'tool', action: 'redirect', events: 999, uv: 999 },
      ];
    }
    if (sql.includes('e."visitorHash" AS "visitorHash"')) {
      return [
        { contentId: 'tool-company', assetType: 'unknown', visitorHash: 'visitor-1', downloads: 2 },
        { contentId: 'tool-company', assetType: 'agent', visitorHash: 'visitor-forged', downloads: 500 },
        { contentId: 'portal-only', assetType: 'tool', visitorHash: 'visitor-2', downloads: 999 },
      ];
    }
    if (sql.includes('AND "action" = \'call\'')) {
      return [
        { contentId: 'tool-company', assetType: 'unknown', visitorHash: 'visitor-1', success: 1, durationMs: 10, inputTokens: 1, outputTokens: 2 },
        { contentId: 'tool-company', assetType: 'agent', visitorHash: 'visitor-forged', success: 1, durationMs: 10, inputTokens: 500, outputTokens: 500 },
        { contentId: 'portal-only', assetType: 'tool', visitorHash: 'visitor-2', success: 1, durationMs: 10, inputTokens: 100, outputTokens: 100 },
      ];
    }
    if (sql.includes('FROM "MarketEngagement" AS m')) {
      return [{ views: 10, favorites: 2, likes: 3, dislikes: 1, redirects: 4, downloads: 5 }];
    }
    return [];
  }, centerRows);

  const report = await new PortalAnalyticsService(db.prisma).getReport('ws-test', 1);
  assert.equal(report.assets.summary.company, 1);
  assert.deepEqual(report.assets.rows.map((row) => row.contentId), ['tool-company', 'tool-other']);
  assert.equal(report.assets.rows[0].redirects, 2);
  assert.deepEqual(report.behavior.totals, {
    views: 2,
    favorites: 1,
    likes: 1,
    dislikes: 0,
    redirects: 3,
    downloads: 2,
  });
  assert.deepEqual(report.behavior.currentTotals, {
    views: 10,
    favorites: 2,
    likes: 3,
    dislikes: 1,
    redirects: 4,
    downloads: 5,
  });
  assert.deepEqual(report.behavior.downloads, {
    count: 2,
    uv: 1,
    currentCount: 5,
    currentUv: 0,
  });
  assert.equal(report.calls.total, 1);
  assert.equal(report.overview.d1Retention, null);
  assert.equal(report.overview.d7Retention, null);
  assert.equal(report.overview.d30Retention, null);
});
