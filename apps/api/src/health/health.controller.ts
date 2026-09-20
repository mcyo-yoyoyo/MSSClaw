import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { SseConcurrencyGuard } from '../common/sse-concurrency.guard';
import { isNestLlmEnvConfigured } from '../executions/llm.client';
import { authMode, configErrors, validateOAuthConfig } from '../auth/oauth.config';

@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'mss-claw-api',
      version: '0.1.1',
      timestamp: new Date().toISOString(),
      sseActive: SseConcurrencyGuard.activeCount,
      sseLimit: Number(process.env.MAX_CONCURRENT_SSE ?? 200),
      apiKeyRequired: Boolean(process.env.API_KEY?.trim()),
      /** 前端启动探活时顺带拿到登录模式，省一次请求 */
      auth: {
        mode: authMode(),
        ready: authMode() !== 'oauth' || configErrors(validateOAuthConfig()).length === 0,
      },
      /** 部署级 LLM_*；工作区 llm-config 文档也可驱动执行，不在此探测以免泄露 */
      llmEnvConfigured: isNestLlmEnvConfigured(),
      persistenceNote:
        'SQLite is a demo stub; prefer static frontend or Postgres for multi-user shared writes',
    };
  }
}
