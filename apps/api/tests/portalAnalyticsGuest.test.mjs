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
    getReport: async (workspaceId, days) => {
      calls.reports.push({ workspaceId, days });
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

function recordingPrisma(queryRows) {
  const executeCalls = [];
  const queryCalls = [];
  return {
    executeCalls,
    queryCalls,
    prisma: {
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
  assert.deepEqual(admin.analytics.calls.reports, [{ workspaceId: 'ws-test', days: '30' }]);
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
  const funnelSql = db.queryCalls.find((call) => call.sql.includes('AS "convertedUv"')).sql;
  assert.match(funnelSql, /l\."occurredAt" >= g\."occurredAt"/);
  const totalSql = db.queryCalls.find((call) => call.sql.includes('MAX("occurredAt")')).sql;
  assert.match(totalSql, /p\."visitorType" = 'user' THEN p\."visitorHash"/);
  assert.match(totalSql, /l\."occurredAt" >= p\."occurredAt"/);
});
