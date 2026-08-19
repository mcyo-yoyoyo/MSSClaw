#!/usr/bin/env node
/**
 * 清空 Skill Hub / Agent Hub 内容与全部互动数据。
 *
 * 会做的事：
 *   1. 删除全部 Skill / Agent 本体（marketplace 聚合 + 散落的单条记录）
 *   2. 清空点赞 / 点踩 / 查看 / 收藏 / 下载 / 使用 计数（含工具）
 *   3. 清空最近浏览与收藏列表
 *
 * 不会动：工具、知识库、工作流、审批记录、成员、登录凭据、AI 快讯归档。
 *
 * 为什么要删「散落的单条记录」：后端 getMarketplace 发现 marketplace 记录缺失时，
 * 会从 kind IN (agent, skill, tool, workflow, knowledge) 的单条记录重建聚合。
 * 只清聚合、不删单条，将来一旦触发重建，Skill/Agent 就会全部复活。
 *
 * 用法（在仓库根目录）：
 *   node deploy/windows/clear-hub-data.mjs            预览，不改动任何数据
 *   node deploy/windows/clear-hub-data.mjs --apply    实际执行（会先自动备份数据库）
 *
 * 可选参数：
 *   --workspace=<id>   只处理指定工作区，默认全部
 *   --keep-content     只清互动数据，保留 Skill/Agent 本体
 */

import { existsSync, copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const keepContent = args.includes('--keep-content');
const onlyWorkspace = args.find((a) => a.startsWith('--workspace='))?.split('=')[1];

/** 从 apps/api/.env 解析 DATABASE_URL，拿到 sqlite 实际文件路径 */
function resolveDbPath() {
  const envPath = join(repoRoot, 'apps', 'api', '.env');
  if (!existsSync(envPath)) {
    throw new Error(`未找到 ${envPath}，无法确定数据库位置`);
  }
  const raw = readFileSync(envPath, 'utf8');
  const line = raw.split(/\r?\n/).find((l) => l.trim().startsWith('DATABASE_URL'));
  if (!line) throw new Error('apps/api/.env 里没有 DATABASE_URL');
  const value = line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
  if (!value.startsWith('file:')) throw new Error(`只支持 sqlite（file:），当前是 ${value}`);
  // Prisma 的相对路径以 schema 所在目录为基准
  const rel = value.slice('file:'.length);
  return resolve(join(repoRoot, 'apps', 'api', 'prisma'), rel);
}

/**
 * 备份前必须先把 WAL 落盘。SQLite 开着 WAL 时最近的写入还留在 dev.db-wal 里，
 * 只复制主库文件会得到一个不完整的快照；同样地，还原时若 -wal 还在，
 * 打开数据库会重放 WAL，把刚还原的内容再次覆盖掉。
 */
function backup(db, dbPath) {
  db.pragma('wal_checkpoint(TRUNCATE)');
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
  const dir = join(repoRoot, 'deploy', 'windows', 'backup');
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, `db-before-clear-${stamp}.db`);
  copyFileSync(dbPath, dest);
  return dest;
}

const dbPath = resolveDbPath();
if (!existsSync(dbPath)) throw new Error(`数据库文件不存在：${dbPath}`);
console.log(`数据库：${dbPath}`);
console.log(`模式  ：${apply ? '实际执行' : '预览（不改动数据）'}`);
console.log(`范围  ：${onlyWorkspace || '全部工作区'}｜${keepContent ? '仅清互动数据' : '删 Skill/Agent 本体 + 清互动数据'}`);
console.log('');

// 复用 api workspace 已安装的 better-sqlite3；没有则退回 Prisma Client
let db;
try {
  const Database = require(join(repoRoot, 'node_modules', 'better-sqlite3'));
  db = new Database(dbPath);
} catch {
  console.error('未找到 better-sqlite3。请先在仓库根目录执行：npm i -D better-sqlite3');
  process.exit(1);
}

const wsFilter = onlyWorkspace ? ' where workspaceId = ?' : '';
const wsArgs = onlyWorkspace ? [onlyWorkspace] : [];

/** 统计将要影响的行数 */
const counts = {
  MarketEngagement: db.prepare(`select count(*) c from MarketEngagement${wsFilter}`).get(...wsArgs).c,
  MarketUserInteraction: db.prepare(`select count(*) c from MarketUserInteraction${wsFilter}`).get(...wsArgs).c,
};

const docKinds = ['doc:content-engagement', 'doc:market-recent', 'doc:market-favorites'];
const contentKinds = ['skill', 'agent'];

const docRows = db
  .prepare(
    `select id, kind, workspaceId from CenterRecord where kind in (${docKinds.map(() => '?').join(',')})${onlyWorkspace ? ' and workspaceId = ?' : ''}`,
  )
  .all(...docKinds, ...wsArgs);

const contentRows = keepContent
  ? []
  : db
      .prepare(
        `select id, kind, workspaceId from CenterRecord where kind in (${contentKinds.map(() => '?').join(',')})${onlyWorkspace ? ' and workspaceId = ?' : ''}`,
      )
      .all(...contentKinds, ...wsArgs);

const marketRows = db
  .prepare(`select id, workspaceId, payload from CenterRecord where kind = 'marketplace'${onlyWorkspace ? ' and workspaceId = ?' : ''}`)
  .all(...wsArgs);

console.log('将要清理：');
console.log(`  MarketEngagement       ${counts.MarketEngagement} 行（点赞/点踩/查看/收藏/下载/使用 计数）`);
console.log(`  MarketUserInteraction  ${counts.MarketUserInteraction} 行（每个用户的投票与收藏状态）`);
console.log(`  互动相关 doc 记录       ${docRows.length} 条（content-engagement / market-recent / market-favorites）`);
if (!keepContent) {
  const skillCount = contentRows.filter((r) => r.kind === 'skill').length;
  const agentCount = contentRows.filter((r) => r.kind === 'agent').length;
  console.log(`  Skill 单条记录          ${skillCount} 条`);
  console.log(`  Agent 单条记录          ${agentCount} 条`);
}
console.log('');
console.log('marketplace 聚合（工具保留，只清 skills / agents）：');
for (const row of marketRows) {
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
  console.log(
    `  ${row.workspaceId.padEnd(22)} skills ${String((payload.skills || []).length).padStart(3)} → 0` +
      `｜agents ${String((payload.agents || []).length).padStart(3)} → 0` +
      `｜tools ${String((payload.tools || []).length).padStart(3)}（保留）`,
  );
}
console.log('');

if (!apply) {
  console.log('以上为预览。确认无误后加 --apply 实际执行：');
  console.log('  node deploy\\windows\\clear-hub-data.mjs --apply');
  process.exit(0);
}

// API 在跑时清库很危险：它进程内的写入会在之后覆盖清理结果
const wal = `${dbPath}-wal`;
if (existsSync(wal) && statSync(wal).size > 0) {
  console.error('检测到活动的 WAL 文件，说明可能仍有进程在使用数据库。');
  console.error('请先停掉 API 服务再执行清理，否则清理结果会被覆盖。');
  console.error(`（若确认服务已停，可删除 ${wal} 后重试）`);
  process.exit(1);
}

const backupPath = backup(db, dbPath);
console.log(`已备份数据库 → ${backupPath}`);

const run = db.transaction(() => {
  db.prepare(`delete from MarketEngagement${wsFilter}`).run(...wsArgs);
  db.prepare(`delete from MarketUserInteraction${wsFilter}`).run(...wsArgs);

  // 互动类 doc 记录清成空对象，而不是删行——前端 hydrate 读不到会走兜底逻辑
  const emptyDoc = db.prepare('update CenterRecord set payload = ? where id = ?');
  for (const row of docRows) {
    emptyDoc.run(row.kind === 'doc:content-engagement' ? '{}' : '[]', row.id);
  }

  if (!keepContent) {
    const delContent = db.prepare('delete from CenterRecord where id = ?');
    for (const row of contentRows) delContent.run(row.id);
  }

  const updMarket = db.prepare('update CenterRecord set payload = ? where id = ?');
  for (const row of marketRows) {
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    if (!keepContent) {
      payload.skills = [];
      payload.agents = [];
    }
    updMarket.run(JSON.stringify(payload), row.id);
  }
});

run();
db.pragma('wal_checkpoint(TRUNCATE)');
db.close();

console.log('');
console.log('清理完成。请启动 API 服务，并让浏览器强制刷新（Ctrl+F5）。');
console.log('');
console.log('如需回滚（务必按顺序）：');
console.log('  1. 停掉 API 服务');
console.log(`  2. 删除 ${dbPath}-wal 和 ${dbPath}-shm（若存在）`);
console.log(`  3. 复制 ${backupPath} 覆盖 ${dbPath}`);
console.log('  4. 启动 API');
console.log('  跳过第 2 步会导致 WAL 重放，还原后数据仍是空的。');
