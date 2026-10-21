import type { PrototypeToolSeed } from './prototype/types.ts';
import { resolveToolMarketShelf } from './aiToolCategories.ts';

function toolTypeIds(tool: PrototypeToolSeed): Set<string> {
  return new Set([...(tool.toolTypeIds ?? []), ...(tool.toolTypeId ? [tool.toolTypeId] : [])]);
}

/** 工具详情页右侧「相关推荐」：同一货架上的其他上架工具，工具类型重合多的在前，其次按热度 */
export function relatedTools(
  current: PrototypeToolSeed,
  tools: PrototypeToolSeed[],
  isVisible: (tool: PrototypeToolSeed) => boolean,
  limit = 6,
): PrototypeToolSeed[] {
  const shelf = resolveToolMarketShelf(current);
  if (shelf === 'none') return [];
  const types = toolTypeIds(current);
  return tools
    .filter((tool) => tool.id !== current.id && resolveToolMarketShelf(tool) === shelf && isVisible(tool))
    .map((tool) => ({ tool, shared: [...toolTypeIds(tool)].filter((id) => types.has(id)).length }))
    .sort((a, b) => b.shared - a.shared || (b.tool.invokes ?? 0) - (a.tool.invokes ?? 0))
    .slice(0, limit)
    .map((entry) => entry.tool);
}
