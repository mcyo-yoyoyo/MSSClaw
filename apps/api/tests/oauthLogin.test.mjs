import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { PlatformDocsService } from '../dist/persistence/platform-docs.service.js';
import { AuthOAuthService } from '../dist/auth/auth-oauth.service.js';
import { OAuthStateStore } from '../dist/auth/oauth-state.store.js';
import { UniPortalClient } from '../dist/auth/uniportal.client.js';
import { resetOAuthConfigCache } from '../dist/auth/oauth.config.js';

/**
 * 真实 IDaaS 跑不到（需要注册凭据 + 真人在登录页输密码），
 * 所以这里用本地假上游把「换码 → 取用户信息 → 映射成员 → 签发令牌」整条链路测掉。
 * 上游返回什么由每个用例自己决定，包括只回 uuid、字段名不一样、返回 errorCode 等情况。
 */

const member = (over = {}) => ({
  id: 'u-jh',
  name: '江洪',
  email: 'jianghong@huawei.com',
  role: 'business_user',
  avatar: 'bg-zinc-600',
  lastActive: '刚刚',
  status: 'active',
  deptIds: [],
  regionId: null,
  ...over,
});

function buildDocs({ members = [member()], workspaces = ['ws-mss-ai'] } = {}) {
  const rows = new Map();
  const wsRows = new Map(workspaces.map((id) => [id, { id }]));
  rows.set('doc-members-ws-mss-ai', {
    id: 'doc-members-ws-mss-ai',
    workspaceId: 'ws-mss-ai',
    kind: 'doc:members',
    payload: { members, revision: 1 },
  });

  const prisma = {
    workspace: {
      findUnique: async ({ where }) => wsRows.get(where.id) ?? null,
      create: async ({ data }) => (wsRows.set(data.id, data), data),
    },
    centerRecord: {
      findUnique: async ({ where }) => rows.get(where.id) ?? null,
      findFirst: async () => null,
      findMany: async () => [...rows.values()],
      create: async ({ data }) => (rows.set(data.id, { ...data }), data),
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
  return {
    docs: new PlatformDocsService(prisma, { recordDailyLogin: async () => {} }),
    rows,
  };
}

/** 假 IDaaS：profile / tokenError 由用例决定 */
async function startStub({ profile = { uuid: 'uuid~abc' }, tokenError = null } = {}) {
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      if (req.url.endsWith('/accesstoken')) {
        if (tokenError) return res.end(JSON.stringify(tokenError));
        return res.end(JSON.stringify({ access_token: 'AT', refresh_token: 'RT', expires_in: 1800 }));
      }
      if (req.url.endsWith('/userinfo')) return res.end(JSON.stringify(profile));
      res.statusCode = 404;
      res.end('{}');
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

function configure(base, over = {}) {
  process.env.AUTH_MODE = 'oauth';
  process.env.OAUTH_ISSUER_BASE = base;
  process.env.OAUTH_CLIENT_ID = 'mssclaw';
  process.env.OAUTH_CLIENT_SECRET = 'secret';
  process.env.OAUTH_REDIRECT_URI = 'https://claw-test.example.com/oauth/callback';
  process.env.OAUTH_JIT_PROVISION = '0';
  process.env.OAUTH_ALLOWED_EMAIL_DOMAINS = 'huawei.com';
  process.env.OAUTH_DEFAULT_EMAIL_DOMAIN = '';
  for (const key of ['OAUTH_FIELD_EMAIL', 'OAUTH_FIELD_ACCOUNT', 'OAUTH_FIELD_NAME', 'OAUTH_FIELD_EXTERNAL_ID']) {
    delete process.env[key];
  }
  Object.assign(process.env, over);
  resetOAuthConfigCache();
}

async function harness(opts = {}) {
  const stub = await startStub(opts);
  configure(stub.base, opts.env);
  const { docs, rows } = buildDocs(opts);
  const states = new OAuthStateStore();
  const service = new AuthOAuthService(docs, states, new UniPortalClient());
  const login = async (over = {}) => {
    const issued = service.buildAuthorizeUrl('ws-mss-ai', '#/home');
    return service.handleCallback({ code: 'GOODCODE', state: issued.state, ...over });
  };
  return {
    service,
    states,
    docs,
    rows,
    login,
    close: () => new Promise((r) => stub.server.close(r)),
  };
}

test('完整流程：换码 → userinfo → 匹配成员 → 签发平台令牌', async () => {
  const h = await harness({
    profile: { uuid: 'uuid~abc', email: 'jianghong@huawei.com', userName: '江洪', postName: '高级产品经理' },
  });
  try {
    const result = await h.login();
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.user.email, 'jianghong@huawei.com');
    assert.equal(result.user.platformRole, 'business_user');
    assert.equal(result.user.postName, '高级产品经理');
    assert.equal(result.user.externalId, 'uuid~abc');
    assert.ok(result.traceId, '必须带 traceId，否则内网排障没法 grep 日志');

    // 令牌可被既有 me() 还原，说明复用的是同一套会话体系
    const me = await h.docs.me(result.token, 'ws-mss-ai');
    assert.equal(me.ok, true);
    assert.equal(me.user.email, 'jianghong@huawei.com');
  } finally {
    await h.close();
  }
});

test('state 不可重放：同一个 state 第二次必失败', async () => {
  const h = await harness({ profile: { uuid: 'uuid~abc', email: 'jianghong@huawei.com' } });
  try {
    const issued = h.service.buildAuthorizeUrl('ws-mss-ai', '');
    const first = await h.service.handleCallback({ code: 'C1', state: issued.state });
    assert.equal(first.ok, true);

    const replay = await h.service.handleCallback({ code: 'C1', state: issued.state });
    assert.equal(replay.ok, false);
    assert.equal(replay.code, 'oauth_state_invalid');
    assert.match(replay.detail, /已被使用过/);
  } finally {
    await h.close();
  }
});

test('state 不存在时给出「是不是重启过 / 多实例」的排查方向', async () => {
  const h = await harness();
  try {
    const result = await h.service.handleCallback({ code: 'C1', state: 'never-issued' });
    assert.equal(result.code, 'oauth_state_invalid');
    assert.match(result.detail, /不存在/);
    assert.match(result.hint, /重启|多实例/);
  } finally {
    await h.close();
  }
});

test('上游 errorCode 被翻成可操作的提示，且不签发令牌', async () => {
  const h = await harness({ tokenError: { errorCode: 'E_10003', errorDesc: 'redirect_uri mismatch' } });
  try {
    const result = await h.login();
    assert.equal(result.ok, false);
    assert.equal(result.code, 'oauth_exchange_failed');
    assert.match(result.detail, /E_10003/);
    assert.match(result.hint, /redirect_uri/);
  } finally {
    await h.close();
  }
});

test('只回 uuid 且成员表匹配不上时，明确报未开通而不是含糊失败', async () => {
  const h = await harness({ profile: { uuid: 'uuid~unknown' } });
  try {
    const result = await h.login();
    assert.equal(result.ok, false);
    assert.equal(result.code, 'oauth_identity_unmapped');
    assert.match(result.hint, /组织权限|JIT/);
  } finally {
    await h.close();
  }
});

test('上游字段名不一样时，用 OAUTH_FIELD_* 环境变量即可纠正（无需改代码）', async () => {
  const h = await harness({
    profile: { openId: 'X-9', mailbox: 'jianghong@huawei.com', 姓名: '江洪' },
    env: { OAUTH_FIELD_EMAIL: 'mailbox', OAUTH_FIELD_EXTERNAL_ID: 'openId' },
  });
  try {
    const result = await h.login();
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.user.email, 'jianghong@huawei.com');
    assert.equal(result.user.externalId, 'X-9');
  } finally {
    await h.close();
  }
});

test('字段完全认不出来时，错误里要带上游实际字段名，好让人对着配别名', async () => {
  const h = await harness({ profile: { someWeirdKey: 'v', anotherKey: 2 } });
  try {
    const result = await h.login();
    assert.equal(result.ok, false);
    assert.equal(result.code, 'oauth_identity_empty');
    assert.match(result.detail, /someWeirdKey/);
    assert.match(result.detail, /anotherKey/);
    assert.match(result.hint, /OAUTH_FIELD_/);
  } finally {
    await h.close();
  }
});

test('JIT 建号只会给默认角色，且受邮箱域白名单限制', async () => {
  const h = await harness({
    members: [],
    profile: { uuid: 'u1', email: 'newbie@huawei.com', userName: '新人' },
    env: { OAUTH_JIT_PROVISION: '1' },
  });
  try {
    const result = await h.login();
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.provisioned, true);
    assert.equal(result.user.platformRole, 'business_user');

    const saved = h.rows.get('doc-members-ws-mss-ai').payload.members;
    assert.equal(saved.length, 1);
    assert.equal(saved[0].email, 'newbie@huawei.com');
    assert.notEqual(saved[0].role, 'super_admin');
  } finally {
    await h.close();
  }
});

test('JIT 开启时，白名单外的邮箱域仍然被拒', async () => {
  const h = await harness({
    members: [],
    profile: { uuid: 'u1', email: 'outsider@example.com' },
    env: { OAUTH_JIT_PROVISION: '1' },
  });
  try {
    const result = await h.login();
    assert.equal(result.ok, false);
    assert.equal(result.code, 'oauth_domain_not_allowed');
  } finally {
    await h.close();
  }
});

test('已停用的成员不得通过统一身份登录', async () => {
  const h = await harness({
    members: [member({ status: 'suspended' })],
    profile: { uuid: 'u1', email: 'jianghong@huawei.com' },
  });
  try {
    const result = await h.login();
    assert.equal(result.ok, false);
    assert.equal(result.code, 'oauth_member_suspended');
  } finally {
    await h.close();
  }
});

test('上游只给工号时，可用 OAUTH_DEFAULT_EMAIL_DOMAIN 补成邮箱匹配成员', async () => {
  const h = await harness({
    members: [member({ email: 'j00123456@huawei.com' })],
    profile: { uuid: 'u1', w3Account: 'j00123456' },
    env: { OAUTH_DEFAULT_EMAIL_DOMAIN: 'huawei.com' },
  });
  try {
    const result = await h.login();
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.user.email, 'j00123456@huawei.com');
  } finally {
    await h.close();
  }
});

test('配置不完整时，发起登录就被拦住并点名缺哪一项', async () => {
  const stub = await startStub();
  try {
    configure(stub.base, { OAUTH_CLIENT_SECRET: '' });
    const { docs } = buildDocs();
    const service = new AuthOAuthService(docs, new OAuthStateStore(), new UniPortalClient());
    const result = service.buildAuthorizeUrl('ws-mss-ai', '');
    assert.equal(result.ok, false);
    assert.equal(result.code, 'oauth_config_incomplete');
    assert.match(result.detail, /OAUTH_CLIENT_SECRET/);
  } finally {
    await new Promise((r) => stub.server.close(r));
  }
});

test('诊断接口点名缺失项，且不回显 client_secret', async () => {
  const stub = await startStub();
  try {
    configure(stub.base, { OAUTH_CLIENT_SECRET: 'super-secret-value', OAUTH_REDIRECT_URI: 'not-a-url' });
    const { docs } = buildDocs();
    const service = new AuthOAuthService(docs, new OAuthStateStore(), new UniPortalClient());
    const report = await service.diagnostics(false);

    assert.equal(report.ready, false);
    assert.ok(report.errors.some((line) => line.startsWith('OAUTH_REDIRECT_URI')));
    const dumped = JSON.stringify(report);
    assert.ok(!dumped.includes('super-secret-value'), '诊断输出绝不能包含 client_secret');
    assert.match(dumped, /已配置/);
  } finally {
    await new Promise((r) => stub.server.close(r));
  }
});

test('上游连不上时给出网络层原因与处置建议', async () => {
  const stub = await startStub();
  const port = stub.server.address().port;
  await new Promise((r) => stub.server.close(r)); // 先关掉，制造连不上
  configure(`http://127.0.0.1:${port}`, { OAUTH_HTTP_TIMEOUT_MS: '1500' });
  const { docs } = buildDocs();
  const states = new OAuthStateStore();
  const service = new AuthOAuthService(docs, states, new UniPortalClient());
  const issued = service.buildAuthorizeUrl('ws-mss-ai', '');
  const result = await service.handleCallback({ code: 'C', state: issued.state });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'oauth_exchange_failed');
  assert.match(result.detail, /网络层失败/);
  assert.match(result.hint, /连不上|代理|出网/);
});
