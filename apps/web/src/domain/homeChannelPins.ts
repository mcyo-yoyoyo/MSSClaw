import type { MarketShelfKind } from '@/domain/marketShelf';

/**
 * 首页内部 / MSS 两列置顶（自上而下，各 3 条）。
 * 外部工具精选改由 external-tool-layout 统一维护；这里不再保存外部工具 ID。
 */
export const HOME_CHANNEL_PINS: Pick<
  Record<MarketShelfKind, readonly string[]>,
  'internal' | 'projects'
> = {
  internal: ['tool-hw-assistant', 'tool-hw-cloudnote', 'tool-hw-w3-qa'],
  projects: ['price-offer-monitor', 'ecommerce-review', 'l10n-translation'],
};
