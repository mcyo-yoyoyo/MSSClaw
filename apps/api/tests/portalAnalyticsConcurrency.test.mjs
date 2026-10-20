import assert from 'node:assert/strict';
import test from 'node:test';
import { PortalAnalyticsService } from '../dist/persistence/portal-analytics.service.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';

function assertAllFulfilled(results, label) {
  const rejected = results.filter((result) => result.status === 'rejected');
  assert.equal(
    rejected.length,
    0,
    `${label}: ${rejected.map((result) => String(result.reason)).join('\n')}`,
  );
}

async function withTemporaryDatabase(run) {
  const database = await createTestDatabase('portal_analytics');
  const previousDatabaseUrl = process.env.DATABASE_URL;
  let prisma;

  try {
    process.env.DATABASE_URL = database.url;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    await run({ prisma, service: new PortalAnalyticsService(prisma) });
  } finally {
    await prisma?.$disconnect().catch(() => undefined);
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    await database.drop();
  }
}

test('page-view writes remain idempotent and rate limited under concurrency', async () => {
  await withTemporaryDatabase(async ({ prisma, service }) => {
    const duplicateInput = {
      workspaceId: 'ws-portal-concurrency',
      eventId: 'event-page-view-replay-0001',
      routeKey: 'home',
      visitorType: 'guest',
      rawVisitorId: '00000000-0000-4000-8000-000000000001',
      journeyVisitorId: '00000000-0000-4000-8000-000000000001',
      clientIp: '198.51.100.1',
    };
    const duplicateResults = await Promise.allSettled(
      Array.from({ length: 20 }, () => service.recordPageView(duplicateInput)),
    );
    assertAllFulfilled(duplicateResults, '20-way duplicate page views must all settle');
    assert.equal(
      await prisma.portalPageView.count({
        where: {
          eventId: duplicateInput.eventId,
        },
      }),
      1,
    );

    const burstResults = await Promise.allSettled(
      Array.from({ length: 65 }, (_, index) =>
        service.recordPageView({
          workspaceId: 'ws-portal-concurrency',
          eventId: `event-page-view-burst-${String(index).padStart(3, '0')}`,
          routeKey: 'home',
          visitorType: 'guest',
          rawVisitorId: '00000000-0000-4000-8000-000000000002',
          journeyVisitorId: '00000000-0000-4000-8000-000000000002',
          clientIp: '198.51.100.2',
        }),
      ),
    );
    assertAllFulfilled(burstResults, '65-way page-view burst must all settle');
    assert.equal(
      await prisma.portalPageView.count({
        where: {
          eventId: { startsWith: 'event-page-view-burst-' },
        },
      }),
      60,
    );
  });
});
