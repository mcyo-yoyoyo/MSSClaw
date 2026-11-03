import assert from 'node:assert/strict';
import test, { after, before, beforeEach } from 'node:test';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PlatformDocsService } from '../dist/persistence/platform-docs.service.js';
import { AuthController } from '../dist/persistence/platform-docs.controller.js';
import { writeMembersDoc } from '../dist/persistence/identity-store.js';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';

process.env.JWT_SECRET = 'test-jwt-secret';

let database;
let prisma;

before(async () => {
  database = await createTestDatabase('jwt_auth');
  prisma = new PrismaClient({ datasourceUrl: database.url });
});

after(async () => {
  await prisma?.$disconnect();
  await database?.drop();
});

beforeEach(async () => {
  for (const table of ['refresh_token', 'auth_session', 'member_credential', 'member_domain', 'member', 'collection_revision', 'app_setting']) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
  await prisma.member.create({ data: { id: 'u-a', name: 'A', email: 'a@huawei.com', roleId: 'capability_ops' } });
  await setLegacyPassword('u-a', 'Old-Passw0rd');
});

const docs = () => new PlatformDocsService(prisma, { recordDailyLogin: async () => {} });

async function setLegacyPassword(memberId, password) {
  const salt = randomBytes(8).toString('hex');
  const passwordHash = createHash('sha256').update(`${salt}:${password}`, 'utf8').digest('hex');
  await prisma.memberCredential.upsert({
    where: { memberId },
    create: { memberId, salt, passwordHash, passwordUpdatedAt: new Date() },
    update: { algorithm: 'sha256-salt', salt, passwordHash },
  });
}

/** 假的 express req/res：记录写 / 清 Cookie */
function http(cookie) {
  const jar = {};
  return {
    jar,
    req: { headers: { cookie: cookie ? `other=1; mssclaw_refresh=${cookie}` : undefined, 'user-agent': 'node-test' }, secure: false },
    res: {
      cookie: (name, value, options) => (jar[name] = { value, options }),
      clearCookie: (name) => (jar[name] = { cleared: true }),
    },
  };
}

async function login(email = 'a@huawei.com', password = 'Old-Passw0rd') {
  const { req, res, jar } = http();
  const body = await new AuthController(docs()).login({ email, password }, req, res);
  return { body, refresh: jar.mssclaw_refresh?.value, cookie: jar.mssclaw_refresh };
}

async function refresh(cookie) {
  const { req, res, jar } = http(cookie);
  try {
    const body = await new AuthController(docs()).refresh(req, res);
    return { body, refresh: jar.mssclaw_refresh?.value };
  } catch (error) {
    return { status: error.getStatus(), error: error.getResponse().error, cleared: jar.mssclaw_refresh?.cleared };
  }
}

test('登录：响应体给 JWT 访问令牌，刷新令牌只进 httpOnly Cookie', async () => {
  const { body, refresh: refreshToken, cookie } = await login();
  assert.equal(body.ok, true);
  assert.equal(body.token.split('.').length, 3);
  assert.equal(body.user.platformRole, 'capability_ops');
  assert.equal('refreshToken' in body, false);
  assert.match(refreshToken, /^[0-9a-f]{64}$/);
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.path, '/api/v1/auth');
  const stored = await prisma.refreshToken.findFirstOrThrow();
  assert.notEqual(stored.tokenHash, refreshToken);
  assert.equal(stored.userAgent, 'node-test');

  const me = await docs().me(body.token);
  assert.equal(me.ok, true);
  assert.equal(me.user.id, 'u-a');
});

test('旧格式密码登录成功后改存 scrypt，之后照常登录；密码错误仍被拒', async () => {
  assert.equal((await login()).body.ok, true);
  const credential = await prisma.memberCredential.findUniqueOrThrow({ where: { memberId: 'u-a' } });
  assert.equal(credential.algorithm, 'scrypt');
  assert.equal((await login()).body.ok, true);
  assert.deepEqual((await login('a@huawei.com', 'wrong')).body, { ok: false, error: '密码错误' });
});

test('凭证文档整份回传时，已升级为 scrypt 的密码保持不动', async () => {
  await login();
  const service = docs();
  const { payload } = await service.getDoc('platform', 'auth-credentials');
  await service.putDoc('platform', 'auth-credentials', payload);
  assert.equal((await prisma.memberCredential.findUniqueOrThrow({ where: { memberId: 'u-a' } })).algorithm, 'scrypt');
  assert.equal((await login()).body.ok, true);
});

test('改角色、停用后，手里的访问令牌立即失效', async () => {
  const { body } = await login();
  await writeMembersDoc(prisma, {
    revision: 0,
    members: [{ id: 'u-a', name: 'A', email: 'a@huawei.com', role: 'viewer', deptIds: [], regionId: null }],
  });
  assert.deepEqual(await docs().me(body.token), { ok: false, error: '会话已失效，请重新登录' });

  const again = await login();
  assert.equal(again.body.user.platformRole, 'viewer');
  await prisma.member.update({ where: { id: 'u-a' }, data: { status: 'suspended' } });
  assert.deepEqual(await docs().me(again.body.token), { ok: false, error: '无权访问该工作区' });
});

test('伪造或改过的访问令牌被拒', async () => {
  const { body } = await login();
  const [header, payload, signature] = body.token.split('.');
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url')), role: 'super_admin' })).toString('base64url');
  assert.equal((await docs().me(`${header}.${forged}.${signature}`)).ok, false);
});

test('刷新：换新访问令牌并轮换刷新令牌；旧令牌宽限期内重放只拒绝，超过宽限期作废全部', async () => {
  const first = await login();
  const rotated = await refresh(first.refresh);
  assert.equal(rotated.body.ok, true);
  assert.equal((await docs().me(rotated.body.token)).ok, true);
  assert.notEqual(rotated.refresh, first.refresh);
  assert.equal('refreshToken' in rotated.body, false);

  // 两个标签页同时刷新：后到的拿旧令牌，拒绝但不连坐
  assert.deepEqual(await refresh(first.refresh), { status: 401, error: 'refresh_token_revoked', cleared: true });
  assert.equal((await refresh(rotated.refresh)).body.ok, true);

  // 超过宽限期还拿旧令牌来换：当作被盗，该成员所有刷新令牌作废
  await prisma.refreshToken.updateMany({ where: { revokedAt: { not: null } }, data: { revokedAt: new Date(Date.now() - 5 * 60 * 1000) } });
  assert.equal((await refresh(first.refresh)).error, 'refresh_token_revoked');
  assert.equal(await prisma.refreshToken.count({ where: { revokedAt: null } }), 0);
});

test('刷新：没带 Cookie、令牌不存在、已过期、成员停用都返回 401', async () => {
  assert.equal((await refresh(undefined)).error, 'refresh_token_missing');
  assert.equal((await refresh('f'.repeat(64))).error, 'refresh_token_invalid');
  const { refresh: token } = await login();
  await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await refresh(token)).error, 'refresh_token_expired');
  const { refresh: token2 } = await login();
  await prisma.member.update({ where: { id: 'u-a' }, data: { status: 'suspended' } });
  assert.equal((await refresh(token2)).error, 'member_suspended');
});

test('登出：作废刷新令牌并清 Cookie', async () => {
  const { body, refresh: token } = await login();
  const { req, res, jar } = http(token);
  await new AuthController(docs()).logout(`Bearer ${body.token}`, undefined, req, res);
  assert.equal(jar.mssclaw_refresh.cleared, true);
  assert.equal((await refresh(token)).error, 'refresh_token_revoked');
});

test('演示口令登录的令牌在运营关闭演示口令后失效', async () => {
  await prisma.member.create({ data: { id: 'u-demo', name: 'Demo', email: 'demo@huawei.com' } });
  const { body, refresh: token } = await login('demo@huawei.com', 'mssclaw');
  assert.equal(body.ok, true);
  assert.equal((await docs().me(body.token)).ok, true);
  await prisma.appSetting.create({ data: { settingKey: 'auth-policy', value: { allowDemoPassword: false } } });
  assert.equal((await docs().me(body.token)).ok, false);
  assert.equal((await refresh(token)).error, 'refresh_token_revoked');
});

test('改造前签发的会话令牌到期前仍然有效', async () => {
  const legacy = randomBytes(24).toString('hex');
  await prisma.authSession.create({
    data: {
      tokenHash: createHash('sha256').update(legacy, 'utf8').digest('hex'),
      memberId: 'u-a',
      authMethod: 'password',
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  const me = await docs().me(legacy);
  assert.equal(me.ok, true);
  assert.equal(me.user.id, 'u-a');
});
