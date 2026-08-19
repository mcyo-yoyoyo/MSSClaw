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

/** 优先使用进程环境，否则从 apps/api/.env 解析 DATABASE_URL。 */
function resolveDatabase() {
  const prismaDir = join(repoRoot, 'apps', 'api', 'prisma');
  const envPath = join(repoRoot, 'apps', 'api', '.env');
  let value = process.env.DATABASE_URL?.trim();
  if (!value) {
    if (!existsSync(envPath)) {
      throw new Error(`未找到 ${envPath}，无法确定数据库位置`);
    }
    const raw = readFileSync(envPath, 'utf8');
    const line = raw.split(/\r?\n/).find((l) => l.trim().startsWith('DATABASE_URL'));
    if (!line) throw new Error('apps/api/.env 里没有 DATABASE_URL');
    value = line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
  }

  if (!value.startsWith('file:')) throw new Error(`只支持 sqlite（file:），当前是 ${value}`);
  // Prisma 的相对路径以 schema 所在目录为基准；标准 file:// URL 也一并支持。
  const dbPath = value.startsWith('file://')
    ? fileURLToPath(value)
    : resolve(prismaDir, value.slice('file:'.length));
  return {
    dbPath,
    datasourceUrl: `file:${dbPath.replaceAll('\\', '/')}`,
  };
}

/**
 * 备份前必须先把 WAL 落盘。SQLite 开着 WAL 时最近的写入还留在 dev.db-wal 里，
 * 只复制主库文件会得到一个不完整的快照；同样地，还原时若 -wal 还在，
 * 打开数据库会重放 WAL，把刚还原的内容再次覆盖掉。
 */
async function backup(prisma, dbPath) {
  await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)');
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
  const dir = join(repoRoot, 'deploy', 'windows', 'backup');
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, `db-before-clear-${stamp}.db`);
  copyFileSync(dbPath, dest);
  return dest;
}

const { dbPath, datasourceUrl } = resolveDatabase();
if (!existsSync(dbPath)) throw new Error(`数据库文件不存在：${dbPath}`);
console.log(`数据库：${dbPath}`);
console.log(`模式  ：${apply ? '实际执行' : '预览（不改动数据）'}`);
console.log(`范围  ：${onlyWorkspace || '全部工作区'}｜${keepContent ? '仅清互动数据' : '删 Skill/Agent 本体 + 清互动数据'}`);
console.log('');

// 复用 api workspace 已安装并生成的 Prisma Client
let PrismaClient;
try {
  ({ PrismaClient } = require('@prisma/client'));
} catch {
  console.error('未找到 @prisma/client。请先在仓库根目录执行：npm install');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasourceUrl,
});
const workspaceWhere = onlyWorkspace ? { workspaceId: onlyWorkspace } : undefined;

async function main() {
  /** 统计将要影响的行数 */
  const [marketEngagementCount, marketUserInteractionCount] = await Promise.all([
    prisma.marketEngagement.count({ where: workspaceWhere }),
    prisma.marketUserInteraction.count({ where: workspaceWhere }),
  ]);
  const counts = {
    MarketEngagement: marketEngagementCount,
    MarketUserInteraction: marketUserInteractionCount,
  };

  const docKinds = ['doc:content-engagement', 'doc:market-recent', 'doc:market-favorites'];
  const contentKinds = ['skill', 'agent'];

  const docRows = await prisma.centerRecord.findMany({
    where: { kind: { in: docKinds }, ...workspaceWhere },
    select: { id: true, kind: true, workspaceId: true },
  });

  const contentRows = keepContent
    ? []
    : await prisma.centerRecord.findMany({
        where: { kind: { in: contentKinds }, ...workspaceWhere },
        select: { id: true, kind: true, workspaceId: true },
      });

  const marketRows = await prisma.centerRecord.findMany({
    where: { kind: 'marketplace', ...workspaceWhere },
    select: { id: true, workspaceId: true, payload: true },
  });

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
    return;
  }

  // API 在跑时清库很危险：它进程内的写入会在之后覆盖清理结果
  const wal = `${dbPath}-wal`;
  if (existsSync(wal) && statSync(wal).size > 0) {
    console.error('检测到活动的 WAL 文件，说明可能仍有进程在使用数据库。');
    console.error('请先停掉 API 服务再执行清理，否则清理结果会被覆盖。');
    console.error(`（若确认服务已停，可删除 ${wal} 后重试）`);
    process.exitCode = 1;
    return;
  }

  const backupPath = await backup(prisma, dbPath);
  console.log(`已备份数据库 → ${backupPath}`);

  await prisma.$transaction(async (tx) => {
    await tx.marketEngagement.deleteMany({ where: workspaceWhere });
    await tx.marketUserInteraction.deleteMany({ where: workspaceWhere });

    // 互动类 doc 记录清成空对象，而不是删行——前端 hydrate 读不到会走兜底逻辑
    const contentEngagementIds = docRows.filter((row) => row.kind === 'doc:content-engagement').map((row) => row.id);
    const listDocIds = docRows.filter((row) => row.kind !== 'doc:content-engagement').map((row) => row.id);
    if (contentEngagementIds.length > 0) {
      await tx.centerRecord.updateMany({
        where: { id: { in: contentEngagementIds } },
        data: { payload: {} },
      });
    }
    if (listDocIds.length > 0) {
      await tx.centerRecord.updateMany({
        where: { id: { in: listDocIds } },
        data: { payload: [] },
      });
    }

    if (!keepContent && contentRows.length > 0) {
      await tx.centerRecord.deleteMany({
        where: { id: { in: contentRows.map((row) => row.id) } },
      });
    }

    if (!keepContent) {
      for (const row of marketRows) {
        const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
        payload.skills = [];
        payload.agents = [];
        await tx.centerRecord.update({
          where: { id: row.id },
          data: { payload },
        });
      }
    }
  });

  await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)');

  console.log('');
  console.log('清理完成。请启动 API 服务，并让浏览器强制刷新（Ctrl+F5）。');
  console.log('');
  console.log('如需回滚（务必按顺序）：');
  console.log('  1. 停掉 API 服务');
  console.log(`  2. 删除 ${dbPath}-wal 和 ${dbPath}-shm（若存在）`);
  console.log(`  3. 复制 ${backupPath} 覆盖 ${dbPath}`);
  console.log('  4. 启动 API');
  console.log('  跳过第 2 步会导致 WAL 重放，还原后数据仍是空的。');
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
