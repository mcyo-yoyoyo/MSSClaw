export type ExternalFeaturedOrderItem = {
  id: string;
  externalSortOrder?: number;
  sourceOrder?: number;
};

export type ExternalCategoryRankedItem = {
  id: string;
  externalSortOrder?: number;
  externalCategoryRanks?: Record<string, number>;
};

export type ExternalFeaturedRegionItem = {
  id: string;
  featured?: boolean;
  region?: 'overseas' | 'domestic';
};

export type ExternalFeaturedOrderSelector<T> = (item: T) => number | undefined;

/**
 * 外部工具精选的稳定排序投影。
 *
 * 置顶列表是独立于当前可见卡片的运营配置：工具临时下架时可能不在
 * `items` 中，但调用方不应因此删改 `pinnedIds`。重新上架后，相同的 pin
 * 配置会让工具自动回到原位置。
 */
export function orderExternalFeaturedItems<T extends ExternalFeaturedOrderItem>(
  items: readonly T[],
  pinnedIds: readonly string[],
  orderOf: ExternalFeaturedOrderSelector<T> = (item) => item.externalSortOrder,
): T[] {
  const pinOrder = new Map<string, number>();
  for (const id of pinnedIds) {
    if (!pinOrder.has(id)) pinOrder.set(id, pinOrder.size);
  }

  return items
    .map((item, inputIndex) => ({ item, inputIndex }))
    .sort((a, b) => {
      const aPin = pinOrder.get(a.item.id);
      const bPin = pinOrder.get(b.item.id);
      if (aPin !== undefined || bPin !== undefined) {
        if (aPin === undefined) return 1;
        if (bPin === undefined) return -1;
        if (aPin !== bPin) return aPin - bPin;
      }

      const aSourceOrder = orderOf(a.item) ?? Number.POSITIVE_INFINITY;
      const bSourceOrder = orderOf(b.item) ?? Number.POSITIVE_INFINITY;
      if (aSourceOrder !== bSourceOrder) return aSourceOrder - bSourceOrder;
      return a.inputIndex - b.inputIndex;
    })
    .map(({ item }) => item);
}

/**
 * 分类“更多”只消费 Excel 中明确存在的分类排名，并排除当前分类精选。
 * 排名相同时回落到 Excel 全表顺序，最后保持输入稳定，避免全局精选 pin
 * 或其他互动排序污染分类排名。
 */
export function listExternalCategoryRankedMore<T extends ExternalCategoryRankedItem>(
  items: readonly T[],
  categoryId: string,
  featuredIds: readonly string[],
): T[] {
  const featured = new Set(featuredIds);

  return items
    .filter((item) => {
      const rank = item.externalCategoryRanks?.[categoryId];
      return (
        !featured.has(item.id) &&
        typeof rank === 'number' &&
        Number.isFinite(rank) &&
        rank > 0
      );
    })
    .map((item, inputIndex) => ({ item, inputIndex }))
    .sort((a, b) => {
      const rankDelta =
        (a.item.externalCategoryRanks?.[categoryId] ?? Number.POSITIVE_INFINITY) -
        (b.item.externalCategoryRanks?.[categoryId] ?? Number.POSITIVE_INFINITY);
      if (rankDelta !== 0) return rankDelta;

      const aSourceOrder = a.item.externalSortOrder ?? Number.POSITIVE_INFINITY;
      const bSourceOrder = b.item.externalSortOrder ?? Number.POSITIVE_INFINITY;
      if (aSourceOrder !== bSourceOrder) return aSourceOrder - bSourceOrder;
      return a.inputIndex - b.inputIndex;
    })
    .map(({ item }) => item);
}

/**
 * 外部货架按海外 / 国内各取固定数量；未实际展示进精选的置顶卡仍回到“更多”。
 * 这样运营配置不均衡时不会出现卡片被精选截断后又从全部列表消失。
 */
export function splitExternalFeaturedItemsByRegion<T extends ExternalFeaturedRegionItem>(
  items: readonly T[],
  qualifies: (item: T) => boolean,
  perRegionLimit = 4,
) {
  const eligible = items.filter((item) => item.featured && qualifies(item));
  const overseas = eligible
    .filter((item) => item.region === 'overseas')
    .slice(0, perRegionLimit);
  const domestic = eligible
    .filter((item) => item.region === 'domestic')
    .slice(0, perRegionLimit);
  const featuredIds = new Set([...overseas, ...domestic].map((item) => item.id));

  return {
    featured: items.filter((item) => featuredIds.has(item.id)),
    overseas,
    domestic,
    rest: items.filter((item) => !featuredIds.has(item.id)),
  };
}
