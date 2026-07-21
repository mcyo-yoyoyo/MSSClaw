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
  ecommerce: [
    'agent-review-collect',
    'agent-review-translate',
    'agent-review',
    'agent-price-monitor',
  ],
  retail: ['agent-retail-insight', 'agent-training', 'agent-retail-coach'],
  service: ['agent-knowledge', 'agent-review', 'agent-review-collect', 'agent-launch-sentiment'],
  channel: ['agent-price-monitor', 'agent-retail-insight', 'agent-data-analysis'],
  hr: ['agent-hr-resume', 'agent-meeting', 'agent-file-organize'],
  finance: ['agent-data-analysis', 'agent-ppt', 'agent-knowledge'],
  quality: ['agent-doc-review', 'agent-knowledge', 'agent-data-analysis'],
};

/** 各一线区域关联的 Agent（演示：区域特色能力组合） */
export const HOME_REGION_AGENTS: Record<RegionId, string[]> = {
  china: ['agent-retail-insight', 'agent-data-analysis', 'agent-knowledge', 'agent-ppt'],
  apac: [
    'agent-review-collect',
    'agent-review-translate',
    'agent-review',
    'agent-price-monitor',
  ],
  mea: ['agent-price-monitor', 'agent-data-analysis', 'agent-knowledge'],
  latam: ['agent-price-monitor', 'agent-retail-insight', 'agent-data-analysis', 'agent-ppt'],
  europe: [
    'agent-doc-review',
    'agent-review-translate',
    'agent-review',
    'agent-price-monitor',
  ],
  eurasia: ['agent-price-monitor', 'agent-retail-insight', 'agent-knowledge'],
};

/** 各职能线下关联的 Skill（AI任务「领域」推荐） */
export const HOME_BIZ_SKILLS: Record<DeptId, string[]> = {
  gtm: ['skill-price-monitor', 'skill-so-report', 'skill-data-analysis', 'skill-ppt-gen'],
  mkt: ['skill-launch-sentiment', 'skill-survey-insight', 'skill-doc-compliance', 'skill-ppt-gen'],
  ecommerce: [
    'skill-review-collect',
    'skill-review-translate',
    'skill-review-cluster',
    'skill-price-monitor',
  ],
  retail: ['skill-retail-insight', 'skill-retail-coach', 'skill-training-gen', 'skill-so-report'],
  service: [
    'skill-complaint-sop',
    'skill-rag',
    'skill-review-cluster',
    'skill-review-translate',
  ],
  channel: ['skill-price-monitor', 'skill-so-report', 'skill-data-analysis', 'skill-retail-insight'],
  hr: ['skill-jd-parser', 'skill-resume-screen', 'skill-interview-analysis', 'skill-meeting-minutes'],
  finance: ['skill-data-analysis', 'skill-so-report', 'skill-ppt-gen', 'skill-doc-gen'],
  quality: ['skill-doc-compliance', 'skill-rag', 'skill-data-analysis', 'skill-doc-gen'],
};

/** 各一线区域关联的 Skill（AI任务「区域」推荐） */
export const HOME_REGION_SKILLS: Record<RegionId, string[]> = {
  china: ['skill-retail-insight', 'skill-data-analysis', 'skill-rag', 'skill-ppt-gen'],
  apac: [
    'skill-review-collect',
    'skill-review-translate',
    'skill-review-cluster',
    'skill-price-monitor',
  ],
  mea: ['skill-price-monitor', 'skill-data-analysis', 'skill-so-report', 'skill-rag'],
  latam: ['skill-price-monitor', 'skill-retail-insight', 'skill-data-analysis', 'skill-ppt-gen'],
  europe: [
    'skill-doc-compliance',
    'skill-review-translate',
    'skill-review-cluster',
    'skill-price-monitor',
  ],
  eurasia: ['skill-price-monitor', 'skill-retail-insight', 'skill-rag', 'skill-complaint-sop'],
};

export const HOME_SUGGESTIONS: Record<DeptId, string> = {
  gtm: '/价格监测 输出本周 18 国价格与 offer 异动，并可接 /so报表',
  mkt: '/舆情快报 生成本周发布会舆情快报，需要成稿时再 /文档生成',
  ecommerce: '/评论采集 拉取 Amazon 3C 评论，再 /评论翻译 /评论分析 出洞察',
  retail: '/零售洞察 输出门店 DOS 与转化洞察 π 报告',
  service: '/客诉 检索电池过热 SOP 话术，必要时 /检索 补知识',
  channel: '/价格监测 对比渠道价差，再用 /so报表 看代表处',
  hr: '/简历筛选 按 JD 初筛本周简历；可先 /jd解析',
  finance: '/数据分析 汇总区域返利与结算差异，输出财经周报',
  quality: '/合规筛查 抽检本周营销物料医疗用语风险',
};

export const HOME_REGION_SUGGESTIONS: Record<RegionId, string> = {
  china: '/零售洞察 输出中国区门店 DOS 与转化周报',
  apac: '/评论采集 采集亚太电渠评论，再 /评论翻译 /评论分析',
  mea: '/价格监测 输出中东非重点市场本周价盘异动',
  latam: '/价格监测 输出拉美价格与 offer 异动',
  europe: '/合规筛查 核查 EU 准入与环保宣称合规',
  eurasia: '/零售洞察 输出欧亚门店 DOS 与转化周报',
};

export function getHomeSuggestion(category: HomeCategory): string {
  return HOME_SUGGESTIONS[category] ?? HOME_SUGGESTIONS.mkt;
}

export function getHomeRegionSuggestion(regionId: RegionId): string {
  return HOME_REGION_SUGGESTIONS[regionId] ?? HOME_REGION_SUGGESTIONS.latam;
}
