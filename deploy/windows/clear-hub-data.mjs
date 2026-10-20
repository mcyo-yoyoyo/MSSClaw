#!/usr/bin/env node
/**
 * 清空 Skill Hub / Agent Hub 内容与全部互动数据（PostgreSQL）。
 *
 * 会做的事：
 *   1. 删除全部 Skill / Agent（skill、agent 表；Skill 版本与 Agent 编排随之级联删除）
 *   2. 清空点赞 / 点踩 / 查看 / 收藏 / 下载 / 使用 计数（含工具）
 *   3. 清空最近浏览与收藏列表
 *
 * 不会动：工具、知识库、自动化、审批记录、成员、登录凭据、AI 快讯归档、行为事件（看板趋势）。
 *
 * 用法（在仓库根目录，执行前先停掉 API 服务）：
 *   node deploy/windows/clear-hub-data.mjs            预览，不改动任何数据
 *   node deploy/windows/clear-hub-data.mjs --apply    实际执行（先备份数据库，备份失败则不执行）
 *
 * 可选参数：
 *   --keep-content     只清互动数据，保留 Skill/Agent 本体
 *
 * 数据库取 DATABASE_URL（进程环境优先，否则读 apps/api/.env），必须是 postgresql:// 连接串，
 * 只处理连接串 schema 参数指定的 schema（默认 public）。
 *
 * 备份：改动前用 pg_dump -Fc 把该 schema 导出到 deploy/windows/backup/。优先用本机 pg_dump
 * 直连 DATABASE_URL；本机没有或失败时，改用 deploy/docker-compose.infra.yml 里 postgres 容器
 * 自带的 pg_dump，并先核对容器与 DATABASE_URL 是同一个 PG 实例，防止备到别的库。
 * 两种都失败就拒绝执行。全部改动在一个事务里；回滚用 pg_restore，命令在执行完成后打印。
 */

import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const composeExec = ['compose', '-f', join(repoRoot, 'deploy', 'docker-compose.infra.yml'), 'exec', '-T', 'postgres'];
// --clean 先删掉该 schema 里的表再按备份重建；--single-transaction 中途失败则整体不生效
const restoreFlags = '--clean --if-exists --single-transaction';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const keepContent = args.includes('--keep-content');

/** 优先使用进程环境，否则从 apps/api/.env 解析 DATABASE_URL。 */
function resolveDatabase() {
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

  // 只打印协议部分，连接串里有口令
  if (!/^postgres(ql)?:\/\//.test(value)) {
    throw new Error(`只支持 PostgreSQL（postgresql://），当前是 ${value.slice(0, value.indexOf(':') + 1) || value}`);
  }
  const url = new URL(value);
  return {
    datasourceUrl: value,
    host: url.hostname.replace(/^\[|\]$/g, '') || 'localhost',
    port: url.port || '5432',
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    schema: url.searchParams.get('schema') || 'public',
  };
}

/** 同步跑命令，失败时抛出带 stderr 的错误。 */
function run(cmd, cmdArgs, options = {}) {
  const result = spawnSync(cmd, cmdArgs, { encoding: 'utf8', ...options });
  if (result.error) throw new Error(`${cmd}：${result.error.message}`);
  if (result.status !== 0) throw new Error(`${cmd} 退出码 ${result.status}：${(result.stderr || '').trim()}`);
  return result.stdout;
}

/** 本机 pg_dump 直连 DATABASE_URL。返回回滚命令（在仓库根目录执行）。 */
function dumpWithLocalPgDump(db, dest) {
  run('pg_dump', ['-Fc', '-w', '-h', db.host, '-p', db.port, '-U', db.user, '-n', db.schema, '-f', dest, db.database], {
    env: { ...process.env, PGPASSWORD: db.password },
  });
  return [`pg_restore ${restoreFlags} -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.database} "${dest}"`];
}

/** 用 infra compose 里 postgres 容器的 pg_dump。返回回滚命令（在仓库根目录执行）。 */
async function dumpWithDockerPgDump(db, dest) {
  // 容器未必就是 DATABASE_URL 指向的实例（库可能在另一台机器，或本机还有别的 PG），备错库等于没备
  const sql = 'select system_identifier::text as id from pg_control_system()';
  const [{ id: expected }] = await prisma.$queryRawUnsafe(sql);
  const actual = run('docker', [...composeExec, 'psql', '-U', db.user, '-d', db.database, '-Atc', sql]).trim();
  if (actual !== expected) {
    throw new Error(`docker 里的 postgres（实例 ${actual}）不是 DATABASE_URL 指向的实例（${expected}）`);
  }
  const fd = openSync(dest, 'w');
  try {
    run('docker', [...composeExec, 'pg_dump', '-Fc', '-U', db.user, '-n', db.schema, db.database], {
      stdio: ['ignore', fd, 'pipe'],
    });
  } finally {
    closeSync(fd);
  }
  // 不用 < 重定向：PowerShell 不支持
  return [
    `docker compose -f deploy/docker-compose.infra.yml cp "${dest}" postgres:/tmp/restore.dump`,
    `docker compose -f deploy/docker-compose.infra.yml exec -T postgres pg_restore ${restoreFlags} -U ${db.user} -d ${db.database} /tmp/restore.dump`,
  ];
}

async function backup(db) {
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const dir = join(repoRoot, 'deploy', 'windows', 'backup');
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, `db-before-clear-${stamp}.dump`);
  const failures = [];
  for (const dump of [dumpWithLocalPgDump, dumpWithDockerPgDump]) {
    try {
      const restoreCommands = await dump(db, dest);
      if (statSync(dest).size === 0) throw new Error('备份文件为空');
      return { backupPath: dest, restoreCommands };
    } catch (error) {
      failures.push(error.message);
      rmSync(dest, { force: true });
    }
  }
  throw new Error(`无法备份数据库，未做任何改动：\n  ${failures.join('\n  ')}`);
}

const db = resolveDatabase();
console.log(`数据库：${db.user}@${db.host}:${db.port}/${db.database}（schema ${db.schema}）`);
console.log(`模式  ：${apply ? '实际执行' : '预览（不改动数据）'}`);
console.log(`范围  ：${keepContent ? '仅清互动数据' : '删 Skill/Agent 本体 + 清互动数据'}`);
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
  datasourceUrl: db.datasourceUrl,
});

async function main() {
  /** 统计将要影响的行数 */
  const [marketEngagementCount, marketUserInteractionCount] = await Promise.all([
    prisma.marketEngagement.count(),
    prisma.marketUserInteraction.count(),
  ]);
  const counts = {
    MarketEngagement: marketEngagementCount,
    MarketUserInteraction: marketUserInteractionCount,
  };

  const docKinds = ['doc:content-engagement', 'doc:market-recent', 'doc:market-favorites'];

  const docRows = await prisma.centerRecord.findMany({
    where: { kind: { in: docKinds } },
    select: { id: true, kind: true },
  });

  const [skillCount, agentCount, toolCount] = await Promise.all([
    prisma.skill.count(),
    prisma.agent.count(),
    prisma.tool.count(),
  ]);

  console.log('将要清理：');
  console.log(`  MarketEngagement       ${counts.MarketEngagement} 行（点赞/点踩/查看/收藏/下载/使用 计数）`);
  console.log(`  MarketUserInteraction  ${counts.MarketUserInteraction} 行（每个用户的投票与收藏状态）`);
  console.log(`  互动相关 doc 记录       ${docRows.length} 条（content-engagement / market-recent / market-favorites）`);
  if (!keepContent) {
    console.log(`  Skill                  ${skillCount} 条（连同版本记录）`);
    console.log(`  Agent                  ${agentCount} 条（连同编排的 Skill 列表）`);
  }
  console.log(`  工具                   ${toolCount} 条（保留）`);
  console.log('');

  if (!apply) {
    console.log('以上为预览。确认无误后先停掉 API 服务，再加 --apply 实际执行：');
    console.log('  node deploy\\windows\\clear-hub-data.mjs --apply');
    return;
  }

  let backupResult;
  try {
    backupResult = await backup(db);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  const { backupPath, restoreCommands } = backupResult;
  console.log(`已备份数据库 → ${backupPath}`);

  await prisma.$transaction(async (tx) => {
    await tx.marketEngagement.deleteMany();
    await tx.marketUserInteraction.deleteMany();

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

    if (!keepContent) {
      // skill_version、agent_skill 外键级联删除
      await tx.skill.deleteMany();
      await tx.agent.deleteMany();
    }
  });

  console.log('');
  console.log('清理完成。请启动 API 服务，并让浏览器强制刷新（Ctrl+F5）。');
  console.log('');
  console.log('如需回滚：');
  console.log('  1. 停掉 API 服务');
  console.log('  2. 在仓库根目录执行：');
  for (const command of restoreCommands) console.log(`       ${command}`);
  console.log('  3. 启动 API');
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
