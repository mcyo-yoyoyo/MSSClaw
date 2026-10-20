// 单租户：请求里带的 workspaceId 一律忽略，只认平台空间的成员与密码。跑在临时 PG schema 上。
import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PlatformDocsService } from '../dist/persistence/platform-docs.service.js';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';

const WS = 'ws-cn-marketing';
let database;
let prisma;

/** 平台只有一个空间：mcyo 已设强密码，且关闭演示口令 */
before(async () => {
  database = await createTestDatabase('auth_isolation');
  prisma = new PrismaClient({ datasourceUrl: database.url });
  const salt = randomBytes(8).toString('hex');
  await prisma.member.create({
    data: { id: 'm-mcyo', name: 'mcyo', email: 'mcyo@huawei.com', role: 'super_admin' },
  });
  await prisma.memberCredential.create({
    data: {
      memberId: 'm-mcyo',
      salt,
      passwordHash: createHash('sha256').update(`${salt}:Str0ng-Real-Password`, 'utf8').digest('hex'),
      passwordUpdatedAt: new Date(),
    },
  });
  await prisma.appSetting.create({ data: { settingKey: 'auth-policy', value: { allowDemoPassword: false } } });
});

after(async () => {
  await prisma?.$disconnect();
  await database?.drop();
});

const service = () => new PlatformDocsService(prisma, { recordDailyLogin: async () => {} });

test('请求里编造的 workspaceId 被忽略：只能登录平台空间', async () => {
  const demo = await service().login({ email: 'mcyo@huawei.com', password: 'mssclaw', workspaceId: 'ws-attacker-1' });
  assert.equal(demo.ok, false, '平台空间已设强密码，演示口令不能借别的空间名登进来');

  const real = await service().login({
    email: 'mcyo@huawei.com',
    password: 'Str0ng-Real-Password',
    workspaceId: 'ws-attacker-1',
  });
  assert.equal(real.ok, true);
  assert.equal(real.user.workspaceId, WS);
  assert.equal(await prisma.member.count(), 1, '不会因为陌生的 workspaceId 多出成员');
});

test('平台空间内的会话校验保持原样', async () => {
  const session = await service().login({ email: 'mcyo@huawei.com', password: 'Str0ng-Real-Password' });
  assert.equal(session.ok, true);

  const me = await service().me(session.token);
  assert.equal(me.ok, true);
  assert.equal(me.user.workspaceId, WS);
  assert.equal((await service().me(session.token, 'ws-attacker-2')).user.workspaceId, WS);
});
