/**
 * 站内公告：文档是权威源，发布时把已上架公告落成一条全员广播消息。
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
  published: boolean;
}

interface BroadcastPrisma {
  inboxMessageRecord: {
    upsert(args: unknown): Promise<unknown>;
    deleteMany(args: unknown): Promise<unknown>;
  };
  inboxUserMessageState: {
    deleteMany(args: unknown): Promise<unknown>;
  };
}

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
      published: entry.published !== false,
    });
  }
  return {
    items: [...byId.values()]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, LIMITS.items),
  };
}

/**
 * 把公告文档的变更同步到广播消息：
 * - 已上架 → upsert 一条广播消息，标题/正文改动跟着更新
 * - 下架 → 保留消息（已经通知过的不追回），只退出首页公告条
 * - 删除 → 撤回消息及各人已读态，用于运营误发
 */
export async function syncStationAnnouncementBroadcast(
  prisma: BroadcastPrisma,
  workspaceId: string,
  previous: readonly CanonicalStationAnnouncement[],
  next: readonly CanonicalStationAnnouncement[],
): Promise<{ delivered: number; retracted: number }> {
  const nextIds = new Set(next.map((item) => item.id));
  const retracted = previous.map((item) => item.id).filter((id) => !nextIds.has(id));
  for (const id of retracted) {
    await prisma.inboxMessageRecord.deleteMany({ where: { workspaceId, id } });
    await prisma.inboxUserMessageState.deleteMany({ where: { workspaceId, messageId: id } });
  }

  const published = next.filter((item) => item.published);
  for (const item of published) {
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
      where: { workspaceId_id: { workspaceId, id: item.id } },
      create: { workspaceId, id: item.id, ...shared },
      update: shared,
    });
  }

  return { delivered: published.length, retracted: retracted.length };
}
