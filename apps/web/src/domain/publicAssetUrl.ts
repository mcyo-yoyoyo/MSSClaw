/** GitHub Pages 子路径（/MSSClaw/）下，把站点相对路径补上 BASE_URL */
export function publicAssetUrl(path: string | null | undefined): string {
  const raw = (path ?? '').trim();
  if (!raw) return '';
  if (
    raw.startsWith('data:') ||
    raw.startsWith('blob:') ||
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('//')
  ) {
    return raw;
  }
  const base = String(import.meta.env.BASE_URL || '/');
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${raw.replace(/^\//, '')}`;
}
