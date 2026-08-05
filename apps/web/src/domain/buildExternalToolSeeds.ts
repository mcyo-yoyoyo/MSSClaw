import { EXTERNAL_TOOLS_CATALOG } from '@/domain/externalToolsCatalog';
import type { ExternalToolCatalogEntry } from '@/domain/externalToolTaxonomy';
import type { PrototypeToolSeed } from '@/domain/prototype/types';

export function catalogEntryToToolSeed(entry: ExternalToolCatalogEntry): PrototypeToolSeed {
  return {
    id: entry.id,
    name: entry.name,
    desc: entry.cardSummary || entry.desc || entry.name,
    category: 'platform',
    author: entry.company || '业界精选',
    published: true,
    invokes: 0,
    icon: entry.icon || 'fa-cube',
    tags: entry.tags?.length ? entry.tags : ['ai-saas'],
    sourceType: 'external',
    visibility: 'public',
    ownerDeptIds: [],
    ownerRegionId: null,
    homepageUrl: entry.homepageUrl || '#',
    marketShelf: 'external',
    region: entry.region,
    toolTypeId: entry.toolTypeId,
    cardSummary: entry.cardSummary,
    company: entry.company,
    docsUrl: entry.docsUrl,
    mediaUrl: entry.mediaUrl,
    screenshotUrl: entry.screenshotUrl,
    versionLabel: entry.version,
    bestFor: entry.bestFor,
    productIntro: entry.productIntro,
    featuredInFindCases: false,
  };
}

export function buildExternalToolSeedsFromCatalog(): PrototypeToolSeed[] {
  return EXTERNAL_TOOLS_CATALOG.map(catalogEntryToToolSeed);
}
