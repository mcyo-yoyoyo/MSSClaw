import type { AiToolNavCategoryId } from '@/domain/aiToolCategories';
import { isHomeAiTool, toolBelongsToNavCategory } from '@/domain/aiToolCategories';
import type { PrototypeToolSeed } from '@/domain/prototype/types';

/**
 * 找案例 · 场景工具：静态精选基线（每侧最多 2 个）。
 * 运营可在配置工具勾选 featuredInFindCases 追加/覆盖精选露出。
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

function allStaticPickIds(): Set<string> {
  const ids = new Set<string>();
  for (const picks of Object.values(PLAZA_TOOL_PICKS)) {
    picks.external.forEach((id) => ids.add(id));
    picks.internal.forEach((id) => ids.add(id));
  }
  return ids;
}

const STATIC_PICK_IDS = allStaticPickIds();

/** 未显式配置时：落在静态精选表内视为精选露出 */
export function resolveToolFeaturedInFindCases(tool: PrototypeToolSeed): boolean {
  if (typeof tool.featuredInFindCases === 'boolean') return tool.featuredInFindCases;
  return STATIC_PICK_IDS.has(tool.id);
}

/**
 * 找案例橱窗工具：已上架 ∩ 精选露出 ∩ 当前分类，静态序优先。
 */
export function listFeaturedFindCaseTools(
  tools: PrototypeToolSeed[],
  categoryId: AiToolNavCategoryId,
  limitPerSide = 2,
): { external: PrototypeToolSeed[]; internal: PrototypeToolSeed[] } {
  const eligible = tools.filter(
    (t) =>
      isHomeAiTool(t) &&
      resolveToolFeaturedInFindCases(t) &&
      toolBelongsToNavCategory(t, categoryId),
  );
  const byId = new Map(eligible.map((t) => [t.id, t]));
  const staticPicks = getPlazaToolPicks(categoryId);

  const take = (ids: string[], scope: 'external' | 'internal') => {
    const out: PrototypeToolSeed[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
      const tool = byId.get(id);
      if (!tool) continue;
      out.push(tool);
      seen.add(id);
      if (out.length >= limitPerSide) return out;
    }
    for (const tool of eligible) {
      if (seen.has(tool.id)) continue;
      const src = tool.sourceType ?? (tool.tags?.includes('hw-internal') ? 'internal' : 'external');
      if (src !== scope) continue;
      out.push(tool);
      seen.add(tool.id);
      if (out.length >= limitPerSide) break;
    }
    return out;
  };

  return {
    external: take(staticPicks.external, 'external'),
    internal: take(staticPicks.internal, 'internal'),
  };
}
