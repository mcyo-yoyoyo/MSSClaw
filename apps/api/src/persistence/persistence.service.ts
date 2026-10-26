import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { findWorkspace } from '../workspaces/workspace-setting';
import { PrismaService } from '../prisma/prisma.service';
import type { MarketplacePayload } from './marketplace-center-sync';
import { readChats, writeChats } from './chat-session-store';
import { hasPendingApproval, readPortalContent, writePortalContent } from './operations-store';
import {
  readAssetIds,
  readAssets,
  readToolCatalogMeta,
  replaceAssets,
  writeToolCatalogMeta,
  type AssetKind,
  type ToolCatalogMeta,
} from './asset-catalog';
import {
  MARKET_AGENT_BUSINESS_SCENARIO,
  MARKET_SKILL_BUSINESS_SCENARIO,
  SEED_MARKET_ENGAGEMENT_STATIC_CONTENT_IDS,
} from '../data/market-doc-seeds';
import {
  EXTERNAL_TOOLS_EXCEL,
  EXTERNAL_TOOLS_EXCEL_VERSION,
} from '../data/external-tools-excel-v1-0-5';
import {
  INTERNAL_TOOLS_EXCEL,
  INTERNAL_TOOLS_EXCEL_VERSION,
} from '../data/internal-tools-excel-v1-0-5';
import { portalAnalyticsDateKey } from './portal-analytics-time';

export type { MarketplacePayload };

/**
 * 原 center_record 里的工具目录单例。第 3 期起工具在 tool 表，这两个值只用于
 * 看板把工具表拼成旧的「全局工具记录」形状（portal-analytics readCenterRows）。
 */
export const GLOBAL_TOOLS_RECORD_ID = 'global-tools';
export const GLOBAL_TOOLS_RECORD_KIND = 'tool-catalog';

/** 货架快照里的资产列表与资产表的对应关系 */
const MARKETPLACE_ASSET_LISTS = [
  ['agents', 'agent'],
  ['skills', 'skill'],
  ['automations', 'automation'],
  ['kbDocs', 'kbDoc'],
] as const satisfies ReadonlyArray<readonly [keyof MarketplacePayload, AssetKind]>;

export interface GlobalToolsPayload {
  tools: unknown[];
  externalCatalogVersion?: string;
  internalCatalogVersion?: string;
  /** 首次初始化完成后写入；旧 workspace 数据迁移不会设置它。 */
  initialized?: boolean;
  initializedAt?: string;
  /** 仅用于说明 singleton 是从旧 workspace 快照迁来的。 */
  migratedAt?: string;
}

/** 收藏写入时带的展示快照（个人收藏清单直接显示它） */
export interface FavoriteSnapshot {
  shelfKind: string;
  /** 旧收藏没有资产类型时为空串 */
  assetType: string;
  assetId: string;
  title: string;
  icon?: string | null;
  logoUrl?: string | null;
  note?: string | null;
}

/** 每人最多保留的收藏数（沿用前端上限）；超出时淘汰最早的收藏，计数随之减一 */
export const MAX_FAVORITES = 40;

export interface PortalContentPayload {
  items?: unknown[];
  /** 乐观锁版本；客户端 PUT 时带 expectedRevision */
  revision?: number;
  expectedRevision?: number;
}

export interface InboxMessageInput {
  id: string;
  kind: string;
  title: string;
  body: string;
  fromUserId?: string;
  fromName: string;
  toUserId: string;
  createdAt?: string;
  meta?: Record<string, unknown>;
}

export type MarketEngagementAction =
  | 'exposure'
  | 'detail'
  /** 详情页直达（页面新打开就落在详情页，多为分享链接）；看板「分享浏览数」只数它 */
  | 'detail_direct'
  | 'view'
  | 'use'
  | 'redirect'
  | 'download'
  | 'favorite'
  | 'unfavorite'
  | 'like'
  | 'unlike'
  | 'dislike';

// `undislike` is kept as a wire-level cancellation alias. It is intentionally not
// exposed by the existing toggle UI, but accepting it makes imported event streams
// explicit instead of encoding cancellations as a second positive vote.
export type MarketEngagementEventAction =
  | MarketEngagementAction
  | 'undislike'
  | 'favorite_cancel'
  | 'like_cancel'
  | 'dislike_cancel'
  | 'call';

export const MARKET_ENGAGEMENT_EVENT_ACTIONS = new Set<MarketEngagementEventAction>([
  'exposure',
  'detail',
  'detail_direct',
  'view',
  'use',
  'redirect',
  'download',
  'favorite',
  'unfavorite',
  'like',
  'unlike',
  'dislike',
  'undislike',
  'favorite_cancel',
  'like_cancel',
  'dislike_cancel',
  'call',
]);

const MARKET_ENGAGEMENT_EVENT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MARKET_ENGAGEMENT_RATE_WINDOW_MS = 60_000;
const MARKET_ENGAGEMENT_VISITOR_RATE_LIMIT = 60;
const MARKET_ENGAGEMENT_DAILY_VISITOR_LIMIT = 500;
const MARKET_ENGAGEMENT_STATIC_CONTENT_IDS = new Set<string>(
  SEED_MARKET_ENGAGEMENT_STATIC_CONTENT_IDS,
);

function optionalTrimmedString(value: unknown, errorCode: string): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new BadRequestException(errorCode);
  return value.trim();
}

function normalizeExternalToolName(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase();
}

function normalizeExternalToolUrl(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\/+$/, '')
    .toLocaleLowerCase();
}

/**
 * 首版目录已被精选、互动数据和运营配置引用的稳定 ID。
 * 名称允许后台修改，但这些 ID 不能再随 Excel 导入重新生成。
 */
const LEGACY_STABLE_EXTERNAL_IDS: Record<string, string> = {
  chatgpt: 'tool-saas-chatgpt',
  claude: 'tool-saas-claude',
  gemini: 'tool-saas-gemini',
  perplexity: 'tool-saas-perplexity',
  豆包: 'tool-saas-doubao',
  deepseek: 'tool-saas-deepseek',
  kimi: 'tool-saas-kimi',
  qwen: 'tool-saas-tongyi',
};

function externalToolId(name: string): string {
  const slug = name
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `tool-excel-${slug || Buffer.from(name).toString('hex').slice(0, 20)}`;
}

/**
 * marketplace 是工具的权威快照；中心里的 tool 记录只是兼容投影。
 * 旧数据有时没有 sourceType，但带有 ai-saas / external 标记，不能把它误归为内部连接器。
 */
function isExternalToolRecord(raw: unknown): raw is Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const tool = raw as Record<string, unknown>;
  const tags = Array.isArray(tool.tags) ? tool.tags.map(String) : [];
  return (
    tool.sourceType === 'external' ||
    tool.marketShelf === 'external' ||
    tool.category === 'external' ||
    tags.includes('ai-saas') ||
    tags.includes('external')
  );
}

export function existingMarketShelf(value: unknown): 'external' | 'internal' | 'none' | undefined {
  return value === 'external' || value === 'internal' || value === 'none'
    ? value
    : undefined;
}

export function dedupeMarketplaceTools(source: unknown[] | undefined): {
  tools: unknown[];
  changed: boolean;
} {
  const tools = Array.isArray(source) ? source : [];
  const seenIds = new Set<string>();
  let changed = false;
  const deduped = tools.filter((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return true;
    const id = typeof (raw as Record<string, unknown>).id === 'string'
      ? String((raw as Record<string, unknown>).id).trim()
      : '';
    if (!id) return true;
    if (seenIds.has(id)) {
      changed = true;
      return false;
    }
    seenIds.add(id);
    return true;
  });
  return { tools: deduped, changed };
}

function mergeExcelExternalTools(source: unknown[] | undefined): unknown[] {
  const tools = Array.isArray(source) ? source : [];
  const existingExternal = tools.filter(isExternalToolRecord);
  const internal = tools.filter((raw) => !isExternalToolRecord(raw));
  const existingByName = new Map(
    existingExternal.map((tool) => [normalizeExternalToolName(tool.name), tool]),
  );
  const existingById = new Map(
    existingExternal
      .filter((tool) => typeof tool.id === 'string')
      .map((tool) => [String(tool.id), tool]),
  );
  const existingByHomepage = new Map(
    existingExternal
      .map((tool) => [normalizeExternalToolUrl(tool.homepageUrl), tool] as const)
      .filter(([url]) => Boolean(url)),
  );
  const existingByDocs = new Map(
    existingExternal
      .map((tool) => [normalizeExternalToolUrl(tool.docsUrl), tool] as const)
      .filter(([url]) => Boolean(url)),
  );
  const matchedExisting = new Set<Record<string, unknown>>();
  const matchedExternalIds = new Set<string>();
  const matchedExternalNames = new Set<string>();
  const matchedExternalHomepages = new Set<string>();
  const matchedExternalDocs = new Set<string>();

  const external = EXTERNAL_TOOLS_EXCEL.map((record) => {
    const normalizedName = normalizeExternalToolName(record.name);
    const stableId = LEGACY_STABLE_EXTERNAL_IDS[normalizedName];
    const recordId = (record as { id?: unknown }).id;
    const catalogId = typeof recordId === 'string' && recordId ? recordId : undefined;
    const recordDocsUrl = 'docsUrl' in record ? record.docsUrl : undefined;
    const existing =
      (stableId ? existingById.get(stableId) : undefined) ??
      existingByName.get(normalizedName) ??
      existingByHomepage.get(normalizeExternalToolUrl(record.homepageUrl)) ??
      existingByDocs.get(normalizeExternalToolUrl(recordDocsUrl)) ??
      (catalogId ? existingById.get(catalogId) : undefined);
    if (existing) {
      matchedExisting.add(existing);
      if (typeof existing.id === 'string' && existing.id.trim()) {
        matchedExternalIds.add(existing.id.trim());
      }
      const existingNameKey = normalizeExternalToolName(existing.name);
      const existingHomepageKey = normalizeExternalToolUrl(existing.homepageUrl);
      const existingDocsKey = normalizeExternalToolUrl(existing.docsUrl);
      if (existingNameKey) matchedExternalNames.add(existingNameKey);
      if (existingHomepageKey) matchedExternalHomepages.add(existingHomepageKey);
      if (existingDocsKey) matchedExternalDocs.add(existingDocsKey);
    }
    const existingName =
      typeof existing?.name === 'string' && existing.name.trim() ? existing.name.trim() : '';
    const existingTags = Array.isArray(existing?.tags) ? existing.tags.map(String) : [];
    const existingShelf = existingMarketShelf(existing?.marketShelf);
    const existingCategoryRanks = existing?.externalCategoryRanks;
    const existingSortOrder = existing?.externalSortOrder;
    const existingSortRank = existing?.externalSortRank;
    return {
      ...existing,
      ...record,
      id:
        stableId ||
        (typeof existing?.id === 'string' && existing.id
          ? existing.id
          : catalogId || externalToolId(record.name)),
      // URL / ID 命中说明只是运营改了展示名，应保留后台名称。
      name: existingName || record.name,
      desc: record.cardSummary,
      category: 'external',
      author: record.company,
      // 目录迁移不能把管理员已经下架的工具重新发布。
      published: typeof existing?.published === 'boolean' ? existing.published : true,
      invokes: typeof existing?.invokes === 'number' ? existing.invokes : 0,
      icon: typeof existing?.icon === 'string' && existing.icon ? existing.icon : record.icon,
      tags: [...new Set(['ai-saas', ...existingTags, ...(record.toolTypeLabels ?? [])])],
      // 运营排序字段已经被工具运营使用时，目录迁移只补缺不覆盖。
      externalCategoryRanks:
        existingCategoryRanks && typeof existingCategoryRanks === 'object'
          ? existingCategoryRanks
          : record.externalCategoryRanks,
      externalSortOrder:
        typeof existingSortOrder === 'number' ? existingSortOrder : record.externalSortOrder,
      externalSortRank:
        typeof existingSortRank === 'number' ? existingSortRank : record.externalSortRank,
      sourceType: 'external',
      visibility: existing?.visibility ?? 'public',
      ownerDeptIds: Array.isArray(existing?.ownerDeptIds) ? existing.ownerDeptIds : [],
      ownerRegionId: existing?.ownerRegionId ?? null,
      // 保留运营已选的目标货架；新目录条目默认进入外部货架候选。
      marketShelf: existingShelf ?? 'external',
    };
  });

  // 目录迁移只补齐/更新目录条目，不删除管理员后来新增的外部工具；
  // 但旧快照中的重复目录项不能继续进入统一 marketplace 快照。
  const extraIds = new Set<string>();
  const extraNames = new Set<string>();
  const extraHomepages = new Set<string>();
  const extraDocs = new Set<string>();
  const extras = existingExternal.filter((tool) => {
    if (matchedExisting.has(tool)) return false;
    const id = typeof tool.id === 'string' ? tool.id.trim() : '';
    const name = normalizeExternalToolName(tool.name);
    const homepage = normalizeExternalToolUrl(tool.homepageUrl);
    const docs = normalizeExternalToolUrl(tool.docsUrl);
    if (
      (id && matchedExternalIds.has(id)) ||
      (name && matchedExternalNames.has(name)) ||
      (homepage && matchedExternalHomepages.has(homepage)) ||
      (docs && matchedExternalDocs.has(docs))
    ) {
      return false;
    }
    if (
      (id && extraIds.has(id)) ||
      (name && extraNames.has(name)) ||
      (homepage && extraHomepages.has(homepage)) ||
      (docs && extraDocs.has(docs))
    ) {
      return false;
    }
    if (id) extraIds.add(id);
    if (name) extraNames.add(name);
    if (homepage) extraHomepages.add(homepage);
    if (docs) extraDocs.add(docs);
    return true;
  });
  return [...internal, ...external, ...extras];
}

function mergeExcelInternalTools(source: unknown[] | undefined): unknown[] {
  const tools = Array.isArray(source) ? source : [];
  const byId = new Map(
    tools
      .filter((raw): raw is Record<string, unknown> => Boolean(raw && typeof raw === 'object' && !Array.isArray(raw)))
      .map((tool) => [String(tool.id ?? ''), tool]),
  );
  const updatedIds = new Set<string>();
  const updated = INTERNAL_TOOLS_EXCEL.map((record) => {
    updatedIds.add(record.id);
    const existing = byId.get(record.id) ?? {};
    const existingShelf = existingMarketShelf(existing.marketShelf);
    return {
      ...existing,
      ...record,
      desc: record.cardSummary,
      category: 'platform',
      author: '华为内部',
      // 目录迁移不能把管理员已经下架的内部工具重新发布。
      published: typeof existing.published === 'boolean' ? existing.published : true,
      invokes: typeof existing.invokes === 'number' ? existing.invokes : 0,
      icon: typeof existing.icon === 'string' && existing.icon ? existing.icon : record.icon,
      tags: Array.isArray(existing.tags) ? existing.tags : ['hw-internal'],
      sourceType: 'internal',
      visibility: typeof existing.visibility === 'string' ? existing.visibility : 'public',
      ownerDeptIds: Array.isArray(existing.ownerDeptIds) ? existing.ownerDeptIds : [],
      ownerRegionId: existing.ownerRegionId ?? null,
      marketShelf: existingShelf ?? 'internal',
    };
  });
  return [...tools.filter((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return true;
    return !updatedIds.has(String((raw as Record<string, unknown>).id ?? ''));
  }), ...updated];
}

type FavoriteTx = Prisma.TransactionClient;

/**
 * 写一条收藏。旧收藏没有资产类型（空串），和带类型的同一资产视为同一条：
 * 收藏时把旧行换成带类型的行（保留备注和收藏时间），取消时两种都删。
 */
async function writeFavoriteRow(
  tx: FavoriteTx,
  memberId: string,
  contentId: string,
  favorite: FavoriteSnapshot,
  active: boolean,
): Promise<void> {
  const sameAsset = {
    memberId,
    shelfKind: favorite.shelfKind,
    assetId: favorite.assetId,
    ...(favorite.assetType ? { assetType: { in: [favorite.assetType, ''] } } : {}),
  };
  if (!active) {
    await tx.marketFavorite.deleteMany({ where: sameAsset });
    return;
  }
  const existing = await tx.marketFavorite.findFirst({ where: sameAsset, orderBy: { assetType: 'desc' } });
  const snapshot = {
    contentId,
    title: favorite.title,
    icon: favorite.icon ?? null,
    logoUrl: favorite.logoUrl ?? null,
    ...(favorite.note !== undefined ? { note: favorite.note } : {}),
  };
  if (existing && existing.assetType === favorite.assetType) {
    await tx.marketFavorite.update({
      where: { memberId_shelfKind_assetType_assetId: { memberId, shelfKind: favorite.shelfKind, assetType: favorite.assetType, assetId: favorite.assetId } },
      data: snapshot,
    });
    return;
  }
  if (existing) await tx.marketFavorite.deleteMany({ where: sameAsset });
  await tx.marketFavorite.create({
    data: {
      memberId,
      shelfKind: favorite.shelfKind,
      assetType: favorite.assetType,
      assetId: favorite.assetId,
      ...snapshot,
      note: favorite.note ?? existing?.note ?? null,
      createdAt: existing?.createdAt ?? new Date(),
    },
  });
}

/** 超过收藏上限时淘汰最早的收藏；某个内容因此不再被收藏，计数减一并记一条取消收藏事实。 */
async function evictOldFavorites(
  tx: FavoriteTx,
  memberId: string,
  fact: { dateKey: string; visitorHash: string; visitorType: string; occurredAt: Date },
): Promise<void> {
  const evicted = await tx.marketFavorite.findMany({
    where: { memberId },
    orderBy: { createdAt: 'desc' },
    skip: MAX_FAVORITES,
  });
  for (const row of evicted) {
    await tx.marketFavorite.delete({
      where: { memberId_shelfKind_assetType_assetId: { memberId, shelfKind: row.shelfKind, assetType: row.assetType, assetId: row.assetId } },
    });
    if (await tx.marketFavorite.count({ where: { memberId, contentId: row.contentId } })) continue;
    const decremented = await tx.marketEngagement.updateMany({
      where: { contentId: row.contentId },
      data: { favorites: { increment: -1 } },
    });
    if (!decremented.count) continue;
    await tx.marketEngagementEvent.create({
      data: {
        contentId: row.contentId,
        assetType: row.assetType || 'unknown',
        action: 'favorite_cancel',
        ...fact,
      },
    });
  }
}

@Injectable()
export class PersistenceService {
  /** 行为写事务按进程排队：上限检查是先计数再插入，排队后同一实例内的并发请求不会一起穿过上限。 */
  private marketEngagementWriteTail: Promise<void> = Promise.resolve();

  constructor(private readonly prisma: PrismaService) {}

  getSessions(memberId: string) {
    return readChats(this.prisma, memberId).then((chats) => ({ chats }));
  }

  putSessions(memberId: string, chats: unknown) {
    return writeChats(this.prisma, memberId, chats);
  }

  async getInboxMessages(workspaceId: string, userId: string) {
    const [messages, states] = await Promise.all([
      this.prisma.inboxMessageRecord.findMany({
        where: { toUserId: { in: [userId, '*'] } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inboxUserMessageState.findMany({ where: { userId } }),
    ]);
    const stateByMessage = new Map(states.map((state) => [state.messageId, state]));
    return {
      messages: messages
        .filter((message) => !stateByMessage.get(message.id)?.deletedAt)
        .map((message) => ({
          ...message,
          createdAt: message.createdAt.toISOString(),
          read: Boolean(stateByMessage.get(message.id)?.readAt),
        })),
    };
  }

  async createInboxMessage(workspaceId: string, input: InboxMessageInput) {
    const message = await this.prisma.inboxMessageRecord.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        kind: input.kind,
        title: input.title,
        body: input.body,
        fromUserId: input.fromUserId,
        fromName: input.fromName,
        toUserId: input.toUserId,
        createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
        meta: input.meta ? (input.meta as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
      update: {},
    });
    return { ...message, createdAt: message.createdAt.toISOString(), read: false };
  }

  async markInboxMessageRead(workspaceId: string, userId: string, messageId: string) {
    await this.prisma.inboxUserMessageState.upsert({
      where: { userId_messageId: { userId, messageId } },
      create: { userId, messageId, readAt: new Date() },
      update: { readAt: new Date(), deletedAt: null },
    });
    return { ok: true };
  }

  async markAllInboxMessagesRead(workspaceId: string, userId: string) {
    const messages = await this.prisma.inboxMessageRecord.findMany({
      where: { toUserId: { in: [userId, '*'] } },
      select: { id: true },
    });
    await this.prisma.$transaction(
      messages.map(({ id: messageId }) =>
        this.prisma.inboxUserMessageState.upsert({
          where: { userId_messageId: { userId, messageId } },
          create: { userId, messageId, readAt: new Date() },
          update: { readAt: new Date() },
        }),
      ),
    );
    return { ok: true, count: messages.length };
  }

  async deleteInboxMessageForUser(workspaceId: string, userId: string, messageId: string) {
    await this.prisma.inboxUserMessageState.upsert({
      where: { userId_messageId: { userId, messageId } },
      create: { userId, messageId, deletedAt: new Date() },
      update: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  async getMarketplace(workspaceId: string): Promise<MarketplacePayload | null> {
    // 平台空间还没建出来时（全新库、只是有人打开了页面）不播种任何东西。
    if (!(await findWorkspace(this.prisma))) return null;
    return this.readMarketplace(workspaceId);
  }

  private async readMarketplace(_workspaceId: string): Promise<MarketplacePayload> {
    const global = await this.getGlobalTools();
    const [agents, skills, automations, kbDocs] = await Promise.all(
      MARKETPLACE_ASSET_LISTS.map(([, kind]) => readAssets(this.prisma, kind)),
    );
    // 补业务场景、Skill Hub 精选默认值；只在确有变化时写回（replaceAssets 只重写变了的行）。
    const enriched = this.enrichMarketplaceMetadata({ agents, skills, tools: [], automations, kbDocs });
    if (enriched.changed) {
      await this.prisma.$transaction(async (tx) => {
        await replaceAssets(tx, 'agent', enriched.payload.agents ?? []);
        await replaceAssets(tx, 'skill', enriched.payload.skills ?? []);
      });
    }
    return {
      ...enriched.payload,
      tools: global.tools,
      externalCatalogVersion: global.externalCatalogVersion,
      internalCatalogVersion: global.internalCatalogVersion,
    };
  }

  /** 部署级工具目录：tool 表 + app_setting('tool-catalog.meta')。全新库第一次读取时用内置清单播种。 */
  async getGlobalTools(): Promise<GlobalToolsPayload> {
    const meta = (await readToolCatalogMeta(this.prisma)) ?? (await this.seedToolCatalog());
    const tools = await readAssets(this.prisma, 'tool');
    return { ...meta, tools, initialized: meta.initialized === true || Boolean(meta.initializedAt) };
  }

  private async seedToolCatalog(): Promise<ToolCatalogMeta> {
    const meta: ToolCatalogMeta = { initialized: false, migratedAt: new Date().toISOString() };
    try {
      await this.prisma.$transaction(async (tx) => {
        if (!(await readAssetIds(tx, 'tool')).length) {
          const seeded = mergeExcelInternalTools(mergeExcelExternalTools([]));
          await replaceAssets(tx, 'tool', dedupeMarketplaceTools(seeded).tools);
          meta.externalCatalogVersion = EXTERNAL_TOOLS_EXCEL_VERSION;
          meta.internalCatalogVersion = INTERNAL_TOOLS_EXCEL_VERSION;
        }
        await writeToolCatalogMeta(tx, meta);
      });
    } catch (error) {
      // 两个首次请求同时播种时，后到的那个撞唯一键；以先写进去的为准。
      const stored = await readToolCatalogMeta(this.prisma);
      if (!stored) throw error;
      return stored;
    }
    return meta;
  }

  /** 写入部署级工具目录；PUT 是一次完整快照替换，之后不再回灌 Excel。 */
  async putGlobalTools(input: unknown): Promise<GlobalToolsPayload> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('tools_payload_required');
    }
    const source = input as Record<string, unknown>;
    if (!Array.isArray(source.tools)) throw new BadRequestException('tools_array_required');

    const current = (await readToolCatalogMeta(this.prisma)) ?? {};
    const meta: ToolCatalogMeta = {
      ...current,
      initialized: true,
      initializedAt: current.initializedAt || new Date().toISOString(),
      ...(typeof source.externalCatalogVersion === 'string'
        ? { externalCatalogVersion: source.externalCatalogVersion }
        : {}),
      ...(typeof source.internalCatalogVersion === 'string'
        ? { internalCatalogVersion: source.internalCatalogVersion }
        : {}),
    };
    const tools = dedupeMarketplaceTools(source.tools).tools;
    await this.prisma.$transaction(async (tx) => {
      await replaceAssets(tx, 'tool', tools);
      await writeToolCatalogMeta(tx, meta);
    });
    return this.getGlobalTools();
  }

  /**
   * 整份快照写入：请求里带了哪个列表就整份替换哪张表，省略的列表保持不变
   * （旧客户端省略列表不等于清空货架）。tools 走部署级工具目录。
   */
  async putMarketplace(workspaceId: string, payload: MarketplacePayload) {
    if (Array.isArray(payload?.skills)) {
      const nextIds = new Set(payload.skills.map((item) => (item as { id?: string })?.id));
      const removed = (await readAssets(this.prisma, 'skill')).filter((item) => !nextIds.has(item.id as string));
      if (removed.length) {
        if (
          removed.some((skill) => skill.published) ||
          (await hasPendingApproval(this.prisma, 'skill', removed.map((skill) => String(skill.id))))
        ) {
          throw new ConflictException('仅可删除已下架且无待处理审批的 Skill，请刷新后重试');
        }
        // 删掉的 Skill 同时从 Agent 编排里摘掉
        const removedIds = new Set(removed.map((skill) => String(skill.id)));
        const agents = payload.agents ?? (await readAssets(this.prisma, 'agent'));
        payload = {
          ...payload,
          agents: agents.map((item) => {
            const agent = item as Record<string, unknown>;
            return { ...agent, skillIds: Array.isArray(agent.skillIds) ? agent.skillIds.filter((id) => !removedIds.has(String(id))) : [] };
          }),
        };
      }
    }
    const hasTools = Array.isArray(payload?.tools);
    const next = this.enrichMarketplaceMetadata({ ...payload, tools: hasTools ? payload.tools : [] }).payload;
    if (hasTools) {
      await this.putGlobalTools({
        tools: next.tools,
        externalCatalogVersion: payload.externalCatalogVersion,
        internalCatalogVersion: payload.internalCatalogVersion,
      });
    }
    await this.prisma.$transaction(async (tx) => {
      for (const [key, kind] of MARKETPLACE_ASSET_LISTS) {
        if (Array.isArray(payload?.[key])) await replaceAssets(tx, kind, next[key] as unknown[]);
      }
    });
    return this.readMarketplace(workspaceId);
  }

  /** userId 为空表示游客：只返回聚合计数，不带个人投票/收藏态 */
  async getMarketEngagement(workspaceId: string, userId: string) {
    const [metrics, votes, favorites] = await Promise.all([
      this.prisma.marketEngagement.findMany(),
      userId ? this.prisma.marketUserVote.findMany({ where: { userId } }) : Promise.resolve([]),
      userId
        ? this.prisma.marketFavorite.findMany({ where: { memberId: userId }, select: { contentId: true } })
        : Promise.resolve([]),
    ]);
    return {
      byId: Object.fromEntries(metrics.map((row) => [row.contentId, this.toEngagement(row)])),
      userVotes: Object.fromEntries(
        votes.map((row) => [row.contentId, row.vote === 'like' || row.vote === 'dislike' ? row.vote : null]),
      ),
      favorites: Object.fromEntries(favorites.map((row) => [row.contentId, true])),
    };
  }

  async mutateMarketEngagement(
    workspaceId: string,
    contentId: string,
    input: {
      action: MarketEngagementEventAction;
      userId: string;
      active?: boolean;
      eventId: string;
      visitorId?: string;
      assetType?: string;
      success?: boolean;
      durationMs?: number;
      inputTokens?: number;
      outputTokens?: number;
      errorCode?: string;
      /** 收藏 / 取消收藏必须带：收藏表是「谁收藏了什么」的唯一来源 */
      favorite?: FavoriteSnapshot;
    },
  ) {
    const eventId = optionalTrimmedString(
      input.eventId,
      'invalid_market_engagement_event_id',
    );
    if (!MARKET_ENGAGEMENT_EVENT_ID_RE.test(eventId)) {
      throw new BadRequestException('invalid_market_engagement_event_id');
    }

    const action = String(input.action ?? '').trim().toLowerCase() as MarketEngagementEventAction;
    if (!MARKET_ENGAGEMENT_EVENT_ACTIONS.has(action)) {
      throw new BadRequestException('invalid_market_engagement_action');
    }
    if (input.active !== undefined && typeof input.active !== 'boolean') {
      throw new BadRequestException('invalid_market_engagement_active');
    }
    const requestedAssetType =
      optionalTrimmedString(input.assetType, 'invalid_market_engagement_asset_type').toLowerCase() ||
      'unknown';
    if (!['unknown', 'tool', 'skill', 'agent', 'office-scene', 'case'].includes(requestedAssetType)) {
      throw new BadRequestException('invalid_market_engagement_asset_type');
    }
    const factNumber = (value: number | undefined, field: string): number | null => {
      if (value === undefined || value === null) return null;
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new BadRequestException(`invalid_market_engagement_${field}`);
      }
      return value;
    };
    const durationMs = factNumber(input.durationMs, 'duration_ms');
    const inputTokens = factNumber(input.inputTokens, 'input_tokens');
    const outputTokens = factNumber(input.outputTokens, 'output_tokens');
    const errorCode =
      optionalTrimmedString(input.errorCode, 'invalid_market_engagement_error_code').slice(0, 200) ||
      null;

    // 游客（userId 为空）只允许曝光/详情/浏览/跳转等纯计数，控制器已拦截其余动作。
    const userId = optionalTrimmedString(input.userId, 'invalid_market_engagement_user_id');
    const guestVisitorId = optionalTrimmedString(
      input.visitorId,
      'invalid_guest_visitor_id',
    ).toLowerCase();
    if (!userId && !UUID_V4_RE.test(guestVisitorId)) {
      throw new BadRequestException('invalid_guest_visitor_id');
    }

    await this.assertKnownMarketEngagementContent(workspaceId, contentId);

    const occurredAt = new Date();
    const dateKey = portalAnalyticsDateKey(occurredAt);
    const visitorHash = userId
      ? this.accountVisitorHash(workspaceId, userId)
      : createHash('sha256')
          .update(`${workspaceId}:market-engagement:guest:${guestVisitorId}`)
          .digest('hex');
    const visitorType = userId ? 'user' : 'guest';

    return this.serializeMarketEngagementWrite(async () => {
      const result = await this.prisma.$transaction(async (tx) => {
      let behaviorAction: MarketEngagementEventAction | null = null;
      let metric = await tx.marketEngagement.findUnique({
        where: { contentId },
      });
      let vote = userId
        ? (await tx.marketUserVote.findUnique({ where: { userId_contentId: { userId, contentId } } }))?.vote ?? null
        : null;
      let favorited = userId ? (await tx.marketFavorite.count({ where: { memberId: userId, contentId } })) > 0 : false;

      const requestEventRowId = randomUUID();
      const requestAction = `request:${action}`;
      const rateWindowStart = new Date(occurredAt.getTime() - MARKET_ENGAGEMENT_RATE_WINDOW_MS);
      // 写入已按进程排队；分钟/每日上限先计数再插入，多实例并发时最多多记几条。
      // eventId 唯一键保证重试幂等（skipDuplicates = ON CONFLICT DO NOTHING）；旧事实没有 eventId，列保持 nullable。
      // 收藏不受统计限流：限流会让这次收藏连同收藏表一起丢掉；计数只随真实状态变化，刷不上去。
      const overLimit = !input.favorite && visitorHash !== null && (
        await tx.marketEngagementEvent.count({
          where: { visitorHash, occurredAt: { gte: rateWindowStart } },
        }) >= MARKET_ENGAGEMENT_VISITOR_RATE_LIMIT ||
        await tx.marketEngagementEvent.count({
          where: { dateKey, visitorHash },
        }) >= MARKET_ENGAGEMENT_DAILY_VISITOR_LIMIT
      );
      const accepted = overLimit ? 0 : (await tx.marketEngagementEvent.createMany({
        data: [{
          id: requestEventRowId,
          eventId,
          contentId,
          action: requestAction,
          dateKey,
          visitorHash,
          occurredAt,
          visitorType,
          success: input.success ?? null,
          durationMs,
          inputTokens,
          outputTokens,
          errorCode,
          assetType: requestedAssetType,
        }],
        skipDuplicates: true,
      })).count;

      if (accepted === 0) {
        return this.marketEngagementStateFromRows(contentId, metric, { vote, favorited });
      }

      if (!metric) {
        // Exposure and call facts do not create a zero-valued market card. They remain
        // queryable in the event table while the aggregate stays an interaction metric.
        if (action !== 'exposure' && action !== 'call') {
          metric = await tx.marketEngagement.upsert({
            where: { contentId },
            create: { contentId },
            update: {},
          });
        }
      }

      if (action === 'exposure') {
        behaviorAction = 'exposure';
      } else if (action === 'detail' || action === 'detail_direct' || action === 'view' || action === 'use' || action === 'redirect' || action === 'download') {
        const field =
          action === 'detail' || action === 'detail_direct' || action === 'view'
            ? 'views'
            : action === 'use' || action === 'redirect'
              ? 'uses'
              : 'downloads';
        // The branch is unreachable for an exposure/call event, for which metric remains
        // null. Keeping the guard makes malformed imported events fail closed.
        if (!metric) {
          throw new BadRequestException('market_engagement_metric_unavailable');
        }
        metric = await tx.marketEngagement.update({
          where: { contentId },
          data: { [field]: { increment: 1 } },
        });
        behaviorAction = action;
      } else if (action === 'favorite' || action === 'unfavorite' || action === 'favorite_cancel') {
        if (!metric) throw new BadRequestException('market_engagement_metric_unavailable');
        if (!input.favorite) throw new BadRequestException('market_favorite_snapshot_required');
        const explicitCancel = action === 'unfavorite' || action === 'favorite_cancel';
        const previous = favorited;
        await writeFavoriteRow(tx, userId, contentId, input.favorite, explicitCancel ? false : input.active ?? !previous);
        favorited = (await tx.marketFavorite.count({ where: { memberId: userId, contentId } })) > 0;
        if (favorited !== previous) {
          metric = await tx.marketEngagement.update({
            where: { contentId },
            data: { favorites: { increment: favorited ? 1 : -1 } },
          });
          behaviorAction = favorited ? 'favorite' : explicitCancel ? 'favorite_cancel' : null;
        } else if (explicitCancel) {
          behaviorAction = 'favorite_cancel';
        }
        await evictOldFavorites(tx, userId, { dateKey, visitorHash, visitorType, occurredAt });
      } else if (
        action === 'like' ||
        action === 'unlike' ||
        action === 'dislike' ||
        action === 'undislike' ||
        action === 'like_cancel' ||
        action === 'dislike_cancel'
      ) {
        if (!metric) throw new BadRequestException('market_engagement_metric_unavailable');
        const explicitCancel =
          action === 'unlike' || action === 'undislike' || action === 'like_cancel' || action === 'dislike_cancel';
        const requestedVote = action === 'dislike' || action === 'undislike' || action === 'dislike_cancel'
          ? 'dislike'
          : 'like';
        const previousVote = vote === 'like' || vote === 'dislike' ? vote : null;
        const nextVote = explicitCancel
          ? previousVote === requestedVote
            ? null
            : previousVote
          : previousVote === requestedVote
            ? null
            : requestedVote;
        const likeDelta = (nextVote === 'like' ? 1 : 0) - (previousVote === 'like' ? 1 : 0);
        const dislikeDelta =
          (nextVote === 'dislike' ? 1 : 0) - (previousVote === 'dislike' ? 1 : 0);
        if (likeDelta || dislikeDelta) {
          metric = await tx.marketEngagement.update({
            where: { contentId },
            data: {
              likes: { increment: likeDelta },
              dislikes: { increment: dislikeDelta },
            },
          });
          if (nextVote === requestedVote) behaviorAction = requestedVote;
          else if (explicitCancel) {
            behaviorAction = requestedVote === 'like' ? 'like_cancel' : 'dislike_cancel';
          }
        } else if (explicitCancel) {
          behaviorAction = requestedVote === 'like' ? 'like_cancel' : 'dislike_cancel';
        }
        await tx.marketUserVote.upsert({
          where: { userId_contentId: { userId, contentId } },
          create: { userId, contentId, vote: nextVote },
          update: { vote: nextVote },
        });
        vote = nextVote;
      } else if (action === 'call') {
        behaviorAction = 'call';
      }

      if (behaviorAction) {
        await tx.marketEngagementEvent.updateMany({
          where: { eventId },
          data: { action: behaviorAction },
        });
      }

      return this.marketEngagementStateFromRows(contentId, metric, { vote, favorited });
      }, {
        maxWait: 15_000,
        timeout: 15_000,
      });

      return result;
    });
  }

  private serializeMarketEngagementWrite<T>(operation: () => Promise<T>): Promise<T> {
    const pending = this.marketEngagementWriteTail.then(operation, operation);
    this.marketEngagementWriteTail = pending.then(
      () => undefined,
      () => undefined,
    );
    return pending;
  }

  private accountVisitorHash(workspaceId: string, userId: string): string {
    // Keep the same stable, non-reversible namespace as portal page-view UVs so
    // dashboard user metrics can join page, login, and market-event facts.
    return createHash('sha256')
      .update(`mss-claw:portal-uv:v1:${workspaceId}:account:${userId}`)
      .digest('hex');
  }

  private async assertKnownMarketEngagementContent(workspaceId: string, contentId: string) {
    const knownIds = await this.knownMarketEngagementContentIds(workspaceId);
    if (!knownIds.has(contentId)) {
      throw new NotFoundException('market_engagement_content_not_found');
    }
  }

  /** 迁移脚本导入旧互动计数时也用它过滤已不存在的内容 */
  async knownMarketEngagementContentIds(_workspaceId: string): Promise<Set<string>> {
    const workspace = await findWorkspace(this.prisma);
    if (!workspace) throw new NotFoundException('market_engagement_workspace_not_found');

    const assetKinds: AssetKind[] = ['tool', 'skill', 'agent', 'automation', 'kbDoc'];
    const [portalItems, scenes, resources, cases, ...assetIds] = await Promise.all([
      this.prisma.portalContent.findMany({ select: { id: true } }),
      this.prisma.officeScene.findMany({ select: { id: true } }),
      this.prisma.centerResource.findMany({ where: { kind: { in: ['workflow', 'knowledge'] } }, select: { id: true } }),
      // 案例只认用户看得到的：已发布且未删除
      this.prisma.caseInsightArticle.findMany({ where: { status: 'published', deletedAt: null }, select: { id: true } }),
      ...assetKinds.map((kind) => readAssetIds(this.prisma, kind)),
    ]);
    const knownIds = new Set(MARKET_ENGAGEMENT_STATIC_CONTENT_IDS);
    assetIds.flat().forEach((id) => knownIds.add(id));
    portalItems.forEach((item) => knownIds.add(item.id));
    resources.forEach((item) => knownIds.add(item.id));
    cases.forEach((item) => knownIds.add(item.id));
    scenes.forEach((scene) => knownIds.add(`office-scene-${scene.id}`));
    return knownIds;
  }

  private marketEngagementStateFromRows(
    contentId: string,
    metric: {
      contentId: string;
      views: number;
      uses: number;
      likes: number;
      dislikes: number;
      downloads: number;
      favorites: number;
      updatedAt: Date;
    } | null,
    state: { vote: string | null; favorited: boolean },
  ) {
    const row = metric ?? {
      contentId,
      views: 0,
      uses: 0,
      likes: 0,
      dislikes: 0,
      downloads: 0,
      favorites: 0,
      updatedAt: new Date(0),
    };
    return {
      engagement: this.toEngagement(row),
      userVote:
        state.vote === 'like' || state.vote === 'dislike'
          ? state.vote
          : null,
      favorited: state.favorited,
    };
  }

  private toEngagement(row: {
    contentId: string;
    views: number;
    uses: number;
    likes: number;
    dislikes: number;
    downloads: number;
    favorites: number;
    updatedAt: Date;
  }) {
    return {
      id: row.contentId,
      views: row.views,
      uses: row.uses,
      likes: row.likes,
      dislikes: row.dislikes,
      downloads: row.downloads,
      favorites: row.favorites,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /**
   * @param seedCatalogs 是否用 Excel 清单播种工具目录。
   *   仅首次生成 marketplace 快照时为 true——初始化完成后数据库即唯一真相源，
   *   运营的增删改不应被清单回灌覆盖（历史上每次读写都合并，导致下架等改动被打回）。
   */
  private enrichMarketplaceMetadata(
    payload: MarketplacePayload,
    seedCatalogs = false,
  ): {
    payload: MarketplacePayload;
    changed: boolean;
  } {
    let changed =
      !Array.isArray(payload.agents) ||
      !Array.isArray(payload.skills) ||
      !Array.isArray(payload.tools) ||
      !Array.isArray(payload.automations) ||
      !Array.isArray(payload.kbDocs);
    const enrich = (
      source: unknown[] | undefined,
      scenarioById: Record<string, string>,
      includeFeatured: boolean,
    ) =>
      Array.isArray(source)
        ? source.map((raw) => {
            if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
            const item = raw as Record<string, unknown>;
            const id = typeof item.id === 'string' ? item.id : '';
            const scenarioId = scenarioById[id];
            let next = item;
            if (!item.businessScenarioId && scenarioId) {
              next = { ...next, businessScenarioId: scenarioId };
              changed = true;
            }
            if (includeFeatured && typeof item.featuredInMssMarket !== 'boolean') {
              // 兼容旧字段的显式选择：历史数据若已设为 false，不能在读取时被反弹成精选。
              const legacyFeatured =
                typeof item.featuredInDoTask === 'boolean' ? item.featuredInDoTask : true;
              next = { ...next, featuredInMssMarket: legacyFeatured };
              changed = true;
            }
            return next;
          })
        : [];

    const agents = enrich(payload.agents, MARKET_AGENT_BUSINESS_SCENARIO, false);
    const skills = enrich(payload.skills, MARKET_SKILL_BUSINESS_SCENARIO, true);
    const dedupedTools = dedupeMarketplaceTools(payload.tools);
    let tools = dedupedTools.tools;
    if (dedupedTools.changed) changed = true;
    if (seedCatalogs) {
      if (payload.externalCatalogVersion !== EXTERNAL_TOOLS_EXCEL_VERSION) {
        tools = mergeExcelExternalTools(tools);
        changed = true;
      }
      if (payload.internalCatalogVersion !== INTERNAL_TOOLS_EXCEL_VERSION) {
        tools = mergeExcelInternalTools(tools);
        changed = true;
      }
    }
    return {
      payload: {
        ...payload,
        agents,
        skills,
        tools,
        automations: Array.isArray(payload.automations) ? payload.automations : [],
        kbDocs: Array.isArray(payload.kbDocs) ? payload.kbDocs : [],
        externalCatalogVersion: seedCatalogs
          ? EXTERNAL_TOOLS_EXCEL_VERSION
          : payload.externalCatalogVersion,
        internalCatalogVersion: seedCatalogs
          ? INTERNAL_TOOLS_EXCEL_VERSION
          : payload.internalCatalogVersion,
      },
      changed,
    };
  }

  async getPortalContent(_workspaceId: string): Promise<PortalContentPayload | null> {
    return readPortalContent(this.prisma);
  }

  async putPortalContent(_workspaceId: string, payload: PortalContentPayload) {
    return writePortalContent(this.prisma, payload);
  }
}
