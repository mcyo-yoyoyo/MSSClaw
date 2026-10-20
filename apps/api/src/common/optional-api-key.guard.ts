import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

/** 未设置 API_KEY，或请求头 X-API-Key 与之匹配。 */
export function hasValidApiKey(req: Request): boolean {
  const expected = process.env.API_KEY?.trim();
  if (!expected) return true;
  const provided = (req.header('x-api-key') ?? '').trim();
  return Boolean(provided) && provided === expected;
}

/**
 * 若设置环境变量 API_KEY，则要求请求头 X-API-Key 匹配。
 * 未设置时放行（兼容本地原型）；私服建议务必配置。
 */
@Injectable()
export class OptionalApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (hasValidApiKey(req)) return true;
    // 健康检查始终放行，供负载均衡探活
    if (req.path?.includes('/health')) return true;
    // <img> 带不了请求头：读取单个 blob 交给 getBlob 判断，只有图片免校验，其他类型照常要求 API Key。
    if (req.method === 'GET' && /\/blobs\/[0-9a-f]{32}$/.test(req.path ?? '')) return true;
    throw new UnauthorizedException('Invalid or missing X-API-Key');
  }
}
