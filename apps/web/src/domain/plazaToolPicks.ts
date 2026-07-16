import type { AiToolNavCategoryId } from '@/domain/aiToolCategories';

/**
 * AI广场 · 马上能用 · 经洞察验证的精选推荐（每侧最多 2 个，不穷举）
 */
export type PlazaToolPicks = {
  external: string[];
  internal: string[];
};

export const PLAZA_TOOL_PICKS: Record<AiToolNavCategoryId, PlazaToolPicks> = {
  chat: {
    external: ['tool-saas-chatgpt', 'tool-saas-doubao'],
    internal: ['tool-hw-assistant', 'tool-hw-xiaowei'],
  },
  search: {
    external: ['tool-saas-perplexity', 'tool-saas-kimi'],
    internal: ['tool-hw-w3-qa'],
  },
  write: {
    external: ['tool-saas-jasper', 'tool-saas-copyai'],
    internal: [],
  },
  office: {
    external: ['tool-saas-ms-copilot', 'tool-saas-feishu'],
    internal: ['tool-hw-meeting', 'tool-hw-cloudnote'],
  },
  code: {
    external: ['tool-saas-cursor', 'tool-saas-trae'],
    internal: ['tool-hw-xiaoluban'],
  },
  image: {
    external: ['tool-saas-midjourney', 'tool-saas-flux'],
    internal: [],
  },
  video: {
    external: ['tool-saas-kling', 'tool-saas-capcut'],
    internal: [],
  },
};

export function getPlazaToolPicks(categoryId: AiToolNavCategoryId): PlazaToolPicks {
  const picks = PLAZA_TOOL_PICKS[categoryId] ?? { external: [], internal: [] };
  return {
    external: picks.external.slice(0, 2),
    internal: picks.internal.slice(0, 2),
  };
}
