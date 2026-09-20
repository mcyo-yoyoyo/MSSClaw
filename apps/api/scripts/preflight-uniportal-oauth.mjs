#!/usr/bin/env node
/**
 * UniPortal(IDaaS) 配置预检 —— 打真实 IDaaS，但【不需要任何人登录】。
 *
 * 为什么能做到：授权码流程里只有"用户在 IDaaS 输密码"那一步需要真人，
 * 而 client_id / redirect_uri / client_secret 这三项是否注册正确，
 * 可以靠「故意用错参数看上游回什么错误码」反推出来：
 *
 *   - 拿真 client_id + 真 redirect_uri 打 authorize：
 *       跳错误页 → 参数有问题（错误码会告诉你是哪个）
 *       跳登录页 → 两项都被 IDaaS 接受了
 *   - 拿真 client_id + 真 client_secret + 一个瞎编的 code 打 accesstoken：
 *       回 E_10001 / E_10002 → 对应 id 或 secret 配错了
 *       只回 E_10009（code 错）→ 该上游先校验 code，这条路推不出 secret
 *
 * 每项都配了"对照组"（故意填错的那次），用来确认上游确实在校验这一项，
 * 避免把"上游根本没检查"误判成"配置正确"。
 *
 * 【实测结论】uniportal-beta 的 accesstoken 是先校验 code 的：真假 secret 都回
 * E_10009。所以 client_secret 无法在没有真实授权码的情况下验证——它只能在一次
 * 真人登录里被验到（probe 脚本走的就是真实换码，secret 错了那里必报 E_10002）。
 * client_id 与 redirect_uri 则可以完全无人验证，走 authorize 那条路。
 *
 * 用法（仓库根目录）：
 *     node apps/api/scripts/preflight-uniportal-oauth.mjs
 *     node apps/api/scripts/preflight-uniportal-oauth.mjs --env-file=apps/api/.env.oauth
 *
 * 参数：
 *     --env-file=<path>  指定配置文件，默认依次找 apps/api/.env.oauth、apps/api/.env
 *     --proxy            强制走 HTTPS_PROXY（默认先直连，失败再按需回退）
 *     --no-proxy         禁止回退代理
 *     --json             只输出机器可读的 JSON 结果
 *
 * 全部通过后，还剩两件必须真人做的事：
 *   1. 在浏览器完成一次登录，确认 userinfo 实际返回哪些字段
 *      → node apps/api/scripts/probe-uniportal-userinfo.mjs
 *   2. 在部署环境点一次完整登录，确认会话与权限正确
 *
 * 本脚本不会打印 client_secret。
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lookup } from 'node:dns/promises';
import { ProxyAgent, fetch as undiciFetch } from 'undici';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};
const jsonOnly = flag('json');

if (flag('help') || flag('h')) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
  process.exit(0);
}

/* ----------------------------------------------------------------- 配置 */

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return out;
}

const envFiles = opt('env-file')
  ? [resolve(process.cwd(), opt('env-file'))]
  : [resolve(repoRoot, 'apps/api/.env.oauth'), resolve(repoRoot, 'apps/api/.env')];
const fileEnv = envFiles.reduce((acc, path) => ({ ...parseEnvFile(path), ...acc }), {});
const conf = (key, fallback = '') => process.env[key]?.trim() || fileEnv[key] || fallback;

const base = conf('OAUTH_ISSUER_BASE').replace(/\/$/, '');
const clientId = conf('OAUTH_CLIENT_ID');
const clientSecret = conf('OAUTH_CLIENT_SECRET');
const redirectUri = conf('OAUTH_REDIRECT_URI');
const scope = conf('OAUTH_SCOPE', 'base.profile');
const display = conf('OAUTH_DISPLAY', 'page');
const timeoutMs = Number(conf('OAUTH_HTTP_TIMEOUT_MS', '10000')) || 10000;
const proxyUrl = flag('no-proxy')
  ? ''
  : conf('HTTPS_PROXY') || process.env.https_proxy?.trim() || '';

/* ------------------------------------------------------------- 结果收集 */

const results = [];
const record = (name, status, detail, hint = '') => {
  results.push({ name, status, detail, hint });
  if (jsonOnly) return;
  const icon = { pass: '✅', fail: '❌', warn: '⚠️ ', info: '· ', skip: '⏭ ' }[status] ?? '· ';
  console.log(`${icon} ${name}`);
  if (detail) console.log(`     ${detail}`);
  if (hint) console.log(`     → ${hint}`);
};

function describeError(error) {
  const parts = [];
  let cur = error;
  for (let i = 0; i < 5 && cur; i += 1) {
    if (cur.code) parts.push(String(cur.code));
    else if (cur.message) parts.push(String(cur.message));
    cur = cur.cause;
  }
  return parts.join(' → ') || String(error);
}

/* ------------------------------------------------------------- HTTP 层 */

async function send(url, { method = 'GET', body } = {}) {
  const attempt = async (via, dispatcher) => {
    const res = await undiciFetch(url, {
      method,
      dispatcher,
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
      headers: body
        ? { 'Content-Type': 'application/json', Accept: 'application/json' }
        : { Accept: 'application/json,text/html' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      via,
      status: res.status,
      location: res.headers.get('location') ?? '',
      text: await res.text(),
    };
  };

  if (!flag('proxy')) {
    try {
      return await attempt('direct', undefined);
    } catch (error) {
      if (!proxyUrl) throw error;
      if (!jsonOnly) console.log(`     （直连失败 ${describeError(error)}，改走代理重试）`);
    }
  }
  if (!proxyUrl) throw new Error('指定了 --proxy 但没有 HTTPS_PROXY');
  const agent = new ProxyAgent(proxyUrl);
  try {
    return await attempt('proxy', agent);
  } finally {
    void agent.close().catch(() => undefined);
  }
}

/** authorize 的结果：要么跳错误页（带 error_code），要么进登录流程 */
function readAuthorizeOutcome(res) {
  const target = res.location || '';
  const codeInLocation = /error_code=([A-Za-z0-9_]+)/.exec(target)?.[1];
  const codeInBody = /error_code=([A-Za-z0-9_]+)/.exec(res.text)?.[1];
  const errorCode = codeInLocation ?? codeInBody ?? '';
  const isErrorPage = /\/error\//.test(target) || Boolean(errorCode);
  return { errorCode, isErrorPage, target, status: res.status };
}

function authorizeUrl({ id = clientId, redirect = redirectUri } = {}) {
  const qs = new URLSearchParams({
    client_id: id,
    response_type: 'code',
    redirect_uri: redirect,
    scope,
    display,
    state: 'preflight',
  });
  return `${base}/saaslogin1/oauth2/authorize?${qs.toString()}`;
}

async function postToken({ id = clientId, secret = clientSecret, code = 'PREFLIGHT_INVALID_CODE' } = {}) {
  const res = await send(`${base}/saaslogin1/oauth2/accesstoken`, {
    method: 'POST',
    body: {
      client_id: id,
      client_secret: secret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
    },
  });
  let json;
  try {
    json = JSON.parse(res.text);
  } catch {
    json = null;
  }
  return { res, json, errorCode: json?.errorCode ?? '' };
}

/* ------------------------------------------------------------- 检查项 */

async function checkConfigPresence() {
  const missing = [];
  if (!base) missing.push('OAUTH_ISSUER_BASE');
  if (!clientId) missing.push('OAUTH_CLIENT_ID');
  if (!clientSecret) missing.push('OAUTH_CLIENT_SECRET');
  if (!redirectUri) missing.push('OAUTH_REDIRECT_URI');
  if (missing.length) {
    record(
      '配置完整性',
      'fail',
      `缺少 ${missing.join('、')}`,
      `先 cp deploy/oauth.env.example apps/api/.env.oauth 并填写；已读取 ${envFiles.filter(existsSync).join('、') || '(无配置文件)'}`,
    );
    return false;
  }
  record(
    '配置完整性',
    'pass',
    `issuer=${base} client_id=${clientId} secret=已配置(${clientSecret.length}位)\n     redirect_uri=${redirectUri}`,
  );

  try {
    const url = new URL(redirectUri);
    if (url.search || url.hash) {
      record('redirect_uri 格式', 'fail', `${redirectUri} 带了 query 或 # 片段`, '回调地址必须是干净的路径');
      return false;
    }
    record('redirect_uri 格式', 'pass', `${url.protocol}//${url.host}${url.pathname}`);
  } catch {
    record('redirect_uri 格式', 'fail', `${redirectUri} 不是合法的绝对 URL`, '必须形如 https://域名[:端口]/oauth/callback');
    return false;
  }
  return true;
}

async function checkNetwork() {
  const host = new URL(base).hostname;
  try {
    const { address } = await lookup(host);
    record('DNS 解析', 'pass', `${host} → ${address}`);
  } catch (error) {
    record('DNS 解析', 'fail', `${host} 解析失败：${describeError(error)}`, '确认服务器 DNS，或配 HTTPS_PROXY 走代理出网');
    return false;
  }
  try {
    const res = await send(`${base}/saaslogin1/oauth2/authorize`);
    record('HTTPS 连通', 'pass', `HTTP ${res.status}（${res.via}）`);
    return true;
  } catch (error) {
    const text = describeError(error);
    const hint = /CERT|SELF_SIGNED|UNABLE_TO_VERIFY/i.test(text)
      ? 'TLS 证书校验失败，需要导入企业根证书'
      : /ENOTFOUND|ECONNREFUSED|TIMEOUT/i.test(text)
        ? '端口不通或被拦截，确认出网策略，或开 OAUTH_PROXY_ENABLED=1'
        : '检查服务器到 IDaaS 的连通性';
    record('HTTPS 连通', 'fail', text, hint);
    return false;
  }
}

async function checkClientIdAndRedirect() {
  // 对照组：故意用一个不存在的 client_id，确认上游确实会因此报错
  const control = readAuthorizeOutcome(await send(authorizeUrl({ id: `${clientId}-preflight-bogus` })));
  if (!control.isErrorPage) {
    record(
      '对照组（错误 client_id）',
      'warn',
      `上游没有因为伪造的 client_id 报错（HTTP ${control.status} → ${control.target || '无跳转'}）`,
      '本脚本对 client_id / redirect_uri 的判断依赖上游会拒绝错误参数；这里没拒绝，下面两项结论仅供参考',
    );
  } else {
    record('对照组（错误 client_id）', 'pass', `上游按预期拒绝，error_code=${control.errorCode || '(未给码)'}`);
  }

  const real = readAuthorizeOutcome(await send(authorizeUrl()));
  if (!real.isErrorPage) {
    record(
      'client_id + redirect_uri 注册',
      'pass',
      `真实参数未被拒绝（HTTP ${real.status}，进入登录流程）`,
      '说明这两项都已在 IDaaS 正确注册',
    );
    return true;
  }

  const code = real.errorCode;
  const reason =
    code === 'E_10001'
      ? 'client_id 不正确或未注册'
      : code === 'E_10003'
        ? 'redirect_uri 与注册值不一致'
        : '参数被 IDaaS 拒绝';
  record(
    'client_id + redirect_uri 注册',
    'fail',
    `error_code=${code || '(未给码)'} —— ${reason}`,
    code === 'E_10003' || !code
      ? `逐字符核对注册值与：${redirectUri}（协议/域名/端口/文根都要一致）`
      : '核对 OAUTH_CLIENT_ID 与 IDaaS 注册值',
  );
  return false;
}

async function checkClientSecret(clientIdOk) {
  if (!clientIdOk) {
    record(
      'client_secret 校验',
      'skip',
      'client_id 尚未通过，secret 无从验证',
      '先把 client_id / redirect_uri 修对再重跑',
    );
    return false;
  }
  // 真 secret + 瞎编的 code：若只报 code 错，说明 id/secret 都已过校验
  const real = await postToken();
  if (!real.json) {
    record(
      'client_secret 校验',
      'fail',
      `accesstoken 返回非 JSON（HTTP ${real.res.status}）：${real.res.text.slice(0, 160).replace(/\s+/g, ' ')}`,
      '多半是 OAUTH_ISSUER_BASE 配错，或被网关拦截',
    );
    return false;
  }

  // 对照组：故意用错的 secret，确认上游确实会因此报不同的错
  const control = await postToken({ secret: `${clientSecret}-preflight-bogus` });

  if (real.errorCode === 'E_10001') {
    record('client_secret 校验', 'fail', `client_id 被拒：${real.errorCode} ${real.json.errorDesc ?? ''}`, '先修 OAUTH_CLIENT_ID');
    return false;
  }
  if (real.errorCode === 'E_10002') {
    record('client_secret 校验', 'fail', `${real.errorCode} ${real.json.errorDesc ?? ''}`, '核对 OAUTH_CLIENT_SECRET，注意别把测试的填到生产');
    return false;
  }
  if (real.errorCode && real.errorCode !== control.errorCode) {
    record(
      'client_secret 校验',
      'pass',
      `真 secret 回 ${real.errorCode}（code 无效，符合预期），错 secret 回 ${control.errorCode || '(无码)'}`,
      '两者不同说明上游确实在校验 secret，且我们这把是对的',
    );
    return true;
  }
  if (real.errorCode && real.errorCode === control.errorCode) {
    record(
      'client_secret 校验',
      'warn',
      `真假 secret 都回 ${real.errorCode}：该上游先校验 code，无法用假 code 反推 secret`,
      'secret 只能靠一次真实换码验证：跑 probe-uniportal-userinfo.mjs，' +
        'secret 若不对那里会明确报 E_10002',
    );
    return true;
  }
  record('client_secret 校验', 'warn', `未返回 errorCode，原始响应：${real.res.text.slice(0, 160)}`, '人工确认上游行为');
  return true;
}

async function checkUserInfoEndpoint() {
  const res = await send(`${base}/saaslogin1/oauth2/userinfo`, {
    method: 'POST',
    body: { client_id: clientId, access_token: 'PREFLIGHT_INVALID_TOKEN', scope },
  });
  let json;
  try {
    json = JSON.parse(res.text);
  } catch {
    json = null;
  }
  if (json?.errorCode) {
    record('userinfo 端点', 'pass', `路径可达，按预期拒绝无效令牌（${json.errorCode}）`);
    return true;
  }
  if (json) {
    record('userinfo 端点', 'warn', `无效令牌竟然没报错：${JSON.stringify(json).slice(0, 160)}`, '人工确认上游行为');
    return true;
  }
  record(
    'userinfo 端点',
    'fail',
    `HTTP ${res.status} 返回非 JSON：${res.text.slice(0, 160).replace(/\s+/g, ' ')}`,
    '核对 OAUTH_ISSUER_BASE 与 /saaslogin1 文根',
  );
  return false;
}

/* ------------------------------------------------------------------ 主 */

async function main() {
  if (!jsonOnly) {
    console.log('\nUniPortal OAuth2 配置预检（不需要任何人登录）');
    console.log(`配置来源：${envFiles.filter(existsSync).join('、') || '(仅进程环境)'}`);
    console.log(`代理：${proxyUrl || '不使用'}\n`);
  }

  if (!(await checkConfigPresence())) return finish();
  if (!(await checkNetwork())) return finish();
  const clientIdOk = await checkClientIdAndRedirect();
  await checkClientSecret(clientIdOk);
  await checkUserInfoEndpoint();
  finish();
}

function finish() {
  const failed = results.filter((r) => r.status === 'fail');
  const warned = results.filter((r) => r.status === 'warn');

  if (jsonOnly) {
    console.log(JSON.stringify({ ok: failed.length === 0, results }, null, 2));
    process.exitCode = failed.length ? 1 : 0;
    return;
  }

  console.log('\n──────── 结论 ────────\n');
  if (failed.length) {
    console.log(`  ❌ ${failed.length} 项不通过，先修这些：`);
    for (const item of failed) console.log(`     · ${item.name}：${item.hint || item.detail}`);
  } else {
    console.log('  ✅ 服务端配置与上游契约均已验证通过。');
  }
  if (warned.length) {
    console.log(`\n  ⚠️  ${warned.length} 项需人工确认：`);
    for (const item of warned) console.log(`     · ${item.name}：${item.detail}`);
  }

  console.log('\n  本脚本能验到的：网络连通、client_id、redirect_uri、端点路径。');
  console.log('  验不到、必须真人登录一次的：');
  console.log('     1. client_secret 是否正确（上游先校验 code，假 code 推不出来）');
  console.log('     2. userinfo 实际返回哪些字段');
  console.log('        以上两件一次搞定：node apps/api/scripts/probe-uniportal-userinfo.mjs');
  console.log('     3. 部署环境点一次完整登录，确认会话与权限');
  console.log('\n  本平台自身的全链路（不碰 IDaaS）可用：');
  console.log('        node apps/api/scripts/e2e-oauth-login.mjs\n');

  process.exitCode = failed.length ? 1 : 0;
}

main().catch((error) => {
  console.error(`\n✖ 预检异常：${describeError(error)}\n`);
  process.exit(1);
});
