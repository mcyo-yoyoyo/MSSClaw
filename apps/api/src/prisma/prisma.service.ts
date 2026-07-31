import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * SQLite 演示库：开启 WAL + busy_timeout，缓解少量并发读写下的锁等待。
 * 注意：仍不适合作为 500 人共享写库；生产共享态请换 Postgres。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    try {
      await this.$executeRawUnsafe('PRAGMA journal_mode = WAL;');
      await this.$executeRawUnsafe('PRAGMA synchronous = NORMAL;');
      await this.$executeRawUnsafe('PRAGMA busy_timeout = 5000;');
      await this.$executeRawUnsafe('PRAGMA temp_store = MEMORY;');
      this.logger.log('SQLite pragmas applied (WAL, busy_timeout=5000)');
    } catch (err) {
      this.logger.warn(
        `SQLite pragma setup skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
