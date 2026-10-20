import assert from 'node:assert/strict';
import test from 'node:test';
import { PersistenceService } from '../dist/persistence/persistence.service.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { ensureWorkspace } from '../dist/workspaces/workspace-setting.js';
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
  const database = await createTestDatabase('market_engagement');
  const previousDatabaseUrl = process.env.DATABASE_URL;
  let prisma;

  try {
    process.env.DATABASE_URL = database.url;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    await ensureWorkspace(prisma);
    await prisma.centerRecord.create({
      data: {
        id: 'marketplace-ws-sqlite-concurrency',
        kind: 'marketplace',
        payload: {
          tools: [
            { id: 'tool-replay-concurrency' },
            { id: 'tool-rate-concurrency' },
          ],
        },
      },
    });

    await run({ prisma, service: new PersistenceService(prisma) });
  } finally {
    await prisma?.$disconnect().catch(() => undefined);
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    await database.drop();
  }
}

test('engagement writes remain idempotent and rate limited under concurrency', async () => {
  await withTemporaryDatabase(async ({ prisma, service }) => {
    const replayInput = {
      action: 'view',
      userId: '',
      eventId: 'event-replay-concurrency-0001',
      visitorId: '00000000-0000-4000-8000-000000000001',
    };
    const replayResults = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        service.mutateMarketEngagement(
          'ws-sqlite-concurrency',
          'tool-replay-concurrency',
          replayInput,
        ),
      ),
    );

    assertAllFulfilled(replayResults, '20-way duplicate event writes must all settle');
    const replayMetric = await prisma.marketEngagement.findUniqueOrThrow({
      where: { contentId: 'tool-replay-concurrency' },
    });
    assert.equal(replayMetric.views, 1);
    assert.equal(
      await prisma.marketEngagementEvent.count({
        where: {
          eventId: replayInput.eventId,
        },
      }),
      1,
    );

    const rateResults = await Promise.allSettled(
      Array.from({ length: 65 }, (_, index) =>
        service.mutateMarketEngagement(
          'ws-sqlite-concurrency',
          'tool-rate-concurrency',
          {
            action: 'view',
            userId: '',
            eventId: `event-rate-concurrency-${String(index).padStart(3, '0')}`,
            visitorId: '00000000-0000-4000-8000-000000000002',
          },
        ),
      ),
    );

    assertAllFulfilled(rateResults, '65-way visitor burst must all settle');
    const rateMetric = await prisma.marketEngagement.findUniqueOrThrow({
      where: { contentId: 'tool-rate-concurrency' },
    });
    assert.equal(rateMetric.views, 60);
    assert.equal(
      await prisma.marketEngagementEvent.count({
        where: {
          contentId: 'tool-rate-concurrency',
        },
      }),
      60,
    );
  });
});
