/** Authorization: Bearer 优先，其次 X-Session-Token（改造前的前端两个都发） */
export function bearerToken(authorization?: string, xSessionToken?: string): string | undefined {
  const raw = (authorization ?? '').trim();
  if (raw.toLowerCase().startsWith('bearer ')) return raw.slice(7).trim() || undefined;
  const alt = (xSessionToken ?? '').trim();
  return alt || undefined;
}
