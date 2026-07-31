import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * 若设置环境变量 API_KEY，则要求请求头 X-API-Key 匹配。
 * 未设置时放行（兼容本地原型）；私服建议务必配置。
 */
@Injectable()
export class OptionalApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.API_KEY?.trim();
    if (!expected) return true;

    const req = context.switchToHttp().getRequest<Request>();
    // 健康检查始终放行，供负载均衡探活
    if (req.path?.includes('/health')) return true;

    const provided =
      (req.header('x-api-key') ?? req.header('X-API-Key') ?? '').trim();

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid or missing X-API-Key');
    }
    return true;
  }
}
