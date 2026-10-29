#!/usr/bin/env node
/**
 * 第 6 期：center_record 里剩下的全部记录拆进正式表，搬完删除 center_record（停机执行，先 pg_dump 备份）。
 *
 *   配置类文档（导航、首页精选、分类、安全策略等）→ app_setting，键名就是文档种类，内容原样
 *   办公场景 / 站内公告 / 运营 AI 新闻 / 门户内容 / 审批 / 审计 / 模型配置 → 各自的表（写入走接口同一套校验）
 *   AIHOT 快讯归档 → ai_news_feed_item + app_setting('ai-news-feed.sync')
 *   执行记录、智库草稿与方案、原型中心资源（prompt / workflow / knowledge / memory）→ 各自的表
 *   工作区目录里的会话 → chat_session，并从目录里删掉
 *   旧互动文档 content-engagement：没导入过的计数导入 market_engagement_stat（只认现存内容），然后丢弃
 *   旧站内信文档 inbox：8 月起已停用（前端改读 inbox_message），列出后丢弃；ai-news-prefs 从未使用，丢弃
 *   审计只保留最近 180 天；模型 API Key 加密存储，需要先配置 LLM_KEY_SECRET
 *
 * 用法（apps/api 目录）：
 *   npm run migrate:remaining             预览：在事务里完整跑一遍并读回核对，最后回滚，不改数据
 *   npm run migrate:remaining -- --apply  执行：目标表必须为空；写入、核对、删 center_record 在一个事务里
 */
import { PrismaClient } from '@prisma/client';
import { centerRecord, centerRecordTableExists } from './lib/center-record.mjs';
import { readAiNewsArchive, writeAiNewsArchive } from '../dist/persistence/ai-news-archive.service.js';
import { chatFromRow, importChats } from '../dist/persistence/chat-session-store.js';
import { readLlmConfigDoc, writeLlmConfigDoc } from '../dist/persistence/llm-config-store.js';
import {
  AUDIT_RETENTION_DAYS,
  appendAuditDoc,
  readAiNewsDoc,
  readApprovalsDoc,
  readOfficeScenesDoc,
  readPortalContent,
  readStationAnnouncements,
  writeAiNewsDoc,
  writeApprovalsDoc,
  writeOfficeScenesDoc,
  writePortalContent,
  writeStationAnnouncements,
} from '../dist/persistence/operations-store.js';
import { PersistenceService } from '../dist/persistence/persistence.service.js';
import { canonicalizeStationAnnouncements, syncStationAnnouncementBroadcast } from '../dist/persistence/station-announcement-broadcast.js';
import { executionFromRow, executionToRow } from '../dist/executions/executions.service.js';
import { draftFromRow, draftToRow, solutionFromRow, solutionToRow } from '../dist/ai-knowledge/ai-knowledge.service.js';

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();
const WORKSPACE = 'ws-cn-marketing';

/** 留在 app_setting 里的 JSON 配置文档 */
const SETTING_DOCS = [
  'nav-presentation', 'workspace-config', 'ai-brief-email-copy', 'plaza-howto', 'mss-build-stats',
  'business-scenario-catalog', 'external-taxonomy', 'external-tool-layout', 'home-featured', 'org-taxonomy',
  'market-featured', 'warroom-webhook', 'security-policy', 'demo-content',
];
const TABLE_DOCS = [
  'internal-office-scenes', 'station-announcements', 'ai-news', 'audit-log', 'asset-approvals', 'llm-config',
  'ai-news-archive', 'content-engagement', 'inbox', 'ai-news-prefs',
];
const RESOURCE_KINDS = ['prompt', 'workflow', 'knowledge', 'memory'];
const TARGET_TABLES = [
  'officeScene', 'stationAnnouncement', 'aiNewsPost', 'aiNewsFeedItem', 'auditLog', 'assetApproval', 'assetApprovalWatch',
  'llmModelConfig', 'portalContent', 'centerResource', 'execution', 'aiKnowledgeDraft', 'aiKnowledgeSolution', 'chatSession',
];
const COLLECTIONS = ['internal-office-scenes', 'station-announcements', 'portal-content'];

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
class Rollback extends Error {}

/** 读回核对用：去掉空值 / 空数组 / 空对象后按键排序比较（「空值不输出」是约定内的差异） */
function canonical(value) {
  const prune = (input) => {
    if (Array.isArray(input)) return input.map(prune);
    if (!isRecord(input)) return input;
    const out = {};
    for (const key of Object.keys(input).sort()) {
      const item = prune(input[key]);
      if (item === null || item === undefined) continue;
      if (Array.isArray(item) && !item.length) continue;
      if (isRecord(item) && !Object.keys(item).length) continue;
      out[key] = item;
    }
    return out;
  };
  return JSON.stringify(prune(value));
}

/** 按 id 逐条比较，返回不一致的 id */
function diffById(source, stored, key = 'id') {
  const byId = new Map(stored.map((item) => [String(item[key]), canonical(item)]));
  const diffs = source.filter((item) => byId.get(String(item[key])) !== canonical(item)).map((item) => String(item[key]));
  if (stored.length !== source.length) diffs.push(`条数 ${source.length} → ${stored.length}`);
  return diffs;
}

/** 把 center_record 分好类；未知种类和重复的单例文档直接报错 */
function classify(rows) {
  const docs = new Map();
  const groups = { portal: [], resources: [], executions: [], drafts: [], solutions: [] };
  const unknown = [];
  for (const row of rows) {
    const docKind = row.kind.startsWith('doc:') ? row.kind.slice(4) : null;
    if (docKind && (SETTING_DOCS.includes(docKind) || TABLE_DOCS.includes(docKind))) {
      if (docs.has(docKind)) throw new Error(`${row.kind} 有多行（${docs.get(docKind).id}、${row.id}），只应有平台空间那一行`);
      docs.set(docKind, row);
    } else if (row.kind === 'portal-content') groups.portal.push(row);
    else if (RESOURCE_KINDS.includes(row.kind)) groups.resources.push(row);
    else if (row.kind === 'execution') groups.executions.push(row);
    else if (row.kind === 'ai-knowledge-draft') groups.drafts.push(row);
    else if (row.kind === 'ai-knowledge-solution') groups.solutions.push(row);
    else unknown.push(`${row.kind}（${row.id}）`);
  }
  if (unknown.length) throw new Error(`center_record 里有不认识的记录，先确认怎么处理：${unknown.slice(0, 20).join('，')}`);
  if (groups.portal.length > 1) throw new Error(`portal-content 有 ${groups.portal.length} 行，只应有平台空间那一行`);
  return { docs, ...groups };
}

/** 智库的 ownerKey 是 user:<成员 id> 或 guest:<摘要> */
const actorOf = (ownerKey) => ({ key: ownerKey, userId: ownerKey.startsWith('user:') ? ownerKey.slice(5) : undefined });

async function migrate(tx, source, report) {
  const { docs } = source;
  const payload = (kind) => docs.get(kind)?.payload;
  const check = (label, diffs) => report.checks.push([label, diffs]);

  // 配置类文档：原样进 app_setting
  for (const kind of SETTING_DOCS) {
    if (!docs.has(kind)) continue;
    await tx.appSetting.create({ data: { settingKey: kind, value: payload(kind) } });
  }
  const settings = await tx.appSetting.findMany({ where: { settingKey: { in: SETTING_DOCS } } });
  check('配置文档', diffById(
    SETTING_DOCS.filter((kind) => docs.has(kind)).map((kind) => ({ id: kind, value: payload(kind) })),
    settings.map((row) => ({ id: row.settingKey, value: row.value })),
  ));

  // 带版本号的集合：先按接口写入，再把版本号恢复成原文档的，避免客户端缓存的版本号一律冲突
  const restoreRevision = (collection, revision) =>
    tx.collectionRevision.upsert({
      where: { collection },
      create: { collection, revision: Number.isSafeInteger(revision) && revision >= 0 ? revision : 0 },
      update: { revision: Number.isSafeInteger(revision) && revision >= 0 ? revision : 0 },
    });

  if (docs.has('internal-office-scenes')) {
    const doc = payload('internal-office-scenes');
    const entries = Array.isArray(doc?.entries) ? doc.entries : [];
    await writeOfficeScenesDoc(tx, { expectedRevision: 0, entries });
    await restoreRevision('internal-office-scenes', doc?.revision);
    check('办公场景', diffById(entries, (await readOfficeScenesDoc(tx)).entries));
  }

  if (docs.has('station-announcements')) {
    const doc = payload('station-announcements');
    const items = canonicalizeStationAnnouncements(doc).items;
    await writeStationAnnouncements(tx, 0, items);
    await syncStationAnnouncementBroadcast(tx, [], items);
    await restoreRevision('station-announcements', doc?.revision);
    check('站内公告', diffById(items, (await readStationAnnouncements(tx)).items));
  }

  if (docs.has('ai-news')) {
    const items = Array.isArray(payload('ai-news')?.items) ? payload('ai-news').items : [];
    await writeAiNewsDoc(tx, { items });
    check('运营 AI 新闻', diffById(items, (await readAiNewsDoc(tx)).items));
  }

  if (source.portal.length) {
    const doc = source.portal[0].payload;
    const items = Array.isArray(doc?.items) ? doc.items : [];
    await writePortalContent(tx, { items });
    await restoreRevision('portal-content', doc?.revision);
    check('门户内容', diffById(items, (await readPortalContent(tx)).items));
  }

  if (docs.has('asset-approvals')) {
    const doc = payload('asset-approvals');
    const items = Array.isArray(doc?.items) ? doc.items : [];
    const watched = isRecord(doc?.watchedByUserId) ? doc.watchedByUserId : {};
    await writeApprovalsDoc(tx, { items }, '');
    const watchDiffs = [];
    for (const [memberId, list] of Object.entries(watched)) {
      const saved = await writeApprovalsDoc(tx, { items, watchedByUserId: { [memberId]: list } }, memberId);
      const stored = saved.watchedByUserId[memberId] ?? [];
      const expected = Array.isArray(list) ? list.filter(isRecord) : [];
      if (stored.length !== expected.length) watchDiffs.push(`${memberId} 关注 ${expected.length} → ${stored.length}`);
    }
    check('审批单', diffById(items, (await readApprovalsDoc(tx)).items));
    check('审批关注', watchDiffs);
  }

  if (docs.has('audit-log')) {
    const logs = Array.isArray(payload('audit-log')?.logs) ? payload('audit-log').logs : [];
    const cutoff = Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const kept = logs.filter((log) => isRecord(log) && typeof log.id === 'string' && Date.parse(String(log.at ?? '')) >= cutoff);
    report.notes.push(`审计：共 ${logs.length} 条，保留最近 ${AUDIT_RETENTION_DAYS} 天的 ${kept.length} 条`);
    await appendAuditDoc(tx, { logs: kept });
    const stored = await tx.auditLog.count();
    check('审计', stored === new Set(kept.map((log) => log.id.trim())).size ? [] : [`应有 ${kept.length}，实有 ${stored}`]);
  }

  if (docs.has('llm-config')) {
    const doc = payload('llm-config');
    await writeLlmConfigDoc(tx, doc);
    const stored = await readLlmConfigDoc(tx);
    const models = await tx.llmModelConfig.findMany({ select: { apiKey: true } });
    const plain = models.filter((model) => model.apiKey && !model.apiKey.startsWith('enc:v1:')).length;
    check('模型配置', [
      ...(canonical(stored) === canonical(doc) ? [] : ['读回内容不一致']),
      ...(plain ? [`${plain} 个 Key 没有加密`] : []),
    ]);
  }

  if (docs.has('ai-news-archive')) {
    const doc = payload('ai-news-archive');
    await writeAiNewsArchive(tx, { ...doc, items: Array.isArray(doc?.items) ? doc.items : [] });
    const stored = await readAiNewsArchive(tx);
    check('AIHOT 快讯', [
      ...diffById(Array.isArray(doc?.items) ? doc.items : [], stored.items),
      ...(stored.lastSyncAt === doc?.lastSyncAt ? [] : ['同步状态不一致']),
    ]);
  }

  // 原型中心资源：记录 id 就是资源 id
  if (source.resources.length) {
    await tx.centerResource.createMany({ data: source.resources.map((row) => ({ kind: row.kind, id: row.id, payload: row.payload })) });
    const stored = await tx.centerResource.findMany();
    check('中心资源', diffById(
      source.resources.map((row) => ({ id: `${row.kind}:${row.id}`, payload: row.payload })),
      stored.map((row) => ({ id: `${row.kind}:${row.id}`, payload: row.payload })),
    ));
  }

  if (source.executions.length) {
    // 早期记录没有资产字段：按现在新建执行时的规则补默认值
    const records = source.executions.map(({ payload: record }) => ({
      assetId: `chat:${record.chatId || 'unknown'}`,
      assetType: 'unknown',
      ...record,
    }));
    await tx.execution.createMany({ data: records.map(executionToRow) });
    const stored = (await tx.execution.findMany()).map((row) => executionFromRow(row, WORKSPACE));
    check('执行记录', diffById(records.map((record) => ({ ...record, workspaceId: WORKSPACE })), stored));
  }

  if (source.drafts.length || source.solutions.length) {
    const split = ({ ownerKey, ...rest }) => [rest, actorOf(String(ownerKey ?? ''))];
    const drafts = source.drafts.map((row) => split(row.payload));
    const solutions = source.solutions.map((row) => split(row.payload));
    const anonymous = [...drafts, ...solutions].filter(([, actor]) => !actor.key).length;
    if (anonymous) throw new Error(`智库草稿 / 方案里有 ${anonymous} 条没有 ownerKey`);
    await tx.aiKnowledgeDraft.createMany({ data: drafts.map(([draft, actor]) => draftToRow(draft, actor)) });
    await tx.aiKnowledgeSolution.createMany({ data: solutions.map(([solution, actor]) => solutionToRow(solution, actor)) });
    check('智库草稿', diffById(drafts.map(([draft]) => draft), (await tx.aiKnowledgeDraft.findMany()).map(draftFromRow)));
    check('智库方案', diffById(solutions.map(([solution]) => solution), (await tx.aiKnowledgeSolution.findMany()).map(solutionFromRow)));
  }

  // 会话：从工作区目录搬进 chat_session，目录里删掉
  const workspace = await tx.appSetting.findUnique({ where: { settingKey: 'workspace' } });
  const catalog = isRecord(workspace?.value?.catalog) ? workspace.value.catalog : {};
  if (isRecord(catalog.chats)) {
    const { chats, ...rest } = catalog;
    await importChats(tx, chats);
    await tx.appSetting.update({
      where: { settingKey: 'workspace' },
      data: { value: { ...workspace.value, catalog: rest }, revision: { increment: 1 } },
    });
    const stored = (await tx.chatSession.findMany()).map(chatFromRow);
    check('会话', diffById(Object.entries(chats).map(([id, chat]) => ({ ...chat, id })), stored));
  }

  // 旧站内信文档：8 月起前端改读 inbox_message，这份文档已不再展示也没迁过；
  // 并入会把两个月前的旧通知当未读重新推给所有人（站内公告还会重复），所以列出后丢弃，备份里仍有
  const inbox = Array.isArray(payload('inbox')?.messages) ? payload('inbox').messages : [];
  if (inbox.length) {
    report.notes.push(`旧站内信文档：${inbox.length} 条，已停用两个月，丢弃：`);
    for (const message of inbox.filter(isRecord)) {
      report.notes.push(`    ${String(message.createdAt ?? '').slice(0, 10)} → ${message.toUserId ?? '?'}  ${String(message.title ?? '').slice(0, 40)}`);
    }
  }

  // 旧互动文档：没导入过（无 normalizedAt）才把现存内容的计数导入，已有计数的不覆盖
  const engagement = payload('content-engagement');
  if (isRecord(engagement) && !engagement.normalizedAt) {
    const known = await new PersistenceService(tx).knownMarketEngagementContentIds(WORKSPACE);
    const legacy = isRecord(engagement.byId) ? engagement.byId : isRecord(engagement.map) ? engagement.map : {};
    const count = (value) => {
      const parsed = Number(value ?? 0);
      return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
    };
    let imported = 0;
    for (const [contentId, value] of Object.entries(legacy)) {
      if (!known.has(contentId) || !isRecord(value)) continue;
      const at = new Date(value.updatedAt ?? Date.now());
      const created = await tx.marketEngagement.createMany({
        data: [{
          contentId,
          views: count(value.views ?? value.uses),
          uses: count(value.uses),
          likes: count(value.likes),
          dislikes: count(value.dislikes),
          downloads: count(value.downloads),
          favorites: count(value.favorites),
          updatedAt: Number.isNaN(at.getTime()) ? new Date() : at,
        }],
        skipDuplicates: true,
      });
      imported += created.count;
    }
    report.notes.push(`旧互动文档：${Object.keys(legacy).length} 条，导入 ${imported} 条（不存在的内容和已有计数的跳过）`);
  } else if (engagement) {
    report.notes.push('旧互动文档：之前已导入过，直接丢弃');
  }
  if (docs.has('ai-news-prefs')) report.notes.push('ai-news-prefs：从未使用，丢弃');

  await tx.$executeRawUnsafe('DROP TABLE center_record');
}

async function main() {
  if (!(await centerRecordTableExists(prisma))) {
    console.log('center_record 已不存在，第 6 期已经迁移过（或这是全新库），无需执行。');
    return;
  }
  const rows = await centerRecord(prisma).findMany();
  const source = classify(rows);
  const workspace = await prisma.appSetting.findUnique({ where: { settingKey: 'workspace' } });
  const chats = workspace?.value?.catalog?.chats;

  console.log(`center_record 共 ${rows.length} 行：`);
  const byKind = new Map();
  for (const row of rows) byKind.set(row.kind, (byKind.get(row.kind) ?? 0) + 1);
  for (const [kind, n] of [...byKind].sort(([a], [b]) => a.localeCompare(b))) console.log(`  ${kind.padEnd(34)} ${n}`);
  console.log(`工作区目录里的会话：${isRecord(chats) ? Object.keys(chats).length : 0} 个`);

  const nonEmpty = [];
  for (const model of TARGET_TABLES) {
    const n = await prisma[model].count();
    if (n) nonEmpty.push(`${model} ${n}`);
  }
  const settingClash = await prisma.appSetting.findMany({
    where: { settingKey: { in: [...SETTING_DOCS, 'llm-selection', 'ai-news-feed.sync'] } },
    select: { settingKey: true },
  });
  if (settingClash.length) nonEmpty.push(`app_setting 已有 ${settingClash.map((row) => row.settingKey).join('、')}`);
  const revisions = await prisma.collectionRevision.findMany({ where: { collection: { in: COLLECTIONS } } });
  if (revisions.length) nonEmpty.push(`collection_revision 已有 ${revisions.map((row) => row.collection).join('、')}`);
  if (nonEmpty.length) {
    throw new Error(`目标表不是空的（${nonEmpty.join('；')}）。多半是新版 API 在迁移前启动过并写入了默认数据：从备份恢复后停掉 API 再执行。`);
  }

  const report = { checks: [], notes: [] };
  try {
    await prisma.$transaction(async (tx) => {
      await migrate(tx, source, report);
      const failed = report.checks.filter(([, diffs]) => diffs.length);
      if (failed.length || !apply) throw new Rollback();
    }, { maxWait: 60_000, timeout: 600_000 });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }

  console.log('\n读回核对：');
  for (const [label, diffs] of report.checks) {
    console.log(`  ${label.padEnd(12)} ${diffs.length ? `不一致：${diffs.slice(0, 10).join('，')}${diffs.length > 10 ? ` 等 ${diffs.length} 处` : ''}` : '一致'}`);
  }
  for (const note of report.notes) console.log(`  ${note}`);
  const failed = report.checks.some(([, diffs]) => diffs.length);
  if (failed) throw new Error('读回核对有不一致，已整体回滚，未改动数据');
  console.log(apply ? '\n完成，center_record 已删除。' : '\n预览完成（已回滚，未改动数据）。确认无误后加 --apply 执行。');
}

main()
  .catch((error) => {
    console.error(`\n失败：${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
