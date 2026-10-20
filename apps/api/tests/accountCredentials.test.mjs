import assert from 'node:assert/strict';
import test, { after, before, beforeEach } from 'node:test';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PlatformDocsService } from '../dist/persistence/platform-docs.service.js';
import { PlatformDocsController } from '../dist/persistence/platform-docs.controller.js';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';

function hashPassword(password, salt) {
  return createHash('sha256').update(`${salt}:${password}`, 'utf8').digest('hex');
}

function credentialFor(password) {
  const salt = randomBytes(8).toString('hex');
  return { salt, hash: hashPassword(password, salt), updatedAt: '2026-01-01T00:00:00.000Z' };
}

const WS = 'ws-cn-marketing';
let database;
let prisma;

before(async () => {
  database = await createTestDatabase('account_credentials');
  prisma = new PrismaClient({ datasourceUrl: database.url });
});

after(async () => {
  await prisma?.$disconnect();
  await database?.drop();
});

beforeEach(async () => {
  for (const table of ['auth_session', 'member_credential', 'member', 'collection_revision', 'app_setting']) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
});

const service = () => new PlatformDocsService(prisma, { recordDailyLogin: async () => {} });

async function seedMembers(members, revision = 0) {
  await prisma.member.createMany({
    data: members.map((member, position) => ({
      id: member.id,
      name: member.name,
      email: member.email.trim().toLowerCase().replace(/@company\.com$/, '@huawei.com'),
      role: member.role ?? 'business_user',
      status: member.status ?? 'active',
      position,
    })),
  });
  if (revision) await prisma.collectionRevision.create({ data: { collection: 'members', revision } });
}

async function seedCredentials(credentials, revision = 0, allowDemoPassword = true) {
  for (const [email, cred] of Object.entries(credentials)) {
    const member = await prisma.member.findUniqueOrThrow({ where: { email } });
    await prisma.memberCredential.create({
      data: { memberId: member.id, salt: cred.salt, passwordHash: cred.hash, passwordUpdatedAt: new Date(cred.updatedAt) },
    });
  }
  if (revision) await prisma.collectionRevision.create({ data: { collection: 'auth-credentials', revision } });
  await prisma.appSetting.create({ data: { settingKey: 'auth-policy', value: { allowDemoPassword } } });
}

test('全新库首次 GET 不把默认口令物化成真实凭证', async () => {
  const builtin = await service().getDoc(WS, 'auth-credentials');
  assert.deepEqual(builtin.payload, {
    policy: { allowDemoPassword: true },
    credentials: {},
    revision: 0,
  });
  assert.equal(await prisma.memberCredential.count(), 0);
});

test('PUT 的历史 key（大小写 / @company.com）归一化后挂到成员上，登录能命中', async () => {
  await seedMembers([{ id: 'm-1', name: 'Jacky', email: 'jacky@huawei.com' }]);
  const saved = await service().putDoc(WS, 'auth-credentials', {
    policy: { allowDemoPassword: true },
    credentials: { 'Jacky@Company.com': credentialFor('super-secret') },
    revision: 0,
  });
  assert.deepEqual(Object.keys(saved.payload.credentials), ['jacky@huawei.com']);
  assert.equal((await service().login({ email: 'JACKY@company.com', password: 'super-secret' })).ok, true);
});

test('已设密账号不会被默认口令 mssclaw 登进去', async () => {
  await seedMembers([{ id: 'm-1', name: 'Jacky', email: 'Jacky@Company.com' }]);
  await seedCredentials({ 'jacky@huawei.com': credentialFor('super-secret') }, 1);

  const demo = await service().login({ email: 'jacky@huawei.com', password: 'mssclaw' });
  assert.equal(demo.ok, false);
  assert.equal(demo.error, '密码错误');

  const real = await service().login({ email: 'JACKY@huawei.com', password: 'super-secret' });
  assert.equal(real.ok, true);
});

test('PUT 拒绝陈旧 revision，避免整份覆盖抹掉他人刚设的密码', async () => {
  await seedMembers([
    { id: 'm-a', name: 'A', email: 'a@huawei.com' },
    { id: 'm-b', name: 'B', email: 'b@huawei.com' },
  ]);
  await seedCredentials({ 'b@huawei.com': credentialFor('set-by-admin-b') }, 5);

  await assert.rejects(
    // 管理员 A 手里是 revision 4 的旧快照
    service().putDoc(WS, 'auth-credentials', {
      policy: { allowDemoPassword: true },
      credentials: { 'a@huawei.com': credentialFor('set-by-admin-a') },
      revision: 4,
    }),
    (error) => error.getResponse().error === 'auth_credentials_revision_conflict',
  );

  const after = await service().getDoc(WS, 'auth-credentials');
  assert.deepEqual(Object.keys(after.payload.credentials), ['b@huawei.com']);
});

test('PUT 命中 revision 时写入成功并递增版本，口令策略一起保存', async () => {
  await seedMembers([{ id: 'm-d', name: 'Dickson', email: 'dickson@huawei.com' }]);
  await seedCredentials({}, 5);

  const saved = await service().putDoc(WS, 'auth-credentials', {
    policy: { allowDemoPassword: false },
    credentials: { ' Dickson@Company.com ': credentialFor('pw-123456') },
    revision: 5,
  });

  assert.equal(saved.payload.revision, 6);
  assert.deepEqual(Object.keys(saved.payload.credentials), ['dickson@huawei.com']);
  assert.equal(saved.payload.policy.allowDemoPassword, false);
});

test('密码挂在成员上：找不到成员的邮箱不落库', async () => {
  await seedMembers([{ id: 'm-1', name: 'A', email: 'a@huawei.com' }]);
  const saved = await service().putDoc(WS, 'auth-credentials', {
    policy: { allowDemoPassword: true },
    credentials: { 'a@huawei.com': credentialFor('pw-a'), 'ghost@huawei.com': credentialFor('pw-ghost') },
    revision: 0,
  });
  assert.deepEqual(Object.keys(saved.payload.credentials), ['a@huawei.com']);
});

test('成员表同样受 revision 保护', async () => {
  await seedMembers([{ id: 'm-1', name: 'A', email: 'a@huawei.com', role: 'viewer' }], 2);

  await assert.rejects(
    service().putDoc(WS, 'members', { members: [], revision: 1 }),
    (error) => error.getResponse().error === 'members_revision_conflict',
  );

  const ok = await service().putDoc(WS, 'members', { members: [], revision: 2 });
  assert.equal(ok.payload.revision, 3);
});

test('会话只存令牌的 SHA-256；移除成员连同密码和会话一起删除', async () => {
  await seedMembers([
    { id: 'm-1', name: 'A', email: 'a@huawei.com' },
    { id: 'm-2', name: 'B', email: 'b@huawei.com' },
  ]);
  await seedCredentials({ 'a@huawei.com': credentialFor('pw-a') });
  const login = await service().login({ email: 'a@huawei.com', password: 'pw-a' });
  assert.equal(login.ok, true);
  const [stored] = await prisma.authSession.findMany();
  assert.notEqual(stored.tokenHash, login.token);
  assert.equal(stored.tokenHash, createHash('sha256').update(login.token).digest('hex'));
  assert.equal((await service().me(login.token)).ok, true);

  const members = (await service().getDoc(WS, 'members')).payload;
  await service().putDoc(WS, 'members', {
    members: members.members.filter((member) => member.id !== 'm-1'),
    revision: members.revision,
  });
  assert.equal(await prisma.memberCredential.count(), 0);
  assert.equal((await service().me(login.token)).ok, false);
});

test('运营关掉演示口令后，演示口令登录的会话一并失效', async () => {
  await seedMembers([{ id: 'm-1', name: 'A', email: 'a@huawei.com' }]);
  const demo = await service().login({ email: 'a@huawei.com', password: 'mssclaw' });
  assert.equal(demo.ok, true);
  assert.equal((await service().me(demo.token)).ok, true);

  await service().putDoc(WS, 'auth-credentials', { policy: { allowDemoPassword: false }, credentials: {}, revision: 0 });
  assert.equal((await service().me(demo.token)).ok, false);
});

test('密码表只有 super_admin 能读，写入同样要求 super_admin', async () => {
  let role = 'business_user';
  let putCalls = 0;
  const controller = new PlatformDocsController({
    me: async () => ({ ok: true, user: { id: 'u-1', platformRole: role } }),
    getDoc: async (workspaceId, kind) => ({ workspaceId, kind }),
    putDoc: async () => {
      putCalls += 1;
      return { ok: true };
    },
  });

  await assert.rejects(
    controller.getOne('auth-credentials', 'Bearer t'),
    (error) => error.message === 'auth_credentials_admin_required',
  );
  await assert.rejects(
    controller.putOne('auth-credentials', { payload: {} }, 'Bearer t'),
    (error) => error.message === 'auth_credentials_admin_required',
  );
  await assert.rejects(
    controller.putOne('members', { payload: { members: [] } }, 'Bearer t'),
    (error) => error.message === 'members_admin_required',
  );
  assert.equal(putCalls, 0);

  role = 'super_admin';
  assert.deepEqual(await controller.getOne('auth-credentials', 'Bearer t'), {
    workspaceId: WS,
    kind: 'auth-credentials',
  });
  await controller.putOne('auth-credentials', { payload: {} }, 'Bearer t');
  assert.equal(putCalls, 1);
});

test('未登录既不能读密码表也不能写成员表', async () => {
  const controller = new PlatformDocsController({
    me: async () => ({ ok: false, error: '未登录' }),
    getDoc: async () => ({ ok: true }),
    putDoc: async () => {
      throw new Error('should not write');
    },
  });

  await assert.rejects(controller.getOne('auth-credentials'), {
    name: 'UnauthorizedException',
  });
  await assert.rejects(controller.putOne('members', { payload: { members: [] } }), {
    name: 'UnauthorizedException',
  });
  // 门户展示类文档仍对游客开放
  assert.deepEqual(await controller.getOne('market-featured'), { ok: true });
});
