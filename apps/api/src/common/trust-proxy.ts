/**
 * 正式 Nginx 与本地 API 同机部署，只信任 loopback 反代。
 * Express 会从 X-Forwarded-For 右侧开始，停在第一个非可信地址，
 * 因此客户端伪造的更左侧地址不会成为 req.ip。
 */
export const DEFAULT_TRUST_PROXY = 'loopback';

export function trustProxySetting(raw?: string): string {
  return raw?.trim() || DEFAULT_TRUST_PROXY;
}
