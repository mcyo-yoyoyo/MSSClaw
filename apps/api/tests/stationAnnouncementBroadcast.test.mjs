// 站内公告：表存储 + 版本号乐观锁 + 广播到站内信，跑在临时 PG schema 上。
import assert from 'node:assert/strict';
import test, { after, before, beforeEach } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PlatformDocsService } from '../dist/persistence/platform-docs.service.js';
import { writeStationAnnouncements } from '../dist/persistence/operations-store.js';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';

let database;
let prisma;

before(async () => {
  database = await createTestDatabase('station_announcements');
  prisma = new PrismaClient({ datasourceUrl: database.url });
});

after(async () => {
  await prisma?.$disconnect();
  await database?.drop();
});

beforeEach(async () => {
  for (const table of ['inbox_message_state', 'inbox_message', 'station_announcement', 'collection_revision']) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
});

/** 预置已发布到某个版本号的公告 */
async function seedAnnouncements(revision, items) {
  await writeStationAnnouncements(prisma, 0, items);
  await prisma.collectionRevision.update({ where: { collection: 'station-announcements' }, data: { revision } });
}

const message = (id) => prisma.inboxMessageRecord.findUnique({ where: { id } });
const broadcastMessage = (id, extra = {}) =>
  prisma.inboxMessageRecord.create({
    data: { id, kind: 'announce', title: '功能上线：三货架', body: '详情正文', fromName: '能力运营', toUserId: '*', ...extra },
  });

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

  const broadcast = await message('ann-launch');
  assert.equal(broadcast.toUserId, '*');
  assert.equal(broadcast.kind, 'announce');
  assert.equal(broadcast.title, '功能上线：三货架');
  assert.equal(broadcast.body, '详情正文');
  assert.deepEqual(broadcast.meta, { announcementTag: 'AI上线' });
  assert.notEqual(await message('ann-free'), null);
  assert.equal(await message('ann-old'), null);
});

test('编辑已发布公告：广播消息的标题与正文跟着更新', async () => {
  await seedAnnouncements(4, [announcement()]);
  await broadcastMessage('ann-launch');
  const service = new PlatformDocsService(prisma, {});

  await service.putDoc('ws-test', 'station-announcements', {
    revision: 4,
    items: [announcement({ title: '功能上线：三货架与集市', body: '改过的正文' })],
  });

  const broadcast = await message('ann-launch');
  assert.equal(broadcast.title, '功能上线：三货架与集市');
  assert.equal(broadcast.body, '改过的正文');
});

test('下架只退出首页，消息保留；删除才撤回消息与各人已读态', async () => {
  await seedAnnouncements(1, [announcement()]);
  await broadcastMessage('ann-launch');
  await prisma.inboxUserMessageState.create({ data: { userId: 'u-1', messageId: 'ann-launch', readAt: new Date() } });
  const service = new PlatformDocsService(prisma, {});

  await service.putDoc('ws-test', 'station-announcements', {
    revision: 1,
    items: [announcement({ published: false })],
  });
  assert.notEqual(await message('ann-launch'), null);
  assert.equal(await prisma.inboxUserMessageState.count(), 1);

  await service.putDoc('ws-test', 'station-announcements', { revision: 2, items: [] });
  assert.equal(await message('ann-launch'), null);
  assert.equal(await prisma.inboxUserMessageState.count(), 0);
});

test('陈旧 revision 被拒绝，且不会误发广播', async () => {
  await seedAnnouncements(3, [announcement()]);
  const service = new PlatformDocsService(prisma, {});

  await assert.rejects(
    service.putDoc('ws-test', 'station-announcements', {
      revision: 1,
      items: [announcement({ id: 'ann-other', title: '另一个运营写的' })],
    }),
    (error) => error?.getStatus?.() === 409,
  );
  assert.equal(await prisma.inboxMessageRecord.count(), 0);
});
