import type { HomeCategory } from '@/domain/prototype/types';
import { HQ_DEPTS, type DeptId, type RegionId } from '@/domain/orgTaxonomy';

/** 首页「机关职能」筛选 chips（与 HQ_DEPTS 同源） */
export const HOME_CATEGORIES: { id: HomeCategory; label: string }[] = HQ_DEPTS.map((d) => ({
  id: d.id,
  label: d.label,
}));

/** 各职能线下关联的 Agent（可跨线复用） */
export const HOME_BIZ_AGENTS: Record<DeptId, string[]> = {
  gtm: ['agent-price-monitor', 'agent-data-analysis', 'agent-ppt'],
  mkt: ['agent-launch-sentiment', 'agent-survey', 'agent-doc-review', 'agent-ppt'],
  ecommerce: ['agent-review', 'agent-price-monitor', 'agent-retail-insight'],
  retail: ['agent-retail-insight', 'agent-training', 'agent-retail-coach'],
  service: ['agent-knowledge', 'agent-review', 'agent-launch-sentiment'],
  channel: ['agent-price-monitor', 'agent-retail-insight', 'agent-data-analysis'],
  hr: ['agent-hr-resume', 'agent-meeting', 'agent-file-organize'],
  finance: ['agent-data-analysis', 'agent-ppt', 'agent-knowledge'],
  quality: ['agent-doc-review', 'agent-knowledge', 'agent-data-analysis'],
};

/** 各一线区域关联的 Agent（演示：区域特色能力组合） */
export const HOME_REGION_AGENTS: Record<RegionId, string[]> = {
  china: ['agent-retail-insight', 'agent-data-analysis', 'agent-knowledge', 'agent-ppt'],
  apac: ['agent-review', 'agent-retail-coach', 'agent-training', 'agent-price-monitor'],
  mea: ['agent-price-monitor', 'agent-data-analysis', 'agent-knowledge'],
  latam: ['agent-price-monitor', 'agent-retail-insight', 'agent-data-analysis', 'agent-ppt'],
  europe: ['agent-doc-review', 'agent-review', 'agent-launch-sentiment', 'agent-price-monitor'],
  eurasia: ['agent-price-monitor', 'agent-retail-insight', 'agent-knowledge'],
};

/** 各职能线下关联的 Skill */
export const HOME_BIZ_SKILLS: Record<DeptId, string[]> = {
  gtm: ['skill-price-monitor', 'skill-so-report', 'skill-data-analysis', 'skill-ppt-gen'],
  mkt: ['skill-launch-sentiment', 'skill-survey-insight', 'skill-doc-compliance', 'skill-ppt-gen', 'skill-doc-gen'],
  ecommerce: ['skill-review-cluster', 'skill-price-monitor', 'skill-retail-insight', 'skill-data-analysis'],
  retail: ['skill-retail-insight', 'skill-retail-coach', 'skill-training-gen', 'skill-so-report'],
  service: ['skill-complaint-sop', 'skill-rag', 'skill-review-cluster', 'skill-launch-sentiment'],
  channel: ['skill-price-monitor', 'skill-so-report', 'skill-data-analysis', 'skill-retail-insight'],
  hr: ['skill-jd-parser', 'skill-resume-screen', 'skill-interview-analysis', 'skill-meeting-minutes'],
  finance: ['skill-data-analysis', 'skill-so-report', 'skill-ppt-gen', 'skill-doc-gen'],
  quality: ['skill-doc-compliance', 'skill-rag', 'skill-data-analysis', 'skill-doc-gen'],
};

export const HOME_SUGGESTIONS: Record<DeptId, string> = {
  gtm: '@价格监测 Agent 输出本周 18 国价格与 offer 异动，/价格监测 /so报表',
  mkt: '@舆情快报 Agent 生成本周发布会舆情快报，/舆情快报 /文档生成',
  ecommerce: '@评论分析 Agent 聚类 Amazon/Lazada 近一周差评主题，/评论分析',
  retail: '@零售洞察 Agent 输出门店 DOS 与转化洞察 π 报告，/零售洞察',
  service: '@知识 Agent 检索电池过热客诉 SOP 并给出话术，/客诉 /检索',
  channel: '@价格监测 Agent 对比渠道价差与代表处 SO，/价格监测 /so报表',
  hr: '@简历筛选 Agent 按 JD 筛选本周简历并输出匹配报告，/简历筛选 /jd解析',
  finance: '@数据分析 Agent 汇总本月区域返利与结算差异，输出财经周报，/数据分析 /so报表',
  quality: '@文档解读 Agent 抽检本周营销物料医疗用语合规风险，/文档合规',
};

export const HOME_REGION_SUGGESTIONS: Record<RegionId, string> = {
  china: '@零售洞察 Agent 输出中国区门店 DOS 与转化周报，/零售洞察 /数据分析',
  apac: '@评论分析 Agent 聚类亚太电商近一周差评主题，/评论分析',
  mea: '@价格监测 Agent 输出中东非重点市场本周价盘异动，/价格监测',
  latam: '@价格监测 Agent 输出拉美 18 国价格与 offer 异动，/价格监测 /so报表',
  europe: '@文档解读 Agent 核查 EU 准入与环保宣称合规，/文档合规',
  eurasia: '@零售洞察 Agent 输出欧亚门店 DOS 与转化周报，/零售洞察',
};

export function getHomeSuggestion(category: HomeCategory): string {
  return HOME_SUGGESTIONS[category] ?? HOME_SUGGESTIONS.mkt;
}

export function getHomeRegionSuggestion(regionId: RegionId): string {
  return HOME_REGION_SUGGESTIONS[regionId] ?? HOME_REGION_SUGGESTIONS.latam;
}
