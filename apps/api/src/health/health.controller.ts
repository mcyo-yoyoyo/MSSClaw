import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { SseConcurrencyGuard } from '../common/sse-concurrency.guard';

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
      sseLimit: Number(process.env.MAX_CONCURRENT_SSE ?? 80),
      apiKeyRequired: Boolean(process.env.API_KEY?.trim()),
      persistenceNote:
        'SQLite is a demo stub; prefer static frontend or Postgres for multi-user shared writes',
    };
  }
}
