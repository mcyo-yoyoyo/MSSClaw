#!/usr/bin/env node
/**
 * 第 5 期：把收藏、最近浏览、隐藏、Skill 评价从 center_record 文档拆进个人数据表（停机执行，先 pg_dump 备份）。
 *
 * 来源：doc:market-favorites / doc:market-recent / doc:market-hidden（byUserId）、doc:skill-reviews（bySkillId）。
 *   - 每人收藏最多 40 条、最近浏览最多 12 条、每个 Skill 评价最多 80 条（沿用前端上限）。
 *   - 不属于任何人的旧版共享列表（items）不迁，会列出条数。
 *   - 收藏数不重算：market_engagement_stat.favorites 原样保留。
 *   - 点赞 / 点踩已由数据库迁移从旧互动表复制到 market_user_vote。
 * 写完后删除这四行旧文档。
 *
 * 用法（apps/api 目录）：
 *   npm run migrate:personal-data             只读预览
 *   npm run migrate:personal-data -- --apply  写入：目标表必须为空，全部在一个事务里，失败整体回滚
 */
import { PrismaClient } from '@prisma/client';
import { centerRecord } from './lib/center-record.mjs';

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();

const SHELF_KINDS = new Set(['external', 'internal', 'projects']);
const ASSET_TYPES = new Set(['tool', 'skill', 'agent', 'office-scene']);
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const time = (value) => {
  const parsed = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed) : new Date();
};

/** 每人的清单（数组从新到旧）→ 去重、截断后的行；不合格的条目计入 skipped */
function personalRows(doc, limit, toRow, skipped, label) {
  const rows = [];
  const byUserId = isRecord(doc?.byUserId) ? doc.byUserId : {};
  if (Array.isArray(doc?.items) && doc.items.length) skipped.push(`${label}：旧版共享列表 ${doc.items.length} 条不属于任何人，不迁`);
  for (const [memberId, items] of Object.entries(byUserId)) {
    if (!Array.isArray(items)) continue;
    const seen = new Set();
    let kept = 0;
    for (const item of items) {
      if (kept >= limit) break;
      const row = toRow(memberId, item);
      if (!row) {
        skipped.push(`${label}：${memberId} 的一条记录缺少货架或 id：${JSON.stringify(item).slice(0, 120)}`);
        continue;
      }
      const key = JSON.stringify([row.shelfKind, row.assetType ?? '', row.assetId]);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
      kept += 1;
    }
  }
  return rows;
}

function assetRef(item) {
  if (!isRecord(item)) return null;
  const shelfKind = text(item.kind);
  const assetId = text(item.id);
  if (!shelfKind || !SHELF_KINDS.has(shelfKind) || !assetId) return null;
  const assetType = text(item.assetType);
  return { shelfKind, assetId, assetType: assetType && ASSET_TYPES.has(assetType) ? assetType : '' };
}

async function main() {
  const docs = await centerRecord(prisma).findMany({
    where: { kind: { in: ['doc:market-favorites', 'doc:market-recent', 'doc:market-hidden', 'doc:skill-reviews'] } },
  });
  const byKind = new Map();
  for (const row of docs) {
    if (byKind.has(row.kind)) throw new Error(`${row.kind} 有多行（${row.id}），只应有平台空间那一行`);
    byKind.set(row.kind, row.payload);
  }
  const skipped = [];

  const favorites = personalRows(byKind.get('doc:market-favorites'), 40, (memberId, item) => {
    const ref = assetRef(item);
    return ref && {
      memberId,
      ...ref,
      contentId: ref.assetId,
      title: text(item.title) ?? ref.assetId,
      icon: text(item.icon),
      logoUrl: text(item.logoUrl),
      note: text(item.note),
      createdAt: time(item.at),
    };
  }, skipped, '收藏');

  const recent = personalRows(byKind.get('doc:market-recent'), 12, (memberId, item) => {
    const ref = assetRef(item);
    return ref && {
      memberId,
      ...ref,
      title: text(item.title) ?? ref.assetId,
      icon: text(item.icon),
      logoUrl: text(item.logoUrl),
      viewedAt: time(item.at),
    };
  }, skipped, '最近浏览');

  const hidden = [];
  const hiddenDoc = byKind.get('doc:market-hidden');
  for (const [memberId, keys] of Object.entries(isRecord(hiddenDoc?.byUserId) ? hiddenDoc.byUserId : {})) {
    const seen = new Set();
    for (const key of Array.isArray(keys) ? keys : []) {
      const [shelfKind, ...rest] = String(key).split(':');
      const assetId = rest.join(':');
      if (!SHELF_KINDS.has(shelfKind) || !assetId) {
        skipped.push(`隐藏：${memberId} 的「${key}」格式不对`);
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);
      hidden.push({ memberId, shelfKind, assetId });
    }
  }

  const reviews = [];
  const reviewsDoc = byKind.get('doc:skill-reviews');
  for (const [skillId, items] of Object.entries(isRecord(reviewsDoc?.bySkillId) ? reviewsDoc.bySkillId : {})) {
    for (const item of (Array.isArray(items) ? items : []).slice(0, 80)) {
      const id = text(item?.id);
      const memberId = text(item?.userId);
      const rating = Math.round(Number(item?.rating));
      if (!id || !memberId || !Number.isFinite(rating)) {
        skipped.push(`Skill 评价：${skillId} 的一条评价缺少 id / 评价人 / 分数`);
        continue;
      }
      reviews.push({
        id,
        skillId,
        memberId,
        memberName: text(item.userName) ?? '匿名用户',
        rating: Math.min(5, Math.max(1, rating)),
        content: typeof item.text === 'string' ? item.text : '',
        reply: text(item.reply),
        repliedAt: item.replyAt ? time(item.replyAt) : null,
        createdAt: time(item.at),
      });
    }
  }

  console.log(`收藏 ${favorites.length}，最近浏览 ${recent.length}，隐藏 ${hidden.length}，Skill 评价 ${reviews.length}`);
  skipped.forEach((line) => console.log(`  跳过 · ${line}`));

  if (!apply) {
    console.log('\n只读预览，未写入。确认无误后加 --apply 执行。');
    return;
  }

  const counts = await Promise.all([
    prisma.marketFavorite.count(),
    prisma.marketRecentView.count(),
    prisma.marketHiddenItem.count(),
    prisma.skillReview.count(),
  ]);
  if (counts.some(Boolean)) throw new Error(`个人数据表不是空的（${counts.join(' / ')}），停止`);

  await prisma.$transaction(async (tx) => {
    if (favorites.length) await tx.marketFavorite.createMany({ data: favorites });
    if (recent.length) await tx.marketRecentView.createMany({ data: recent });
    if (hidden.length) await tx.marketHiddenItem.createMany({ data: hidden });
    if (reviews.length) await tx.skillReview.createMany({ data: reviews });
    await centerRecord(tx).deleteMany({ where: { id: { in: docs.map((row) => row.id) } } });
  }, { maxWait: 60_000, timeout: 300_000 });

  const stored = await Promise.all([
    prisma.marketFavorite.count(),
    prisma.marketRecentView.count(),
    prisma.marketHiddenItem.count(),
    prisma.skillReview.count(),
  ]);
  const expected = [favorites.length, recent.length, hidden.length, reviews.length];
  const ok = stored.every((count, index) => count === expected[index]);
  console.log(`\n已写入：收藏 ${stored[0]}，最近浏览 ${stored[1]}，隐藏 ${stored[2]}，Skill 评价 ${stored[3]}${ok ? '，与预期一致' : `，应为 ${expected.join(' / ')}`}`);
  if (!ok) process.exitCode = 1;
  else console.log('完成。');
}

main()
  .catch((error) => {
    console.error(`\n失败：${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
