/**
 * Tool → 业务场景篮子（货架左侧「场景」筛选）
 * 资产字段优先，其次静态映射，再按 AI 能力轴回退。
 */

import type { AiToolNavCategoryId } from '@/domain/aiToolCategories';
import { resolveAiToolNavCategories } from '@/domain/aiToolCategories';
import type { BusinessScenarioId } from '@/domain/businessScenarios';
import type { PrototypeToolSeed } from '@/domain/prototype/types';

/** 显式 toolId → 主业务场景（可多选） */
export const TOOL_TO_BUSINESS_SCENARIOS: Record<string, BusinessScenarioId[]> = {
  // 内部 AI
  'tool-hw-assistant': ['S7', 'S6'],
  'tool-hw-xiaowei': ['S7'],
  'tool-hw-w3-qa': ['S6', 'S7'],
  'tool-hw-cloudnote': ['S7'],
  'tool-hw-meeting': ['S7'],
  'tool-hw-xiaoluban': ['S7'],
  'tool-hw-digital-line': ['S7'],

  // 外部 SaaS · 按典型用途
  'tool-saas-chatgpt': ['S7', 'S2'],
  'tool-saas-claude': ['S7', 'S2'],
  'tool-saas-gemini': ['S7', 'S1'],
  'tool-saas-doubao': ['S7', 'S2'],
  'tool-saas-tongyi': ['S7', 'S2'],
  'tool-saas-wenxin': ['S7'],
  'tool-saas-deepseek': ['S7'],
  'tool-saas-yuanbao': ['S7', 'S1'],
  'tool-saas-perplexity': ['S1'],
  'tool-saas-kimi': ['S1', 'S7'],
  'tool-saas-metaso': ['S1'],
  'tool-saas-jasper': ['S2'],
  'tool-saas-copyai': ['S2'],
  'tool-saas-notion-ai': ['S7', 'S2'],
  'tool-saas-gamma': ['S2', 'S7'],
  'tool-saas-workbuddy': ['S7'],
  'tool-saas-ms-copilot': ['S7'],
  'tool-saas-feishu': ['S7'],
  'tool-saas-cursor': ['S7'],
  'tool-saas-claude-code': ['S7'],
  'tool-saas-copilot': ['S7'],
  'tool-saas-windsurf': ['S7'],
  'tool-saas-trae': ['S7'],
  'tool-saas-midjourney': ['S2'],
  'tool-saas-ideogram': ['S2'],
  'tool-saas-jimeng': ['S2'],
  'tool-saas-wanxiang': ['S2'],
  'tool-saas-flux': ['S2'],
  'tool-saas-runway': ['S2'],
  'tool-saas-kling': ['S2'],
  'tool-saas-pika': ['S2'],
  'tool-saas-luma': ['S2'],
  'tool-saas-capcut': ['S2'],
};

/** AI 能力轴 → 默认业务篮子 */
const CAPABILITY_TO_BUSINESS: Record<AiToolNavCategoryId, BusinessScenarioId[]> = {
  chat: ['S7'],
  search: ['S1'],
  write: ['S2'],
  office: ['S7'],
  code: ['S7'],
  image: ['S2'],
  video: ['S2'],
};

/** scenarioTags 关键词 → 业务场景 */
const TAG_HINTS: Array<{ re: RegExp; ids: BusinessScenarioId[] }> = [
  { re: /价格|offer|价盘|竞品|舆情|评论/, ids: ['S1'] },
  { re: /翻译|本地化|文案|写作|培训|课件/, ids: ['S2', 'S3'] },
  { re: /门店|陪练|销售|话术/, ids: ['S3'] },
  { re: /合规|结算|综履|对账|核验/, ids: ['S4'] },
  { re: /客诉|客服|工单|WeCom/, ids: ['S5'] },
  { re: /知识|RAG|检索|问答/, ids: ['S6'] },
  { re: /招聘|HR|面试|简历|会议|办公/, ids: ['S7'] },
  { re: /SO|数据分析|经营|报表/, ids: ['S8'] },
];

export function resolveToolBusinessScenarios(
  tool: Pick<PrototypeToolSeed, 'id' | 'businessScenarioIds' | 'tags' | 'scenarioTags'>,
): BusinessScenarioId[] {
  if (tool.businessScenarioIds?.length) return [...tool.businessScenarioIds];

  const byId = TOOL_TO_BUSINESS_SCENARIOS[tool.id];
  if (byId?.length) return [...byId];

  const fromTags = new Set<BusinessScenarioId>();
  const blob = [...(tool.tags ?? []), ...(tool.scenarioTags ?? [])].join(' ');
  for (const hint of TAG_HINTS) {
    if (hint.re.test(blob)) hint.ids.forEach((id) => fromTags.add(id));
  }
  if (fromTags.size) return [...fromTags];

  const caps = resolveAiToolNavCategories(tool as PrototypeToolSeed);
  const fromCap = new Set<BusinessScenarioId>();
  for (const c of caps) {
    CAPABILITY_TO_BUSINESS[c]?.forEach((id) => fromCap.add(id));
  }
  return fromCap.size ? [...fromCap] : ['S7'];
}

export function toolMatchesBusinessScenario(
  tool: Pick<PrototypeToolSeed, 'id' | 'businessScenarioIds' | 'tags' | 'scenarioTags'>,
  business: BusinessScenarioId | 'all',
): boolean {
  if (business === 'all') return true;
  return resolveToolBusinessScenarios(tool).includes(business);
}
