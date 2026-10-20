#!/usr/bin/env node
/**
 * 第 2 期：SQLite → PostgreSQL 一次性数据迁移（停机执行，原 SQLite 文件不动、留作备份）。
 *
 * 迁移范围（2026-10-20 确认）：
 *   - 文档与个人数据只迁平台空间 ws-cn-marketing 与全局记录（__global__ 工具目录、global 快讯归档）；
 *     其他工作区的文档、收藏/投票、订阅、案例、站内信都不迁。点赞 / 点踩直接写进 market_user_vote。
 *   - 统计各工作区合并：行为事件、页面访问、每日登录、转化事件全迁（按 eventId / 主键去重），
 *     互动累计值按内容 id 求和。visitor_hash 含原工作区 id，同一人同一天在两个空间登录过会多算一个 UV。
 *   - 原 Workspace 表只取 ws-cn-marketing 那一行，存为 app_setting('workspace')。
 *
 * 用法（apps/api 目录）：
 *   npm run migrate:sqlite-to-pg -- [sqlite 路径]            只读预览：各工作区数据量与将要写入的行数
 *   npm run migrate:sqlite-to-pg -- [sqlite 路径] --apply    写入 DATABASE_URL 指向的 PG：
 *                                                           目标表必须为空，全部写入在一个事务里，失败整体回滚
 * sqlite 路径缺省为 prisma/dev.db。
 */
import { DatabaseSync } from 'node:sqlite';
import { PrismaClient } from '@prisma/client';
import { centerRecord, ensureCenterRecordTable } from './lib/center-record.mjs';

const PLATFORM = 'ws-cn-marketing';
const GLOBAL_SCOPES = ['__global__', 'global'];
const KEPT_SCOPES = [PLATFORM, ...GLOBAL_SCOPES];
const CHUNK = 1000;

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const sqlitePath = args.find((arg) => !arg.startsWith('--')) ?? 'prisma/dev.db';

const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
const all = (sql, ...params) => sqlite.prepare(sql).all(...params);
const placeholders = (values) => values.map(() => '?').join(', ');

function date(value, column) {
  if (value == null) return null;
  const parsed = new Date(typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`无法解析时间 ${column} = ${value}`);
  return parsed;
}

function json(value, column) {
  if (value == null) return null;
  // jsonb 不接受 \u0000；SQLite 的 JSON 文本里允许，遇到就停下来人工处理。
  if (String(value).includes('\\u0000')) throw new Error(`${column} 含 \\u0000，PG jsonb 无法存储`);
  return JSON.parse(value);
}

const bool = (value) => (value == null ? null : Boolean(value));

function overview() {
  const tables = [
    'CenterRecord', 'MarketEngagement', 'MarketUserInteraction', 'MarketEngagementEvent',
    'PortalPageView', 'PortalDailyLogin', 'PortalConversionEvent', 'AiBriefEmailSubscription',
    'CaseInsightArticle', 'InboxMessageRecord', 'InboxUserMessageState',
  ];
  const byWorkspace = new Map();
  for (const table of tables) {
    for (const row of all(`SELECT "workspaceId" AS ws, COUNT(*) AS n FROM "${table}" GROUP BY "workspaceId"`)) {
      if (!byWorkspace.has(row.ws)) byWorkspace.set(row.ws, {});
      byWorkspace.get(row.ws)[table] = row.n;
    }
  }
  for (const row of all('SELECT id FROM "Workspace"')) {
    if (!byWorkspace.has(row.id)) byWorkspace.set(row.id, {});
  }
  console.log(`来源 ${sqlitePath}，各工作区行数（* 为文档会迁移的空间）：`);
  for (const [ws, counts] of [...byWorkspace].sort(([a], [b]) => a.localeCompare(b))) {
    const detail = Object.entries(counts).map(([table, n]) => `${table} ${n}`).join('，') || '（只有 Workspace 行）';
    console.log(`  ${KEPT_SCOPES.includes(ws) ? '*' : ' '} ${ws}: ${detail}`);
  }
}

function collect() {
  const keep = placeholders(KEPT_SCOPES);
  const workspace = all('SELECT * FROM "Workspace" WHERE id = ?', PLATFORM)[0];
  const messages = all('SELECT * FROM "InboxMessageRecord" WHERE "workspaceId" = ?', PLATFORM);
  const messageIds = new Set(messages.map((row) => row.id));
  const states = all('SELECT * FROM "InboxUserMessageState" WHERE "workspaceId" = ?', PLATFORM);
  const orphanStates = states.filter((row) => !messageIds.has(row.messageId));

  return {
    orphanStates,
    tables: {
      appSetting: workspace
        ? [{
            settingKey: 'workspace',
            value: {
              name: workspace.name,
              namespace: workspace.namespace,
              description: workspace.description,
              memberCount: workspace.memberCount,
              defaultChatId: workspace.defaultChatId,
              catalog: json(workspace.catalogJson, 'Workspace.catalogJson'),
            },
            updatedAt: date(workspace.updatedAt, 'Workspace.updatedAt'),
          }]
        : [],
      centerRecord: all(`SELECT * FROM "CenterRecord" WHERE "workspaceId" IN (${keep})`, ...KEPT_SCOPES).map((row) => ({
        id: row.id,
        kind: row.kind,
        payload: json(row.payload, `CenterRecord(${row.id}).payload`),
        updatedAt: date(row.updatedAt, 'CenterRecord.updatedAt'),
      })),
      marketEngagement: all(`
        SELECT "contentId", SUM(views) AS views, SUM(uses) AS uses, SUM(likes) AS likes, SUM(dislikes) AS dislikes,
               SUM(downloads) AS downloads, SUM(favorites) AS favorites, MAX("updatedAt") AS "updatedAt"
        FROM "MarketEngagement" GROUP BY "contentId"`).map((row) => ({
        contentId: row.contentId,
        views: row.views,
        uses: row.uses,
        likes: row.likes,
        dislikes: row.dislikes,
        downloads: row.downloads,
        favorites: row.favorites,
        updatedAt: date(row.updatedAt, 'MarketEngagement.updatedAt'),
      })),
      // 点赞 / 点踩写进 market_user_vote（第 5 期起旧互动表已删除）；收藏状态由 migrate:personal-data 从收藏文档迁入
      marketUserVote: all('SELECT * FROM "MarketUserInteraction" WHERE "workspaceId" = ? AND "vote" IS NOT NULL', PLATFORM).map((row) => ({
        userId: row.userId,
        contentId: row.contentId,
        vote: row.vote,
        updatedAt: date(row.updatedAt, 'MarketUserInteraction.updatedAt'),
      })),
      marketEngagementEvent: all('SELECT * FROM "MarketEngagementEvent" ORDER BY "occurredAt"').map((row) => ({
        id: row.id,
        eventId: row.eventId,
        contentId: row.contentId,
        assetType: row.assetType,
        action: row.action,
        dateKey: row.dateKey,
        visitorHash: row.visitorHash,
        visitorType: row.visitorType,
        success: bool(row.success),
        durationMs: row.durationMs,
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        errorCode: row.errorCode,
        occurredAt: date(row.occurredAt, 'MarketEngagementEvent.occurredAt'),
      })),
      portalPageView: all('SELECT * FROM "PortalPageView" ORDER BY "occurredAt"').map((row) => ({
        eventId: row.eventId,
        dateKey: row.dateKey,
        routeKey: row.routeKey,
        visitorHash: row.visitorHash,
        visitorType: row.visitorType,
        journeyHash: row.journeyHash,
        occurredAt: date(row.occurredAt, 'PortalPageView.occurredAt'),
      })),
      portalDailyLogin: all('SELECT * FROM "PortalDailyLogin"').map((row) => ({
        dateKey: row.dateKey,
        visitorHash: row.visitorHash,
        firstLoginAt: date(row.firstLoginAt, 'PortalDailyLogin.firstLoginAt'),
      })),
      portalConversionEvent: all('SELECT * FROM "PortalConversionEvent" ORDER BY "occurredAt"').map((row) => ({
        eventId: row.eventId,
        dateKey: row.dateKey,
        eventType: row.eventType,
        action: row.action,
        routeKey: row.routeKey,
        journeyHash: row.journeyHash,
        userHash: row.userHash,
        occurredAt: date(row.occurredAt, 'PortalConversionEvent.occurredAt'),
      })),
      aiBriefEmailSubscription: all('SELECT * FROM "AiBriefEmailSubscription" WHERE "workspaceId" = ?', PLATFORM).map((row) => ({
        userId: row.userId,
        userName: row.userName,
        email: row.email,
        subscribedAt: date(row.subscribedAt, 'AiBriefEmailSubscription.subscribedAt'),
        updatedAt: date(row.updatedAt, 'AiBriefEmailSubscription.updatedAt'),
      })),
      caseInsightArticle: all('SELECT * FROM "CaseInsightArticle" WHERE "workspaceId" = ?', PLATFORM).map((row) => ({
        id: row.id,
        sourceCaseId: row.sourceCaseId,
        title: row.title,
        summary: row.summary,
        company: row.company,
        sourceUrl: row.sourceUrl,
        domainIds: json(row.domainIds, 'CaseInsightArticle.domainIds'),
        tags: json(row.tags, 'CaseInsightArticle.tags'),
        draftHtml: row.draftHtml,
        draftMarkdown: row.draftMarkdown,
        draftCoverImage: row.draftCoverImage,
        status: row.status,
        sortOrder: row.sortOrder,
        version: row.version,
        publishedTitle: row.publishedTitle,
        publishedSummary: row.publishedSummary,
        publishedCompany: row.publishedCompany,
        publishedSourceUrl: row.publishedSourceUrl,
        publishedDomainIds: json(row.publishedDomainIds, 'CaseInsightArticle.publishedDomainIds') ?? undefined,
        publishedTags: json(row.publishedTags, 'CaseInsightArticle.publishedTags') ?? undefined,
        publishedHtml: row.publishedHtml,
        publishedMarkdown: row.publishedMarkdown,
        publishedCoverImage: row.publishedCoverImage,
        publishedVersion: row.publishedVersion,
        publishedAt: date(row.publishedAt, 'CaseInsightArticle.publishedAt'),
        deletedAt: date(row.deletedAt, 'CaseInsightArticle.deletedAt'),
        deletedFromStatus: row.deletedFromStatus,
        createdAt: date(row.createdAt, 'CaseInsightArticle.createdAt'),
        updatedAt: date(row.updatedAt, 'CaseInsightArticle.updatedAt'),
      })),
      inboxMessageRecord: messages.map((row) => ({
        id: row.id,
        kind: row.kind,
        title: row.title,
        body: row.body,
        fromUserId: row.fromUserId,
        fromName: row.fromName,
        toUserId: row.toUserId,
        meta: json(row.meta, 'InboxMessageRecord.meta') ?? undefined,
        createdAt: date(row.createdAt, 'InboxMessageRecord.createdAt'),
      })),
      inboxUserMessageState: states.filter((row) => messageIds.has(row.messageId)).map((row) => ({
        userId: row.userId,
        messageId: row.messageId,
        readAt: date(row.readAt, 'InboxUserMessageState.readAt'),
        deletedAt: date(row.deletedAt, 'InboxUserMessageState.deletedAt'),
        updatedAt: date(row.updatedAt, 'InboxUserMessageState.updatedAt'),
      })),
    },
  };
}

async function main() {
  overview();
  const { tables, orphanStates } = collect();
  console.log('\n将写入 PG：');
  for (const [model, rows] of Object.entries(tables)) console.log(`  ${model.padEnd(26)} ${rows.length}`);
  if (orphanStates.length) {
    console.log(`  （跳过 ${orphanStates.length} 条找不到消息正文的站内信状态）`);
  }
  if (!tables.appSetting.length) console.log(`  （SQLite 里没有 ${PLATFORM} 的 Workspace 行，启动时会自动补一行空目录）`);

  if (!apply) {
    console.log('\n只读预览，未写入。确认无误后加 --apply 执行。');
    return;
  }

  const prisma = new PrismaClient();
  // center_record 是过渡表：Prisma 里已没有这个模型，走原始 SQL；全新库上它已被第 6 期迁移删掉，这里重建
  const table = (db, model) => (model === 'centerRecord' ? centerRecord(db) : db[model]);
  try {
    await ensureCenterRecordTable(prisma);
    const nonEmpty = [];
    for (const model of Object.keys(tables)) {
      const count = await table(prisma, model).count();
      if (count) nonEmpty.push(`${model} ${count}`);
    }
    if (nonEmpty.length) {
      throw new Error(`目标库不是空的（${nonEmpty.join('，')}），停止。请换一个新库或先清空这些表。`);
    }

    const inserted = {};
    await prisma.$transaction(async (tx) => {
      for (const [model, rows] of Object.entries(tables)) {
        inserted[model] = 0;
        for (let i = 0; i < rows.length; i += CHUNK) {
          const { count } = await table(tx, model).createMany({ data: rows.slice(i, i + CHUNK), skipDuplicates: true });
          inserted[model] += count;
        }
      }
    }, { maxWait: 60_000, timeout: 600_000 });

    console.log('\n已写入（统计表按 eventId / 主键去重，重复的跳过）：');
    let mismatch = false;
    for (const [model, rows] of Object.entries(tables)) {
      const stored = await table(prisma, model).count();
      const skipped = rows.length - inserted[model];
      if (stored !== inserted[model]) mismatch = true;
      console.log(`  ${model.padEnd(26)} ${stored}${skipped ? `（重复跳过 ${skipped}）` : ''}${stored !== inserted[model] ? '  ← 与写入数不一致' : ''}`);
    }
    if (mismatch) throw new Error('写入后的行数与预期不一致');
    console.log('\n完成。');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`\n失败：${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
