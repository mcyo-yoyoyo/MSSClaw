/**
 * 站内公告类型与演示种子（与 store 解耦，避免循环依赖）
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

/** 系统自带示例公告（演示种子 / 运营「恢复默认」） */
export const STATION_ANNOUNCEMENT_SEEDS: StationAnnouncement[] = [
  {
    id: 'ann-ops-feature-scenario-ia',
    title: '功能上线：三货架与 MSS 工具集市',
    body: '平台已切换为「外部工具精选 · 公司工具推荐 · MSS工具集市」。按领域/区域筛选建设成果，场景分类进入 MSS 集市；详情见本条消息。',
    badge: '上线',
    publishedAt: '2026-07-22T09:00:00.000Z',
  },
  {
    id: 'ann-ops-training-academy',
    title: 'AI培训学院本周开课：场景打样工作坊',
    body: '本周四 15:00 开课，覆盖价格监测、内容生成、人岗速配等样板场景。报名与课件入口请在「MSS工具集市」对应场景或本消息详情中查看。',
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
