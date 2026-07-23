import type { InboxMessage } from '@/domain/inbox';
import { useInboxStore } from '@/stores/inboxStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';

/**
 * 站内公告（能力运营配置 · 广播条）
 * 点击后跳转「我的消息」查看全文；同步写入 inbox 广播消息。
 */
export type StationAnnouncementBadge = '上线' | '培训' | '通知';

export type StationAnnouncement = {
  id: string;
  title: string;
  body: string;
  badge: StationAnnouncementBadge;
  /** ISO 发布时间 */
  publishedAt: string;
};

/** 演示种子：正式环境由门户运营配置下发 */
export const STATION_ANNOUNCEMENTS: StationAnnouncement[] = [
  {
    id: 'ann-ops-feature-scenario-ia',
    title: '功能上线：业务场景主线与场景技能',
    body: '找案例 / 做任务已对齐学·干双轨：学 · 找案例看样板，干 · 做任务选技能开工；组织视角筛选已同步上线。详情与指引见本条消息。',
    badge: '上线',
    publishedAt: '2026-07-22T09:00:00.000Z',
  },
  {
    id: 'ann-ops-training-academy',
    title: 'AI培训学院本周开课：场景打样工作坊',
    body: '本周四 15:00 开课，覆盖价格监测、内容生成、人岗速配等样板场景。报名与课件入口请在「找案例」场景卡或本消息详情中查看。',
    badge: '培训',
    publishedAt: '2026-07-21T10:30:00.000Z',
  },
  {
    id: 'ann-ops-skill-engagement',
    title: '通知：场景技能支持点赞与热度反馈',
    body: '请一线同学对常用技能点赞或反馈，能力运营将据此优化推荐排序与上架优先级。',
    badge: '通知',
    publishedAt: '2026-07-20T14:00:00.000Z',
  },
  {
    id: 'ann-ops-inbox-hub',
    title: '通知：站内公告与交付推送统一进「我的消息」',
    body: '平台广播、培训开课与任务交付推送均汇集至「我的消息」。请及时查收未读，避免错过关键上线与协作通知。',
    badge: '通知',
    publishedAt: '2026-07-19T11:00:00.000Z',
  },
];

/** 将运营公告同步为广播站内消息（幂等） */
export function ensureStationAnnouncementInbox() {
  const { messages } = useInboxStore.getState();
  const existing = new Set(messages.map((m) => m.id));
  const toAdd: InboxMessage[] = STATION_ANNOUNCEMENTS.filter((a) => !existing.has(a.id)).map(
    (a) => ({
      id: a.id,
      kind: 'system',
      title: a.title,
      body: a.body,
      fromName: '能力运营',
      toUserId: '*',
      createdAt: a.publishedAt,
      read: false,
    }),
  );
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
