import assert from 'node:assert/strict';
import test from 'node:test';
import { PlatformDocsService } from '../dist/persistence/platform-docs.service.js';

const DOC_ID = 'doc-station-announcements-ws-test';

/** 按 id 存文档的假 prisma（$executeRaw 走 revision CAS），外加 inbox 两张表 */
function fakePrisma(rows = {}) {
  const store = new Map(Object.entries(rows));
  const messages = new Map();
  const states = [];
  const key = (workspaceId, id) => `${workspaceId}:${id}`;
  return {
    messages,
    states,
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
    inboxMessageRecord: {
      upsert: async ({ where, create, update }) => {
        const id = key(where.workspaceId_id.workspaceId, where.workspaceId_id.id);
        const previous = messages.get(id);
        messages.set(id, previous ? { ...previous, ...update } : { ...create });
        return messages.get(id);
      },
      deleteMany: async ({ where }) => {
        messages.delete(key(where.workspaceId, where.id));
        return { count: 1 };
      },
    },
    inboxUserMessageState: {
      deleteMany: async ({ where }) => {
        for (let i = states.length - 1; i >= 0; i -= 1) {
          if (states[i].workspaceId === where.workspaceId && states[i].messageId === where.messageId) {
            states.splice(i, 1);
          }
        }
        return { count: 1 };
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

function announcement(overrides = {}) {
  return {
    id: 'ann-launch',
    title: '功能上线：三货架',
    body: '详情正文',
    badge: 'AI上线',
    publishedAt: '2026-09-01T09:00:00.000Z',
    published: true,
    ...overrides,
  };
}

test('公告首次发布：规范化落库并广播给全员', async () => {
  const prisma = fakePrisma();
  const service = new PlatformDocsService(prisma, {});

  const saved = await service.putDoc('ws-test', 'station-announcements', {
    revision: 0,
    items: [
      announcement({ title: '  功能上线：三货架  ', badge: ' 上线 ', badgeColor: 'red' }),
      announcement({ id: 'ann-old', title: '', badge: '公告' }),
      announcement({
        id: 'ann-free',
        title: '停机维护通知',
        badge: '维护',
        badgeColor: '#0369A1',
        publishedAt: '2026-09-02T09:00:00.000Z',
      }),
    ],
  });

  assert.equal(saved.payload.revision, 1);
  // 标题为空的条目被丢弃；其余按发布时间倒序
  assert.deepEqual(saved.payload.items.map((item) => item.id), ['ann-free', 'ann-launch']);
  // 旧枚举值补上 AI 前缀，运营自填标签原样保留
  assert.equal(saved.payload.items.find((item) => item.id === 'ann-launch').badge, 'AI上线');
  assert.equal(saved.payload.items.find((item) => item.id === 'ann-free').badge, '维护');
  // 标签色只收 #rrggbb / #rgb，其它写法一律按「自动配色」落空串
  assert.equal(saved.payload.items.find((item) => item.id === 'ann-free').badgeColor, '#0369a1');
  assert.equal(saved.payload.items.find((item) => item.id === 'ann-launch').badgeColor, '');
  assert.equal(saved.payload.items.find((item) => item.id === 'ann-launch').title, '功能上线：三货架');

  const broadcast = prisma.messages.get('ws-test:ann-launch');
  assert.equal(broadcast.toUserId, '*');
  assert.equal(broadcast.kind, 'announce');
  assert.equal(broadcast.title, '功能上线：三货架');
  assert.equal(broadcast.body, '详情正文');
  assert.deepEqual(broadcast.meta, { announcementTag: 'AI上线' });
  assert.equal(prisma.messages.has('ws-test:ann-free'), true);
  assert.equal(prisma.messages.has('ws-test:ann-old'), false);
});

test('编辑已发布公告：广播消息的标题与正文跟着更新', async () => {
  const prisma = fakePrisma({
    [DOC_ID]: {
      id: DOC_ID,
      workspaceId: 'ws-test',
      kind: 'doc:station-announcements',
      payload: { revision: 4, items: [announcement()] },
    },
  });
  prisma.messages.set('ws-test:ann-launch', {
    workspaceId: 'ws-test',
    id: 'ann-launch',
    kind: 'announce',
    title: '功能上线：三货架',
    body: '详情正文',
    toUserId: '*',
  });
  const service = new PlatformDocsService(prisma, {});

  await service.putDoc('ws-test', 'station-announcements', {
    revision: 4,
    items: [announcement({ title: '功能上线：三货架与集市', body: '改过的正文' })],
  });

  const broadcast = prisma.messages.get('ws-test:ann-launch');
  assert.equal(broadcast.title, '功能上线：三货架与集市');
  assert.equal(broadcast.body, '改过的正文');
});

test('下架只退出首页，消息保留；删除才撤回消息与各人已读态', async () => {
  const prisma = fakePrisma({
    [DOC_ID]: {
      id: DOC_ID,
      workspaceId: 'ws-test',
      kind: 'doc:station-announcements',
      payload: { revision: 1, items: [announcement()] },
    },
  });
  prisma.messages.set('ws-test:ann-launch', { workspaceId: 'ws-test', id: 'ann-launch', toUserId: '*' });
  prisma.states.push({ workspaceId: 'ws-test', userId: 'u-1', messageId: 'ann-launch' });
  const service = new PlatformDocsService(prisma, {});

  await service.putDoc('ws-test', 'station-announcements', {
    revision: 1,
    items: [announcement({ published: false })],
  });
  assert.equal(prisma.messages.has('ws-test:ann-launch'), true);
  assert.equal(prisma.states.length, 1);

  await service.putDoc('ws-test', 'station-announcements', { revision: 2, items: [] });
  assert.equal(prisma.messages.has('ws-test:ann-launch'), false);
  assert.equal(prisma.states.length, 0);
});

test('陈旧 revision 被拒绝，且不会误发广播', async () => {
  const prisma = fakePrisma({
    [DOC_ID]: {
      id: DOC_ID,
      workspaceId: 'ws-test',
      kind: 'doc:station-announcements',
      payload: { revision: 3, items: [announcement()] },
    },
  });
  const service = new PlatformDocsService(prisma, {});

  await assert.rejects(
    service.putDoc('ws-test', 'station-announcements', {
      revision: 1,
      items: [announcement({ id: 'ann-other', title: '另一个运营写的' })],
    }),
    (error) => error?.getStatus?.() === 409,
  );
  assert.equal(prisma.messages.size, 0);
});
