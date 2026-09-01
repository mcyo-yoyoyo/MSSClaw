import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, open, rm } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { PortalAnalyticsService } from '../dist/persistence/portal-analytics.service.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const API_DIR = resolve(TESTS_DIR, '..');
const PRISMA_CLI = resolve(API_DIR, '../../node_modules/.bin/prisma');
const PRISMA_DIR = resolve(API_DIR, 'prisma');
const PRISMA_SCHEMA = resolve(PRISMA_DIR, 'schema.prisma');

function assertAllFulfilled(results, label) {
  const rejected = results.filter((result) => result.status === 'rejected');
  assert.equal(
    rejected.length,
    0,
    `${label}: ${rejected.map((result) => String(result.reason)).join('\n')}`,
  );
}

async function withTemporaryDatabase(run) {
  const directory = await mkdtemp(join(PRISMA_DIR, '.tmp-portal-analytics-'));
  // Keep the test database relative to schema.prisma. Some Prisma schema-engine
  // builds reject absolute SQLite URLs outside the schema directory.
  const databaseUrl = `file:./${basename(directory)}/concurrency.db`;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  let prisma;

  try {
    // Prisma 6 SQLite schema engine may fail its first migrate when the target file
    // does not exist yet. Pre-create an empty file; migrations still create every table.
    const handle = await open(join(directory, 'concurrency.db'), 'a');
    await handle.close();
    const migration = spawnSync(
      PRISMA_CLI,
      ['migrate', 'deploy', '--schema', PRISMA_SCHEMA],
      {
        cwd: API_DIR,
        env: { ...process.env, DATABASE_URL: databaseUrl },
        encoding: 'utf8',
      },
    );
    assert.equal(
      migration.status,
      0,
      `temporary database migration failed:\n${migration.stderr || migration.stdout}`,
    );

    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    await run({ prisma, service: new PortalAnalyticsService(prisma) });
  } finally {
    await prisma?.$disconnect().catch(() => undefined);
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    await rm(directory, { recursive: true, force: true });
  }
}

test('SQLite page-view writes remain idempotent and rate limited under concurrency', async () => {
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
          workspaceId: duplicateInput.workspaceId,
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
          workspaceId: 'ws-portal-concurrency',
          eventId: { startsWith: 'event-page-view-burst-' },
        },
      }),
      60,
    );
  });
});
