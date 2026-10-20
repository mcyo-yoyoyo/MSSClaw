// 测试用临时 PG schema：建 schema → 跑 prisma 迁移 → 用完删掉。
// 连接串取 TEST_DATABASE_URL，其次 DATABASE_URL，都没有时用本机 docker（deploy/docker-compose.infra.yml）。
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
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

export async function createTestDatabase(label = 'test') {
  const schema = `test_${label.replace(/\W/g, '_')}_${randomBytes(4).toString('hex')}`;
  const url = new URL(baseUrl());
  url.searchParams.set('schema', schema);
  const migration = spawnSync(PRISMA_CLI, ['migrate', 'deploy'], {
    cwd: API_DIR,
    env: { ...process.env, DATABASE_URL: url.toString() },
    encoding: 'utf8',
  });
  if (migration.status !== 0) {
    throw new Error(`临时库迁移失败：\n${migration.stderr || migration.stdout}`);
  }
  return {
    url: url.toString(),
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
