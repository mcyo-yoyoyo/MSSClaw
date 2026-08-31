import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, randomBytes } from 'node:crypto';
import { PlatformDocsService } from '../dist/persistence/platform-docs.service.js';
import { PlatformDocsController } from '../dist/persistence/platform-docs.controller.js';

function hashPassword(password, salt) {
  return createHash('sha256').update(`${salt}:${password}`, 'utf8').digest('hex');
}

function credentialFor(password) {
  const salt = randomBytes(8).toString('hex');
  return { salt, hash: hashPassword(password, salt), updatedAt: '2026-01-01T00:00:00.000Z' };
}

/** 按 id 存多份文档的假 prisma，$executeRaw 走 revision CAS 语义 */
function fakePrisma(rows = {}) {
  const store = new Map(Object.entries(rows));
  return {
    workspace: { findUnique: async () => ({ id: 'ws-test' }) },
    centerRecord: {
      findUnique: async ({ where }) => store.get(where.id) ?? null,
      findFirst: async () => null,
      findMany: async () => [...store.values()],
      create: async ({ data }) => {
        store.set(data.id, { ...data });
        return store.get(data.id);
      },
      upsert: async ({ where, create }) => {
        if (!store.has(where.id)) store.set(where.id, { ...create });
        return store.get(where.id);
      },
      update: async ({ where, data }) => {
        store.set(where.id, { ...store.get(where.id), ...data });
        return store.get(where.id);
      },
    },
    // $executeRaw`UPDATE ... WHERE id = ${id} AND revision = ${expected}`
    $executeRaw: async (_strings, payloadJson, _updatedAt, id, expectedRevision) => {
      const row = store.get(id);
      const current = typeof row?.payload?.revision === 'number' ? row.payload.revision : 0;
      if (!row || current !== expectedRevision) return 0;
      store.set(id, { ...row, payload: JSON.parse(payloadJson) });
      return 1;
    },
    state: () => Object.fromEntries(store),
  };
}

const docRow = (kind, payload) => ({
  id: `doc-${kind}-ws-test`,
  workspaceId: 'ws-test',
  kind: `doc:${kind}`,
  payload,
});

test('内置工作区首次 GET 不再把默认口令物化成真实凭证', async () => {
  const prisma = fakePrisma();
  const service = new PlatformDocsService(prisma, {});

  // 内置工作区仍放行演示口令，但不落库任何真实凭证
  const builtin = await service.getDoc('ws-mss-ai', 'auth-credentials');
  assert.deepEqual(builtin.payload, {
    policy: { allowDemoPassword: true },
    credentials: {},
    revision: 0,
  });

  // 非内置（含请求侧自动建出来的）工作区连演示口令都不放行
  const adhoc = await service.getDoc('ws-test', 'auth-credentials');
  assert.deepEqual(adhoc.payload, {
    policy: { allowDemoPassword: false },
    credentials: {},
    revision: 0,
  });
});

test('GET 归一化历史 key（大小写 / @company.com），登录才能命中已设密码', async () => {
  const cred = credentialFor('super-secret');
  const prisma = fakePrisma({
    'doc-auth-credentials-ws-test': docRow('auth-credentials', {
      policy: { allowDemoPassword: true },
      credentials: { 'Jacky@Company.com': cred },
      revision: 3,
    }),
  });
  const service = new PlatformDocsService(prisma, {});

  const result = await service.getDoc('ws-test', 'auth-credentials');

  assert.deepEqual(Object.keys(result.payload.credentials), ['jacky@huawei.com']);
  assert.equal(result.payload.revision, 3);
});

test('已设密账号不会被默认口令 mssclaw 登进去', async () => {
  const prisma = fakePrisma({
    'doc-members-ws-test': docRow('members', {
      members: [
        {
          id: 'm-1',
          name: 'Jacky',
          email: 'Jacky@Company.com',
          role: 'business_user',
          status: 'active',
        },
      ],
    }),
    'doc-auth-credentials-ws-test': docRow('auth-credentials', {
      policy: { allowDemoPassword: true },
      credentials: { 'Jacky@Company.com': credentialFor('super-secret') },
      revision: 1,
    }),
  });
  const service = new PlatformDocsService(prisma, { recordDailyLogin: async () => {} });

  const demo = await service.login({
    email: 'jacky@huawei.com',
    password: 'mssclaw',
    workspaceId: 'ws-test',
  });
  assert.equal(demo.ok, false);
  assert.equal(demo.error, '密码错误');

  const real = await service.login({
    email: 'JACKY@huawei.com',
    password: 'super-secret',
    workspaceId: 'ws-test',
  });
  assert.equal(real.ok, true);
});

test('PUT 拒绝陈旧 revision，避免整份覆盖抹掉他人刚设的密码', async () => {
  const kept = credentialFor('set-by-admin-b');
  const prisma = fakePrisma({
    'doc-auth-credentials-ws-test': docRow('auth-credentials', {
      policy: { allowDemoPassword: true },
      credentials: { 'b@huawei.com': kept },
      revision: 5,
    }),
  });
  const service = new PlatformDocsService(prisma, {});

  await assert.rejects(
    // 管理员 A 手里是 revision 4 的旧快照
    service.putDoc('ws-test', 'auth-credentials', {
      policy: { allowDemoPassword: true },
      credentials: { 'a@huawei.com': credentialFor('set-by-admin-a') },
      revision: 4,
    }),
    (error) => error.getResponse().error === 'auth_credentials_revision_conflict',
  );

  const after = await service.getDoc('ws-test', 'auth-credentials');
  assert.deepEqual(Object.keys(after.payload.credentials), ['b@huawei.com']);
});

test('PUT 命中 revision 时写入成功并递增版本，key 落库即归一化', async () => {
  const prisma = fakePrisma({
    'doc-auth-credentials-ws-test': docRow('auth-credentials', {
      policy: { allowDemoPassword: true },
      credentials: {},
      revision: 5,
    }),
  });
  const service = new PlatformDocsService(prisma, {});

  const saved = await service.putDoc('ws-test', 'auth-credentials', {
    policy: { allowDemoPassword: false },
    credentials: { ' Dickson@Company.com ': credentialFor('pw-123456') },
    revision: 5,
  });

  assert.equal(saved.payload.revision, 6);
  assert.deepEqual(Object.keys(saved.payload.credentials), ['dickson@huawei.com']);
  assert.equal(saved.payload.policy.allowDemoPassword, false);
});

test('成员表同样受 revision 保护', async () => {
  const prisma = fakePrisma({
    'doc-members-ws-test': docRow('members', {
      members: [{ id: 'm-1', name: 'A', email: 'a@huawei.com', role: 'viewer' }],
      revision: 2,
    }),
  });
  const service = new PlatformDocsService(prisma, {});

  await assert.rejects(
    service.putDoc('ws-test', 'members', { members: [], revision: 1 }),
    (error) => error.getResponse().error === 'members_revision_conflict',
  );

  const ok = await service.putDoc('ws-test', 'members', { members: [], revision: 2 });
  assert.equal(ok.payload.revision, 3);
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
    controller.getOne('ws-test', 'auth-credentials', 'Bearer t'),
    (error) => error.message === 'auth_credentials_admin_required',
  );
  await assert.rejects(
    controller.putOne('ws-test', 'auth-credentials', { payload: {} }, 'Bearer t'),
    (error) => error.message === 'auth_credentials_admin_required',
  );
  await assert.rejects(
    controller.putOne('ws-test', 'members', { payload: { members: [] } }, 'Bearer t'),
    (error) => error.message === 'members_admin_required',
  );
  assert.equal(putCalls, 0);

  role = 'super_admin';
  assert.deepEqual(await controller.getOne('ws-test', 'auth-credentials', 'Bearer t'), {
    workspaceId: 'ws-test',
    kind: 'auth-credentials',
  });
  await controller.putOne('ws-test', 'auth-credentials', { payload: {} }, 'Bearer t');
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

  await assert.rejects(controller.getOne('ws-test', 'auth-credentials'), {
    name: 'UnauthorizedException',
  });
  await assert.rejects(controller.putOne('ws-test', 'members', { payload: { members: [] } }), {
    name: 'UnauthorizedException',
  });
  // 门户展示类文档仍对游客开放
  assert.deepEqual(await controller.getOne('ws-test', 'market-featured'), { ok: true });
});
