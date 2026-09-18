import assert from 'node:assert/strict';
import test from 'node:test';
import { PlatformDocsService } from '../dist/persistence/platform-docs.service.js';
import { PlatformDocsController } from '../dist/persistence/platform-docs.controller.js';

/** 按 id 存文档的假 prisma，$executeRaw 走 revision CAS 语义 */
function fakePrisma(rows = {}) {
  const store = new Map(Object.entries(rows));
  return {
    workspace: { findUnique: async () => ({ id: 'ws-test' }) },
    centerRecord: {
      findUnique: async ({ where }) => store.get(where.id) ?? null,
      findMany: async () => [...store.values()],
      create: async ({ data }) => {
        store.set(data.id, { ...data });
        return store.get(data.id);
      },
      upsert: async ({ where, create }) => {
        if (!store.has(where.id)) store.set(where.id, { ...create });
        return store.get(where.id);
      },
      update: async ({ where, data }) => {
        store.set(where.id, { ...store.get(where.id), ...data });
        return store.get(where.id);
      },
    },
    $executeRaw: async (_strings, payloadJson, _updatedAt, id, expectedRevision) => {
      const row = store.get(id);
      const current = typeof row?.payload?.revision === 'number' ? row.payload.revision : 0;
      if (!row || current !== expectedRevision) return 0;
      store.set(id, { ...row, payload: JSON.parse(payloadJson) });
      return 1;
    },
  };
}

const DOC_ID = 'doc-home-featured-ws-test';

const channels = (overrides = {}) => ({
  external: ['tool-ext-chatgpt'],
  internal: ['tool-hw-assistant'],
  projects: ['skill:price-offer-monitor', 'agent:agent-1'],
  ...overrides,
});

test('首页配置首次保存从 revision 0 开始，读取返回规范化后的三栏', async () => {
  const service = new PlatformDocsService(fakePrisma(), {});

  const saved = await service.putDoc('ws-test', 'home-featured', {
    revision: 0,
    channels: channels({ external: [' tool-ext-chatgpt ', 'tool-ext-claude'] }),
  });
  assert.equal(saved.payload.revision, 1);
  assert.deepEqual(saved.payload.channels.external, ['tool-ext-chatgpt', 'tool-ext-claude']);

  const read = await service.getDoc('ws-test', 'home-featured');
  assert.deepEqual(read.payload, {
    version: 1,
    revision: 1,
    channels: channels({ external: ['tool-ext-chatgpt', 'tool-ext-claude'] }),
  });
});

test('首页配置拒绝陈旧 revision，避免覆盖其他管理员的排序', async () => {
  const prisma = fakePrisma({
    [DOC_ID]: {
      id: DOC_ID,
      workspaceId: 'ws-test',
      kind: 'doc:home-featured',
      payload: { version: 1, revision: 3, channels: channels() },
    },
  });
  const service = new PlatformDocsService(prisma, {});

  await assert.rejects(
    service.putDoc('ws-test', 'home-featured', { revision: 2, channels: channels() }),
    { name: 'ConflictException' },
  );
  const saved = await service.putDoc('ws-test', 'home-featured', {
    revision: 3,
    channels: channels({ internal: [] }),
  });
  assert.equal(saved.payload.revision, 4);
  assert.deepEqual(saved.payload.channels.internal, []);
});

test('首页配置写入校验引用格式、重复项与单栏上限', async () => {
  const service = new PlatformDocsService(fakePrisma(), {});
  const put = (payload) => service.putDoc('ws-test', 'home-featured', { revision: 0, ...payload });

  await assert.rejects(put({}), /invalid_home_featured:channels:object_required/);
  await assert.rejects(
    put({ channels: channels({ projects: ['price-offer-monitor'] }) }),
    /invalid_home_featured:channels\.projects\[0\]:invalid_ref/,
  );
  await assert.rejects(
    put({ channels: channels({ internal: ['tool-hw-assistant', 'tool-hw-assistant'] }) }),
    /invalid_home_featured:channels\.internal\[1\]:duplicate/,
  );
  await assert.rejects(
    put({
      channels: channels({ external: Array.from({ length: 31 }, (_, i) => `tool-${i}`) }),
    }),
    /invalid_home_featured:channels\.external:max_items_30/,
  );
});

test('首页配置读取时丢弃脏数据，不让单条坏引用拖垮首页', async () => {
  const prisma = fakePrisma({
    [DOC_ID]: {
      id: DOC_ID,
      workspaceId: 'ws-test',
      kind: 'doc:home-featured',
      payload: {
        revision: 2,
        channels: {
          external: ['tool-a', 'tool-a', 42, ''],
          internal: 'tool-b',
          projects: ['skill:s-1', 'bad-ref', 'agent:a-1'],
        },
      },
    },
  });
  const service = new PlatformDocsService(prisma, {});
  const read = await service.getDoc('ws-test', 'home-featured');
  assert.deepEqual(read.payload, {
    version: 1,
    revision: 2,
    channels: { external: ['tool-a'], internal: [], projects: ['skill:s-1', 'agent:a-1'] },
  });
});

test('首页配置对游客只读开放，写入仅限 super_admin', async () => {
  let role = 'platform_ops';
  let putCalls = 0;
  const controller = new PlatformDocsController({
    me: async () => ({ ok: true, user: { id: 'u-1', platformRole: role } }),
    getDoc: async (workspaceId, kind) => ({ workspaceId, kind }),
    putDoc: async () => {
      putCalls += 1;
      return { ok: true };
    },
  });

  assert.deepEqual(await controller.getOne('ws-test', 'home-featured'), {
    workspaceId: 'ws-test',
    kind: 'home-featured',
  });
  await assert.rejects(
    controller.putOne('ws-test', 'home-featured', { payload: {} }, 'Bearer t'),
    (error) => error.message === 'home_featured_admin_required',
  );
  assert.equal(putCalls, 0);

  role = 'super_admin';
  await controller.putOne('ws-test', 'home-featured', { payload: {} }, 'Bearer t');
  assert.equal(putCalls, 1);
});
