/**
 * 站内公告（能力运营配置 · 广播条）
 * 点击后跳转「我的消息」查看全文；同步写入 inbox 广播消息。
 * 正式环境由门户运营配置；演示开启且无本地配置时由 store 灌入种子。
 */

import type { InboxMessage } from '@/domain/inbox';
import {
  STATION_ANNOUNCEMENT_SEEDS,
  type StationAnnouncement,
  type StationAnnouncementBadge,
} from '@/domain/stationAnnouncementSeeds';
import { useInboxStore } from '@/stores/inboxStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useStationAnnouncementStore } from '@/stores/stationAnnouncementStore';

export type { StationAnnouncement, StationAnnouncementBadge };
export { STATION_ANNOUNCEMENT_SEEDS };

/** @deprecated 使用 getStationAnnouncements()；保留别名兼容旧引用 */
export const STATION_ANNOUNCEMENTS = STATION_ANNOUNCEMENT_SEEDS;

/** 首页跑马灯 / 消息同步：仅已上架公告 */
export function getStationAnnouncements(): StationAnnouncement[] {
  return useStationAnnouncementStore.getState().listPublished();
}

/** 将运营公告同步为广播站内消息（幂等） */
export function ensureStationAnnouncementInbox() {
  const announcements = getStationAnnouncements();
  if (!announcements.length) return;
  const { messages } = useInboxStore.getState();
  const existing = new Set(messages.map((m) => m.id));
  const toAdd: InboxMessage[] = announcements
    .filter((a) => !existing.has(a.id))
    .map((a) => ({
      id: a.id,
      kind: 'system',
      title: a.title,
      body: a.body,
      fromName: '能力运营',
      toUserId: '*',
      createdAt: a.publishedAt,
      read: false,
    }));
  if (!toAdd.length) return;
  useInboxStore.setState((s) => ({ messages: [...toAdd, ...s.messages] }));
  useInboxStore.getState().persist();
}

export function openStationAnnouncement(id: string) {
  ensureStationAnnouncementInbox();
  useInboxStore.getState().markRead(id);
  useNavigationIntentStore.getState().focusMessage(id);
  useAppViewStore.getState().setAppView('messages');
}

export function openStationAnnouncementList() {
  ensureStationAnnouncementInbox();
  useAppViewStore.getState().setAppView('messages');
}
