// 测试用临时 PG schema：建 schema → 跑 prisma 迁移 → 用完删掉。
// 连接串取 TEST_DATABASE_URL，其次 DATABASE_URL，都没有时用本机 docker（deploy/docker-compose.infra.yml）。
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const API_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PRISMA_CLI = resolve(API_DIR, '../../node_modules/.bin/prisma');
const LOCAL_DEFAULT = 'postgresql://mssclaw:mssclaw_dev@127.0.0.1:5432/mssclaw';

function baseUrl() {
  const raw = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || LOCAL_DEFAULT;
  if (!raw.startsWith('postgres')) {
    throw new Error(`测试需要 PostgreSQL 连接串，当前为 ${raw.split(':')[0]}；请设置 TEST_DATABASE_URL`);
  }
  return raw;
}

function migrateDeploy(url, schemaPath) {
  const result = spawnSync(PRISMA_CLI, ['migrate', 'deploy', ...(schemaPath ? ['--schema', schemaPath] : [])], {
    cwd: API_DIR,
    env: { ...process.env, DATABASE_URL: url },
    encoding: 'utf8',
  });
  return result.status === 0 ? null : result.stderr || result.stdout;
}

/** 只复制 stopBefore 之前的迁移，用来在旧表结构上造数据、再验证新迁移的数据转换 */
function migrationsBefore(stopBefore) {
  const dir = mkdtempSync(join(tmpdir(), 'mssclaw-migrations-'));
  const source = resolve(API_DIR, 'prisma');
  cpSync(join(source, 'schema.prisma'), join(dir, 'schema.prisma'));
  cpSync(join(source, 'migrations', 'migration_lock.toml'), join(dir, 'migrations', 'migration_lock.toml'));
  for (const name of readdirSync(join(source, 'migrations'))) {
    if (name.endsWith('.toml') || name >= stopBefore) continue;
    cpSync(join(source, 'migrations', name), join(dir, 'migrations', name), { recursive: true });
  }
  return dir;
}

/**
 * options.stopBefore：迁移只跑到这个目录名之前；返回的 applyRemaining() 再跑剩下的，
 * 失败时返回 prisma 的输出（迁移里的 RAISE EXCEPTION 文案在其中），成功返回 null。
 */
export async function createTestDatabase(label = 'test', options = {}) {
  const schema = `test_${label.replace(/\W/g, '_')}_${randomBytes(4).toString('hex')}`;
  const url = new URL(baseUrl());
  url.searchParams.set('schema', schema);
  let error;
  if (options.stopBefore) {
    const dir = migrationsBefore(options.stopBefore);
    error = migrateDeploy(url.toString(), join(dir, 'schema.prisma'));
    rmSync(dir, { recursive: true, force: true });
  } else {
    error = migrateDeploy(url.toString());
  }
  if (error) throw new Error(`临时库迁移失败：\n${error}`);
  return {
    url: url.toString(),
    applyRemaining() {
      return migrateDeploy(url.toString());
    },
    async drop() {
      const admin = new PrismaClient({ datasourceUrl: baseUrl() });
      try {
        await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      } finally {
        await admin.$disconnect();
      }
    },
  };
}
