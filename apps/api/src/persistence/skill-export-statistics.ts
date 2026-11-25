/**
 * [INPUT]: 当前成员可见的 Skill、互动累计、下载事件和成员投票。
 * [OUTPUT]: readSkillExportStatistics 按 Skill ID 返回明细表统计。
 * [POS]: 后台目录导出专用，沿用目录的组织可见范围。
 * [PROTOCOL]: Update this header on change, then check AGENTS.md
 */
import type { PrismaService } from '../prisma/prisma.service';
import { catalogScope, type CatalogViewer } from './asset-catalog';
import { portalAnalyticsDateKey, shiftPortalAnalyticsDateKey } from './portal-analytics-time';

export async function readSkillExportStatistics(db: PrismaService, viewer: NonNullable<CatalogViewer>) {
  const skills = await db.skill.findMany({
    where: catalogScope('skill', viewer),
    select: { id: true },
  });
  const ids = skills.map(skill => skill.id);
  const to = portalAnalyticsDateKey();
  const [totals, recent, votes] = await Promise.all([
    db.marketEngagement.findMany({
      where: { contentId: { in: ids } },
      select: { contentId: true, views: true, downloads: true, likes: true, dislikes: true },
    }),
    db.marketEngagementEvent.groupBy({
      by: ['contentId'],
      where: {
        contentId: { in: ids },
        assetType: { in: ['skill', 'unknown'] },
        action: { in: ['download', 'request:download'] },
        dateKey: { gte: shiftPortalAnalyticsDateKey(to, -29), lte: to },
      },
      _count: { _all: true },
    }),
    db.marketUserVote.findMany({
      where: { contentId: { in: ids }, vote: { in: ['like', 'dislike'] } },
      select: { contentId: true, userId: true, vote: true },
      orderBy: { userId: 'asc' },
    }),
  ]);

  const members = await db.member.findMany({
    where: { id: { in: [...new Set(votes.map(vote => vote.userId))] } },
    select: { id: true, name: true },
  });
  // 平台没有独立的工号字段。OAuth externalId 可以是 UUID 或 OpenID。
  const names = new Map(members.map(member => [member.id, member.name]));
  const cumulative = new Map(totals.map(row => [row.contentId, row]));
  const monthly = new Map(recent.map(row => [row.contentId, row._count._all]));
  const result = new Map(ids.map(id => {
    const total = cumulative.get(id);
    return [id, {
      views: total?.views ?? 0, likes: total?.likes ?? 0, dislikes: total?.dislikes ?? 0,
      downloads: total?.downloads ?? 0, downloads30d: monthly.get(id) ?? 0,
      likeUsers: [] as string[], dislikeUsers: [] as string[],
    }] as const;
  }));
  for (const vote of votes) {
    const row = result.get(vote.contentId);
    const name = names.get(vote.userId);
    if (row && name) (vote.vote === 'like' ? row.likeUsers : row.dislikeUsers).push(name);
  }
  return Object.fromEntries(result);
}
