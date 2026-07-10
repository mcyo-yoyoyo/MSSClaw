import type { HomeCategory } from '@/domain/prototype/types';

export const HOME_CATEGORIES: { id: HomeCategory; label: string }[] = [
  { id: 'gtm', label: 'GTM' },
  { id: 'mkt', label: 'MKT' },
  { id: 'ecommerce', label: '电商' },
  { id: 'retail', label: '零售' },
  { id: 'service', label: '服务' },
  { id: 'channel', label: '渠道' },
  { id: 'hr', label: 'HR' },
];

/** 各业务线下关联的 Agent（可跨线复用） */
export const HOME_BIZ_AGENTS: Record<HomeCategory, string[]> = {
  gtm: ['agent-price-monitor', 'agent-data-analysis', 'agent-ppt'],
  mkt: ['agent-launch-sentiment', 'agent-survey', 'agent-doc-review', 'agent-ppt'],
  ecommerce: ['agent-review', 'agent-price-monitor', 'agent-retail-insight'],
  retail: ['agent-retail-insight', 'agent-training', 'agent-retail-coach'],
  service: ['agent-knowledge', 'agent-review', 'agent-launch-sentiment'],
  channel: ['agent-price-monitor', 'agent-retail-insight', 'agent-data-analysis'],
  hr: ['agent-hr-resume', 'agent-meeting', 'agent-file-organize'],
};

/** 各业务线下关联的 Skill */
export const HOME_BIZ_SKILLS: Record<HomeCategory, string[]> = {
  gtm: ['skill-price-monitor', 'skill-so-report', 'skill-data-analysis', 'skill-ppt-gen'],
  mkt: ['skill-launch-sentiment', 'skill-survey-insight', 'skill-doc-compliance', 'skill-ppt-gen', 'skill-doc-gen'],
  ecommerce: ['skill-review-cluster', 'skill-price-monitor', 'skill-retail-insight', 'skill-data-analysis'],
  retail: ['skill-retail-insight', 'skill-retail-coach', 'skill-training-gen', 'skill-so-report'],
  service: ['skill-complaint-sop', 'skill-rag', 'skill-review-cluster', 'skill-launch-sentiment'],
  channel: ['skill-price-monitor', 'skill-so-report', 'skill-data-analysis', 'skill-retail-insight'],
  hr: ['skill-jd-parser', 'skill-resume-screen', 'skill-interview-analysis', 'skill-meeting-minutes'],
};

export const HOME_SUGGESTIONS: Record<HomeCategory, string> = {
  gtm: '@价格监测 Agent 输出本周 18 国价格与 offer 异动，/价格监测 /so报表',
  mkt: '@舆情快报 Agent 生成本周发布会舆情快报，/舆情快报 /文档生成',
  ecommerce: '@评论分析 Agent 聚类 Amazon/Lazada 近一周差评主题，/评论分析',
  retail: '@零售洞察 Agent 输出门店 DOS 与转化洞察 π 报告，/零售洞察',
  service: '@知识 Agent 检索电池过热客诉 SOP 并给出话术，/客诉 /检索',
  channel: '@价格监测 Agent 对比渠道价差与代表处 SO，/价格监测 /so报表',
  hr: '@简历筛选 Agent 按 JD 筛选本周简历并输出匹配报告，/简历筛选 /jd解析',
};

export function getHomeSuggestion(category: HomeCategory): string {
  return HOME_SUGGESTIONS[category] ?? HOME_SUGGESTIONS.mkt;
}
