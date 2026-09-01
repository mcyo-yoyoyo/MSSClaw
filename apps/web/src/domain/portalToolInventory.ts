import { resolveToolMarketShelf } from './aiToolCategories.ts';
import type { InternalOfficeSceneCatalogEntry } from './internalOfficeScenes.ts';
import type { PrototypeToolSeed } from './prototype/types.ts';

export interface PortalToolInventory {
  totalTools: number;
  publishedTools: number;
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
  return {
    totalTools: tools.length,
    publishedTools: tools.filter((tool) => tool.published).length,
    externalTools,
    companyTools: tools.length - externalTools,
    officeScenes: officeScenes.length,
    boundTools: boundToolIds.size,
  };
}
