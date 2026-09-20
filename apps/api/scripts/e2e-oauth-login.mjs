#!/usr/bin/env node
/**
 * 统一身份登录 · 本平台侧全链路验证（完全不碰真实 IDaaS）。
 *
 * 跟单元测试的区别：这里启动的是【真正的 Nest 进程】，打的是真正的 HTTP 接口，
 * 用的是真正的 SQLite。所以它能验到单测验不到的东西——全局前缀、路由挂载、
 * 守卫、body 解析、会话落库、令牌透传。上游 IDaaS 由本地假服务顶替。
 *
 * 换句话说：跑通它 = "除了 IDaaS 那一端，我们这边都是对的"。
 * 内网部署后如果登录失败，先跑这个：过了就说明问题在配置或上游，不在代码。
 *
 * 用法（仓库根目录）：
 *     node apps/api/scripts/e2e-oauth-login.mjs
 *     node apps/api/scripts/e2e-oauth-login.mjs --keep-logs   保留 Nest 日志输出
 *
 * 前置：先构建一次 npm run build:api（脚本会自动检查 dist 是否存在）
 */

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const keepLogs = process.argv.includes('--keep-logs');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` —— ${detail}` : ''}`);
    console.log(`  ❌ ${name}${detail ? `\n       ${detail}` : ''}`);
  }
}

/* ----------------------------------------------------------- 假 IDaaS */

function startStubIdaas() {
  const issued = new Map();
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://stub');
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      // 模拟用户在 IDaaS 完成登录后带 code 回跳
      if (url.pathname.endsWith('/authorize')) {
        const code = `CODE-${Math.random().toString(36).slice(2, 10)}`;
        issued.set(code, { used: false });
        const back = new URL(url.searchParams.get('redirect_uri'));
        back.searchParams.set('code', code);
        back.searchParams.set('state', url.searchParams.get('state') ?? '');
        res.writeHead(302, { Location: back.toString() }).end();
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      if (url.pathname.endsWith('/accesstoken')) {
        const payload = JSON.parse(body || '{}');
        const entry = issued.get(payload.code);
        if (!entry || entry.used) {
          res.end(JSON.stringify({ errorCode: 'E_10009', errorDesc: 'code Parameter error.' }));
          return;
        }
        entry.used = true; // 授权码一次性，与真实 IDaaS 行为一致
        res.end(JSON.stringify({ access_token: `AT-${payload.code}`, refresh_token: 'RT', expires_in: 1800 }));
        return;
      }
      if (url.pathname.endsWith('/userinfo')) {
        res.end(
          JSON.stringify({
            uuid: 'uuid~stub-dickson',
            w3Account: 'd00001',
            email: 'dickson@huawei.com',
            userName: 'Dickson',
            postName: '解决方案经理',
            deptName: 'MSS/交付与服务部',
          }),
        );
        return;
      }
      res.statusCode = 404;
      res.end('{}');
    });
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, port: server.address().port })));
}

/* -------------------------------------------------------------- Nest */

async function waitForHealth(baseUrl, timeoutMs = 40_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/api/v1/health`);
      if (res.ok) return await res.json();
    } catch {
      /* 还没起来 */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('Nest 在超时时间内没有就绪');
}

function run(command, args, options) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { ...options, stdio: keepLogs ? 'inherit' : 'ignore' });
    child.on('error', rejectRun);
    child.on('exit', (code) => (code === 0 ? resolveRun() : rejectRun(new Error(`${command} 退出码 ${code}`))));
  });
}

/* --------------------------------------------------------------- 主流程 */

async function main() {
  if (!existsSync(join(apiDir, 'dist', 'main.js'))) {
    console.error('\n✖ 未找到 apps/api/dist，先执行：npm run build:api\n');
    process.exit(2);
  }

  const workDir = mkdtempSync(join(tmpdir(), 'mssclaw-oauth-e2e-'));
  const dbPath = join(workDir, 'e2e.db');
  const stub = await startStubIdaas();
  const stubBase = `http://127.0.0.1:${stub.port}`;
  const port = 3100 + Math.floor(Math.random() * 400);
  const baseUrl = `http://127.0.0.1:${port}`;
  const redirectUri = `${baseUrl}/oauth/callback`;

  console.log('\n统一身份登录 · 本平台侧全链路验证');
  console.log(`假 IDaaS : ${stubBase}`);
  console.log(`Nest     : ${baseUrl}`);
  console.log(`临时库   : ${dbPath}\n`);

  const env = {
    ...process.env,
    DATABASE_URL: `file:${dbPath}`,
    PORT: String(port),
    AUTH_MODE: 'oauth',
    OAUTH_ISSUER_BASE: stubBase,
    OAUTH_CLIENT_ID: 'mssclaw-e2e',
    OAUTH_CLIENT_SECRET: 'e2e-secret-should-never-be-echoed',
    OAUTH_REDIRECT_URI: redirectUri,
    OAUTH_LOGOUT_REDIRECT: `${baseUrl}/`,
    OAUTH_JIT_PROVISION: '0',
    OAUTH_ALLOWED_EMAIL_DOMAINS: 'huawei.com',
    OAUTH_SESSION_TTL_HOURS: '12',
    OAUTH_DIAGNOSTICS: '1',
    OAUTH_DEBUG_USERINFO: '0',
    API_KEY: '',
    CORS_ORIGIN: baseUrl,
  };

  let nest;
  try {
    console.log('[1/3] 准备临时数据库…');
    await run('npx', ['prisma', 'migrate', 'deploy'], { cwd: apiDir, env });

    console.log('[2/3] 启动真实 Nest 进程…');
    nest = spawn('node', ['dist/main'], { cwd: apiDir, env, stdio: keepLogs ? 'inherit' : 'ignore' });
    const health = await waitForHealth(baseUrl);

    console.log('[3/3] 验证…\n');

    check('health 下发登录模式 = oauth', health?.auth?.mode === 'oauth', JSON.stringify(health?.auth));
    check('health 报告配置就绪', health?.auth?.ready === true);

    const config = await (await fetch(`${baseUrl}/api/v1/auth/config`)).json();
    check('GET /auth/config 返回 oauth', config.mode === 'oauth' && config.ready === true, JSON.stringify(config));

    const diag = await (await fetch(`${baseUrl}/api/v1/auth/oauth/diagnostics?ping=0`)).json();
    check('诊断接口 ready=true', diag.ready === true, JSON.stringify(diag.errors));
    check(
      '诊断接口不泄露 client_secret',
      !JSON.stringify(diag).includes('e2e-secret-should-never-be-echoed'),
    );
    check(
      '诊断接口回显授权链接供核对 redirect_uri',
      typeof diag.authorizeUrlSample === 'string' && diag.authorizeUrlSample.includes(encodeURIComponent(redirectUri)),
    );

    // 【安全红线】密码通道必须关死
    const pwd = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mcyo@huawei.com', password: 'mssclaw' }),
    });
    const pwdBody = await pwd.json().catch(() => ({}));
    check(
      '密码登录被拒（403 password_login_disabled）',
      pwd.status === 403 && JSON.stringify(pwdBody).includes('password_login_disabled'),
      `HTTP ${pwd.status} ${JSON.stringify(pwdBody)}`,
    );

    // 完整走一遍：authorize-url → (假 IDaaS 回跳) → callback → me
    const authorize = await (
      await fetch(`${baseUrl}/api/v1/auth/oauth/authorize-url?workspaceId=ws-mss-ai&returnTo=${encodeURIComponent('#/market-internal')}`)
    ).json();
    check('拿到授权地址与 state', authorize.ok === true && Boolean(authorize.url && authorize.state));
    check('授权地址参数完整', /response_type=code/.test(authorize.url ?? '') && /scope=base.profile/.test(authorize.url ?? ''));

    const redirected = await fetch(authorize.url, { redirect: 'manual' });
    const callbackUrl = new URL(redirected.headers.get('location'));
    const code = callbackUrl.searchParams.get('code');
    check('假 IDaaS 按 redirect_uri 回跳并带回 code', Boolean(code) && callbackUrl.origin === baseUrl);
    check('回跳原样带回 state', callbackUrl.searchParams.get('state') === authorize.state);

    const login = await (
      await fetch(`${baseUrl}/api/v1/auth/oauth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state: authorize.state, workspaceId: 'ws-mss-ai' }),
      })
    ).json();
    check('回调换到平台令牌', login.ok === true, JSON.stringify(login));
    check('身份映射到既有成员', login.user?.email === 'dickson@huawei.com', JSON.stringify(login.user));
    check('角色取自成员表而非上游', login.user?.platformRole === 'business_user');
    check('岗位与组织被写入', login.user?.postName === '解决方案经理' && Boolean(login.user?.orgPath));
    check('externalId 落库，便于日后账号变更仍可识别', login.user?.externalId === 'uuid~stub-dickson');
    check('返回 traceId 供日志关联', Boolean(login.traceId));

    // 令牌走的是既有会话体系
    const me = await (
      await fetch(`${baseUrl}/api/v1/auth/me?workspaceId=ws-mss-ai`, {
        headers: { Authorization: `Bearer ${login.token}` },
      })
    ).json();
    check('令牌可被既有 /auth/me 还原', me.ok === true && me.user?.email === 'dickson@huawei.com', JSON.stringify(me));

    // state 一次性
    const replay = await (
      await fetch(`${baseUrl}/api/v1/auth/oauth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state: authorize.state }),
      })
    ).json();
    check('同一 state 重放被拒', replay.ok === false && replay.code === 'oauth_state_invalid', JSON.stringify(replay));
    check('重放失败也带 traceId 与处置建议', Boolean(replay.traceId) && Boolean(replay.hint));

    // 登出联动
    const logoutUrl = await (await fetch(`${baseUrl}/api/v1/auth/oauth/logout-url`)).json();
    check('提供 IDaaS 登出地址', typeof logoutUrl.url === 'string' && logoutUrl.url.includes('/oauth2/logout'));

    await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${login.token}` },
      body: JSON.stringify({ workspaceId: 'ws-mss-ai' }),
    });
    const afterLogout = await (
      await fetch(`${baseUrl}/api/v1/auth/me?workspaceId=ws-mss-ai`, {
        headers: { Authorization: `Bearer ${login.token}` },
      })
    ).json();
    check('登出后令牌失效', afterLogout.ok === false, JSON.stringify(afterLogout));

    // 未登记用户（JIT 关闭）
    const authorize2 = await (await fetch(`${baseUrl}/api/v1/auth/oauth/authorize-url`)).json();
    const redirected2 = await fetch(authorize2.url, { redirect: 'manual' });
    const code2 = new URL(redirected2.headers.get('location')).searchParams.get('code');
    // 篡改授权码：假 IDaaS 会按真实行为回 E_10009
    const tampered = await (
      await fetch(`${baseUrl}/api/v1/auth/oauth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: `${code2}-tampered`, state: authorize2.state }),
      })
    ).json();
    check(
      '无效授权码被上游拒绝且不签发令牌',
      tampered.ok === false && tampered.code === 'oauth_exchange_failed' && !tampered.token,
      JSON.stringify(tampered),
    );
    // 必须是"上游明确拒绝"，不能是网络超时之类的其它原因蒙混过关
    check(
      '失败原因确实来自上游错误码 E_10009',
      typeof tampered.detail === 'string' && tampered.detail.includes('E_10009'),
      tampered.detail,
    );
    check(
      '上游错误码被翻成可操作提示',
      typeof tampered.hint === 'string' && /code/i.test(tampered.hint),
      tampered.hint,
    );

    // 授权码一次性：拿已经换过的 code 再换一次必须失败
    const authorize3 = await (await fetch(`${baseUrl}/api/v1/auth/oauth/authorize-url`)).json();
    const redirected3 = await fetch(authorize3.url, { redirect: 'manual' });
    const code3 = new URL(redirected3.headers.get('location')).searchParams.get('code');
    const first = await (
      await fetch(`${baseUrl}/api/v1/auth/oauth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code3, state: authorize3.state }),
      })
    ).json();
    const authorize4 = await (await fetch(`${baseUrl}/api/v1/auth/oauth/authorize-url`)).json();
    const reusedCode = await (
      await fetch(`${baseUrl}/api/v1/auth/oauth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code3, state: authorize4.state }),
      })
    ).json();
    check('授权码一次性：首次可用', first.ok === true, JSON.stringify(first));
    check(
      '授权码一次性：换过的 code 再用必失败',
      reusedCode.ok === false && reusedCode.code === 'oauth_exchange_failed',
      JSON.stringify(reusedCode),
    );
  } finally {
    nest?.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 300));
    stub.server.close();
    try {
      rmSync(workDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  console.log(`\n──────── 结果：${passed} 通过 / ${failed} 失败 ────────\n`);
  if (failed) {
    for (const line of failures) console.log(`  · ${line}`);
    console.log('\n  本平台侧存在问题，先修这里再去排查 IDaaS 配置。\n');
    process.exitCode = 1;
    return;
  }
  console.log('  ✅ 除 IDaaS 那一端外，登录全链路均已验证通过。');
  console.log('     真实环境若仍登录失败，问题在配置或上游，按下面两步走：');
  console.log('       node apps/api/scripts/preflight-uniportal-oauth.mjs   （验配置，无需真人）');
  console.log('       curl .../api/v1/auth/oauth/diagnostics                （验部署机连通性）\n');
}

main().catch((error) => {
  console.error(`\n✖ 验证异常：${error.message}\n`);
  process.exit(1);
});
