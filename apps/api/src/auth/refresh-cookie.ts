import type { Request, Response } from 'express';

/** 刷新令牌只放 httpOnly Cookie，页面脚本读不到；Path 限定在 /auth，其他接口不会带上 */
export const REFRESH_COOKIE = 'mssclaw_refresh';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

export function readRefreshCookie(req: Request): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index < 0 || part.slice(0, index).trim() !== REFRESH_COOKIE) continue;
    const value = decodeURIComponent(part.slice(index + 1).trim());
    return value || undefined;
  }
  return undefined;
}

export function setRefreshCookie(req: Request, res: Response, token: string, expires: Date): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    path: REFRESH_COOKIE_PATH,
    expires,
  });
}

export function clearRefreshCookie(req: Request, res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'lax', secure: req.secure, path: REFRESH_COOKIE_PATH });
}

/** 登录 / 刷新成功：刷新令牌写进 Cookie，响应体里去掉 */
export function withRefreshCookie<T extends { ok: boolean; refreshToken?: string; refreshExpiresAt?: Date }>(
  req: Request,
  res: Response,
  result: T,
): Omit<T, 'refreshToken' | 'refreshExpiresAt'> {
  const { refreshToken, refreshExpiresAt, ...body } = result;
  if (result.ok && refreshToken && refreshExpiresAt) setRefreshCookie(req, res, refreshToken, refreshExpiresAt);
  return body;
}
