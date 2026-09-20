import { Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';

/**
 * 每次登录尝试一个 traceId：日志、接口错误响应、前端错误面板三处都带它。
 * 内网排障时用户只要念出屏幕上的 8 位 id，运维 `grep 'oauth' api.log | grep <id>`
 * 就能拿到这次登录从发起到失败的完整链路，不用去猜是哪一条。
 */
export function newTraceId(): string {
  return randomBytes(4).toString('hex');
}

export interface TraceStep {
  step: string;
  ms: number;
  detail: string;
}

export class OAuthTrace {
  readonly id: string;
  readonly startedAt = Date.now();
  readonly steps: TraceStep[] = [];

  constructor(
    private readonly logger: Logger,
    id?: string,
  ) {
    this.id = id ?? newTraceId();
  }

  /** 记一步：既进日志也留在内存里，失败时可随响应一起回给前端 */
  step(step: string, detail = ''): void {
    const ms = Date.now() - this.startedAt;
    this.steps.push({ step, ms, detail });
    this.logger.log(`[oauth][${this.id}] ${step}${detail ? ` · ${detail}` : ''} (+${ms}ms)`);
  }

  warn(step: string, detail = ''): void {
    const ms = Date.now() - this.startedAt;
    this.steps.push({ step, ms, detail });
    this.logger.warn(`[oauth][${this.id}] ${step}${detail ? ` · ${detail}` : ''} (+${ms}ms)`);
  }

  fail(code: string, detail = ''): void {
    const ms = Date.now() - this.startedAt;
    this.steps.push({ step: `FAIL:${code}`, ms, detail });
    this.logger.error(`[oauth][${this.id}] FAIL ${code}${detail ? ` · ${detail}` : ''} (+${ms}ms)`);
  }

  /** 给前端看的精简轨迹：只有步骤名和耗时，不含任何上游返回值 */
  publicSteps(): string[] {
    return this.steps.map((entry) => `${entry.step}+${entry.ms}ms`);
  }
}

/**
 * undici 的网络错误 message 恒为 "fetch failed"，真实原因埋在 cause 链里。
 * 内网最常见的三种（DNS 不通 / 端口不通 / 证书不认）必须能一眼区分，否则
 * 只看到 "fetch failed" 根本没法判断是该配代理还是该加证书。
 */
export function describeError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let i = 0; i < 5 && current; i += 1) {
    const node = current as { code?: string; message?: string; cause?: unknown };
    if (node.code) parts.push(String(node.code));
    else if (node.message) parts.push(String(node.message));
    current = node.cause;
  }
  return parts.join(' → ') || String(error);
}

/** 把网络错误翻译成「该怎么办」 */
export function networkHint(error: unknown): string {
  const text = describeError(error).toUpperCase();
  if (text.includes('ENOTFOUND') || text.includes('EAI_AGAIN')) {
    return 'DNS 解析不了 IDaaS 域名：确认服务器 DNS，或改用 OAUTH_PROXY_ENABLED=1 走代理';
  }
  if (text.includes('ECONNREFUSED') || text.includes('CONNECTTIMEOUT') || text.includes('UND_ERR_CONNECT_TIMEOUT')) {
    return '连不上 IDaaS（端口不通/被防火墙拦）：确认出网策略，或开 OAUTH_PROXY_ENABLED=1';
  }
  if (text.includes('CERT') || text.includes('SELF_SIGNED') || text.includes('UNABLE_TO_VERIFY')) {
    return 'TLS 证书校验失败：服务器缺少企业根证书，需导入 CA（不要用忽略证书的方式绕过）';
  }
  if (text.includes('HEADERS_TIMEOUT') || text.includes('BODY_TIMEOUT') || text.includes('ABORT')) {
    return '上游超时：适当调大 OAUTH_HTTP_TIMEOUT_MS，或确认代理是否可用';
  }
  return '网络层失败，检查服务器到 IDaaS 的连通性与代理配置';
}
