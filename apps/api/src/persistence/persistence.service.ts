import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  listMappedFromMarketplace,
  toPrismaJson,
  type MarketplacePayload,
} from './marketplace-center-sync';
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
 * 工具目录是部署级资源，不再按 workspace 复制。为避免给 CenterRecord
 * 引入新的表/迁移，使用一条保留前缀的 singleton 记录承载它。
 */
export const GLOBAL_TOOLS_RECORD_ID = 'global-tools';
export const GLOBAL_TOOLS_SCOPE = '__global__';
export const GLOBAL_TOOLS_RECORD_KIND = 'tool-catalog';

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
const MARKET_ENGAGEMENT_RETENTION_DAYS = 180;
const MARKET_ENGAGEMENT_RETENTION_CHECK_INTERVAL = 256;
const MARKET_ENGAGEMENT_CENTER_KINDS = [
  'marketplace',
  'portal-content',
  'doc:internal-office-scenes',
  'agent',
  'skill',
  'tool',
  'workflow',
  'knowledge',
] as const;
const MARKET_ENGAGEMENT_STATIC_CONTENT_IDS = new Set<string>(
  SEED_MARKET_ENGAGEMENT_STATIC_CONTENT_IDS,
);

function optionalTrimmedString(value: unknown, errorCode: string): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new BadRequestException(errorCode);
  return value.trim();
}

type LegacyEngagement = {
  id?: string;
  views?: number;
  uses?: number;
  likes?: number;
  dislikes?: number;
  downloads?: number;
  favorites?: number;
  updatedAt?: string;
};

function normalizeExternalToolName(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase();
}

function normalizeExternalToolUrl(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\/+$/, '')
    .toLocaleLowerCase();
}

function addTopLevelItemIds(value: unknown, ids: Set<string>, prefix = ''): void {
  if (!Array.isArray(value)) return;
  value.forEach((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;
    const id = String((item as Record<string, unknown>).id ?? '').trim();
    if (id) ids.add(`${prefix}${id}`);
  });
}

function legacyEngagementCount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
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

type LegacyToolRow = {
  id?: string;
  payload?: unknown;
  updatedAt?: Date | string;
};

function normalizedToolField(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\/+$/, '')
    .toLocaleLowerCase();
}

function legacyToolKeys(raw: Record<string, unknown>, fallbackId?: string): string[] {
  const keys: string[] = [];
  const id = normalizedToolField(raw.id || fallbackId);
  const name = normalizedToolField(raw.name ?? raw.displayName);
  const homepage = normalizedToolField(raw.homepageUrl ?? raw.endpoint ?? raw.url);
  const docs = normalizedToolField(raw.docsUrl ?? raw.documentationUrl);
  if (id) keys.push(`id:${id}`);
  if (name) keys.push(`name:${name}`);
  if (homepage && homepage !== '#') keys.push(`homepage:${homepage}`);
  if (docs && docs !== '#') keys.push(`docs:${docs}`);
  return keys;
}

function legacyToolTime(value: Date | string | undefined): number {
  if (value instanceof Date) return value.getTime();
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * 将旧 workspace marketplace/center tool 投影合并成一份兼容快照。
 * marketplace 优先于 center 投影，较新的 workspace 快照优先；同名/同 URL
 * 的旧 ID 也只保留一份，尽量避免精选和互动数据出现重复卡片。
 */
function mergeLegacyGlobalTools(
  marketplaceRows: LegacyToolRow[],
  centerRows: LegacyToolRow[],
): unknown[] {
  const result: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  const append = (row: LegacyToolRow) => {
    const payload =
      row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
        ? ({ ...(row.payload as Record<string, unknown>) } as Record<string, unknown>)
        : null;
    if (!payload) return;
    if (!payload.id && row.id) payload.id = row.id;
    if (!payload.id && !payload.name && !payload.displayName) return;
    const keys = legacyToolKeys(payload, row.id);
    if (keys.some((key) => seen.has(key))) return;
    keys.forEach((key) => seen.add(key));
    result.push(payload);
  };

  // The query normally supplies this order; sorting here also keeps migration
  // deterministic for adapters/tests that return rows in arbitrary order.
  const newestFirst = (a: LegacyToolRow, b: LegacyToolRow) =>
    legacyToolTime(b.updatedAt) - legacyToolTime(a.updatedAt);
  [...marketplaceRows].sort(newestFirst).forEach((row) => {
    const payload = row.payload;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
    const tools = (payload as Record<string, unknown>).tools;
    if (!Array.isArray(tools)) return;
    tools.forEach((tool) => append({ payload: tool, updatedAt: row.updatedAt }));
  });
  [...centerRows].sort(newestFirst).forEach(append);
  return result;
}

function normalizeGlobalToolsPayload(raw: unknown): GlobalToolsPayload {
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const deduped = dedupeMarketplaceTools(Array.isArray(source.tools) ? source.tools : []).tools;
  const initializedAt =
    typeof source.initializedAt === 'string' && source.initializedAt.trim()
      ? source.initializedAt
      : undefined;
  return {
    tools: deduped,
    ...(typeof source.externalCatalogVersion === 'string'
      ? { externalCatalogVersion: source.externalCatalogVersion }
      : {}),
    ...(typeof source.internalCatalogVersion === 'string'
      ? { internalCatalogVersion: source.internalCatalogVersion }
      : {}),
    initialized: source.initialized === true || Boolean(initializedAt),
    ...(initializedAt ? { initializedAt } : {}),
    ...(typeof source.migratedAt === 'string' && source.migratedAt.trim()
      ? { migratedAt: source.migratedAt }
      : {}),
  };
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

@Injectable()
export class PersistenceService {
  private marketEngagementRetentionChecks = 0;
  /** SQLite 只有一个写者；把行为写事务排队，避免并发 deferred transaction 锁升级超时。 */
  private marketEngagementWriteTail: Promise<void> = Promise.resolve();

  constructor(private readonly prisma: PrismaService) {}

  async getSessions(workspaceId: string) {
    const row = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!row) throw new NotFoundException(`Workspace ${workspaceId} not found`);
    const catalog = row.catalogJson as Record<string, unknown>;
    return { chats: (catalog.chats as Record<string, unknown>) ?? {} };
  }

  async putSessions(workspaceId: string, chats: Record<string, unknown>) {
    const row = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!row) throw new NotFoundException(`Workspace ${workspaceId} not found`);
    const catalog = { ...(row.catalogJson as Record<string, unknown>), chats };
    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { catalogJson: catalog as Prisma.InputJsonValue },
    });
    return { chats };
  }

  async getInboxMessages(workspaceId: string, userId: string) {
    const [messages, states] = await Promise.all([
      this.prisma.inboxMessageRecord.findMany({
        where: { workspaceId, toUserId: { in: [userId, '*'] } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inboxUserMessageState.findMany({ where: { workspaceId, userId } }),
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
      where: { workspaceId_id: { workspaceId, id: input.id } },
      create: {
        workspaceId,
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
      where: { workspaceId_userId_messageId: { workspaceId, userId, messageId } },
      create: { workspaceId, userId, messageId, readAt: new Date() },
      update: { readAt: new Date(), deletedAt: null },
    });
    return { ok: true };
  }

  async markAllInboxMessagesRead(workspaceId: string, userId: string) {
    const messages = await this.prisma.inboxMessageRecord.findMany({
      where: { workspaceId, toUserId: { in: [userId, '*'] } },
      select: { id: true },
    });
    await this.prisma.$transaction(
      messages.map(({ id: messageId }) =>
        this.prisma.inboxUserMessageState.upsert({
          where: { workspaceId_userId_messageId: { workspaceId, userId, messageId } },
          create: { workspaceId, userId, messageId, readAt: new Date() },
          update: { readAt: new Date() },
        }),
      ),
    );
    return { ok: true, count: messages.length };
  }

  async deleteInboxMessageForUser(workspaceId: string, userId: string, messageId: string) {
    await this.prisma.inboxUserMessageState.upsert({
      where: { workspaceId_userId_messageId: { workspaceId, userId, messageId } },
      create: { workspaceId, userId, messageId, deletedAt: new Date() },
      update: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  async getMarketplace(workspaceId: string): Promise<MarketplacePayload | null> {
    const row = await this.prisma.centerRecord.findFirst({
      where: { workspaceId, kind: 'marketplace' },
    });
    if (row) {
      const current = row.payload as MarketplacePayload;
      // 目录版本变化只触发一次显式迁移；迁移会补齐新目录，但保留发布状态、运营标题、热度和不上架选择。
      const catalogNeedsMigration =
        current.externalCatalogVersion !== EXTERNAL_TOOLS_EXCEL_VERSION ||
        current.internalCatalogVersion !== INTERNAL_TOOLS_EXCEL_VERSION;
      const enriched = this.enrichMarketplaceMetadata(current, catalogNeedsMigration);
      if (enriched.changed) {
        await this.prisma.centerRecord.update({
          where: { id: row.id },
          data: { payload: enriched.payload as Prisma.InputJsonValue },
        });
        await this.syncMarketplaceToCenters(workspaceId, enriched.payload, current);
      }
      // 兼容旧 marketplace URL：工具列表统一从部署级 singleton 返回。
      return this.withGlobalTools(enriched.payload);
    }

    // 兼容已存在中心记录、但尚未生成 marketplace 聚合快照的工作区。
    // 没有任何旧中心记录时也创建完整的 canonical 目录，避免新工作区只能看到
    // 空货架；首次读取后前端始终只消费数据库 marketplace 快照。
    // 未知工作区不应因一次公开 GET 产生孤儿 CenterRecord。
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });
    if (!workspace) return null;
    const built = await this.buildMarketplaceFromCenterRecords(workspaceId);
    const initialPayload: MarketplacePayload = built ?? {
      agents: [],
      skills: [],
      tools: [],
      automations: [],
      kbDocs: [],
    };
    const payload = this.enrichMarketplaceMetadata(initialPayload, true).payload;
    await this.prisma.centerRecord.upsert({
      where: { id: `marketplace-${workspaceId}` },
      create: {
        id: `marketplace-${workspaceId}`,
        workspaceId,
        kind: 'marketplace',
        payload: payload as Prisma.InputJsonValue,
      },
      update: {},
    });
    await this.syncMarketplaceToCenters(workspaceId, payload);
    return this.withGlobalTools(payload);
  }

  /**
   * 读取部署级工具目录。第一次读取时把旧 workspace marketplace/center tool
   * 快照合并到 singleton；迁移只设置 initialized=false，让一次性初始化脚本
   * 仍有机会用外部清单覆盖旧的分工作区数据。
   */
  private async withGlobalTools(payload: MarketplacePayload): Promise<MarketplacePayload> {
    const global = await this.getGlobalTools();
    return { ...payload, tools: global.tools };
  }

  async getGlobalTools(): Promise<GlobalToolsPayload> {
    const existing = await this.prisma.centerRecord.findUnique({
      where: { id: GLOBAL_TOOLS_RECORD_ID },
    });
    if (existing) return normalizeGlobalToolsPayload(existing.payload);

    const [marketplaceRows, centerRows] = await Promise.all([
      this.prisma.centerRecord.findMany({
        where: { kind: 'marketplace' },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, payload: true, updatedAt: true },
      }),
      this.prisma.centerRecord.findMany({
        where: { kind: 'tool' },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, payload: true, updatedAt: true },
      }),
    ]);
    const migratedAt = new Date().toISOString();
    const payload: GlobalToolsPayload = {
      tools: mergeLegacyGlobalTools(
        marketplaceRows as LegacyToolRow[],
        centerRows as LegacyToolRow[],
      ),
      initialized: false,
      migratedAt,
    };
    const row = await this.prisma.centerRecord.upsert({
      where: { id: GLOBAL_TOOLS_RECORD_ID },
      create: {
        id: GLOBAL_TOOLS_RECORD_ID,
        workspaceId: GLOBAL_TOOLS_SCOPE,
        kind: GLOBAL_TOOLS_RECORD_KIND,
        payload: toPrismaJson(payload as unknown as Record<string, unknown>),
      },
      update: {},
    });
    return normalizeGlobalToolsPayload(row.payload);
  }

  /** 写入部署级工具目录；PUT 是一次完整快照替换，之后不再回灌 Excel。 */
  async putGlobalTools(input: unknown): Promise<GlobalToolsPayload> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('tools_payload_required');
    }
    const source = input as Record<string, unknown>;
    if (!Array.isArray(source.tools)) throw new BadRequestException('tools_array_required');

    const existing = await this.prisma.centerRecord.findUnique({
      where: { id: GLOBAL_TOOLS_RECORD_ID },
    });
    const current = normalizeGlobalToolsPayload(existing?.payload);
    const initializedAt = current.initializedAt || new Date().toISOString();
    const payload: GlobalToolsPayload = {
      ...current,
      tools: dedupeMarketplaceTools(source.tools).tools,
      initialized: true,
      initializedAt,
      ...(typeof source.externalCatalogVersion === 'string'
        ? { externalCatalogVersion: source.externalCatalogVersion }
        : {}),
      ...(typeof source.internalCatalogVersion === 'string'
        ? { internalCatalogVersion: source.internalCatalogVersion }
        : {}),
    };
    const row = await this.prisma.centerRecord.upsert({
      where: { id: GLOBAL_TOOLS_RECORD_ID },
      create: {
        id: GLOBAL_TOOLS_RECORD_ID,
        workspaceId: GLOBAL_TOOLS_SCOPE,
        kind: GLOBAL_TOOLS_RECORD_KIND,
        payload: toPrismaJson(payload as unknown as Record<string, unknown>),
      },
      update: {
        // Keep the singleton scope immutable; only its JSON snapshot changes.
        payload: toPrismaJson(payload as unknown as Record<string, unknown>),
      },
    });
    return normalizeGlobalToolsPayload(row.payload);
  }

  async putMarketplace(workspaceId: string, payload: MarketplacePayload) {
    const id = `marketplace-${workspaceId}`;
    // 前端快照不含目录版本号；沿用库中已有值，避免被抹掉后误判为「需要重新播种」
    const existing = (await this.prisma.centerRecord.findUnique({ where: { id } }))
      ?.payload as MarketplacePayload | undefined;
    const hasTools = Array.isArray(payload?.tools);
    payload = this.enrichMarketplaceMetadata({
      ...payload,
      // 工具已迁移到全局 singleton。旧客户端省略 tools 时不能把旧快照
      // 覆盖成空数组；显式传 [] 仍保留旧 API 的完整替换语义。
      tools: hasTools ? payload.tools : existing?.tools,
      externalCatalogVersion:
        payload.externalCatalogVersion ?? existing?.externalCatalogVersion,
      internalCatalogVersion:
        payload.internalCatalogVersion ?? existing?.internalCatalogVersion,
    }).payload;
    if (hasTools) {
      const global = await this.putGlobalTools({
        tools: payload.tools,
        externalCatalogVersion: payload.externalCatalogVersion,
        internalCatalogVersion: payload.internalCatalogVersion,
      });
      payload = {
        ...payload,
        tools: global.tools,
        externalCatalogVersion:
          global.externalCatalogVersion ?? payload.externalCatalogVersion,
        internalCatalogVersion:
          global.internalCatalogVersion ?? payload.internalCatalogVersion,
      };
    }
    await this.prisma.centerRecord.upsert({
      where: { id },
      create: {
        id,
        workspaceId,
        kind: 'marketplace',
        payload: payload as Prisma.InputJsonValue,
      },
      update: {
        payload: payload as Prisma.InputJsonValue,
      },
    });
    await this.syncMarketplaceToCenters(workspaceId, payload, existing, hasTools);
    return payload;
  }

  /** userId 为空表示游客：只返回聚合计数，不带个人投票/收藏态 */
  async getMarketEngagement(workspaceId: string, userId: string) {
    await this.ensureLegacyMarketEngagementMigrated(workspaceId);
    const [metrics, interactions] = await Promise.all([
      this.prisma.marketEngagement.findMany({ where: { workspaceId } }),
      userId
        ? this.prisma.marketUserInteraction.findMany({ where: { workspaceId, userId } })
        : Promise.resolve([]),
    ]);
    return {
      byId: Object.fromEntries(metrics.map((row) => [row.contentId, this.toEngagement(row)])),
      userVotes: Object.fromEntries(
        interactions.map((row) => [row.contentId, row.vote === 'like' || row.vote === 'dislike' ? row.vote : null]),
      ),
      favorites: Object.fromEntries(interactions.map((row) => [row.contentId, row.favorited])),
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
    if (!['unknown', 'tool', 'skill', 'agent', 'office-scene'].includes(requestedAssetType)) {
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

    await this.ensureLegacyMarketEngagementMigrated(workspaceId);
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
        where: { workspaceId_contentId: { workspaceId, contentId } },
      });
      let interaction = userId
        ? await tx.marketUserInteraction.findUnique({
            where: { workspaceId_userId_contentId: { workspaceId, userId, contentId } },
          })
        : null;

      const requestEventRowId = randomUUID();
      const requestAction = `request:${action}`;
      const rateWindowStart = new Date(occurredAt.getTime() - MARKET_ENGAGEMENT_RATE_WINDOW_MS);
      // 唯一键与分钟/每日上限都放进同一条 SQLite 语句；并发重试无法同时穿过
      // “先查再写”的窗口。旧事实没有 eventId，因此新增列保持 nullable。
      const accepted = await tx.$executeRaw`
        INSERT OR IGNORE INTO "MarketEngagementEvent"
          ("id", "workspaceId", "eventId", "contentId", "action", "dateKey", "visitorHash", "occurredAt", "visitorType", "success", "durationMs", "inputTokens", "outputTokens", "errorCode", "assetType")
        SELECT
          ${requestEventRowId}, ${workspaceId}, ${eventId}, ${contentId}, ${requestAction}, ${dateKey}, ${visitorHash}, ${occurredAt}, ${visitorType}, ${input.success ?? null}, ${durationMs}, ${inputTokens}, ${outputTokens}, ${errorCode}, ${requestedAssetType}
        WHERE ${visitorHash} IS NULL OR (
          (
            SELECT COUNT(*)
            FROM "MarketEngagementEvent"
            WHERE "workspaceId" = ${workspaceId}
              AND "visitorHash" = ${visitorHash}
              AND "occurredAt" >= ${rateWindowStart}
          ) < ${MARKET_ENGAGEMENT_VISITOR_RATE_LIMIT}
          AND (
            SELECT COUNT(*)
            FROM "MarketEngagementEvent"
            WHERE "workspaceId" = ${workspaceId}
              AND "dateKey" = ${dateKey}
              AND "visitorHash" = ${visitorHash}
          ) < ${MARKET_ENGAGEMENT_DAILY_VISITOR_LIMIT}
        )
      `;

      if (accepted === 0) {
        return this.marketEngagementStateFromRows(contentId, metric, interaction);
      }

      if (!metric) {
        // Exposure and call facts do not create a zero-valued market card. They remain
        // queryable in the event table while the aggregate stays an interaction metric.
        if (action !== 'exposure' && action !== 'call') {
          metric = await tx.marketEngagement.upsert({
            where: { workspaceId_contentId: { workspaceId, contentId } },
            create: { workspaceId, contentId },
            update: {},
          });
        }
      }

      if (action === 'exposure') {
        behaviorAction = 'exposure';
      } else if (action === 'detail' || action === 'view' || action === 'use' || action === 'redirect' || action === 'download') {
        const field =
          action === 'detail' || action === 'view'
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
          where: { workspaceId_contentId: { workspaceId, contentId } },
          data: { [field]: { increment: 1 } },
        });
        behaviorAction = action;
      } else if (action === 'favorite' || action === 'unfavorite' || action === 'favorite_cancel') {
        if (!metric) throw new BadRequestException('market_engagement_metric_unavailable');
        const explicitCancel = action === 'unfavorite' || action === 'favorite_cancel';
        const next = explicitCancel ? false : input.active ?? !interaction?.favorited;
        const previous = interaction?.favorited ?? false;
        if (next !== previous) {
          metric = await tx.marketEngagement.update({
            where: { workspaceId_contentId: { workspaceId, contentId } },
            data: { favorites: { increment: next ? 1 : -1 } },
          });
          behaviorAction = next ? 'favorite' : explicitCancel ? 'favorite_cancel' : null;
        } else if (explicitCancel) {
          behaviorAction = 'favorite_cancel';
        }
        interaction = await tx.marketUserInteraction.upsert({
          where: { workspaceId_userId_contentId: { workspaceId, userId, contentId } },
          create: { workspaceId, userId, contentId, favorited: next },
          update: { favorited: next },
        });
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
        const previousVote = interaction?.vote === 'like' || interaction?.vote === 'dislike'
          ? interaction.vote
          : null;
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
            where: { workspaceId_contentId: { workspaceId, contentId } },
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
        interaction = await tx.marketUserInteraction.upsert({
          where: { workspaceId_userId_contentId: { workspaceId, userId, contentId } },
          create: { workspaceId, userId, contentId, vote: nextVote },
          update: { vote: nextVote },
        });
      } else if (action === 'call') {
        behaviorAction = 'call';
      }

      if (behaviorAction) {
        await tx.marketEngagementEvent.updateMany({
          where: { workspaceId, eventId },
          data: { action: behaviorAction },
        });
      }

      return this.marketEngagementStateFromRows(contentId, metric, interaction);
      }, {
        maxWait: 15_000,
        timeout: 15_000,
      });

      await this.maybePruneMarketEngagementEvents();
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

  private async knownMarketEngagementContentIds(workspaceId: string): Promise<Set<string>> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });
    if (!workspace) throw new NotFoundException('market_engagement_workspace_not_found');

    const [rows, globalToolsRow] = await Promise.all([
      this.prisma.centerRecord.findMany({
        where: {
          workspaceId,
          kind: { in: [...MARKET_ENGAGEMENT_CENTER_KINDS] },
        },
        select: { id: true, kind: true, payload: true },
      }),
      this.prisma.centerRecord.findUnique({
        where: { id: GLOBAL_TOOLS_RECORD_ID },
        select: { payload: true },
      }),
    ]);
    const knownIds = new Set(MARKET_ENGAGEMENT_STATIC_CONTENT_IDS);
    rows.forEach((row) => {
      if (['agent', 'skill', 'tool', 'workflow', 'knowledge'].includes(row.kind)) {
        knownIds.add(row.id);
      }
      if (!row.payload || typeof row.payload !== 'object' || Array.isArray(row.payload)) return;
      const payload = row.payload as Record<string, unknown>;
      if (row.kind === 'marketplace') {
        ['agents', 'skills', 'tools', 'automations', 'kbDocs'].forEach((key) =>
          addTopLevelItemIds(payload[key], knownIds),
        );
      } else if (row.kind === 'portal-content') {
        addTopLevelItemIds(payload.items, knownIds);
      } else if (row.kind === 'doc:internal-office-scenes') {
        addTopLevelItemIds(payload.entries, knownIds, 'office-scene-');
      }
    });
    if (globalToolsRow?.payload && typeof globalToolsRow.payload === 'object' && !Array.isArray(globalToolsRow.payload)) {
      addTopLevelItemIds(
        (globalToolsRow.payload as Record<string, unknown>).tools,
        knownIds,
      );
    }
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
    interaction: { vote: string | null; favorited: boolean } | null,
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
        interaction?.vote === 'like' || interaction?.vote === 'dislike'
          ? interaction.vote
          : null,
      favorited: interaction?.favorited ?? false,
    };
  }

  private async maybePruneMarketEngagementEvents(): Promise<void> {
    this.marketEngagementRetentionChecks += 1;
    if (
      this.marketEngagementRetentionChecks % MARKET_ENGAGEMENT_RETENTION_CHECK_INTERVAL !==
      0
    ) {
      return;
    }
    const cutoff = new Date(
      Date.now() - MARKET_ENGAGEMENT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    await this.prisma.marketEngagementEvent
      .deleteMany({ where: { occurredAt: { lt: cutoff } } })
      .catch(() => undefined);
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

  private async buildMarketplaceFromCenterRecords(
    workspaceId: string,
  ): Promise<MarketplacePayload | null> {
    const rows = await this.prisma.centerRecord.findMany({
      where: {
        workspaceId,
        kind: { in: ['agent', 'skill', 'tool', 'workflow', 'knowledge'] },
      },
      orderBy: { updatedAt: 'asc' },
    });
    if (!rows.length) return null;

    const records = rows.map((row) => ({
      kind: row.kind,
      payload: row.payload as Record<string, unknown>,
    }));
    const strings = (value: unknown): string[] =>
      Array.isArray(value) ? value.map(String).filter(Boolean) : [];
    const text = (value: unknown, fallback = ''): string =>
      typeof value === 'string' && value.trim() ? value : fallback;
    const isPublished = (value: unknown): boolean =>
      ['active', 'online', 'published', 'publish', 'ready'].includes(text(value).toLowerCase());

    const agents = records
      .filter((row) => row.kind === 'agent')
      .map(({ payload: item }) => {
        const bindings =
          item.bindings && typeof item.bindings === 'object'
            ? (item.bindings as Record<string, unknown>)
            : {};
        return {
          id: text(item.id),
          name: text(item.name ?? item.displayName, text(item.id)),
          desc: text(item.description),
          category: 'office',
          bizLine: '',
          homeTag: '',
          author: text(item.author, '平台运营'),
          published: typeof item.published === 'boolean' ? item.published : isPublished(item.status),
          invokes: 0,
          skillIds: strings(bindings.skillIds),
          chatId: text(item.chatId) || undefined,
          icon: text(item.icon, 'fa-robot'),
          color: text(item.color, 'from-zinc-800 to-zinc-950'),
          scenarioTags: strings(item.tags),
        };
      })
      .filter((item) => item.id);

    const skills = records
      .filter((row) => row.kind === 'skill')
      .map(({ payload: item }) => ({
        id: text(item.id),
        name: text(item.displayName ?? item.name, text(item.id)),
        desc: text(item.description),
        category: 'office',
        command: '',
        author: text(item.author, '平台运营'),
        version: text(item.version, '1.0').replace(/^v/i, ''),
        connector: strings(item.toolNames).join(' + '),
        published:
          typeof item.published === 'boolean'
            ? item.published
            : isPublished(item.lifecycle),
        invokes: 0,
        icon: text(item.icon, 'fa-puzzle-piece'),
        tags: strings(item.tags),
      }))
      .filter((item) => item.id);

    const tools = records
      .filter((row) => row.kind === 'tool')
      .map(({ payload: item }) => {
        const tags = strings(item.tags);
        const external =
          item.sourceType === 'external' ||
          item.marketShelf === 'external' ||
          item.category === 'external' ||
          tags.includes('ai-saas') ||
          tags.includes('external');
        return {
          id: text(item.id),
          name: text(item.displayName ?? item.name, text(item.id)),
          desc: text(item.description),
          category: external ? 'external' : text(item.type) === 'function' ? 'platform' : 'connector',
          author: text(item.author, '平台运营'),
          published:
            typeof item.published === 'boolean' ? item.published : isPublished(item.status),
          invokes: 0,
          icon: text(item.icon, 'fa-cube'),
          tags,
          sourceType: external ? 'external' : 'internal',
          visibility: 'public',
          ownerDeptIds: [],
          ownerRegionId: null,
          homepageUrl: text(item.endpoint) || '#',
          ...(external ? { marketShelf: 'external' } : { marketShelf: 'none' }),
        };
      })
      .filter((item) => item.id);

    const automations = records
      .filter((row) => row.kind === 'workflow')
      .map(({ payload: item }) => ({
        id: text(item.id),
        name: text(item.name, text(item.id)),
        desc: text(item.description),
        published: isPublished(item.status),
        icon: text(item.icon, 'fa-diagram-project'),
      }))
      .filter((item) => item.id);

    const kbDocs = records
      .filter((row) => row.kind === 'knowledge')
      .map(({ payload: item }) => ({
        id: text(item.id),
        title: text(item.name ?? item.title, text(item.id)),
        content: text(item.description),
        published: isPublished(item.status ?? item.pipelineStage),
        tags: strings(item.tags),
      }))
      .filter((item) => item.id);

    return { agents, skills, tools, automations, kbDocs };
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

  /** 将旧 content-engagement JSON 文档一次性迁入原子计数表，避免已有数据丢失。 */
  async ensureLegacyMarketEngagementMigrated(workspaceId: string) {
    const legacyRow = await this.prisma.centerRecord.findUnique({
      where: { id: `doc-content-engagement-${workspaceId}` },
    });
    if (!legacyRow) return;
    const payload = (legacyRow.payload ?? {}) as {
      byId?: Record<string, LegacyEngagement>;
      map?: Record<string, LegacyEngagement>;
      normalizedAt?: string;
    };
    if (payload.normalizedAt) return;
    const legacyMap = payload.byId ?? payload.map ?? {};
    const knownIds = await this.knownMarketEngagementContentIds(workspaceId);
    const entries = Object.entries(legacyMap).filter(([contentId]) => knownIds.has(contentId));
    if (entries.length) {
      await this.prisma.$transaction(
        entries.map(([contentId, value]) => {
          const parsedDate = value.updatedAt ? new Date(value.updatedAt) : new Date();
          const updatedAt = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
          return this.prisma.marketEngagement.upsert({
            where: { workspaceId_contentId: { workspaceId, contentId } },
            create: {
              workspaceId,
              contentId,
              views: legacyEngagementCount(value.views ?? value.uses),
              uses: legacyEngagementCount(value.uses),
              likes: legacyEngagementCount(value.likes),
              dislikes: legacyEngagementCount(value.dislikes),
              downloads: legacyEngagementCount(value.downloads),
              favorites: legacyEngagementCount(value.favorites),
              updatedAt,
            },
            update: {},
          });
        }),
      );
    }
    await this.prisma.centerRecord.update({
      where: { id: legacyRow.id },
      data: {
        payload: {
          ...payload,
          normalizedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  }

  /** 集市为权威源：写入时镜像 agent/skill/tool 到 center 记录，供中心 API 合并读取 */
  private async syncMarketplaceToCenters(
    workspaceId: string,
    payload: MarketplacePayload,
    previousPayload?: MarketplacePayload,
    syncTools = true,
  ) {
    const kinds = syncTools
      ? (['agent', 'skill', 'tool'] as const)
      : (['agent', 'skill'] as const);
    for (const kind of kinds) {
      const items = listMappedFromMarketplace(kind, payload);
      for (const item of items) {
        const id = String(item.id);
        if (!id) continue;
        // 保留 global-tools 作为 singleton 主键，避免旧 workspace 投影覆盖目录记录。
        if (kind === 'tool' && id === GLOBAL_TOOLS_RECORD_ID) continue;
        await this.prisma.centerRecord.upsert({
          where: { id },
          create: {
            id,
            workspaceId,
            kind,
            payload: toPrismaJson(item),
          },
          update: {
            payload: toPrismaJson(item),
          },
        });
      }
      if (kind === 'tool' && previousPayload) {
        const nextIds = new Set(items.map((item) => String(item.id)));
        const removedIds = listMappedFromMarketplace(kind, previousPayload)
          .map((item) => String(item.id))
          .filter((id) => id && !nextIds.has(id));
        if (removedIds.length) {
          await this.prisma.centerRecord.deleteMany({
            where: {
              workspaceId,
              kind,
              id: { in: removedIds },
            },
          });
        }
      }
    }
  }

  async getPortalContent(workspaceId: string): Promise<PortalContentPayload | null> {
    const row = await this.prisma.centerRecord.findFirst({
      where: { workspaceId, kind: 'portal-content' },
    });
    if (!row) return null;
    const payload = row.payload as PortalContentPayload;
    return {
      items: Array.isArray(payload.items) ? payload.items : [],
      revision: typeof payload.revision === 'number' ? payload.revision : 0,
    };
  }

  async putPortalContent(workspaceId: string, payload: PortalContentPayload) {
    const id = `portal-content-${workspaceId}`;
    const existing = await this.prisma.centerRecord.findUnique({ where: { id } });
    const current = (existing?.payload as PortalContentPayload | undefined) ?? {};
    const currentRev = typeof current.revision === 'number' ? current.revision : 0;
    const expected =
      typeof payload.expectedRevision === 'number' ? payload.expectedRevision : undefined;

    // 有 expectedRevision 时做乐观锁；缺省（旧客户端）仍允许写入并递增
    if (expected != null && expected !== currentRev) {
      throw new ConflictException({
        message: 'portal_content_conflict',
        revision: currentRev,
        items: Array.isArray(current.items) ? current.items : [],
      });
    }

    const nextRev = currentRev + 1;
    const nextPayload: PortalContentPayload = {
      items: Array.isArray(payload.items) ? payload.items : [],
      revision: nextRev,
    };

    await this.prisma.centerRecord.upsert({
      where: { id },
      create: {
        id,
        workspaceId,
        kind: 'portal-content',
        payload: nextPayload as Prisma.InputJsonValue,
      },
      update: {
        payload: nextPayload as Prisma.InputJsonValue,
      },
    });
    return nextPayload;
  }
}
