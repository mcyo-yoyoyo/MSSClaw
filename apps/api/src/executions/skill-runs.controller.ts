import { SkillRunLauncher } from './skill-run-launcher';
import { BadRequestException, Body, Controller, Get, Headers, NotFoundException, Param, Post, Query, Res, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { pipeline } from 'stream';
import { PlatformDocsService } from '../persistence/platform-docs.service';
import { BlobStoreService } from '../persistence/blob-store.service';
import { SkillRunService } from '../skill-worker/skill-run.service';

const UploadInput = z.object({ name: z.string().min(1).max(240).regex(/^[^/\\]+$/), mimeType: z.string().optional(), dataBase64: z.string().max(28 * 1024 * 1024) });
@Controller('skill-runs')
export class SkillRunsController {
  constructor(private readonly runs: SkillRunService, private readonly docs: PlatformDocsService, private readonly blobs: BlobStoreService, private readonly launcher: SkillRunLauncher) {}
  private async user(auth?: string, alternate?: string) {
    const token = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : alternate;
    const session = await this.docs.me(token);
    if (!session.ok) throw new UnauthorizedException('platform_docs_login_required');
    return session.user;
  }
  @Post('inputs')
  async upload(@Body() body: unknown, @Headers('authorization') auth?: string, @Headers('x-session-token') alternate?: string) {
    const user = await this.user(auth, alternate);
    const parsed = UploadInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_input_upload');
    const blob = await this.blobs.putBase64({ ...parsed.data, privateOwner: String(user.id) });
    await this.runs.prisma.skillRunInput.create({ data: { blobId: blob.id, memberId: String(user.id) } });
    return { id: blob.id, name: blob.name };
  }
  @Post()
  async create(@Body() body: unknown, @Headers('authorization') auth?: string, @Headers('x-session-token') alternate?: string) {
    const user = await this.user(auth, alternate);
    return this.launcher.create(body, user);
  }
  @Get(':id')
  async get(@Param('id') id: string, @Headers('authorization') auth?: string, @Headers('x-session-token') alternate?: string) {
    return this.runs.owned(id, String((await this.user(auth, alternate)).id));
  }
  @Get(':id/events')
  async events(@Param('id') id: string, @Query('afterSeq') after: string | undefined, @Headers('authorization') auth?: string, @Headers('x-session-token') alternate?: string) {
    const seq = Number(after ?? 0);
    if (!Number.isSafeInteger(seq) || seq < 0) throw new BadRequestException('invalid_after_seq');
    return this.runs.events(id, String((await this.user(auth, alternate)).id), seq);
  }
  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Headers('authorization') auth?: string, @Headers('x-session-token') alternate?: string) {
    return this.runs.cancel(id, String((await this.user(auth, alternate)).id));
  }
  @Get(':id/artifacts/:blobId')
  async download(@Param('id') id: string, @Param('blobId') blobId: string, @Res() res: Response, @Headers('authorization') auth?: string, @Headers('x-session-token') alternate?: string) {
    const run = await this.runs.owned(id, String((await this.user(auth, alternate)).id));
    if (run.status !== 'succeeded' || !Array.isArray(run.artifacts) || !run.artifacts.some((a) => a && typeof a === 'object' && !Array.isArray(a) && a.id === blobId)) throw new NotFoundException('artifact_not_found');
    const blob = await this.blobs.get(blobId);
    res.setHeader('Content-Type', blob.meta.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(blob.meta.name)}`);
    pipeline(blob.stream, res, () => undefined);
  }
}
