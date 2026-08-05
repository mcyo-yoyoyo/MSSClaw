import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

const DEFAULT_SSE_LIMIT = 200;

function sseLimit(): number {
  const max = Number(process.env.MAX_CONCURRENT_SSE ?? DEFAULT_SSE_LIMIT);
  return Number.isFinite(max) && max > 0 ? max : DEFAULT_SSE_LIMIT;
}

/**
 * 限制同时进行的 SSE 执行流数量，避免私服上连接占满。
 * 环境变量 MAX_CONCURRENT_SSE（默认 200）。
 */
@Injectable()
export class SseConcurrencyGuard implements CanActivate {
  private static active = 0;

  static get activeCount() {
    return SseConcurrencyGuard.active;
  }

  static acquire(): boolean {
    const limit = sseLimit();
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
          limit: sseLimit(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
