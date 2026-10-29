// 站内公告：表存储 + 版本号乐观锁 + 广播到站内信，跑在临时 PG schema 上。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { after, before, beforeEach } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PlatformDocsService } from '../dist/persistence/platform-docs.service.js';
import { readStationAnnouncements, writeStationAnnouncements } from '../dist/persistence/operations-store.js';
import { canonicalizeStationAnnouncements } from '../dist/persistence/station-announcement-broadcast.js';
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
    pinned: false,
    listed: true,
    ...overrides,
  };
}

test('公告首次发布：规范化落库并广播给全员', async () => {
  const service = new PlatformDocsService(prisma, {});

  const saved = await service.putDoc('ws-test', 'station-announcements', {
    revision: 0,
    items: [
      announcement({ title: '  功能上线：三货架  ', badge: ' 上线 ', badgeColor: 'red', published: false }),
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
  assert.equal(saved.payload.items.every((item) => item.pinned === false && !('published' in item)), true);

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

test('置顶及取消置顶保留已读态，删除才撤回消息与各人已读态', async () => {
  await seedAnnouncements(1, [announcement()]);
  await broadcastMessage('ann-launch');
  const readAt = new Date('2026-09-02T10:00:00.000Z');
  await prisma.inboxUserMessageState.create({ data: { userId: 'u-1', messageId: 'ann-launch', readAt } });
  const service = new PlatformDocsService(prisma, {});

  await service.putDoc('ws-test', 'station-announcements', {
    revision: 1,
    items: [announcement({ pinned: true })],
  });
  assert.notEqual(await message('ann-launch'), null);
  assert.equal((await prisma.inboxUserMessageState.findFirst()).readAt.toISOString(), readAt.toISOString());

  await service.putDoc('ws-test', 'station-announcements', {
    revision: 2,
    items: [announcement({ pinned: false })],
  });
  assert.equal((await prisma.inboxUserMessageState.findFirst()).readAt.toISOString(), readAt.toISOString());

  await service.putDoc('ws-test', 'station-announcements', { revision: 3, items: [] });
  assert.equal(await message('ann-launch'), null);
  assert.equal(await prisma.inboxUserMessageState.count(), 0);
});

test('下架撤回消息和已读态但保留公告，重新上架后再次广播', async () => {
  await seedAnnouncements(1, [announcement()]);
  await broadcastMessage('ann-launch');
  const readAt = new Date('2026-09-02T10:00:00.000Z');
  await prisma.inboxUserMessageState.create({ data: { userId: 'u-1', messageId: 'ann-launch', readAt } });
  const service = new PlatformDocsService(prisma, {});

  const hidden = await service.putDoc('ws-test', 'station-announcements', {
    revision: 1,
    items: [announcement({ listed: false })],
  });
  assert.equal(hidden.payload.items[0].listed, false);
  assert.equal(await message('ann-launch'), null);
  assert.equal(await prisma.inboxUserMessageState.count(), 0);
  assert.equal((await prisma.stationAnnouncement.findUnique({ where: { id: 'ann-launch' } })).listed, false);

  await service.putDoc('ws-test', 'station-announcements', {
    revision: 2,
    items: [announcement({ listed: true })],
  });
  assert.equal((await message('ann-launch')).title, '功能上线：三货架');
  assert.equal(await prisma.inboxUserMessageState.count(), 0);
});

test('置顶只接受布尔 true，置顶组与普通组都按发布时间倒序', () => {
  const { items } = canonicalizeStationAnnouncements({
    items: [
      announcement({ id: 'normal-new', publishedAt: '2026-10-01', pinned: 'true' }),
      announcement({ id: 'pin-old', publishedAt: '2026-08-01', pinned: true }),
      announcement({ id: 'pin-new', publishedAt: '2026-09-01', pinned: true }),
      announcement({ id: 'normal-old', publishedAt: '2026-07-01', pinned: 1 }),
      announcement({ id: 'normal-middle', publishedAt: '2026-08-01', pinned: undefined }),
    ],
  });
  assert.deepEqual(items.map((item) => [item.id, item.pinned]), [
    ['pin-new', true], ['pin-old', true], ['normal-new', false], ['normal-middle', false], ['normal-old', false],
  ]);
});

test('置顶落库后重新读取仍优先，取消置顶恢复发布时间顺序', async () => {
  const service = new PlatformDocsService(prisma, {});
  const older = announcement({ pinned: true });
  const newer = announcement({ id: 'ann-new', publishedAt: '2026-09-02T09:00:00.000Z' });
  await service.putDoc('ws-test', 'station-announcements', { revision: 0, items: [newer, older] });
  assert.equal((await prisma.stationAnnouncement.findUnique({ where: { id: older.id } })).pinned, true);
  assert.deepEqual((await readStationAnnouncements(prisma)).items.map((item) => item.id), [older.id, newer.id]);

  await service.putDoc('ws-test', 'station-announcements', {
    revision: 1,
    items: [newer, { ...older, pinned: false }],
  });
  assert.deepEqual((await readStationAnnouncements(prisma)).items.map((item) => item.id), [newer.id, older.id]);
});

test('迁移旧公告：保留正文及已读态，为旧下架公告补齐消息详情', async () => {
  const migration = readFileSync(
    new URL('../prisma/migrations/20261026000000_station_announcement_pinning/migration.sql', import.meta.url),
    'utf8',
  );
  const readAt = new Date('2026-09-02T10:00:00.000Z');
  await broadcastMessage('ann-launch');
  await prisma.inboxUserMessageState.create({ data: { userId: 'u-1', messageId: 'ann-launch', readAt } });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('ALTER TABLE "station_announcement" DROP COLUMN "pinned", ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true');
    await tx.$executeRawUnsafe(`INSERT INTO "station_announcement"
      ("id", "position", "title", "body", "badge", "published", "published_at", "updated_at") VALUES
      ('ann-launch', 0, '原公告', '原正文', 'AI上线', true, '2026-09-01T09:00:00.000Z', CURRENT_TIMESTAMP),
      ('ann-hidden', 1, '旧下架公告', '保留的正文', '维护', false, '2026-09-02T09:00:00.000Z', CURRENT_TIMESTAMP)`);
    for (const statement of migration.split(';').map((part) => part.trim()).filter(Boolean)) {
      await tx.$executeRawUnsafe(statement);
    }
  });

  const saved = await readStationAnnouncements(prisma);
  assert.equal(saved.items.length, 2);
  assert.equal(saved.items.every((item) => item.pinned === false && !('published' in item)), true);
  assert.equal(saved.items.find((item) => item.id === 'ann-hidden').body, '保留的正文');
  const hiddenMessage = await message('ann-hidden');
  assert.equal(hiddenMessage.title, '旧下架公告');
  assert.equal(hiddenMessage.body, '保留的正文');
  assert.equal(hiddenMessage.toUserId, '*');
  assert.equal(hiddenMessage.createdAt.toISOString(), '2026-09-02T09:00:00.000Z');
  assert.deepEqual(hiddenMessage.meta, { announcementTag: '维护' });
  assert.equal((await message('ann-launch')).title, '功能上线：三货架');
  assert.equal((await prisma.inboxUserMessageState.findFirst()).readAt.toISOString(), readAt.toISOString());
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
