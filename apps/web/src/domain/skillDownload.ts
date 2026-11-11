/** 空值使用原包；非法地址不会作为下载跳转目标。 */
export function skillDownloadUrl(value?: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  try {
    const url = new URL(trimmed);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? trimmed : null;
  } catch { return null; }
}
