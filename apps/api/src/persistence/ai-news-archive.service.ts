import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const AI_NEWS_SOURCE = 'https://aihot.virxact.com';
const ITEMS_API = `${AI_NEWS_SOURCE}/api/v1/items?mode=selected&window=7d&limit=100`;

/** 归档保留半年；超期条目在每次归档后滚动淘汰 */
const RETENTION_DAYS = 180;

/** 启动时距上次成功同步超过该小时数即补拉；取 12h 可覆盖"错过当天 08:00"的情形 */
const STALE_AFTER_HOURS = 12;

/** 全局单条记录：AI 快讯不区分工作区，各租户读同一份公共资讯 */
const ARCHIVE_ID = 'doc-ai-news-archive';
const ARCHIVE_KIND = 'doc:ai-news-archive';
const ARCHIVE_WORKSPACE = 'global';

type AihotItem = {
  id?: string;
  title?: string;
  summary?: string | null;
  publishedAt?: string;
  discoveredAt?: string;
  category?: string;
  score?: number;
  reason?: string | null;
  source?: { name?: string };
  links?: { original?: string; aihot?: string };
};

/** 归档条目：前端展示字段 + publishedAt（用于排序与超期淘汰） */
export interface ArchivedNewsItem {
  id: string;
  publishedAt: string;
  dateLabel: string;
  title: string;
  summary: string;
  url: string;
  source?: string;
  category?: string;
  reason?: string;
  score?: number;
  aihotUrl?: string;
}

interface ArchivePayload {
  items: ArchivedNewsItem[];
  updatedAt: string;
  lastSyncAt?: string;
  lastSyncError?: string;
}

function dateLabel(value?: string): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '日期未知';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })
    .format(date)
    .replace(/日周/, '·周');
}

/** 稳定的上海自然日键，供日历筛选使用；dateLabel 仅用于展示。 */
function dateKey(value?: string): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : '';
}

function toArchived(item: AihotItem): ArchivedNewsItem | null {
  const title = item.title?.trim();
  if (!item.id || !title) return null;
  const publishedAt = item.publishedAt ?? item.discoveredAt ?? new Date().toISOString();
  return {
    id: `aihot-${item.id}`,
    publishedAt,
    dateLabel: dateLabel(publishedAt),
    title,
    summary: item.summary?.trim() ?? '',
    url: item.links?.original || item.links?.aihot || AI_NEWS_SOURCE,
    source: item.source?.name?.trim() || undefined,
    category: item.category || undefined,
    reason: item.reason?.trim() || undefined,
    score: typeof item.score === 'number' ? item.score : undefined,
    aihotUrl: item.links?.aihot || undefined,
  };
}

/**
 * AI 快讯归档：每天 08:00（Asia/Shanghai）拉一次上游 7 天窗口并合并入库，
 * 前端只读数据库，不再每次访问都依赖外网。
 *
 * 合并而非只取前一天：内网环境定时任务失败是常态，7 天窗口可自动补回
 * 漏掉的日期；按 id 去重，重复执行不会产生脏数据。
 *
 * 存储沿用 CenterRecord（doc:ai-news-archive），不新增表——内网 Windows
 * 部署最怕表结构变更，这样升级时无需执行迁移。
 */
@Injectable()
export class AiNewsArchiveService implements OnModuleInit {
  private readonly logger = new Logger(AiNewsArchiveService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // 启动补偿：进程在 08:00 时未运行（机器关机 / 重启 / 部署窗口）时 cron 不会
    // 触发，若只在归档为空时补拉，"每天 9 点才开机"这类用法会永远错过定时，
    // 归档停在最后一次成功同步。因此改为按新鲜度判断：距上次成功同步超过
    // STALE_AFTER_HOURS 就立即补一次。
    const archive = await this.readArchive();
    const lastOk = archive.lastSyncError ? undefined : archive.lastSyncAt;
    const ageMs = lastOk ? Date.now() - new Date(lastOk).getTime() : Number.POSITIVE_INFINITY;
    if (archive.items.length && ageMs < STALE_AFTER_HOURS * 60 * 60 * 1000) return;

    this.logger.log(
      archive.items.length
        ? `AI news archive stale (${Math.round(ageMs / 3_600_000)}h since last sync); catching up`
        : 'AI news archive empty on boot; fetching once',
    );
    await this.syncNow().catch((err) => {
      this.logger.warn(`AI news catch-up sync failed: ${String(err)}`);
    });
  }

  @Cron('0 8 * * *', { name: 'ai-news-daily', timeZone: 'Asia/Shanghai' })
  async scheduledSync() {
    this.logger.log('AI news daily sync started');
    const result = await this.syncNow();
    this.logger.log(
      result.ok
        ? `AI news daily sync done: +${result.added} new, ${result.total} archived`
        : `AI news daily sync failed: ${result.error}`,
    );
  }

  /** 拉取上游并合并入库；上游失败时保留既有归档不动 */
  async syncNow(): Promise<{
    ok: boolean;
    added: number;
    total: number;
    error?: string;
  }> {
    const archive = await this.readArchive();
    let fetched: AihotItem[];
    try {
      const upstream = await fetch(ITEMS_API, {
        headers: {
          'User-Agent': 'mssclaw-ai-brief/1.0',
          Accept: 'application/json',
        },
      });
      if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
      const data = (await upstream.json()) as { items?: AihotItem[] };
      fetched = Array.isArray(data.items) ? data.items : [];
    } catch (e) {
      const error = e instanceof Error ? e.message : 'fetch failed';
      await this.writeArchive({
        ...archive,
        lastSyncAt: new Date().toISOString(),
        lastSyncError: error,
      });
      return { ok: false, added: 0, total: archive.items.length, error };
    }

    const byId = new Map(archive.items.map((item) => [item.id, item]));
    let added = 0;
    for (const raw of fetched) {
      const item = toArchived(raw);
      if (!item) continue;
      if (!byId.has(item.id)) added += 1;
      // 已存在的条目也用最新内容覆盖：上游可能修订标题或摘要
      byId.set(item.id, item);
    }

    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const items = [...byId.values()]
      .filter((item) => {
        const ts = new Date(item.publishedAt).getTime();
        return Number.isNaN(ts) ? true : ts >= cutoff;
      })
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

    await this.writeArchive({
      items,
      updatedAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
      lastSyncError: undefined,
    });
    return { ok: true, added, total: items.length };
  }

  /** 供接口读取：按日期分组，结构与原实时代理保持一致 */
  async readGrouped() {
    const archive = await this.readArchive();
    const grouped = new Map<
      string,
      { dateLabel: string; items: ArchivedNewsItem[] }
    >();
    for (const item of archive.items) {
      // 旧归档没有 dateKey；读取时由 publishedAt 现算，无需数据迁移。
      const key = dateKey(item.publishedAt);
      const group = grouped.get(key);
      if (group) group.items.push(item);
      else grouped.set(key, { dateLabel: item.dateLabel, items: [item] });
    }
    return {
      sourceUrl: AI_NEWS_SOURCE,
      sourceName: 'AIHOT',
      fetchedAt: archive.updatedAt,
      lastSyncAt: archive.lastSyncAt,
      lastSyncError: archive.lastSyncError,
      groups: [...grouped].map(([key, group]) => ({
        dateKey: key,
        dateLabel: group.dateLabel,
        items: group.items,
      })),
    };
  }

  private async readArchive(): Promise<ArchivePayload> {
    const row = await this.prisma.centerRecord.findUnique({ where: { id: ARCHIVE_ID } });
    const payload = row?.payload as ArchivePayload | undefined;
    return {
      items: Array.isArray(payload?.items) ? payload!.items : [],
      updatedAt: payload?.updatedAt ?? new Date(0).toISOString(),
      lastSyncAt: payload?.lastSyncAt,
      lastSyncError: payload?.lastSyncError,
    };
  }

  private async writeArchive(payload: ArchivePayload) {
    await this.prisma.centerRecord.upsert({
      where: { id: ARCHIVE_ID },
      create: {
        id: ARCHIVE_ID,
        workspaceId: ARCHIVE_WORKSPACE,
        kind: ARCHIVE_KIND,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
      update: { payload: payload as unknown as Prisma.InputJsonValue },
    });
  }
}
