import assert from 'node:assert/strict';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PersistenceService } from '../dist/persistence/persistence.service.js';
import { CenterRecordService } from '../dist/centers/center-record.service.js';

function setup({ published = false, pending = false } = {}) {
  const workspaceId = 'ws-cn-marketing';
  const rows = new Map([
    [`marketplace-${workspaceId}`, { id: `marketplace-${workspaceId}`, workspaceId, kind: 'marketplace', payload: {
      skills: [{ id: 'skill-delete', name: '待删除', published }],
      agents: [{ id: 'agent-keep', name: '保留', skillIds: ['skill-delete', 'skill-other'] }],
      automations: [], kbDocs: [],
    } }],
    ['skill-delete', { id: 'skill-delete', workspaceId, kind: 'skill', payload: { id: 'skill-delete' } }],
    [`doc-asset-approvals-${workspaceId}`, { id: `doc-asset-approvals-${workspaceId}`, workspaceId, kind: 'asset-approvals', payload: {
      items: [{ kind: 'skill', assetId: 'skill-delete', status: pending ? 'pending' : 'approved' }],
    } }],
  ]);
  const prisma = { centerRecord: {
    findUnique: async ({ where }) => rows.get(where.id) ?? null,
    findFirst: async ({ where }) => [...rows.values()].find((row) => row.workspaceId === where.workspaceId && row.kind === where.kind) ?? null,
    findMany: async ({ where }) => [...rows.values()].filter((row) => row.workspaceId === where.workspaceId && row.kind === where.kind),
    upsert: async ({ where, create, update }) => {
      const value = rows.has(where.id) ? { ...rows.get(where.id), ...update } : create;
      rows.set(where.id, value);
      return value;
    },
    deleteMany: async ({ where }) => {
      for (const [id, row] of rows) {
        if (row.workspaceId === where.workspaceId && row.kind === where.kind && where.id.in.includes(id)) rows.delete(id);
      }
    },
  } };
  const service = new PersistenceService(prisma);
  // Isolate deletion from unrelated catalog metadata backfills.
  service.enrichMarketplaceMetadata = (payload) => ({ payload });
  return { service, prisma, rows, workspaceId };
}

test('删除下架 Skill 后重新连接 SQLite，目录、投影和绑定仍已移除', async () => {
  const { rows, workspaceId } = setup();
  const dir = await mkdtemp(join(tmpdir(), 'mssclaw-skill-delete-'));
  const datasourceUrl = `file:${join(dir, 'test.db')}`;
  const prisma = new PrismaClient({ datasourceUrl });
  const reopened = new PrismaClient({ datasourceUrl });
  try {
    await prisma.$executeRawUnsafe('CREATE TABLE "CenterRecord" ("id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL, "kind" TEXT NOT NULL, "payload" JSONB NOT NULL, "updatedAt" DATETIME NOT NULL)');
    for (const row of rows.values()) await prisma.centerRecord.create({ data: row });
    await new PersistenceService(prisma).putMarketplace(workspaceId, { skills: [], automations: [], kbDocs: [] });
    await prisma.$disconnect();
    const market = await reopened.centerRecord.findUnique({ where: { id: `marketplace-${workspaceId}` } });
    assert.deepEqual(market.payload.skills, []);
    assert.deepEqual(market.payload.agents[0].skillIds, ['skill-other']);
    assert.equal(await reopened.centerRecord.findUnique({ where: { id: 'skill-delete' } }), null);
    const agent = await reopened.centerRecord.findUnique({ where: { id: 'agent-keep' } });
    assert.deepEqual(agent.payload.bindings.skillIds, ['skill-other']);
    const approvals = await reopened.centerRecord.findUnique({ where: { id: `doc-asset-approvals-${workspaceId}` } });
    assert.equal(approvals.payload.items.length, 1);
    assert.deepEqual(await new CenterRecordService(reopened).list(workspaceId, 'skill'), []);
  } finally {
    await prisma.$disconnect();
    await reopened.$disconnect();
    await rm(dir, { recursive: true, force: true });
  }
});

for (const state of [{ published: true }, { pending: true }]) {
  test(`拒绝删除 ${JSON.stringify(state)}，原记录不变`, async () => {
    const { service, rows, workspaceId } = setup(state);
    const before = JSON.stringify([...rows]);
    await assert.rejects(service.putMarketplace(workspaceId, { skills: [] }), /仅可删除已下架/);
    assert.equal(JSON.stringify([...rows]), before);
  });
}
