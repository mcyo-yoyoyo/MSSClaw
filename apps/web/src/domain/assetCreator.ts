/** 导入时留下的占位值，按「没填」处理，不显示 */
const PLACEHOLDERS = new Set(['', 'imported', '未知', '-']);

function meaningful(value: string | undefined | null): string {
  const text = (value ?? '').trim();
  return PLACEHOLDERS.has(text.toLowerCase()) ? '' : text;
}

/** Skill / Agent 的创建人：取 author（编辑器里的「创建人」），没有再取 publisher；都没有返回空串 */
export function assetCreatorName(asset: { author?: string | null; publisher?: string | null }): string {
  return meaningful(asset.author) || meaningful(asset.publisher);
}
