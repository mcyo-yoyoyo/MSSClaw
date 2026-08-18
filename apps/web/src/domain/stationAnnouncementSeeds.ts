/**
 * 站内公告类型与演示种子（与 store 解耦，避免循环依赖）
 */

/** 首页站内动态仅露出 AI 相关三类（另含跑马灯中的 AI快讯） */
export type StationAnnouncementBadge = 'AI上线' | 'AI培训';

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
    body: '平台已切换为「外部工具精选 · 内部办公推荐 · AI工具hub」。按领域/区域筛选建设成果，场景分类进入 MSS 集市；详情见本条消息。',
    badge: 'AI上线',
    publishedAt: '2026-07-22T09:00:00.000Z',
  },
  {
    id: 'ann-ops-training-academy',
    title: 'AI培训学院本周开课：场景打样工作坊',
    body: '本周四 15:00 开课，覆盖价格监测、内容生成、人岗速配等样板场景。报名与课件入口请在「AI工具hub」对应场景或本消息详情中查看。',
    badge: 'AI培训',
    publishedAt: '2026-07-21T10:30:00.000Z',
  },
];
