/** 展示版本号时只保留一个 v；不修改用于版本匹配的原始值。 */
export function formatVersion(value?: string | null): string {
  const version = value?.trim().replace(/^(?:v\s*)+/i, '') ?? '';
  return version ? `v${version}` : '—';
}
