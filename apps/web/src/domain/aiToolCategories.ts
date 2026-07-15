import type { PrototypeToolSeed } from '@/domain/prototype/types';

/** 场景导航 · 常用 AI 工具易懂分类 */
export const AI_TOOL_NAV_CATEGORIES = [
  { id: 'chat', label: 'AI对话', icon: 'fa-comments' },
  { id: 'search', label: 'AI搜索', icon: 'fa-magnifying-glass' },
  { id: 'write', label: 'AI写作', icon: 'fa-pen-nib' },
  { id: 'design', label: 'AI设计', icon: 'fa-palette' },
  { id: 'office', label: 'AI办公', icon: 'fa-briefcase' },
  { id: 'code', label: 'AI编程', icon: 'fa-code' },
  { id: 'image', label: 'AI生图', icon: 'fa-image' },
  { id: 'video', label: 'AI生视频', icon: 'fa-clapperboard' },
] as const;

export type AiToolNavCategoryId = (typeof AI_TOOL_NAV_CATEGORIES)[number]['id'];

const TAG_TO_CATEGORY: Record<string, AiToolNavCategoryId> = {
  对话: 'chat',
  研究: 'search',
  写作: 'write',
  协作: 'office',
  创作: 'design',
  编码: 'code',
  办公: 'office',
  会议: 'office',
  笔记: 'write',
  效能: 'office',
  生图: 'image',
  生视频: 'video',
  设计: 'design',
  搜索: 'search',
};

/** 按工具 id 的精确归类（覆盖模糊 tag） */
const TOOL_ID_CATEGORY: Record<string, AiToolNavCategoryId> = {
  'tool-saas-chatgpt': 'chat',
  'tool-saas-gemini': 'chat',
  'tool-saas-doubao': 'chat',
  'tool-saas-tongyi': 'chat',
  'tool-saas-wenxin': 'chat',
  'tool-hw-assistant': 'chat',
  'tool-saas-perplexity': 'search',
  'tool-saas-kimi': 'search',
  'tool-saas-notion-ai': 'write',
  'tool-hw-cloudnote': 'write',
  'tool-saas-gamma': 'design',
  'tool-saas-workbuddy': 'office',
  'tool-hw-meeting': 'office',
  'tool-hw-xiaoluban': 'office',
  'tool-saas-cursor': 'code',
  'tool-saas-claude-code': 'code',
  'tool-saas-copilot': 'code',
  'tool-hw-opencode': 'code',
  'tool-hw-codeagent': 'code',
  'tool-saas-midjourney': 'image',
  'tool-saas-runway': 'video',
  'tool-saas-kling': 'video',
  'tool-saas-jimeng': 'video',
};

export function resolveAiToolNavCategory(tool: PrototypeToolSeed): AiToolNavCategoryId | null {
  const byId = TOOL_ID_CATEGORY[tool.id];
  if (byId) return byId;
  for (const tag of tool.tags ?? []) {
    if (TAG_TO_CATEGORY[tag]) return TAG_TO_CATEGORY[tag];
  }
  return null;
}

export function isHomeAiTool(tool: PrototypeToolSeed): boolean {
  if (!tool.published) return false;
  const tags = tool.tags ?? [];
  return tags.includes('ai-saas') || tags.includes('hw-internal');
}
