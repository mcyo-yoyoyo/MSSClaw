import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type SkillRun } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export const terminal = (status: string) => ['succeeded', 'failed', 'cancelled', 'timeout'].includes(status);
export function limit(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}
@Injectable()
export class SkillRunService {
  constructor(readonly prisma: PrismaService) {}

  async enqueue(memberId: string, skillId: string, skillVersion: string, packageBlob: Prisma.InputJsonValue, inputBlobIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      // 跨 API 进程串行校验同一成员，避免并发入队越过限制。
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`skill-run:${memberId}`}))::text`;
      const active = await tx.skillRun.count({ where: { memberId, status: { in: ['queued', 'running'] } } });
      if (active >= limit('SKILL_RUN_PER_USER_LIMIT', 1)) throw new ConflictException('skill_run_per_user_limit');
      const owned = await tx.skillRunInput.count({ where: { memberId, blobId: { in: inputBlobIds } } });
      if (owned !== inputBlobIds.length) throw new BadRequestException('input_blob_not_owned');
      const run = await tx.skillRun.create({ data: { id: randomUUID(), memberId, skillId, skillVersion, packageBlob, inputBlobIds } });
      await tx.skillRunEvent.create({ data: { runId: run.id, seq: 1, type: 'status', payload: { status: 'queued' } } });
      return run;
    });
  }
  async owned(id: string, memberId: string) {
    const run = await this.prisma.skillRun.findUnique({ where: { id } });
    if (!run || run.memberId !== memberId) throw new NotFoundException('skill_run_not_found');
    return run;
  }
  async events(id: string, memberId: string, afterSeq = 0) {
    await this.owned(id, memberId);
    return this.prisma.skillRunEvent.findMany({ where: { runId: id, seq: { gt: afterSeq } }, orderBy: { seq: 'asc' }, take: 200 });
  }
  async event(runId: string, type: string, payload: Prisma.InputJsonValue) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM skill_run WHERE id = ${runId} FOR UPDATE`;
      const last = await tx.skillRunEvent.aggregate({ where: { runId }, _max: { seq: true } });
      return tx.skillRunEvent.create({ data: { runId, seq: (last._max.seq ?? 0) + 1, type, payload } });
    });
  }
  async claim(worker: string): Promise<SkillRun | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(774291840)::text`;
      if (await tx.skillRun.count({ where: { status: 'running' } }) >= limit('SKILL_WORKER_CONCURRENCY', 2)) return null;
      const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM skill_run WHERE status = 'queued' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`;
      if (!rows.length) return null;
      return tx.skillRun.update({ where: { id: rows[0].id }, data: { status: 'running', lockedBy: worker, lockedUntil: new Date(Date.now() + 30000), startedAt: new Date(), attempt: { increment: 1 } } });
    });
  }
  async heartbeat(id: string, worker: string) {
    const updated = await this.prisma.skillRun.updateMany({ where: { id, lockedBy: worker, status: 'running', lockedUntil: { gt: new Date() } }, data: { lockedUntil: new Date(Date.now() + 30000) } });
    if (!updated.count) throw new Error('lease_lost');
    return this.prisma.skillRun.findUniqueOrThrow({ where: { id } });
  }
  async recoverExpired(cleanup?: (runId: string) => Promise<void>) {
    const expired = await this.prisma.skillRun.findMany({ where: { status: 'running', lockedUntil: { lt: new Date() } } });
    for (const run of expired) {
      if (cleanup) await cleanup(run.id);
      await this.finish(run.id, 'failed', 'worker_interrupted', undefined, run.lockedBy ?? undefined, true);
    }
  }
  async finish(id: string, status: string, error?: string, artifacts?: Prisma.InputJsonValue, worker?: string, expired = false) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM skill_run WHERE id = ${id} FOR UPDATE`;
      const run = await tx.skillRun.findUniqueOrThrow({ where: { id } });
      if (terminal(run.status) || (worker && run.lockedBy !== worker) || (expired && run.lockedUntil && run.lockedUntil >= new Date())) return;
      if (!expired && run.cancelRequested) { status = 'cancelled'; error = 'cancelled'; }
      await tx.skillRun.update({ where: { id }, data: { status, error, artifacts, finishedAt: new Date(), lockedUntil: null, lockedBy: null } });
      const last = await tx.skillRunEvent.aggregate({ where: { runId: id }, _max: { seq: true } });
      await tx.skillRunEvent.create({ data: { runId: id, seq: (last._max.seq ?? 0) + 1, type: 'status', payload: { status, ...(error ? { error } : {}) } } });
    });
  }
  async cancel(id: string, memberId: string) {
    await this.owned(id, memberId);
    await this.prisma.skillRun.updateMany({ where: { id, status: { in: ['queued', 'running'] } }, data: { cancelRequested: true } });
    const run = await this.owned(id, memberId);
    if (run.status === 'queued') await this.finish(id, 'cancelled');
    return this.owned(id, memberId);
  }
}
