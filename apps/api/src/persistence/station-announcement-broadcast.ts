import type { PrismaService } from '../prisma/prisma.service';

/**
 * 站内公告：文档是权威源，保存时把公告落成一条全员广播消息。
 *
 * 首页公告条按「未读」过滤，而未读态挂在 InboxUserMessageState 上（每人一行），
 * 所以公告必须先有 InboxMessageRecord 才能记住「擦掉=已读」。这一步放在服务端，
 * 不依赖任何用户打开过首页。
 */

const LIMITS = {
  items: 50,
  id: 64,
  title: 200,
  body: 4_000,
  tag: 12,
} as const;

/** 首版枚举只有「上线 / 培训」，后来加了 AI 前缀，现在是运营自填标签 */
const LEGACY_TAGS: Record<string, string> = {
  上线: 'AI上线',
  培训: 'AI培训',
};

export const ANNOUNCEMENT_BROADCAST_KIND = 'announce';
export const ANNOUNCEMENT_BROADCAST_FROM = '能力运营';
/** 收件人通配：与 InboxMessageRecord 的广播约定一致 */
export const ANNOUNCEMENT_BROADCAST_TO = '*';

export interface CanonicalStationAnnouncement {
  id: string;
  title: string;
  body: string;
  badge: string;
  /** 运营选定的标签色 #rrggbb；空串表示按标签文字自动取色 */
  badgeColor: string;
  publishedAt: string;
  pinned: boolean;
  /** false 表示已下架。缺省按在架处理，避免旧数据被藏起来。 */
  listed: boolean;
}

type BroadcastPrisma = Pick<PrismaService, 'inboxMessageRecord' | 'inboxUserMessageState'>;

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown, max: number): string {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

/** 运营自填标签：去空白、套用历史枚举映射、限长；留空表示不展示标签 */
export function normalizeAnnouncementTag(value: unknown): string {
  const raw = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!raw) return '';
  return (LEGACY_TAGS[raw] ?? raw).slice(0, LIMITS.tag);
}

/** 只接受 #rrggbb / #rgb；其它一律按「自动配色」处理，避免把任意字符串写进样式 */
export function normalizeAnnouncementColor(value: unknown): string {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-f]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return '';
}

function isoDate(value: unknown): string {
  const raw = String(value ?? '').trim();
  const parsed = raw ? Date.parse(raw) : Number.NaN;
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

/**
 * 公告文档规范化。标题为空的条目直接丢弃——它在首页只有一行标题可看，
 * 没有标题就没有任何可展示信息。
 */
export function canonicalizeStationAnnouncements(input: unknown): {
  items: CanonicalStationAnnouncement[];
} {
  const raw = isJsonObject(input) && Array.isArray(input.items) ? input.items : [];
  const byId = new Map<string, CanonicalStationAnnouncement>();
  for (const entry of raw) {
    if (!isJsonObject(entry)) continue;
    const id = text(entry.id, LIMITS.id);
    const title = text(entry.title, LIMITS.title);
    if (!id || !title || byId.has(id)) continue;
    byId.set(id, {
      id,
      title,
      body: text(entry.body, LIMITS.body),
      badge: normalizeAnnouncementTag(entry.badge ?? entry.tag),
      badgeColor: normalizeAnnouncementColor(entry.badgeColor),
      publishedAt: isoDate(entry.publishedAt),
      pinned: entry.pinned === true,
      listed: entry.listed !== false,
    });
  }
  return {
    items: [...byId.values()]
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, LIMITS.items),
  };
}

/**
 * 把公告文档的变更同步到广播消息：
 * - 在架 → upsert 一条广播消息，标题/正文改动跟着更新，保留各人已读态
 * - 下架 → 撤回消息。已读态挂在消息上，会一并清掉；重新上架会再次通知所有人
 * - 删除 → 撤回消息及各人已读态，公告记录也不保留，用于运营误发
 */
export async function syncStationAnnouncementBroadcast(
  prisma: BroadcastPrisma,
  previous: readonly CanonicalStationAnnouncement[],
  next: readonly CanonicalStationAnnouncement[],
): Promise<{ delivered: number; retracted: number }> {
  const nextIds = new Set(next.map((item) => item.id));
  const removed = previous.map((item) => item.id).filter((id) => !nextIds.has(id));
  for (const id of removed) {
    await prisma.inboxUserMessageState.deleteMany({ where: { messageId: id } });
    await prisma.inboxMessageRecord.deleteMany({ where: { id } });
  }

  const unlisted = next.filter((item) => !item.listed);
  for (const item of unlisted) {
    await prisma.inboxMessageRecord.deleteMany({ where: { id: item.id } });
  }

  const listed = next.filter((item) => item.listed);
  for (const item of listed) {
    const shared = {
      kind: ANNOUNCEMENT_BROADCAST_KIND,
      title: item.title,
      body: item.body,
      fromName: ANNOUNCEMENT_BROADCAST_FROM,
      toUserId: ANNOUNCEMENT_BROADCAST_TO,
      createdAt: new Date(item.publishedAt),
      meta: { announcementTag: item.badge },
    };
    await prisma.inboxMessageRecord.upsert({
      where: { id: item.id },
      create: { id: item.id, ...shared },
      update: shared,
    });
  }

  return { delivered: listed.length, retracted: removed.length + unlisted.length };
}
