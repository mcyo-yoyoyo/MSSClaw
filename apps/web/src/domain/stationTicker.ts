/**
 * 首页公告条的翻页索引。公告条数会变（擦掉一条、运营下架），
 * 索引必须始终落在列表内，否则会翻到空行。
 */

export function clampTickerIndex(index: number, length: number): number {
  if (!Number.isFinite(index) || length <= 0) return 0;
  const floored = Math.floor(index);
  return ((floored % length) + length) % length;
}

export function nextTickerIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return clampTickerIndex(clampTickerIndex(index, length) + 1, length);
}

export function prevTickerIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return clampTickerIndex(clampTickerIndex(index, length) - 1, length);
}
