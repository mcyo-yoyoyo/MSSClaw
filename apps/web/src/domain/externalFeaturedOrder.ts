export type ExternalFeaturedOrderItem = {
  id: string;
  externalSortOrder?: number;
  sourceOrder?: number;
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
