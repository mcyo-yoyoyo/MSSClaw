/** 电渠评论场景：采集 → 翻译 → 分析 三段式专家链路 */

export const REVIEW_PIPELINE_STEPS = [
  {
    agentId: 'agent-review-collect',
    skillId: 'skill-review-collect',
    label: '评分采集',
    command: '/评论采集',
    blurb: '采集 Amazon 等购买页订单评论并清洗',
  },
  {
    agentId: 'agent-review-translate',
    skillId: 'skill-review-translate',
    label: '语种翻译',
    command: '/评论翻译',
    blurb: '多语种统一译为英语与中文，保留原文',
  },
  {
    agentId: 'agent-review',
    skillId: 'skill-review-cluster',
    label: '评论分析',
    command: '/评论分析',
    blurb: '情感判断、用户数据挖掘与行动建议',
  },
] as const;

export const REVIEW_PIPELINE_CASE_IDS = new Set([
  'portal-case-apac-voc',
  'portal-insight-apac-review',
]);

export function isReviewPipelineCase(caseId?: string | null): boolean {
  return Boolean(caseId && REVIEW_PIPELINE_CASE_IDS.has(caseId));
}
