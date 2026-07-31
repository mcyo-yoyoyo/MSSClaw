import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

/**
 * 限制同时进行的 SSE 执行流数量，避免私服上连接占满。
 * 环境变量 MAX_CONCURRENT_SSE（默认 80，约覆盖演示级并发）。
 */
@Injectable()
export class SseConcurrencyGuard implements CanActivate {
  private static active = 0;

  static get activeCount() {
    return SseConcurrencyGuard.active;
  }

  static acquire(): boolean {
    const max = Number(process.env.MAX_CONCURRENT_SSE ?? 80);
    const limit = Number.isFinite(max) && max > 0 ? max : 80;
    if (SseConcurrencyGuard.active >= limit) return false;
    SseConcurrencyGuard.active += 1;
    return true;
  }

  static release() {
    SseConcurrencyGuard.active = Math.max(0, SseConcurrencyGuard.active - 1);
  }

  canActivate(_context: ExecutionContext): boolean {
    if (!SseConcurrencyGuard.acquire()) {
      throw new HttpException(
        {
          message: 'Too many concurrent execution streams',
          active: SseConcurrencyGuard.activeCount,
          limit: Number(process.env.MAX_CONCURRENT_SSE ?? 80),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
