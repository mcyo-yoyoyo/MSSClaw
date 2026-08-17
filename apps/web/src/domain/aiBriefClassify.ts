/** AI 快讯分类与 MSS 业务相关度（基于标题/摘要关键词，不改源数据） */

export type AiBriefCategoryId = 'model' | 'tool' | 'oss' | 'policy' | 'industry';

export const AI_BRIEF_CATEGORIES: {
  id: AiBriefCategoryId;
  label: string;
}[] = [
  { id: 'model', label: '大模型' },
  { id: 'tool', label: '工具' },
  { id: 'oss', label: '开源' },
  { id: 'policy', label: '政策' },
  { id: 'industry', label: '行业' },
];

const CATEGORY_RULES: { id: AiBriefCategoryId; re: RegExp }[] = [
  {
    id: 'policy',
    re: /政策|监管|合规|法案|条例|网信|欧盟|白宫|出口管制|安全评估|数据出境|个人信息/,
  },
  {
    id: 'oss',
    re: /开源|开源模型|权重|Hugging\s*Face|GitHub|Apache|MIT\b|社区版|开源许可/,
  },
  {
    id: 'tool',
    re: /工具|助手|Copilot|Skill|Agent|插件|IDE|Cursor|上线|发布.*产品|办公套件/,
  },
  {
    id: 'model',
    re: /大模型|语言模型|LLM|GPT|Claude|Gemini|DeepSeek|通义|千问|Qwen|Kimi|豆包|参数|基座模型|多模态/,
  },
  {
    id: 'industry',
    re: /行业|医疗|金融|汽车|零售|制造|教育|能源|政务|运营商|政企|供应链/,
  },
];

const MSS_FIT_RE =
  /营销|零售|客服|渠道|供应链|办公|知识|Skill|Agent|华为|企业|销售|门店|终端|运营商|政企|数字化|提效|Copilot|助手|会议|文档|报告|笔记|搜索|周报|制度|MSS|门店运营|渠道管理/;

export function classifyAiBriefItem(input: {
  title: string;
  summary?: string;
  category?: string;
}): { category: AiBriefCategoryId; mssFit: boolean } {
  const text = `${input.title} ${input.summary ?? ''}`;
  const sourceCategory: Partial<Record<string, AiBriefCategoryId>> = {
    'ai-models': 'model',
    'ai-products': 'tool',
    tip: 'tool',
    paper: 'oss',
    industry: 'industry',
  };
  const category =
    (input.category ? sourceCategory[input.category] : undefined) ??
    CATEGORY_RULES.find((r) => r.re.test(text))?.id ??
    'industry';
  return { category, mssFit: MSS_FIT_RE.test(text) };
}

export function getAiBriefCategoryLabel(id: AiBriefCategoryId): string {
  return AI_BRIEF_CATEGORIES.find((c) => c.id === id)?.label ?? '行业';
}
