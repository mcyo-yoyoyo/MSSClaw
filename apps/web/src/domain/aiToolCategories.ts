import type { PrototypeToolSeed } from '@/domain/prototype/types';

/**
 * 发现页 · 马上能用 · AI 能力轴
 * 排序逻辑：对话 → 检索 → 文本创作 → 办公协同 → 代码 → 视觉生成
 */
export const AI_TOOL_NAV_CATEGORIES = [
  { id: 'chat', label: 'AI对话', icon: 'fa-comments', blurb: '通用对话与多模态助手' },
  { id: 'search', label: 'AI搜索', icon: 'fa-magnifying-glass', blurb: '检索 / 研究 / 引用来源' },
  { id: 'write', label: 'AI写作', icon: 'fa-pen', blurb: '文案 / 长文 / 营销写作' },
  { id: 'office', label: 'AI办公', icon: 'fa-briefcase', blurb: '文档 / 会议 / 协作提效' },
  { id: 'code', label: 'AI编程', icon: 'fa-code', blurb: '编码 / Agent / 补全' },
  { id: 'image', label: 'AI生图', icon: 'fa-image', blurb: '图像与视觉物料' },
  { id: 'video', label: 'AI生视频', icon: 'fa-video', blurb: '视频生成与剪辑' },
] as const;

export type AiToolNavCategoryId = (typeof AI_TOOL_NAV_CATEGORIES)[number]['id'];

/** 马上能用 · 来源范围（默认外部） */
export const AI_TOOL_SCOPE_OPTIONS = [
  { id: 'external', label: '外部' },
  { id: 'internal', label: '内部' },
] as const;

export type AiToolScopeId = (typeof AI_TOOL_SCOPE_OPTIONS)[number]['id'];

/** 工具 id → 能力（可多选） */
const TOOL_ID_CAPABILITY: Record<string, AiToolNavCategoryId[]> = {
  // 对话 · 外部
  'tool-saas-chatgpt': ['chat'],
  'tool-saas-gemini': ['chat', 'search'],
  'tool-saas-doubao': ['chat', 'write'],
  'tool-saas-tongyi': ['chat', 'write'],
  'tool-saas-wenxin': ['chat'],
  'tool-saas-claude': ['chat', 'write'],
  'tool-saas-deepseek': ['chat', 'code'],
  'tool-saas-yuanbao': ['chat', 'search'],

  // 对话 · 内部
  'tool-hw-assistant': ['chat'],
  'tool-hw-xiaowei': ['chat'],
  'tool-hw-w3-qa': ['chat', 'search'],

  // 搜索
  'tool-saas-perplexity': ['search'],
  'tool-saas-kimi': ['search', 'chat'],
  'tool-saas-metaso': ['search'],

  // 写作 · 外部
  'tool-saas-jasper': ['write'],
  'tool-saas-copyai': ['write'],

  // 办公 · 外部
  'tool-saas-notion-ai': ['office', 'write'],
  'tool-saas-gamma': ['office', 'write'],
  'tool-saas-workbuddy': ['office', 'chat'],
  'tool-saas-ms-copilot': ['office'],
  'tool-saas-feishu': ['office'],

  // 办公 · 内部
  'tool-hw-meeting': ['office'],
  'tool-hw-cloudnote': ['office'],
  'tool-hw-digital-line': ['office', 'code'],

  // 编程 · 外部
  'tool-saas-cursor': ['code'],
  'tool-saas-claude-code': ['code'],
  'tool-saas-copilot': ['code'],
  'tool-saas-windsurf': ['code'],
  'tool-saas-trae': ['code'],

  // 编程 · 内部
  'tool-hw-xiaoluban': ['code'],

  // 生图
  'tool-saas-midjourney': ['image'],
  'tool-saas-ideogram': ['image'],
  'tool-saas-jimeng': ['video', 'image'],
  'tool-saas-wanxiang': ['image'],
  'tool-saas-flux': ['image'],

  // 生视频
  'tool-saas-runway': ['video'],
  'tool-saas-kling': ['video'],
  'tool-saas-pika': ['video'],
  'tool-saas-luma': ['video'],
  'tool-saas-capcut': ['video'],
};

/** tag → 能力 */
const TAG_TO_CAPABILITY: Record<string, AiToolNavCategoryId[]> = {
  对话: ['chat'],
  研究: ['search'],
  搜索: ['search'],
  写作: ['write'],
  协作: ['office'],
  设计: ['office'],
  办公: ['office'],
  会议: ['office'],
  笔记: ['office'],
  编码: ['code'],
  生图: ['image'],
  生视频: ['video'],
  效能: ['code'],
};

export function resolveAiToolNavCategories(tool: PrototypeToolSeed): AiToolNavCategoryId[] {
  const byId = TOOL_ID_CAPABILITY[tool.id];
  if (byId?.length) return byId;

  const fromTags = new Set<AiToolNavCategoryId>();
  for (const tag of [...(tool.tags ?? []), ...(tool.scenarioTags ?? [])]) {
    const mapped = TAG_TO_CAPABILITY[tag];
    mapped?.forEach((id) => fromTags.add(id));
  }
  if (fromTags.size) return [...fromTags];
  return ['chat'];
}

/** @deprecated 使用 resolveAiToolNavCategories */
export function resolveAiToolNavCategory(tool: PrototypeToolSeed): AiToolNavCategoryId | null {
  return resolveAiToolNavCategories(tool)[0] ?? null;
}

export function toolBelongsToNavCategory(
  tool: PrototypeToolSeed,
  categoryId: AiToolNavCategoryId,
): boolean {
  return resolveAiToolNavCategories(tool).includes(categoryId);
}

export function toolBelongsToScope(tool: PrototypeToolSeed, scope: AiToolScopeId): boolean {
  return resolveToolMarketShelf(tool) === scope;
}

export function getNavCategoryMeta(categoryId: AiToolNavCategoryId) {
  return AI_TOOL_NAV_CATEGORIES.find((c) => c.id === categoryId);
}

/** 业务货架位：外精选 / 公司推荐 / 不上架 */
export type MarketShelfSlot = NonNullable<PrototypeToolSeed['marketShelf']>;

/**
 * 解析工具上架货架。
 * - 未能力上架 → none
 * - 显式 `marketShelf` 优先
 * - 缺省：带 ai-saas / hw-internal 标签时，按 sourceType 归入外/内货架
 */
export function resolveToolMarketShelf(tool: PrototypeToolSeed): MarketShelfSlot {
  if (!tool.published) return 'none';
  if (tool.marketShelf) return tool.marketShelf;
  const tags = tool.tags ?? [];
  if (!tags.includes('ai-saas') && !tags.includes('hw-internal')) return 'none';
  const src = tool.sourceType ?? (tags.includes('hw-internal') ? 'internal' : 'external');
  return src === 'internal' ? 'internal' : 'external';
}

/** 是否出现在外精选或公司工具货架（兼容旧 isHomeAiTool 调用点） */
export function isHomeAiTool(tool: PrototypeToolSeed): boolean {
  const shelf = resolveToolMarketShelf(tool);
  return shelf === 'external' || shelf === 'internal';
}

/** 保存时按货架位补齐兼容标签，避免旧筛选漏掉 */
export function ensureMarketShelfTags(
  tags: string[],
  marketShelf: MarketShelfSlot,
): string[] {
  const next = [...tags];
  if (marketShelf === 'external' && !next.includes('ai-saas')) next.push('ai-saas');
  if (marketShelf === 'internal' && !next.includes('hw-internal')) next.push('hw-internal');
  return next;
}

/** 调用量 / 热度展示：一律取整，不出现小数点 */
export function formatToolInvokes(n: number): string {
  const v = Math.max(0, Math.round(Number.isFinite(n) ? n : 0));
  if (v >= 10000) return `${Math.round(v / 10000)}万`;
  if (v >= 1000) return `${Math.max(1, Math.round(v / 1000))}k`;
  return String(v);
}
