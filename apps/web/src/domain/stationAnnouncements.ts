/**
 * 站内公告（门户运营 · 首页公告条）
 *
 * 首页只滚动标题，点标题进「我的消息」看全文；标题右侧的 × 是「擦掉」，等同已读。
 * 已读态是每人一份的 inbox 状态（服务端 InboxUserMessageState），所以公告在发布时
 * 就由服务端落成一条全员广播消息，首页按「未读」过滤即可。
 */

import type { InboxMessage } from '@/domain/inbox';
import {
  STATION_ANNOUNCEMENT_SEEDS,
  type StationAnnouncement,
  type StationAnnouncementTag,
} from '@/domain/stationAnnouncementSeeds';
import { getCurrentUserId } from '@/domain/currentUser';
import { canUseInboxApi } from '@/api/inboxApi';
import { useInboxStore } from '@/stores/inboxStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useStationAnnouncementStore } from '@/stores/stationAnnouncementStore';

export type { StationAnnouncement, StationAnnouncementTag };
export { STATION_ANNOUNCEMENT_SEEDS };

const SESSION_KEY = 'mss-claw:station-announce-dismissed';

/**
 * 本次会话内已擦掉的公告。游客没有账号已读态，登录用户在 markRead 请求失败时
 * 也要立刻消失——两种情况都靠它兜住，刷新后再由服务端已读态接手。
 */
function sessionDismissed(): Set<string> {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(list) ? list.map(String) : []);
  } catch {
    return new Set();
  }
}

function rememberDismissed(id: string) {
  try {
    const next = sessionDismissed();
    next.add(id);
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify([...next]));
  } catch {
    /* 隐私模式下 sessionStorage 不可用：本次渲染已经移除，刷新后按服务端已读态 */
  }
}

/** 首页公告条 / 消息同步：仅已上架公告 */
export function getStationAnnouncements(): StationAnnouncement[] {
  return useStationAnnouncementStore.getState().listPublished();
}

/** 首页公告条的数据源：已上架且当前用户未读、未擦掉 */
export function listUnreadStationAnnouncements(): StationAnnouncement[] {
  const dismissed = sessionDismissed();
  const readIds = new Set(
    useInboxStore
      .getState()
      .messages.filter((message) => message.read)
      .map((message) => message.id),
  );
  return getStationAnnouncements().filter(
    (announcement) => !readIds.has(announcement.id) && !dismissed.has(announcement.id),
  );
}

/**
 * 没有后端时（静态演示构建）把公告合成进消息列表，保证点标题还能看到全文。
 * 连了后端就什么都不做：广播消息在运营发布那一刻已经落库。
 */
export function ensureStationAnnouncementInbox() {
  if (canUseInboxApi()) return;
  const announcements = getStationAnnouncements();
  if (!announcements.length) return;
  const { messages } = useInboxStore.getState();
  const existing = new Set(messages.map((m) => m.id));
  const toAdd: InboxMessage[] = announcements
    .filter((a) => !existing.has(a.id))
    .map((a) => ({
      id: a.id,
      kind: 'announce',
      title: a.title,
      body: a.body,
      fromName: '能力运营',
      toUserId: '*',
      createdAt: a.publishedAt,
      read: false,
      meta: { announcementTag: a.badge },
    }));
  if (!toAdd.length) return;
  useInboxStore.setState((s) => ({ messages: [...toAdd, ...s.messages] }));
  useInboxStore.getState().persist();
}

/** 擦掉一条公告：等同已读，不再进入首页公告条 */
export function dismissStationAnnouncement(id: string) {
  rememberDismissed(id);
  if (!getCurrentUserId()) return;
  useInboxStore.getState().markRead(id);
}

/** 点公告标题：标已读并跳到「我的消息」展开这条详情 */
export function openStationAnnouncement(id: string) {
  ensureStationAnnouncementInbox();
  // 游客点开只会撞上登录弹窗，正文一个字都没看到，这时不能算已读、更不能把它从
  // 公告条里抹掉；登录后再点才记已读。主动点 × 擦掉是另一回事，游客也生效。
  if (getCurrentUserId()) {
    rememberDismissed(id);
    useInboxStore.getState().markRead(id);
  }
  useNavigationIntentStore.getState().focusMessage(id);
  useAppViewStore.getState().setAppView('messages');
}

export function openStationAnnouncementList() {
  ensureStationAnnouncementInbox();
  useAppViewStore.getState().setAppView('messages');
}
