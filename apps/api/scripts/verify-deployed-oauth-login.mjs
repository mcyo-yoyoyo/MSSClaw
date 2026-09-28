#!/usr/bin/env node
/**
 * 对已部署的 MSSClaw API 做一次真人 OAuth 登录验收，不依赖前端。
 *
 * 用法（仓库根目录）：
 *   npm run verify:oauth:deployed -- --api-base=https://cbg-beta.test.huawei.com
 *
 * 脚本会打印 UniPortal 授权地址。浏览器登录后，即使回调页显示 403/404，
 * 只要地址栏仍有 code/state，把整条 URL 粘回终端即可。
 *
 * 非交互运行（供测试或已有回调 URL 时使用）：
 *   npm run verify:oauth:deployed -- \
 *     --api-base=https://cbg-beta.test.huawei.com \
 *     '--callback-url=https://example.com/oauth/callback?code=...&state=...'
 *
 * 可选环境变量：MSSCLAW_API_KEY（后端启用了 API_KEY 时使用）。
 * 本脚本不读取、接收或打印 OAUTH_CLIENT_SECRET；换码始终由已部署后端完成。
 */

import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback = '') => {
  const prefix = `--${name}=`;
  const hit = argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
};

if (flag('help') || flag('h')) {
  console.log(`
MSSClaw 已部署后端 OAuth 真人登录验收

用法：
  npm run verify:oauth:deployed -- --api-base=https://域名

参数：
  --api-base=<url>       API 所在站点根地址，默认 http://127.0.0.1:3000
  --workspace-id=<id>    工作区，默认 ws-mss-ai
  --return-to=<hash>     登录后业务路由，仅用于签发 state，默认 #/home
  --callback-url=<url>   已有回调 URL 时跳过终端粘贴
  --timeout-ms=<ms>      单次 API 请求超时，默认 20000

环境变量：
  MSSCLAW_API_BASE       --api-base 的默认值
  MSSCLAW_API_KEY        后端启用 API_KEY 时发送 X-API-Key
`);
  process.exit(0);
}

const apiBase = opt('api-base', process.env.MSSCLAW_API_BASE || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const workspaceId = opt('workspace-id', 'ws-mss-ai');
const returnTo = opt('return-to', '#/home');
const presetCallbackUrl = opt('callback-url');
const apiKey = process.env.MSSCLAW_API_KEY?.trim() || '';
const timeoutMs = Number(opt('timeout-ms', '20000'));

function fail(message, detail = '') {
  const error = new Error(detail ? `${message}\n  ${detail}` : message);
  error.name = 'OAuthVerificationError';
  throw error;
}

function validateOptions() {
  let url;
  try {
    url = new URL(apiBase);
  } catch {
    fail('api-base 不是合法 URL', apiBase);
  }
  if (!['http:', 'https:'].includes(url.protocol)) fail('api-base 只支持 http/https', apiBase);
  if (url.pathname !== '/' || url.search || url.hash) {
    fail('api-base 只填站点根地址，不要带 /api、query 或 hash', `当前值：${apiBase}`);
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) fail('timeout-ms 必须是正数');
}

function preview(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > 500 ? `${text.slice(0, 500)}…` : text;
}

async function request(path, init = {}) {
  const headers = {
    Accept: 'application/json',
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    ...(init.headers || {}),
  };
  let response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    fail(`请求失败：${path}`, error instanceof Error ? error.message : String(error));
  }
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    fail(`接口没有返回 JSON：${path}`, `HTTP ${response.status} ${preview(text)}`);
  }
  return { response, body };
}

function requireHttpOk(label, result) {
  if (!result.response.ok) {
    fail(label, `HTTP ${result.response.status} ${preview(result.body)}`);
  }
  return result.body;
}

function callbackParams(input) {
  const raw = input.trim();
  if (!raw) fail('没有收到回调 URL');

  let params;
  if (/^https?:\/\//i.test(raw)) {
    let url;
    try {
      url = new URL(raw);
    } catch {
      fail('回调 URL 格式不正确', raw);
    }
    params = url.searchParams;
  } else if (raw.includes('code=') || raw.includes('error=')) {
    params = new URLSearchParams(raw.replace(/^.*\?/, '').replace(/^\?/, ''));
  } else {
    fail('请粘贴同时包含 code 和 state 的完整回调 URL 或查询串');
  }

  const upstreamError = params.get('error') || params.get('errorCode') || params.get('error_code');
  if (upstreamError) {
    fail(
      `UniPortal 拒绝了授权：${upstreamError}`,
      params.get('error_description') || params.get('errorDesc') || '',
    );
  }
  return {
    code: params.get('code') || '',
    state: params.get('state') || '',
  };
}

async function readCallbackUrl() {
  if (presetCallbackUrl) return presetCallbackUrl;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(
      '\n浏览器登录并回跳后，把地址栏中的整条 URL 粘到这里。\n' +
        '回调页显示 403/404 不影响，只要 URL 里还有 code 和 state。\n> ',
    );
  } finally {
    rl.close();
  }
}

function maskedToken(token) {
  return token.length > 16 ? `${token.slice(0, 8)}…${token.slice(-6)}` : '已签发';
}

async function main() {
  validateOptions();
  console.log(`\nMSSClaw 后端 OAuth 真人登录验收\nAPI       : ${apiBase}\nWorkspace : ${workspaceId}\n`);

  console.log('[1/8] 检查已部署 API 与登录模式…');
  const health = requireHttpOk('健康检查失败', await request('/api/v1/health'));
  if (!health.auth) fail('当前部署不是包含 OAuth 登录的 API 版本', 'GET /api/v1/health 缺少 auth 字段');
  if (health.auth.mode !== 'oauth') fail('后端没有启用 OAuth', `health.auth.mode=${health.auth.mode}`);
  if (health.auth.ready === false) fail('后端 OAuth 配置不完整', 'health.auth.ready=false');
  console.log('  ✓ health.auth = oauth，配置已就绪');

  console.log('[2/8] 检查部署机到 UniPortal 的连通性…');
  const diagnosticsResult = await request('/api/v1/auth/oauth/diagnostics');
  if (
    diagnosticsResult.response.status === 404 &&
    JSON.stringify(diagnosticsResult.body).includes('diagnostics_disabled')
  ) {
    console.log('  - diagnostics 已关闭，跳过预检并继续真人登录');
  } else {
    const diagnostics = requireHttpOk('OAuth diagnostics 请求失败', diagnosticsResult);
    if (diagnostics.ready !== true) fail('OAuth diagnostics.ready 不是 true', preview(diagnostics.errors || diagnostics));
    if (diagnostics.upstream?.ok !== true) fail('部署机无法连通 UniPortal', preview(diagnostics.upstream || diagnostics));
    const registeredRedirect = diagnostics.authorizeUrlSample
      ? new URL(diagnostics.authorizeUrlSample).searchParams.get('redirect_uri')
      : '';
    console.log(`  ✓ ready=true，upstream.ok=true${registeredRedirect ? `\n    redirect_uri=${registeredRedirect}` : ''}`);
  }

  console.log('[3/8] 确认密码登录通道已关闭…');
  const passwordLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'oauth-backend-check@example.invalid',
      password: 'not-used',
      workspaceId,
    }),
  });
  if (
    passwordLogin.response.status !== 403 ||
    !JSON.stringify(passwordLogin.body).includes('password_login_disabled')
  ) {
    fail('密码登录没有被关死', `HTTP ${passwordLogin.response.status} ${preview(passwordLogin.body)}`);
  }
  console.log('  ✓ POST /auth/login = 403 password_login_disabled');

  console.log('[4/8] 向后端申请一次性 state 与授权地址…');
  const query = new URLSearchParams({ workspaceId, returnTo });
  const authorize = requireHttpOk(
    '获取授权地址失败',
    await request(`/api/v1/auth/oauth/authorize-url?${query.toString()}`),
  );
  if (authorize.ok !== true || !authorize.url) fail('后端没有返回授权地址', preview(authorize));
  const issuedState = authorize.state || new URL(authorize.url).searchParams.get('state') || '';
  if (!issuedState) fail('授权地址中缺少 state', preview(authorize));
  console.log(`  ✓ state 已签发，浏览器打开：\n\n${authorize.url}\n`);

  console.log('[5/8] 等待真人在浏览器完成 UniPortal 登录…');
  const returned = callbackParams(await readCallbackUrl());
  if (!returned.code) fail('回调中缺少 code');
  if (!returned.state) fail('回调中缺少 state，请粘贴整条回调 URL，而不是只粘查询片段');
  if (returned.state !== issuedState) fail('回调 state 与后端签发值不一致', `issued=${issuedState} returned=${returned.state}`);
  console.log('  ✓ code/state 已取得且 state 一致');

  console.log('[6/8] 让已部署后端换码、读取 userinfo 并签发平台会话…');
  const callback = requireHttpOk(
    '后端 callback 请求失败',
    await request('/api/v1/auth/oauth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: returned.code,
        state: returned.state,
        visitorId: `oauth-backend-test-${randomUUID()}`,
      }),
    }),
  );
  if (callback.ok !== true || !callback.token) {
    const hint = callback.code === 'oauth_identity_unmapped'
      ? `UniPortal 已登录成功，但测试账号尚未加入 ${workspaceId} 成员表。先加成员，再重新获取一枚授权码。`
      : callback.hint || callback.detail || '';
    fail(`OAuth callback 未完成：${callback.code || callback.error || 'unknown'}`, hint);
  }
  console.log(
    `  ✓ 平台会话已签发 (${maskedToken(callback.token)})\n` +
      `    user=${callback.user?.email || callback.user?.name || callback.user?.id || '(unknown)'} ` +
      `role=${callback.user?.platformRole || '(unknown)'} trace=${callback.traceId || '(none)'}`,
  );

  const sessionHeaders = {
    Authorization: `Bearer ${callback.token}`,
    'X-Session-Token': callback.token,
  };
  console.log('[7/8] 验证 /auth/me 能还原平台身份…');
  const me = requireHttpOk(
    '/auth/me 请求失败',
    await request(`/api/v1/auth/me?workspaceId=${encodeURIComponent(workspaceId)}`, {
      headers: sessionHeaders,
    }),
  );
  if (me.ok !== true) fail('/auth/me 没有接受新会话', preview(me));
  if (!callback.user?.id || me.user?.id !== callback.user.id || me.user?.workspaceId !== workspaceId) {
    fail('/auth/me 还原的用户或工作区与 callback 不一致', preview({ callback: callback.user, me: me.user }));
  }
  console.log(`  ✓ /auth/me = ok，workspace=${me.user?.workspaceId || workspaceId}`);

  console.log('[8/8] 注销平台会话并确认旧 token 失效…');
  const logoutUrlResult = await request('/api/v1/auth/oauth/logout-url', { headers: sessionHeaders });
  const idaasLogoutUrl = logoutUrlResult.response.ok ? logoutUrlResult.body?.url || '' : '';
  const logout = requireHttpOk(
    '平台 logout 请求失败',
    await request('/api/v1/auth/logout', {
      method: 'POST',
      headers: { ...sessionHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId }),
    }),
  );
  if (logout.ok !== true) fail('平台 logout 没有成功', preview(logout));
  const afterLogout = requireHttpOk(
    '登出后的 /auth/me 请求失败',
    await request(`/api/v1/auth/me?workspaceId=${encodeURIComponent(workspaceId)}`, {
      headers: sessionHeaders,
    }),
  );
  if (afterLogout.ok !== false) fail('旧 token 在登出后仍然有效', preview(afterLogout));
  console.log('  ✓ 平台会话已失效');

  console.log('\n✅ 后端 OAuth 登录流程验证通过：真实授权、换码、userinfo、成员映射、平台会话与登出均成功。');
  if (idaasLogoutUrl) {
    console.log(`\n最后请在刚才的浏览器打开下面地址，验证 UniPortal SSO 也被退出：\n${idaasLogoutUrl}\n`);
  } else {
    console.log('\n⚠ 未配置 OAUTH_LOGOUT_REDIRECT；平台会话已退出，但本次没有验证 UniPortal SSO 退出。\n');
  }
}

main().catch((error) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
