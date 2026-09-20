import { resolveToolMarketShelf } from './aiToolCategories.ts';
import type { InternalOfficeSceneCatalogEntry } from './internalOfficeScenes.ts';
import type { PrototypeToolSeed } from './prototype/types.ts';

export interface PortalToolInventory {
  totalTools: number;
  publishedTools: number;
  /** 真正出现在用户货架上的工具（外部 + 公司），看板「工具总数」用它 */
  shelfTools: number;
  externalTools: number;
  companyTools: number;
  officeScenes: number;
  boundTools: number;
}

export function buildPortalToolInventory(
  tools: readonly PrototypeToolSeed[],
  officeScenes: readonly Pick<InternalOfficeSceneCatalogEntry, 'toolIds'>[],
): PortalToolInventory {
  const boundToolIds = new Set(officeScenes.flatMap((entry) => entry.toolIds).filter(Boolean));
  const externalTools = tools.filter((tool) =>
    tool.sourceType === 'external' ||
    (tool.sourceType !== 'internal' && resolveToolMarketShelf(tool) === 'external'),
  ).length;
  // 未上架、或没有配置货架位的工具在用户页面上看不到，不能算进「工具总数」。
  const shelfTools = tools.filter((tool) => {
    const shelf = resolveToolMarketShelf(tool);
    return shelf === 'external' || shelf === 'internal';
  }).length;
  return {
    totalTools: tools.length,
    publishedTools: tools.filter((tool) => tool.published).length,
    shelfTools,
    externalTools,
    companyTools: tools.length - externalTools,
    officeScenes: officeScenes.length,
    boundTools: boundToolIds.size,
  };
}
