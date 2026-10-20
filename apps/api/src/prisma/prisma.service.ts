import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const DEFAULT_TRANSACTION_MAX_WAIT_MS = 15_000;
const DEFAULT_TRANSACTION_TIMEOUT_MS = 15_000;

function positiveInteger(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
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
  }
}
