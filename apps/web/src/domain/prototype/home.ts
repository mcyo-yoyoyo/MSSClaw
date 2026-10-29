import type { HomeCategory } from '@/domain/prototype/types';
import type { DeptId } from '@/domain/orgTaxonomy';

/** 对话「智能建议」按职能预填的提示词。 */
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

export function getHomeSuggestion(category: HomeCategory): string {
  return HOME_SUGGESTIONS[category] ?? HOME_SUGGESTIONS.mkt;
}
