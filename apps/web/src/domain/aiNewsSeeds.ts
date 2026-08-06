/**
 * 每日 / 每周 AI 新闻 · 类型与演示种子
 */

export type AiNewsCadence = 'daily' | 'weekly';

export type AiNewsItem = {
  id: string;
  title: string;
  /** 跑马灯摘要；缺省用 title */
  summary?: string;
  body: string;
  cadence: AiNewsCadence;
  /** ISO 发布时间 */
  publishedAt: string;
  /** 可选来源说明 */
  source?: string;
};

/** 系统自带示例新闻（演示种子 / 运营「恢复默认」） */
export const AI_NEWS_SEEDS: AiNewsItem[] = [
  {
    id: 'ainews-2026-08-06',
    title: '今日 AI 简报：企业 Agent 落地加速',
    summary: '企业 Agent 落地加速，提效场景从办公走向经营分析',
    body: [
      '【今日要点】',
      '1. 多家厂商发布「可审计」Agent 运行时，强调工具调用可回放与权限最小化。',
      '2. 办公提效赛道向「经营分析 / 渠道 SO」延伸，多源取数 + 周报自动化仍是高频刚需。',
      '3. 建议本周关注：场景技能打样是否已有金牌案例与 How to，便于一线复制。',
      '',
      '本条由平台运营维护，订阅 WeLink 推送即将开通。',
    ].join('\n'),
    cadence: 'daily',
    publishedAt: '2026-08-06T08:00:00.000Z',
    source: 'MSS AI 运营整理',
  },
  {
    id: 'ainews-2026-08-05',
    title: '今日 AI 简报：多模态与知识库检索',
    summary: '多模态文档理解与知识库检索成为客服 / 质量条线热点',
    body: [
      '【今日要点】',
      '1. 文档解析 + RAG 组合在客诉 SOP、结算核验等场景继续放量。',
      '2. 评测重点从「答得像」转向「引用可核验、越权可拦截」。',
      '3. 平台侧：可在 MSS 工具集市对照「综履 / 客诉」案例与技能包。',
    ].join('\n'),
    cadence: 'daily',
    publishedAt: '2026-08-05T08:00:00.000Z',
    source: 'MSS AI 运营整理',
  },
  {
    id: 'ainews-week-2026-w31',
    title: '本周 AI 周报：货架与场景建设节奏',
    summary: '三货架运营节奏与场景技能热度反馈机制',
    body: [
      '【本周回顾】',
      '· 外部工具精选 / 公司工具推荐 / MSS 工具集市三分法已稳定。',
      '· 建议一线对常用技能点赞，便于运营调整置顶与赋能课排期。',
      '· 下期预告：每日 AI 新闻站内触达 + WeLink 订阅推送（规划中）。',
    ].join('\n'),
    cadence: 'weekly',
    publishedAt: '2026-08-04T09:00:00.000Z',
    source: 'MSS AI 运营整理',
  },
];
