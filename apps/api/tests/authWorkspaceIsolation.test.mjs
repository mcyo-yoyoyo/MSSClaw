import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, randomBytes } from 'node:crypto';
import { PlatformDocsService } from '../dist/persistence/platform-docs.service.js';

const WS = 'ws-cn-marketing';
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

/** 平台只有一个空间：mcyo 已设强密码，且关闭演示口令 */
function build() {
  const rows = new Map();
  const put = (kind, payload) =>
    rows.set(`doc-${kind}-${WS}`, { id: `doc-${kind}-${WS}`, kind: `doc:${kind}`, payload });

  put('members', { members: [member('mcyo@huawei.com')] });
  put('auth-credentials', {
    policy: { allowDemoPassword: false },
    credentials: { 'mcyo@huawei.com': credFor('Str0ng-Real-Password') },
    revision: 1,
  });

  const prisma = {
    appSetting: { findUnique: async () => ({ value: { catalog: {} } }) },
    centerRecord: {
      findUnique: async ({ where }) => rows.get(where.id) ?? null,
      findFirst: async () => null,
      findMany: async ({ where }) =>
        [...rows.values()].filter((r) => !where?.kind || r.kind === where.kind),
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
    $executeRaw: async (_s, json, id, expected) => {
      const row = rows.get(id);
      const current = typeof row?.payload?.revision === 'number' ? row.payload.revision : 0;
      if (!row || current !== expected) return 0;
      rows.set(id, { ...row, payload: JSON.parse(json) });
      return 1;
    },
  };

  const service = new PlatformDocsService(prisma, { recordDailyLogin: async () => {} });
  return { service, rows };
}

test('请求里编造的 workspaceId 被忽略：只能登录平台空间，也不会建出新空间', async () => {
  const { service, rows } = build();

  const demo = await service.login({ email: 'mcyo@huawei.com', password: 'mssclaw', workspaceId: 'ws-attacker-1' });
  assert.equal(demo.ok, false, '平台空间已设强密码，演示口令不能借别的空间名登进来');

  const real = await service.login({
    email: 'mcyo@huawei.com',
    password: 'Str0ng-Real-Password',
    workspaceId: 'ws-attacker-1',
  });
  assert.equal(real.ok, true);
  assert.equal(real.user.workspaceId, WS);
  assert.equal(rows.has('doc-members-ws-attacker-1'), false);
});

test('非平台空间不会被播种默认管理员与演示口令', async () => {
  const { service } = build();

  const members = await service.getDoc('ws-attacker-2', 'members');
  const creds = await service.getDoc('ws-attacker-2', 'auth-credentials');

  assert.deepEqual(members.payload, { members: [] });
  assert.equal(creds.payload.policy.allowDemoPassword, false);
  assert.deepEqual(creds.payload.credentials, {});
});

test('平台空间内的会话校验保持原样', async () => {
  const { service } = build();

  const session = await service.login({ email: 'mcyo@huawei.com', password: 'Str0ng-Real-Password' });
  assert.equal(session.ok, true);

  const me = await service.me(session.token);
  assert.equal(me.ok, true);
  assert.equal(me.user.workspaceId, WS);
});
