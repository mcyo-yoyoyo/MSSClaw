import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SEED_INTERNAL_OFFICE_SCENES } from '../data/market-doc-seeds';
import { bumpCollectionRevision, readRevision } from './identity-store';
import { inTransaction, readRows, replaceRows, type Db, type TableSpec } from './json-table';
import type { CanonicalStationAnnouncement } from './station-announcement-broadcast';

/**
 * 第 6 期运营类文档 ↔ 正式表。接口形状不变（GET/PUT /docs/<kind>、/portal-content），
 * 整份替换的集合用 collection_revision 做乐观锁，冲突错误体沿用各自原来的写法。
 */

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// 内部办公场景：接口里是 toolIds / toolBlurbs（最多绑一个工具），库里是 tool_id / tool_blurb

const OFFICE_SCENE: TableSpec = {
  label: 'invalid_office_scene',
  model: 'officeScene',
  key: 'id',
  position: true,
  fields: {
    id: { type: 'string', required: true },
    label: { type: 'string', required: true },
    english: { type: 'string', required: true },
    description: { type: 'string', required: true },
    icon: { type: 'string', required: true },
    visible: { type: 'bool', required: true },
    toolId: { type: 'string' },
    toolBlurb: { type: 'string' },
  },
};

type OfficeSceneEntry = {
  id: string;
  label: string;
  english: string;
  description: string;
  icon: string;
  visible: boolean;
  toolIds: string[];
  toolBlurbs: Record<string, string>;
};

const OFFICE_SCENES = 'internal-office-scenes';

function sceneToRow(entry: OfficeSceneEntry): JsonRecord {
  const { toolIds, toolBlurbs, ...rest } = entry;
  const toolId = toolIds[0];
  return { ...rest, ...(toolId ? { toolId } : {}), ...(toolId && toolBlurbs[toolId] !== undefined ? { toolBlurb: toolBlurbs[toolId] } : {}) };
}

function sceneFromRow(row: JsonRecord): OfficeSceneEntry {
  const { toolId, toolBlurb, ...rest } = row as JsonRecord & { toolId?: string; toolBlurb?: string };
  return {
    ...(rest as Omit<OfficeSceneEntry, 'toolIds' | 'toolBlurbs'>),
    toolIds: toolId ? [toolId] : [],
    toolBlurbs: toolId && toolBlurb !== undefined ? { [toolId]: toolBlurb } : {},
  };
}

/** 只读不播种（看板统计用） */
export async function readOfficeSceneEntries(db: Db) {
  return (await readRows(db, OFFICE_SCENE)).map(sceneFromRow);
}

/** 全新库第一次读取时写入内置场景（与原文档首次读取播种一致） */
export async function readOfficeScenesDoc(prisma: Db) {
  let revisionRow = await prisma.collectionRevision.findUnique({ where: { collection: OFFICE_SCENES } });
  if (!revisionRow && !(await prisma.officeScene.count())) {
    const seed = SEED_INTERNAL_OFFICE_SCENES as unknown as { revision?: number; entries: OfficeSceneEntry[] };
    await inTransaction(prisma, async (tx) => {
      await replaceRows(tx, OFFICE_SCENE, seed.entries.map(sceneToRow));
      await tx.collectionRevision.upsert({
        where: { collection: OFFICE_SCENES },
        create: { collection: OFFICE_SCENES, revision: seed.revision ?? 0 },
        update: {},
      });
    });
    revisionRow = await prisma.collectionRevision.findUnique({ where: { collection: OFFICE_SCENES } });
  }
  const entries = await readOfficeSceneEntries(prisma);
  return { version: SEED_INTERNAL_OFFICE_SCENES.version, revision: revisionRow?.revision ?? 0, entries };
}

export async function writeOfficeScenesDoc(
  prisma: Db,
  input: { expectedRevision: number; entries: OfficeSceneEntry[] },
) {
  await inTransaction(prisma, async (tx) => {
    await bumpCollectionRevision(tx, OFFICE_SCENES, input.expectedRevision, 'internal_office_scenes_revision_conflict');
    await replaceRows(tx, OFFICE_SCENE, input.entries.map(sceneToRow));
  });
  return readOfficeScenesDoc(prisma);
}

// ---------------------------------------------------------------------------
// 站内公告

const STATION_ANNOUNCEMENT: TableSpec = {
  label: 'invalid_station_announcement',
  model: 'stationAnnouncement',
  key: 'id',
  position: true,
  fields: {
    id: { type: 'string', required: true },
    title: { type: 'string', required: true },
    body: { type: 'string', required: true },
    badge: { type: 'string', required: true },
    badgeColor: { type: 'string' },
    publishedAt: { type: 'string', required: true },
    pinned: { type: 'bool', required: true },
    listed: { type: 'bool', required: true },
  },
};

export async function readStationAnnouncements(prisma: Db) {
  const [items, revision] = await Promise.all([
    readRows(prisma, STATION_ANNOUNCEMENT),
    readRevision(prisma, 'station-announcements'),
  ]);
  // badgeColor 空串也要原样返回（表示按标签文字取色）
  const announcements = items.map((item) => ({ badgeColor: '', ...item })) as unknown as CanonicalStationAnnouncement[];
  return {
    items: announcements.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishedAt.localeCompare(a.publishedAt)),
    revision,
  };
}

export async function writeStationAnnouncements(
  prisma: Db,
  expectedRevision: number,
  items: CanonicalStationAnnouncement[],
) {
  await inTransaction(prisma, async (tx) => {
    await bumpCollectionRevision(tx, 'station-announcements', expectedRevision, 'station_announcements_revision_conflict');
    await replaceRows(tx, STATION_ANNOUNCEMENT, items);
  });
  return readStationAnnouncements(prisma);
}

// ---------------------------------------------------------------------------
// 运营发布的 AI 新闻（整份替换，没有版本号）

const AI_NEWS_POST: TableSpec = {
  label: 'invalid_ai_news',
  model: 'aiNewsPost',
  key: 'id',
  position: true,
  fields: {
    id: { type: 'string', required: true },
    title: { type: 'string', required: true },
    summary: { type: 'string' },
    body: { type: 'string', required: true },
    cadence: { type: 'string', required: true },
    publishedAt: { type: 'string', required: true },
    source: { type: 'string' },
  },
};

export async function readAiNewsDoc(prisma: Db) {
  return { items: await readRows(prisma, AI_NEWS_POST) };
}

export async function writeAiNewsDoc(prisma: Db, payload: unknown) {
  const items = isRecord(payload) && Array.isArray(payload.items) ? payload.items : [];
  await inTransaction(prisma, (tx) => replaceRows(tx, AI_NEWS_POST, items));
  return readAiNewsDoc(prisma);
}

// ---------------------------------------------------------------------------
// 门户知识地图内容（有 expectedRevision 时做乐观锁；旧客户端不带也允许写入）

const PORTAL_CONTENT: TableSpec = {
  label: 'invalid_portal_content',
  model: 'portalContent',
  key: 'id',
  position: true,
  fields: {
    id: { type: 'string', required: true },
    type: { type: 'string', required: true },
    title: { type: 'string', required: true },
    desc: { type: 'string', required: true },
    icon: { type: 'string', required: true },
    published: { type: 'bool' },
    isGold: { type: 'bool' },
    sourceType: { type: 'string' },
    visibility: { type: 'string' },
    publisher: { type: 'string' },
    publisherUserId: { type: 'string' },
    ownerDeptIds: { type: 'json' },
    ownerRegionId: { type: 'string' },
    scenarioTags: { type: 'json' },
    homepageUrl: { type: 'string' },
    kbDocId: { type: 'string' },
    agentId: { type: 'string' },
    skillId: { type: 'string' },
    primarySkillId: { type: 'string' },
    toolId: { type: 'string' },
    painPoint: { type: 'string' },
    impactMetric: { type: 'string' },
    steps: { type: 'json' },
    packageVersion: { type: 'string' },
    previewFile: { type: 'json' },
    layoutPreviewFile: { type: 'json' },
    publishedAt: { type: 'string', required: true },
  },
};

/** 从没保存过时返回 null（前端据此用内置内容） */
export async function readPortalContent(prisma: Db) {
  const revisionRow = await prisma.collectionRevision.findUnique({ where: { collection: 'portal-content' } });
  if (!revisionRow) return null;
  return { items: await readRows(prisma, PORTAL_CONTENT), revision: revisionRow.revision };
}

export async function writePortalContent(prisma: Db, payload: { items?: unknown; expectedRevision?: unknown }) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const expected = typeof payload.expectedRevision === 'number' ? payload.expectedRevision : undefined;
  await inTransaction(prisma, async (tx) => {
    const current = (await tx.collectionRevision.findUnique({ where: { collection: 'portal-content' } }))?.revision ?? 0;
    if (expected != null && expected !== current) {
      throw new ConflictException({
        message: 'portal_content_conflict',
        revision: current,
        items: await readRows(tx, PORTAL_CONTENT),
      });
    }
    await tx.collectionRevision.upsert({
      where: { collection: 'portal-content' },
      create: { collection: 'portal-content', revision: current + 1 },
      update: { revision: { increment: 1 } },
    });
    await replaceRows(tx, PORTAL_CONTENT, items);
  });
  return readPortalContent(prisma);
}

// ---------------------------------------------------------------------------
// 资产审批：审批单整份替换；「我关注的审批」只读写当前登录人自己的那一份

const ASSET_APPROVAL: TableSpec = {
  label: 'invalid_asset_approval',
  model: 'assetApproval',
  key: 'id',
  position: true,
  fields: {
    id: { type: 'string', required: true },
    kind: { type: 'string', required: true },
    assetId: { type: 'string', required: true },
    assetName: { type: 'string', required: true },
    submitterName: { type: 'string', required: true },
    submitterUserId: { type: 'string' },
    stepIndex: { type: 'int', required: true },
    createdAt: { type: 'epochMs', required: true },
    reasons: { type: 'json' },
    note: { type: 'string' },
    targetVersion: { type: 'string' },
    unpublishMode: { type: 'string' },
    unpublishVersions: { type: 'json' },
    status: { type: 'string', required: true },
    updatedAt: { type: 'epochMs', required: true },
    decidedAt: { type: 'epochMs' },
    rejectNote: { type: 'string' },
  },
  groups: { packageBlob: ['packageName', 'packageBlobId', 'packageUrl', 'packageSize'] },
};

type WatchItem = { kind: string; assetId: string; assetName: string };

function watchItems(raw: unknown): WatchItem[] {
  const seen = new Set<string>();
  return (Array.isArray(raw) ? raw : []).filter((item): item is WatchItem => {
    if (!isRecord(item) || typeof item.kind !== 'string' || typeof item.assetId !== 'string') return false;
    const key = `${item.kind}:${item.assetId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function readApprovalsDoc(prisma: Db, memberId?: string) {
  const [items, watches] = await Promise.all([
    readRows(prisma, ASSET_APPROVAL),
    memberId
      ? prisma.assetApprovalWatch.findMany({ where: { memberId }, orderBy: { position: 'asc' } })
      : Promise.resolve([]),
  ]);
  return {
    items,
    watchedByUserId: memberId
      ? { [memberId]: watches.map(({ kind, assetId, assetName }) => ({ kind, assetId, assetName })) }
      : {},
  };
}

export async function writeApprovalsDoc(prisma: Db, payload: unknown, memberId: string) {
  const input = isRecord(payload) ? payload : {};
  const items = Array.isArray(input.items) ? input.items : [];
  const watched = isRecord(input.watchedByUserId) ? watchItems(input.watchedByUserId[memberId]) : null;
  await inTransaction(prisma, async (tx) => {
    await replaceRows(tx, ASSET_APPROVAL, items);
    if (watched) {
      await tx.assetApprovalWatch.deleteMany({ where: { memberId } });
      if (watched.length) {
        await tx.assetApprovalWatch.createMany({
          data: watched.map((item, position) => ({ memberId, position, kind: item.kind, assetId: item.assetId, assetName: String(item.assetName ?? '') })),
        });
      }
    }
  });
  return readApprovalsDoc(prisma, memberId);
}

/** 删除 Skill 前检查：还有待处理的审批就不能删 */
export async function hasPendingApproval(prisma: Db, kind: string, assetIds: string[]) {
  return (await prisma.assetApproval.count({ where: { kind, assetId: { in: assetIds }, status: 'pending' } })) > 0;
}

// ---------------------------------------------------------------------------
// 审计日志：只追加；读最近 400 条；保留 180 天

const AUDIT_READ_LIMIT = 400;
export const AUDIT_RETENTION_DAYS = 180;

type AuditRow = Prisma.AuditLogGetPayload<object>;

function auditToJson(row: AuditRow): JsonRecord {
  return {
    id: row.entryId,
    at: row.occurredAt.toISOString(),
    category: row.category,
    action: row.action,
    module: row.module,
    detail: row.detail,
    userName: row.actorName,
    ...(row.actorEmail ? { userEmail: row.actorEmail } : {}),
    ...(row.actorRole ? { role: row.actorRole } : {}),
    ...(Array.isArray(row.deptIds) ? { deptIds: row.deptIds } : {}),
    ...(row.regionId !== null ? { regionId: row.regionId } : {}),
  };
}

/** 客户端条目 → 行；缺 id 或时间无法解析的条目跳过（审计是尽力记录，不因一条坏数据丢整批） */
export function auditFromJson(raw: unknown): Prisma.AuditLogCreateManyInput | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id.trim()) return null;
  const at = Date.parse(String(raw.at ?? ''));
  if (!Number.isFinite(at)) return null;
  const text = (value: unknown) => (typeof value === 'string' ? value : '');
  return {
    entryId: raw.id.trim(),
    occurredAt: new Date(at),
    category: text(raw.category),
    action: text(raw.action),
    module: text(raw.module),
    detail: text(raw.detail),
    actorName: text(raw.userName),
    actorEmail: typeof raw.userEmail === 'string' ? raw.userEmail : null,
    actorRole: typeof raw.role === 'string' ? raw.role : null,
    deptIds: Array.isArray(raw.deptIds) ? (raw.deptIds as Prisma.InputJsonValue) : Prisma.DbNull,
    regionId: typeof raw.regionId === 'string' ? raw.regionId : null,
  };
}

export async function readAuditDoc(prisma: Db) {
  const rows = await prisma.auditLog.findMany({ orderBy: { occurredAt: 'desc' }, take: AUDIT_READ_LIMIT });
  return { logs: rows.map(auditToJson) };
}

/** 整份 PUT 兼容：只插入新条目（按条目 id 去重），不按提交列表删除旧条目；顺手清理超过保留期的。 */
export async function appendAuditDoc(prisma: Db, payload: unknown) {
  const logs = isRecord(payload) && Array.isArray(payload.logs) ? payload.logs : [];
  const rows = logs.map(auditFromJson).filter((row): row is Prisma.AuditLogCreateManyInput => Boolean(row));
  const cutoff = new Date(Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await inTransaction(prisma, async (tx) => {
    await tx.auditLog.createMany({ data: rows.filter((row) => new Date(row.occurredAt) >= cutoff), skipDuplicates: true });
    await tx.auditLog.deleteMany({ where: { occurredAt: { lt: cutoff } } });
  });
  return readAuditDoc(prisma);
}
