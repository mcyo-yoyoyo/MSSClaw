import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, randomBytes } from 'node:crypto';
import { PlatformDocsService } from '../dist/persistence/platform-docs.service.js';

const SALT = randomBytes(8).toString('hex');
const hashWith = (password, salt = SALT) =>
  createHash('sha256').update(`${salt}:${password}`, 'utf8').digest('hex');
const credFor = (password) => ({ salt: SALT, hash: hashWith(password), updatedAt: 'x' });

const member = (email, role = 'super_admin') => ({
  id: `m-${email}`,
  name: email,
  email,
  role,
  status: 'active',
});

/**
 * 双工作区 mock：
 * - ws-mss-ai：mcyo 已设强密码，且关闭演示口令
 * - ws-3c-latam：同一个 mcyo，但放行演示口令
 */
function build({ latamCred = null, workspaces = ['ws-mss-ai', 'ws-3c-latam'] } = {}) {
  const rows = new Map();
  const wsRows = new Map(workspaces.map((id) => [id, { id }]));
  const put = (ws, kind, payload) =>
    rows.set(`doc-${kind}-${ws}`, {
      id: `doc-${kind}-${ws}`,
      workspaceId: ws,
      kind: `doc:${kind}`,
      payload,
    });

  put('ws-mss-ai', 'members', { members: [member('mcyo@huawei.com')] });
  put('ws-mss-ai', 'auth-credentials', {
    policy: { allowDemoPassword: false },
    credentials: { 'mcyo@huawei.com': credFor('Str0ng-Real-Password') },
    revision: 1,
  });
  put('ws-3c-latam', 'members', { members: [member('mcyo@huawei.com')] });
  put('ws-3c-latam', 'auth-credentials', {
    policy: { allowDemoPassword: true },
    credentials: latamCred ? { 'mcyo@huawei.com': latamCred } : {},
    revision: 1,
  });

  const prisma = {
    workspace: {
      findUnique: async ({ where }) => wsRows.get(where.id) ?? null,
      create: async ({ data }) => {
        wsRows.set(data.id, data);
        return data;
      },
    },
    centerRecord: {
      findUnique: async ({ where }) => rows.get(where.id) ?? null,
      findFirst: async () => null,
      findMany: async ({ where }) =>
        [...rows.values()].filter(
          (r) =>
            (!where?.kind || r.kind === where.kind) &&
            (!where?.workspaceId?.not || r.workspaceId !== where.workspaceId.not),
        ),
      create: async ({ data }) => {
        rows.set(data.id, { ...data });
        return data;
      },
      upsert: async ({ where, create }) => {
        if (!rows.has(where.id)) rows.set(where.id, { ...create });
        return rows.get(where.id);
      },
      update: async ({ where, data }) => {
        rows.set(where.id, { ...rows.get(where.id), ...data });
        return rows.get(where.id);
      },
    },
    $executeRaw: async (_s, json, _u, id, expected) => {
      const row = rows.get(id);
      const current = typeof row?.payload?.revision === 'number' ? row.payload.revision : 0;
      if (!row || current !== expected) return 0;
      rows.set(id, { ...row, payload: JSON.parse(json) });
      return 1;
    },
  };

  const service = new PlatformDocsService(prisma, { recordDailyLogin: async () => {} });
  return { service, rows, wsRows };
}

test('编造的 workspaceId 无法登录，也不会被登录请求创建出来', async () => {
  const { service, rows, wsRows } = build();

  const attack = await service.login({
    email: 'mcyo@huawei.com',
    password: 'mssclaw',
    workspaceId: 'ws-attacker-1',
  });

  assert.equal(attack.ok, false);
  assert.equal(attack.error, '工作区不存在或尚未开通');
  assert.equal(wsRows.has('ws-attacker-1'), false);
  assert.equal(rows.has('doc-members-ws-attacker-1'), false);
});

test('非内置工作区不会被播种默认管理员与演示口令', async () => {
  const { service } = build();

  const members = await service.getDoc('ws-attacker-2', 'members');
  const creds = await service.getDoc('ws-attacker-2', 'auth-credentials');

  assert.deepEqual(members.payload, { members: [] });
  assert.equal(creds.payload.policy.allowDemoPassword, false);
  assert.deepEqual(creds.payload.credentials, {});
});

test('宽松空间的演示口令会话不能带进已设强密码的空间', async () => {
  const { service } = build();

  const session = await service.login({
    email: 'mcyo@huawei.com',
    password: 'mssclaw',
    workspaceId: 'ws-3c-latam',
  });
  assert.equal(session.ok, true);

  const crossed = await service.me(session.token, 'ws-mss-ai');
  assert.equal(crossed.ok, false);
  assert.equal(crossed.error, '请在该工作区重新登录');
});

test('目标空间本就放行演示口令时，正常切换工作区不受影响', async () => {
  const { service } = build();

  const session = await service.login({
    email: 'mcyo@huawei.com',
    password: 'Str0ng-Real-Password',
    workspaceId: 'ws-mss-ai',
  });
  const switched = await service.me(session.token, 'ws-3c-latam');

  assert.equal(switched.ok, true);
  assert.equal(switched.user.workspaceId, 'ws-3c-latam');
  assert.equal(switched.user.platformRole, 'super_admin');
});

test('两个空间共享同一凭证记录时允许跨空间复用会话', async () => {
  const { service } = build({ latamCred: credFor('Str0ng-Real-Password') });

  const session = await service.login({
    email: 'mcyo@huawei.com',
    password: 'Str0ng-Real-Password',
    workspaceId: 'ws-3c-latam',
  });
  const crossed = await service.me(session.token, 'ws-mss-ai');

  assert.equal(crossed.ok, true);
  assert.equal(crossed.user.platformRole, 'super_admin');
});

test('口令不同则不得跨空间复用，必须在目标空间重新登录', async () => {
  const { service } = build({ latamCred: credFor('another-password') });

  const session = await service.login({
    email: 'mcyo@huawei.com',
    password: 'another-password',
    workspaceId: 'ws-3c-latam',
  });
  const crossed = await service.me(session.token, 'ws-mss-ai');

  assert.equal(crossed.ok, false);
  assert.equal(crossed.error, '请在该工作区重新登录');
});

test('缺少来源信息的历史令牌按最弱情况处理', async () => {
  const { service, rows } = build();

  const session = await service.login({
    email: 'mcyo@huawei.com',
    password: 'mssclaw',
    workspaceId: 'ws-3c-latam',
  });
  // 模拟本次改动之前签发的旧令牌：没有 auth 来源字段
  const sessionRow = rows.get('doc-auth-sessions-ws-3c-latam');
  delete sessionRow.payload.sessions[session.token].auth;

  assert.equal((await service.me(session.token, 'ws-mss-ai')).ok, false);
  // 签发空间自身仍然可用，不会把老用户直接踢下线
  assert.equal((await service.me(session.token, 'ws-3c-latam')).ok, true);
});

test('同工作区内的会话校验保持原样', async () => {
  const { service } = build();

  const session = await service.login({
    email: 'mcyo@huawei.com',
    password: 'Str0ng-Real-Password',
    workspaceId: 'ws-mss-ai',
  });

  const me = await service.me(session.token, 'ws-mss-ai');
  assert.equal(me.ok, true);
  assert.equal(me.user.platformRole, 'super_admin');
});
