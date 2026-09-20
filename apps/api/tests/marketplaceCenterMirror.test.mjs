import assert from 'node:assert/strict';
import test from 'node:test';
import { PersistenceService } from '../dist/persistence/persistence.service.js';

const WORKSPACE_ID = 'ws-cn-marketing';

function setup() {
  const rows = new Map([
    [
      `marketplace-${WORKSPACE_ID}`,
      {
        id: `marketplace-${WORKSPACE_ID}`,
        workspaceId: WORKSPACE_ID,
        kind: 'marketplace',
        payload: {
          agents: [
            { id: 'agent-keep', name: '保留', published: true },
            { id: 'agent-drop', name: '待删除', published: true },
          ],
          skills: [],
          automations: [],
          kbDocs: [],
        },
      },
    ],
    ...['agent-keep', 'agent-drop'].map((id) => [
      id,
      { id, workspaceId: WORKSPACE_ID, kind: 'agent', payload: { id, published: true } },
    ]),
  ]);
  const prisma = {
    centerRecord: {
      findUnique: async ({ where }) => rows.get(where.id) ?? null,
      findFirst: async ({ where }) =>
        [...rows.values()].find(
          (row) => row.workspaceId === where.workspaceId && row.kind === where.kind,
        ) ?? null,
      findMany: async ({ where }) =>
        [...rows.values()].filter(
          (row) => row.workspaceId === where.workspaceId && row.kind === where.kind,
        ),
      upsert: async ({ where, create, update }) => {
        const value = rows.has(where.id) ? { ...rows.get(where.id), ...update } : create;
        rows.set(where.id, value);
        return value;
      },
      deleteMany: async ({ where }) => {
        for (const [id, row] of rows) {
          if (
            row.workspaceId === where.workspaceId &&
            row.kind === where.kind &&
            where.id.in.includes(id)
          ) {
            rows.delete(id);
          }
        }
      },
    },
  };
  const service = new PersistenceService(prisma);
  // 目录元数据补齐与镜像回收无关，隔离掉避免干扰断言。
  service.enrichMarketplaceMetadata = (payload) => ({ payload });
  return { service, rows };
}

test('货架删掉 Agent 后回收 center 投影，看板不再把它算成已上架', async () => {
  const { service, rows } = setup();
  await service.putMarketplace(WORKSPACE_ID, {
    agents: [{ id: 'agent-keep', name: '保留', published: true }],
    skills: [],
    automations: [],
    kbDocs: [],
  });
  assert.equal(rows.has('agent-keep'), true);
  assert.equal(rows.has('agent-drop'), false);
});

test('请求没带 agents 列表时不回收投影：省略列表不等于清空货架', async () => {
  const { service, rows } = setup();
  await service.putMarketplace(WORKSPACE_ID, { skills: [], automations: [], kbDocs: [] });
  assert.equal(rows.has('agent-keep'), true);
  assert.equal(rows.has('agent-drop'), true);
});
