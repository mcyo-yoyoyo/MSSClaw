import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  listMappedFromMarketplace,
  toPrismaJson,
  type MarketplacePayload,
} from './marketplace-center-sync';
import {
  MARKET_AGENT_BUSINESS_SCENARIO,
  MARKET_SKILL_BUSINESS_SCENARIO,
} from '../data/market-doc-seeds';
import {
  EXTERNAL_TOOLS_EXCEL,
  EXTERNAL_TOOLS_EXCEL_VERSION,
} from '../data/external-tools-excel-v1-0-5';
import {
  INTERNAL_TOOLS_EXCEL,
  INTERNAL_TOOLS_EXCEL_VERSION,
} from '../data/internal-tools-excel-v1-0-5';

export type { MarketplacePayload };

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
  | 'view'
  | 'use'
  | 'download'
  | 'favorite'
  | 'like'
  | 'dislike';

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

function mergeExcelExternalTools(source: unknown[] | undefined): unknown[] {
  const tools = Array.isArray(source) ? source : [];
  const internal = tools.filter((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return true;
    return (raw as Record<string, unknown>).sourceType !== 'external';
  });
  const existingByName = new Map(
    tools
      .filter((raw): raw is Record<string, unknown> => Boolean(raw && typeof raw === 'object' && !Array.isArray(raw)))
      .filter((tool) => tool.sourceType === 'external')
      .map((tool) => [normalizeExternalToolName(tool.name), tool]),
  );
  const existingById = new Map(
    tools
      .filter((raw): raw is Record<string, unknown> => Boolean(raw && typeof raw === 'object' && !Array.isArray(raw)))
      .filter((tool) => tool.sourceType === 'external' && typeof tool.id === 'string')
      .map((tool) => [String(tool.id), tool]),
  );
  const existingByHomepage = new Map(
    tools
      .filter((raw): raw is Record<string, unknown> => Boolean(raw && typeof raw === 'object' && !Array.isArray(raw)))
      .filter((tool) => tool.sourceType === 'external' && normalizeExternalToolUrl(tool.homepageUrl))
      .map((tool) => [normalizeExternalToolUrl(tool.homepageUrl), tool]),
  );
  const existingByDocs = new Map(
    tools
      .filter((raw): raw is Record<string, unknown> => Boolean(raw && typeof raw === 'object' && !Array.isArray(raw)))
      .filter((tool) => tool.sourceType === 'external' && normalizeExternalToolUrl(tool.docsUrl))
      .map((tool) => [normalizeExternalToolUrl(tool.docsUrl), tool]),
  );

  const external = EXTERNAL_TOOLS_EXCEL.map((record) => {
    const normalizedName = normalizeExternalToolName(record.name);
    const stableId = LEGACY_STABLE_EXTERNAL_IDS[normalizedName];
    const recordDocsUrl = 'docsUrl' in record ? record.docsUrl : undefined;
    const existing =
      (stableId ? existingById.get(stableId) : undefined) ??
      existingByName.get(normalizedName) ??
      existingByHomepage.get(normalizeExternalToolUrl(record.homepageUrl)) ??
      existingByDocs.get(normalizeExternalToolUrl(recordDocsUrl)) ??
      existingById.get(externalToolId(record.name)) ??
      {};
    const existingName =
      typeof existing.name === 'string' && existing.name.trim() ? existing.name.trim() : '';
    return {
      ...existing,
      ...record,
      id:
        stableId ||
        (typeof existing.id === 'string' && existing.id
          ? existing.id
          : externalToolId(record.name)),
      // URL / ID 命中说明只是运营改了展示名，应保留后台名称。
      name: existingName || record.name,
      desc: record.cardSummary,
      category: 'external',
      author: record.company,
      published: true,
      invokes: typeof existing.invokes === 'number' ? existing.invokes : 0,
      icon: typeof existing.icon === 'string' && existing.icon ? existing.icon : record.icon,
      tags: ['ai-saas', ...record.toolTypeLabels],
      sourceType: 'external',
      visibility: 'public',
      ownerDeptIds: [],
      ownerRegionId: null,
      marketShelf: 'external',
    };
  });
  return [...internal, ...external];
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
    return {
      ...existing,
      ...record,
      desc: record.cardSummary,
      category: 'platform',
      author: '华为内部',
      published: true,
      invokes: typeof existing.invokes === 'number' ? existing.invokes : 0,
      icon: typeof existing.icon === 'string' && existing.icon ? existing.icon : record.icon,
      tags: Array.isArray(existing.tags) ? existing.tags : ['hw-internal'],
      sourceType: 'internal',
      visibility: typeof existing.visibility === 'string' ? existing.visibility : 'public',
      ownerDeptIds: Array.isArray(existing.ownerDeptIds) ? existing.ownerDeptIds : [],
      ownerRegionId: existing.ownerRegionId ?? null,
      marketShelf: 'internal',
    };
  });
  return [...tools.filter((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return true;
    return !updatedIds.has(String((raw as Record<string, unknown>).id ?? ''));
  }), ...updated];
}

@Injectable()
export class PersistenceService {
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
      const enriched = this.enrichMarketplaceMetadata(row.payload as MarketplacePayload);
      if (enriched.changed) {
        await this.prisma.centerRecord.update({
          where: { id: row.id },
          data: { payload: enriched.payload as Prisma.InputJsonValue },
        });
      }
      return enriched.payload;
    }

    // 兼容已存在中心记录、但尚未生成 marketplace 聚合快照的工作区。
    // 首次读取时在后端完成转换并落库，前端始终只消费数据库快照。
    const built = await this.buildMarketplaceFromCenterRecords(workspaceId);
    if (!built) return null;
    const payload = this.enrichMarketplaceMetadata(built, true).payload;
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
    return payload;
  }

  async putMarketplace(workspaceId: string, payload: MarketplacePayload) {
    const id = `marketplace-${workspaceId}`;
    // 前端快照不含目录版本号；沿用库中已有值，避免被抹掉后误判为「需要重新播种」
    const existing = (await this.prisma.centerRecord.findUnique({ where: { id } }))
      ?.payload as MarketplacePayload | undefined;
    payload = this.enrichMarketplaceMetadata({
      ...payload,
      externalCatalogVersion:
        payload.externalCatalogVersion ?? existing?.externalCatalogVersion,
      internalCatalogVersion:
        payload.internalCatalogVersion ?? existing?.internalCatalogVersion,
    }).payload;
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
    await this.syncMarketplaceToCenters(workspaceId, payload);
    return payload;
  }

  async getMarketEngagement(workspaceId: string, userId: string) {
    await this.migrateLegacyMarketEngagement(workspaceId);
    const [metrics, interactions] = await Promise.all([
      this.prisma.marketEngagement.findMany({ where: { workspaceId } }),
      this.prisma.marketUserInteraction.findMany({ where: { workspaceId, userId } }),
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
    input: { action: MarketEngagementAction; userId: string; active?: boolean },
  ) {
    const userId = input.userId || 'anonymous';
    await this.migrateLegacyMarketEngagement(workspaceId);

    return this.prisma.$transaction(async (tx) => {
      let metric = await tx.marketEngagement.upsert({
        where: { workspaceId_contentId: { workspaceId, contentId } },
        create: { workspaceId, contentId },
        update: {},
      });
      let interaction = await tx.marketUserInteraction.findUnique({
        where: { workspaceId_userId_contentId: { workspaceId, userId, contentId } },
      });

      if (input.action === 'view' || input.action === 'use' || input.action === 'download') {
        const field = input.action === 'view' ? 'views' : input.action === 'use' ? 'uses' : 'downloads';
        metric = await tx.marketEngagement.update({
          where: { workspaceId_contentId: { workspaceId, contentId } },
          data: { [field]: { increment: 1 } },
        });
      } else if (input.action === 'favorite') {
        const next = input.active ?? !interaction?.favorited;
        const previous = interaction?.favorited ?? false;
        if (next !== previous) {
          metric = await tx.marketEngagement.update({
            where: { workspaceId_contentId: { workspaceId, contentId } },
            data: { favorites: { increment: next ? 1 : -1 } },
          });
        }
        interaction = await tx.marketUserInteraction.upsert({
          where: { workspaceId_userId_contentId: { workspaceId, userId, contentId } },
          create: { workspaceId, userId, contentId, favorited: next },
          update: { favorited: next },
        });
      } else {
        const requestedVote = input.action;
        const previousVote = interaction?.vote === 'like' || interaction?.vote === 'dislike'
          ? interaction.vote
          : null;
        const nextVote = previousVote === requestedVote ? null : requestedVote;
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
        }
        interaction = await tx.marketUserInteraction.upsert({
          where: { workspaceId_userId_contentId: { workspaceId, userId, contentId } },
          create: { workspaceId, userId, contentId, vote: nextVote },
          update: { vote: nextVote },
        });
      }

      return {
        engagement: this.toEngagement(metric),
        userVote:
          interaction?.vote === 'like' || interaction?.vote === 'dislike'
            ? interaction.vote
            : null,
        favorited: interaction?.favorited ?? false,
      };
    });
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
      .map(({ payload: item }) => ({
        id: text(item.id),
        name: text(item.displayName ?? item.name, text(item.id)),
        desc: text(item.description),
        category: text(item.type) === 'function' ? 'platform' : 'external',
        author: text(item.author, '平台运营'),
        published:
          typeof item.published === 'boolean' ? item.published : isPublished(item.status),
        invokes: 0,
        icon: text(item.icon, 'fa-cube'),
        tags: strings(item.tags),
        sourceType: 'internal',
        visibility: 'public',
        ownerDeptIds: [],
        ownerRegionId: null,
        homepageUrl: text(item.endpoint) || '#',
      }))
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
    let tools = Array.isArray(payload.tools) ? payload.tools : [];
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
  private async migrateLegacyMarketEngagement(workspaceId: string) {
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
    const entries = Object.entries(legacyMap);
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
              views: Math.max(0, Number(value.views ?? value.uses ?? 0)),
              uses: Math.max(0, Number(value.uses ?? 0)),
              likes: Math.max(0, Number(value.likes ?? 0)),
              dislikes: Math.max(0, Number(value.dislikes ?? 0)),
              downloads: Math.max(0, Number(value.downloads ?? 0)),
              favorites: Math.max(0, Number(value.favorites ?? 0)),
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
  private async syncMarketplaceToCenters(workspaceId: string, payload: MarketplacePayload) {
    const kinds = ['agent', 'skill', 'tool'] as const;
    for (const kind of kinds) {
      const items = listMappedFromMarketplace(kind, payload);
      for (const item of items) {
        const id = String(item.id);
        if (!id) continue;
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
