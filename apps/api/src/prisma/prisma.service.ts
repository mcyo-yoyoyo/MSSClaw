import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const DEFAULT_TRANSACTION_MAX_WAIT_MS = 15_000;
const DEFAULT_TRANSACTION_TIMEOUT_MS = 15_000;
const DEFAULT_CONNECTION_LIMIT = 10;

function positiveInteger(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url: appendPgPoolParams(
            process.env.DATABASE_URL,
            `application_name=mssclaw-api&connection_limit=${positiveInteger(
              process.env.PRISMA_CONNECTION_LIMIT,
              DEFAULT_CONNECTION_LIMIT,
            )}`,
          ),
        },
      },
      transactionOptions: {
        maxWait: positiveInteger(
          process.env.PRISMA_TRANSACTION_MAX_WAIT_MS,
          DEFAULT_TRANSACTION_MAX_WAIT_MS,
        ),
        timeout: positiveInteger(
          process.env.PRISMA_TRANSACTION_TIMEOUT_MS,
          DEFAULT_TRANSACTION_TIMEOUT_MS,
        ),
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}

/**
 * 向 DATABASE_URL 追加 PG 连接池参数，保留原有 query string。
 * Prisma 的 connection_limit 通过连接 URL 的 `&connection_limit=N` 控制；
 * application_name 用于在 pg_stat_activity 里区分来源。
 */
function appendPgPoolParams(rawUrl: string | undefined, params: string): string | undefined {
  if (!rawUrl) return rawUrl;
  const sep = rawUrl.includes('?') ? '&' : '?';
  return `${rawUrl}${sep}${params}`;
}
