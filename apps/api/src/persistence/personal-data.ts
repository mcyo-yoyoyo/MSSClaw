import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PLATFORM_WORKSPACE_ID } from '../common/platform-workspace';
import type { PrismaService } from '../prisma/prisma.service';
import type { FavoriteSnapshot, PersistenceService } from './persistence.service';

/**
 * 第 5 期个人数据：收藏、最近浏览、隐藏，按登录人逐条读写（/me/...）。
 * 返回形状沿用前端原来的 MarketFavoriteItem / RecentMarketItem / "<shelfKind>:<id>"。
 */

const SHELF_KINDS = new Set(['external', 'internal', 'projects']);
const ASSET_TYPES = new Set(['tool', 'skill', 'agent', 'office-scene']);
const MAX_RECENT = 12;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown, field: string, max: number, required = false): string | undefined {
  if (value === undefined || value === null || value === '') {
    if (required) throw new BadRequestException(`${field}_required`);
    return undefined;
  }
  if (typeof value !== 'string') throw new BadRequestException(`${field}_must_be_string`);
  const trimmed = value.trim();
  if (required && !trimmed) throw new BadRequestException(`${field}_required`);
  if (trimmed.length > max) throw new BadRequestException(`${field}_too_long`);
  return trimmed || undefined;
}

/** 货架 + 资产定位：shelfKind、id 必填，assetType 可空（旧数据） */
export function assetKey(raw: { kind?: unknown; id?: unknown; assetType?: unknown }) {
  const shelfKind = text(raw.kind, 'kind', 20, true)!;
  if (!SHELF_KINDS.has(shelfKind)) throw new BadRequestException('invalid_shelf_kind');
  const assetId = text(raw.id, 'id', 200, true)!;
  const assetType = text(raw.assetType, 'assetType', 20) ?? '';
  if (assetType && !ASSET_TYPES.has(assetType)) throw new BadRequestException('invalid_asset_type');
  return { shelfKind, assetId, assetType };
}

function snapshot(raw: unknown) {
  if (!isRecord(raw)) throw new BadRequestException('body_required');
  return {
    ...assetKey(raw),
    title: text(raw.title, 'title', 200, true)!,
    icon: text(raw.icon, 'icon', 200) ?? null,
    logoUrl: text(raw.logoUrl, 'logoUrl', 2000) ?? null,
  };
}

function withOptionalAssetType<T extends JsonRecord>(item: T, assetType: string) {
  return assetType ? { ...item, assetType } : item;
}

// ---------------------------------------------------------------------------
// 收藏：写入走互动接口同一事务（收藏表 + 收藏数 + 行为事实）

export async function listFavorites(prisma: PrismaService, memberId: string) {
  const rows = await prisma.marketFavorite.findMany({ where: { memberId }, orderBy: { createdAt: 'desc' } });
  return rows.map((row) =>
    withOptionalAssetType(
      {
        id: row.assetId,
        kind: row.shelfKind,
        title: row.title,
        ...(row.icon ? { icon: row.icon } : {}),
        ...(row.logoUrl ? { logoUrl: row.logoUrl } : {}),
        at: row.createdAt.getTime(),
        ...(row.note ? { note: row.note } : {}),
      },
      row.assetType,
    ),
  );
}

export async function setFavorite(
  prisma: PrismaService,
  persistence: PersistenceService,
  memberId: string,
  raw: unknown,
  active: boolean,
) {
  const base = active
    ? snapshot(raw)
    : { ...assetKey(isRecord(raw) ? raw : {}), title: '', icon: null, logoUrl: null };
  const note = active && isRecord(raw) && raw.note !== undefined ? text(raw.note, 'note', 500) ?? null : undefined;
  const favorite: FavoriteSnapshot = { ...base, ...(note !== undefined ? { note } : {}) };
  let engagement: unknown = null;
  try {
    const result = await persistence.mutateMarketEngagement(PLATFORM_WORKSPACE_ID, favorite.assetId, {
      action: active ? 'favorite' : 'unfavorite',
      active,
      userId: memberId,
      eventId: `favorite-${randomUUID()}`,
      assetType: favorite.assetType || 'unknown',
      favorite,
    });
    engagement = (result as { engagement?: unknown }).engagement ?? null;
  } catch (error) {
    // 已下架删除的资产不再计数，但收藏清单里的旧条目仍要能移除
    if (active || !(error instanceof NotFoundException)) throw error;
    await prisma.marketFavorite.deleteMany({
      where: {
        memberId,
        shelfKind: favorite.shelfKind,
        assetId: favorite.assetId,
        ...(favorite.assetType ? { assetType: { in: [favorite.assetType, ''] } } : {}),
      },
    });
  }
  return { items: await listFavorites(prisma, memberId), engagement };
}

export async function setFavoriteNote(prisma: PrismaService, memberId: string, raw: unknown) {
  if (!isRecord(raw)) throw new BadRequestException('body_required');
  const { shelfKind, assetId, assetType } = assetKey(raw);
  const note = text(raw.note, 'note', 500) ?? null;
  const updated = await prisma.marketFavorite.updateMany({
    where: { memberId, shelfKind, assetId, ...(assetType ? { assetType: { in: [assetType, ''] } } : {}) },
    data: { note },
  });
  if (!updated.count) throw new NotFoundException('market_favorite_not_found');
  return { items: await listFavorites(prisma, memberId) };
}

// ---------------------------------------------------------------------------
// 最近浏览：同一资产只留一条，最近的在前，每人最多 12 条

export async function listRecent(prisma: PrismaService, memberId: string) {
  const rows = await prisma.marketRecentView.findMany({
    where: { memberId },
    orderBy: { viewedAt: 'desc' },
    take: MAX_RECENT,
  });
  return rows.map((row) =>
    withOptionalAssetType(
      {
        id: row.assetId,
        kind: row.shelfKind,
        title: row.title,
        ...(row.icon ? { icon: row.icon } : {}),
        ...(row.logoUrl ? { logoUrl: row.logoUrl } : {}),
        at: row.viewedAt.getTime(),
      },
      row.assetType,
    ),
  );
}

export async function pushRecent(prisma: PrismaService, memberId: string, raw: unknown) {
  const item = snapshot(raw);
  await prisma.$transaction(async (tx) => {
    // 旧记录没有资产类型时与带类型的同一资产视为同一条
    await tx.marketRecentView.deleteMany({
      where: {
        memberId,
        shelfKind: item.shelfKind,
        assetId: item.assetId,
        ...(item.assetType ? { assetType: { in: [item.assetType, ''] } } : {}),
      },
    });
    await tx.marketRecentView.create({ data: { memberId, ...item, viewedAt: new Date() } });
    const stale = await tx.marketRecentView.findMany({
      where: { memberId },
      orderBy: { viewedAt: 'desc' },
      skip: MAX_RECENT,
      select: { shelfKind: true, assetType: true, assetId: true },
    });
    for (const row of stale) {
      await tx.marketRecentView.delete({ where: { memberId_shelfKind_assetType_assetId: { memberId, ...row } } });
    }
  });
  return { items: await listRecent(prisma, memberId) };
}

// ---------------------------------------------------------------------------
// 隐藏的货架项

export async function listHidden(prisma: PrismaService, memberId: string) {
  const rows = await prisma.marketHiddenItem.findMany({ where: { memberId }, orderBy: { hiddenAt: 'asc' } });
  return rows.map((row) => `${row.shelfKind}:${row.assetId}`);
}

export async function hideItem(prisma: PrismaService, memberId: string, raw: { kind?: unknown; id?: unknown }) {
  const { shelfKind, assetId } = assetKey(raw);
  await prisma.marketHiddenItem.upsert({
    where: { memberId_shelfKind_assetId: { memberId, shelfKind, assetId } },
    create: { memberId, shelfKind, assetId },
    update: {},
  });
  return { keys: await listHidden(prisma, memberId) };
}

// ---------------------------------------------------------------------------
// Skill 评价：只读，形状沿用旧文档 { bySkillId: { [skillId]: [...] } }

export async function readSkillReviewsDoc(prisma: PrismaService) {
  const rows = await prisma.skillReview.findMany({ orderBy: { createdAt: 'desc' } });
  const bySkillId: Record<string, JsonRecord[]> = {};
  for (const row of rows) {
    (bySkillId[row.skillId] ??= []).push({
      id: row.id,
      skillId: row.skillId,
      userId: row.memberId,
      userName: row.memberName,
      rating: row.rating,
      text: row.content,
      at: row.createdAt.getTime(),
      ...(row.reply ? { reply: row.reply } : {}),
      ...(row.repliedAt ? { replyAt: row.repliedAt.getTime() } : {}),
    });
  }
  return { bySkillId };
}
