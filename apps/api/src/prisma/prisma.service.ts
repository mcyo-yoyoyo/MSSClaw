import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const DEFAULT_SQLITE_BUSY_TIMEOUT_MS = 15_000;
const DEFAULT_TRANSACTION_MAX_WAIT_MS = 15_000;
const DEFAULT_TRANSACTION_TIMEOUT_MS = 15_000;

function positiveInteger(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * SQLite 演示库：开启 WAL + busy_timeout，缓解少量并发读写下的锁等待。
 * 注意：仍不适合作为 500 人共享写库；生产共享态请换 Postgres。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
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
    const busyTimeoutMs = positiveInteger(
      process.env.SQLITE_BUSY_TIMEOUT_MS,
      DEFAULT_SQLITE_BUSY_TIMEOUT_MS,
    );
    const statements = [
      ['journal_mode', 'PRAGMA journal_mode = WAL;'],
      ['synchronous', 'PRAGMA synchronous = NORMAL;'],
      ['busy_timeout', `PRAGMA busy_timeout = ${busyTimeoutMs};`],
      ['temp_store', 'PRAGMA temp_store = MEMORY;'],
    ] as const;
    const applied: string[] = [];

    // PRAGMA journal_mode 会返回结果集，必须走 queryRaw；executeRaw 会令 Prisma
    // 报 “Execute returned results” 并跳过后续初始化。每条独立处理，避免单项
    // 不受当前 SQLite 构建支持时影响其余配置。
    for (const [name, sql] of statements) {
      try {
        await this.$queryRawUnsafe<unknown[]>(sql);
        applied.push(name);
      } catch (err) {
        this.logger.warn(
          `SQLite pragma ${name} skipped: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    this.logger.log(
      `SQLite pragmas configured (${applied.join(', ') || 'none'}; busy_timeout=${busyTimeoutMs})`,
    );
  }
}
