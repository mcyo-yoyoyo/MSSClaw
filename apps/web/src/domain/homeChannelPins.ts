import type { MarketShelfKind } from '@/domain/marketShelf';

/**
 * 首页三列置顶（自上而下，各 3 条）。
 * 只影响首页橱窗，不改外部/内部/MSS 货架精选钉。
 */
export const HOME_CHANNEL_PINS: Record<MarketShelfKind, readonly string[]> = {
  external: ['tool-ext-codex', 'tool-saas-chatgpt', 'tool-saas-perplexity'],
  internal: ['tool-hw-assistant', 'tool-hw-cloudnote', 'tool-hw-w3-qa'],
  projects: ['price-offer-monitor', 'ecommerce-review', 'l10n-translation'],
};
