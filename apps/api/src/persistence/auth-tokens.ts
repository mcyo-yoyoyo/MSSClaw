import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID } from 'crypto';
import type { PrismaService } from '../prisma/prisma.service';
import { hashToken, type AuthMethod } from './identity-store';

/**
 * 访问令牌：HS256 JWT，15 分钟，不落库；每次请求按 sub 读成员，核对状态和 tv（token_version）。
 * 刷新令牌：随机串，7 天，库里只存 SHA-256；每次刷新作废旧的、签发新的。
 */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** 两个标签页同时刷新时，后到的那个拿着刚被轮换的旧令牌；这段时间内不当作令牌被盗 */
const ROTATION_GRACE_MS = 60 * 1000;

export interface AccessClaims {
  sub: string;
  role: string;
  tv: number;
  amr: AuthMethod;
  exp: number;
}

export interface IssuedTokens {
  accessToken: string;
  expiresAt: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

type TokenMember = { id: string; roleId: string; tokenVersion: number };

const logger = new Logger('AuthTokens');
let devSecret: string | undefined;

/** main.ts 启动时已要求配置 JWT_SECRET；只有直接 new 服务的测试会走到随机密钥 */
function jwtSecret(): string {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured) return configured;
  if (!devSecret) {
    devSecret = randomBytes(32).toString('hex');
    logger.warn('JWT_SECRET 未配置，使用进程内随机密钥（重启后访问令牌全部失效）');
  }
  return devSecret;
}

export function looksLikeJwt(token: string): boolean {
  return token.split('.').length === 3;
}

export class AuthTokens {
  private readonly jwt = new JwtService();

  constructor(private readonly prisma: PrismaService) {}

  async issue(member: TokenMember, authMethod: AuthMethod, userAgent?: string): Promise<IssuedTokens> {
    const refreshToken = randomBytes(32).toString('hex');
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { memberId: member.id, expiresAt: { lt: new Date() } } }),
      this.prisma.refreshToken.create({
        data: {
          id: randomUUID(),
          memberId: member.id,
          tokenHash: hashToken(refreshToken),
          authMethod,
          expiresAt: refreshExpiresAt,
          userAgent: userAgent?.slice(0, 300) ?? null,
        },
      }),
      this.prisma.member.update({ where: { id: member.id }, data: { lastLoginAt: new Date() } }),
    ]);
    return { ...this.signAccess(member, authMethod), refreshToken, refreshExpiresAt };
  }

  signAccess(member: TokenMember, authMethod: AuthMethod): { accessToken: string; expiresAt: string } {
    const accessToken = this.jwt.sign(
      { sub: member.id, role: member.roleId, tv: member.tokenVersion, amr: authMethod },
      { secret: jwtSecret(), algorithm: 'HS256', expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    );
    return { accessToken, expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString() };
  }

  /** 签名不对或已过期返回 null；成员状态、版本由调用方核对 */
  verifyAccess(token: string): AccessClaims | null {
    try {
      const claims = this.jwt.verify<AccessClaims>(token, { secret: jwtSecret(), algorithms: ['HS256'] });
      return typeof claims.sub === 'string' && typeof claims.tv === 'number' ? claims : null;
    } catch {
      return null;
    }
  }

  /**
   * 用刷新令牌换一对新令牌。已作废的令牌再次出现且超过宽限期，按被盗处理：作废该成员全部刷新令牌。
   */
  async rotate(
    refreshToken: string,
    userAgent?: string,
  ): Promise<{ ok: true; memberId: string; authMethod: AuthMethod; tokens: IssuedTokens } | { ok: false; error: string }> {
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { member: true },
    });
    if (!row) return { ok: false, error: 'refresh_token_invalid' };
    if (row.revokedAt) {
      if (Date.now() - row.revokedAt.getTime() > ROTATION_GRACE_MS) {
        await this.revokeAll(row.memberId);
        logger.warn(`成员 ${row.memberId} 的已作废刷新令牌被再次使用，已作废其全部刷新令牌`);
      }
      return { ok: false, error: 'refresh_token_revoked' };
    }
    if (row.expiresAt.getTime() < Date.now()) return { ok: false, error: 'refresh_token_expired' };
    if (row.member.status === 'suspended') return { ok: false, error: 'member_suspended' };

    const authMethod = row.authMethod as AuthMethod;
    const tokens = await this.issue(row.member, authMethod, userAgent);
    const replacement = await this.prisma.refreshToken.findUniqueOrThrow({
      where: { tokenHash: hashToken(tokens.refreshToken) },
      select: { id: true },
    });
    // 并发刷新时只有一个能把旧令牌标成已作废，另一个作废刚签的新令牌并按轮换处理
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: row.id, revokedAt: null },
      data: { revokedAt: new Date(), replacedBy: replacement.id },
    });
    if (claimed.count !== 1) {
      await this.prisma.refreshToken.update({ where: { id: replacement.id }, data: { revokedAt: new Date() } });
      return { ok: false, error: 'refresh_token_revoked' };
    }
    return { ok: true, memberId: row.memberId, authMethod, tokens };
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAll(memberId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { memberId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
