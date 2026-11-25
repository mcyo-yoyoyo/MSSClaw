/**
 * [INPUT]: 当前成员、预览时的更新时间与明细字段差异。
 * [OUTPUT]: patchSkillSheetMetadata 更新并返回一条可见 Skill。
 * [POS]: 在目录事务内锁定记录，只写表格实际改动的字段。
 * [PROTOCOL]: Update this header on change, then check AGENTS.md
 */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { catalogScope, readAsset, type CatalogViewer } from './asset-catalog';
import { appendOperationLogs, type OperationActor } from './operation-log';

const text = z.string().trim().min(1);
const names = z.array(text).min(1).transform(items => [...new Set(items)]);
const sheetUpdate = z.object({
  expectedUpdatedAt: z.string().nullable(),
  patch: z.object({
    author: text.optional(),
    nameEn: text.optional(),
    command: text.optional(),
    tags: names.optional(),
    searchKeywords: names.optional(),
    usageNotes: text.optional(),
    callable: z.boolean().optional(),
    featuredInMssMarket: z.boolean().optional(),
    ownerDeptIds: names.optional(),
    ownerRegionIds: names.optional(),
    businessScenarioId: z.enum(['S1','S2','S3','S4','S5','S6','S7','S8']).optional(),
    visibility: z.enum(['org', 'public']).optional(),
    sourceLabel: text.optional(),
    sourceType: z.enum(['internal', 'external']).optional(),
  }).strict().refine(value => Object.keys(value).length > 0),
}).strict();

export async function patchSkillSheetMetadata(
  tx: Prisma.TransactionClient,
  viewer: NonNullable<CatalogViewer>,
  actor: OperationActor,
  id: string,
  body: unknown,
) {
  const parsed = sheetUpdate.safeParse(body);
  if (!parsed.success) throw new BadRequestException('invalid_skill_sheet_update');
  const { expectedUpdatedAt, patch } = parsed.data;
  const { sourceLabel, ownerDeptIds, ownerRegionIds, ...columns } = patch;
  const now = new Date();
  if (now.toISOString() === expectedUpdatedAt) now.setTime(now.getTime() + 1);
  const scope = { id, ...catalogScope('skill', viewer) };
  // 一次 UPDATE 同时检查权限与预览版本。竞争写入在数据库行锁上排队并重新比较。
  const changed = await tx.skill.updateMany({
    where: { ...scope, sourceUpdatedAt: expectedUpdatedAt },
    data: { ...columns, sourceUpdatedAt: now.toISOString(), updatedBy: actor.name },
  });
  if (!changed.count) {
    if (!await tx.skill.findFirst({ where: scope, select: { id: true } })) throw new NotFoundException('catalog_not_found');
    throw new ConflictException('catalog_conflict');
  }
  const current = await tx.skill.findUniqueOrThrow({
    where: { id }, select: { no: true, name: true, detail: true },
  });
  const data: Prisma.SkillUpdateInput = {};
  if (sourceLabel !== undefined) {
    const detail = current.detail && typeof current.detail === 'object' && !Array.isArray(current.detail)
      ? current.detail : {};
    data.detail = { ...detail, sourceLabel };
  }
  if (ownerDeptIds) {
    const count = await tx.domain.count({ where: { id: { in: ownerDeptIds } } });
    if (count !== ownerDeptIds.length) throw new BadRequestException('unknown_skill_domain');
    data.domains = {
      deleteMany: { domainId: { notIn: ownerDeptIds } },
      upsert: ownerDeptIds.map((domainId, position) => ({
        where: { skillNo_domainId: { skillNo: current.no, domainId } },
        create: { domainId, position }, update: { position },
      })),
    };
  }
  if (ownerRegionIds) {
    const count = await tx.region.count({ where: { id: { in: ownerRegionIds } } });
    if (count !== ownerRegionIds.length) throw new BadRequestException('unknown_skill_region');
    data.regions = {
      deleteMany: { regionId: { notIn: ownerRegionIds } },
      upsert: ownerRegionIds.map((regionId, position) => ({
        where: { skillNo_regionId: { skillNo: current.no, regionId } },
        create: { regionId, position }, update: { position },
      })),
    };
  }
  if (Object.keys(data).length) await tx.skill.update({ where: { id }, data, select: { id: true } });
  await appendOperationLogs(tx, actor, 'skill', [{ id, name: current.name, action: 'update' }]);
  return readAsset(tx, 'skill', id);
}
