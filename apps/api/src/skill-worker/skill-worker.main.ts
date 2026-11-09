import 'reflect-metadata';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaModule } from '../prisma/prisma.module';
import { BlobStoreService } from '../persistence/blob-store.service';
import { SkillRunService, limit } from './skill-run.service';
import { SkillWorker } from './skill-worker';
import { createSandboxDriver } from './sandbox-driver';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule], providers: [BlobStoreService, SkillRunService] })
class SkillWorkerModule {}
async function main() {
  const driver = createSandboxDriver();
  const app = await NestFactory.createApplicationContext(SkillWorkerModule);
  const runs = app.get(SkillRunService);
  await runs.recoverExpired(driver.cleanup?.bind(driver));
  const shutdown = new AbortController();
  process.once('SIGTERM', () => shutdown.abort()); process.once('SIGINT', () => shutdown.abort());
  const workerId = randomUUID();
  const worker = new SkillWorker(runs, app.get(BlobStoreService), driver, workerId);
  try {
    await Promise.all(Array.from({ length: limit('SKILL_WORKER_CONCURRENCY', 2) }, async () => {
      while (!shutdown.signal.aborted) {
        const run = await runs.claim(workerId);
        if (run) await worker.execute(run, shutdown.signal);
        else await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }));
  } finally { await app.close(); }
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : 'worker_start_failed'); process.exitCode = 1; });
