import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { BlobStoreService } from '../persistence/blob-store.service';
import { PersistenceService } from '../persistence/persistence.service';
import { SkillRunService } from '../skill-worker/skill-run.service';
import { blobBytes } from '../skill-worker/skill-worker';
import { validatePackage } from '../skill-worker/package';
import { executionRoute } from './executor-registry';

import type { CatalogViewer } from '../persistence/persistence.service';
import { extname } from 'path';
const CreateRun = z.object({ skillId: z.string().min(1), version: z.string().optional(), inputBlobIds: z.array(z.string().regex(/^[0-9a-f]{32}$/)).max(20).default([]) });
@Injectable()
export class SkillRunLauncher {
  constructor(private readonly runs: SkillRunService, private readonly blobs: BlobStoreService, private readonly persistence: PersistenceService) {}
  async create(body: unknown, user: NonNullable<CatalogViewer>) {
    const parsed = CreateRun.safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_skill_run');
    const input = parsed.data;
    await this.persistence.getCatalogItem('skills', input.skillId, user);
    const skill = await this.runs.prisma.skill.findUniqueOrThrow({ where: { id: input.skillId } });
    if (!skill.published || skill.callable === false) throw new BadRequestException('skill_not_callable');
    const version = input.version && input.version !== skill.version ? await this.runs.prisma.skillVersion.findUnique({ where: { skillNo_version: { skillNo: skill.no, version: input.version } } }) : skill;
    if (!version) throw new NotFoundException('skill_version_not_found');
    const route = executionRoute(version.executionMode);
    if (route.mode === 'prompt') return { mode: 'prompt', fallback: route.fallback, message: route.fallback ? '脚本执行未启用，回退 prompt' : '使用 prompt 执行' };
    const reference = version.packageBlob as { id?: string } | null;
    if (!reference?.id) throw new BadRequestException('script_package_required');
    let manifest;
    try { manifest = validatePackage((await blobBytes(this.blobs, reference.id)).bytes).manifest; }
    catch { throw new BadRequestException('invalid_script_package'); }
    if (input.inputBlobIds.length > manifest.inputs.maxCount || new Set(input.inputBlobIds).size !== input.inputBlobIds.length) throw new BadRequestException('invalid_input_count');
    const owned = await this.runs.prisma.skillRunInput.count({ where: { memberId: String(user.id), blobId: { in: input.inputBlobIds } } });
    if (owned !== input.inputBlobIds.length) throw new BadRequestException('input_blob_not_owned');
    for (const id of input.inputBlobIds) {
      const blob = await this.blobs.get(id); blob.stream.destroy();
      if (!manifest.inputs.extensions.includes(extname(blob.meta.name).toLowerCase())) throw new BadRequestException('input_extension_not_allowed');
    }
    return this.runs.enqueue(String(user.id), skill.id, version.version, version.packageBlob as Prisma.InputJsonValue, input.inputBlobIds);
  }
}
