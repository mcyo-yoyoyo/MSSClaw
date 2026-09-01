import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { PersistenceService } from '../dist/persistence/persistence.service.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';

const TEST_SCHEMA = [
  `CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "defaultChatId" TEXT NOT NULL,
    "catalogJson" JSON NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE "CenterRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSON NOT NULL,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE INDEX "CenterRecord_workspaceId_kind_idx"
    ON "CenterRecord"("workspaceId", "kind")`,
  `CREATE TABLE "MarketEngagement" (
    "workspaceId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "dislikes" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "favorites" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    PRIMARY KEY ("workspaceId", "contentId")
  )`,
  `CREATE TABLE "MarketUserInteraction" (
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "vote" TEXT,
    "favorited" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    PRIMARY KEY ("workspaceId", "userId", "contentId")
  )`,
  `CREATE TABLE "MarketEngagementEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "eventId" TEXT,
    "contentId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL DEFAULT 'unknown',
    "action" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "visitorHash" TEXT,
    "visitorType" TEXT NOT NULL DEFAULT 'user',
    "success" BOOLEAN,
    "durationMs" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "errorCode" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX "MarketEngagementEvent_workspaceId_eventId_key"
    ON "MarketEngagementEvent"("workspaceId", "eventId")`,
  `CREATE INDEX "MarketEngagementEvent_workspaceId_dateKey_visitorHash_idx"
    ON "MarketEngagementEvent"("workspaceId", "dateKey", "visitorHash")`,
  `CREATE INDEX "MarketEngagementEvent_workspaceId_visitorHash_occurredAt_idx"
    ON "MarketEngagementEvent"("workspaceId", "visitorHash", "occurredAt")`,
  `CREATE INDEX "MarketEngagementEvent_workspaceId_contentId_action_dateKey_idx"
    ON "MarketEngagementEvent"("workspaceId", "contentId", "action", "dateKey")`,
  `CREATE INDEX "MarketEngagementEvent_workspaceId_assetType_action_dateKey_idx"
    ON "MarketEngagementEvent"("workspaceId", "assetType", "action", "dateKey")`,
];

function assertAllFulfilled(results, label) {
  const rejected = results.filter((result) => result.status === 'rejected');
  assert.equal(
    rejected.length,
    0,
    `${label}: ${rejected.map((result) => String(result.reason)).join('\n')}`,
  );
}

async function withTemporaryDatabase(run) {
  const directory = await mkdtemp(join(tmpdir(), 'mssclaw-market-engagement-'));
  const databasePath = join(directory, 'concurrency.db');
  const databaseUrl = `file:${databasePath}`;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  let prisma;

  try {
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    for (const statement of TEST_SCHEMA) await prisma.$executeRawUnsafe(statement);

    await prisma.workspace.create({
      data: {
        id: 'ws-sqlite-concurrency',
        name: 'SQLite concurrency regression',
        namespace: 'sqlite-concurrency',
        description: 'temporary test workspace',
        defaultChatId: 'chat-test',
        catalogJson: {},
      },
    });
    await prisma.centerRecord.create({
      data: {
        id: 'marketplace-ws-sqlite-concurrency',
        workspaceId: 'ws-sqlite-concurrency',
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
    await rm(directory, { recursive: true, force: true });
  }
}

test('SQLite engagement writes remain idempotent and rate limited under concurrency', async () => {
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
      where: {
        workspaceId_contentId: {
          workspaceId: 'ws-sqlite-concurrency',
          contentId: 'tool-replay-concurrency',
        },
      },
    });
    assert.equal(replayMetric.views, 1);
    assert.equal(
      await prisma.marketEngagementEvent.count({
        where: {
          workspaceId: 'ws-sqlite-concurrency',
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
      where: {
        workspaceId_contentId: {
          workspaceId: 'ws-sqlite-concurrency',
          contentId: 'tool-rate-concurrency',
        },
      },
    });
    assert.equal(rateMetric.views, 60);
    assert.equal(
      await prisma.marketEngagementEvent.count({
        where: {
          workspaceId: 'ws-sqlite-concurrency',
          contentId: 'tool-rate-concurrency',
        },
      }),
      60,
    );
  });
});
