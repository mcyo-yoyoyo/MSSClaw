#!/usr/bin/env node
/**
 * UniPortal(IDaaS) OAuth2 探针：实测 /oauth2/userinfo 到底返回哪些字段。
 *
 * 为什么需要它：接口文档说「默认只返回 uuid，其它属性在管理平台按应用配置」。
 * 附加属性配没配、字段叫什么名字（account / w3Account / postName / …），
 * 只有对着真实环境跑一次才知道。身份映射方案依赖这个结果，见
 * docs/auth-oauth-login-design.md §5。
 *
 * 跑完会打印三段：
 *   1. userinfo 的原始 JSON（不做任何裁剪）
 *   2. 字段清单：key / 类型 / 样例值
 *   3. 映射体检：平台需要的「账号、姓名、岗位、部门」各由哪个字段满足，缺哪些
 *
 * 用法（仓库根目录执行）：
 *
 *   # A. 回调地址注册的是 localhost —— 全自动，脚本起本地服务收 code
 *   node apps/api/scripts/probe-uniportal-userinfo.mjs --env=beta --serve
 *
 *   # B. 回调地址是测试域名 —— 脚本打印授权链接，浏览器登录后把回调 URL 粘回来
 *   node apps/api/scripts/probe-uniportal-userinfo.mjs --env=beta
 *
 *   # C. 已经有 code（30 分钟内、且没用过）
 *   node apps/api/scripts/probe-uniportal-userinfo.mjs --env=beta --code=ANXxSN...
 *
 *   # D. 已经有 access_token（30 分钟内）—— 管理平台调完附加属性后反复验证用这个
 *   node apps/api/scripts/probe-uniportal-userinfo.mjs --env=beta --access-token=3130...
 *
 * 凭据来源（优先级从高到低）：命令行 > 进程环境 > apps/api/.env
 *   OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET / OAUTH_REDIRECT_URI / OAUTH_SCOPE
 *
 * 其它参数：
 *   --base=<url>        直接指定 IDaaS 根地址，覆盖 --env
 *   --scope=<scope>     默认 base.profile
 *   --serve             起本地回调服务（要求 redirect_uri 是 localhost/127.0.0.1）
 *   --proxy             强制走 HTTPS_PROXY；默认先直连，失败再按需回退代理
 *   --no-proxy          禁止回退代理
 *   --show-token        打印完整 access_token / refresh_token（默认打码）
 *   --out=<file>        把 userinfo 原始 JSON 另存一份
 *
 * 注意：client_secret 不会被打印、不会写进 --out 文件。
 */

import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { randomBytes } from 'node:crypto';
import { ProxyAgent, fetch as undiciFetch } from 'undici';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const HOSTS = {
  beta: 'https://uniportal-beta.huawei.com',
  prod: 'https://uniportal.huawei.com',
};

const DIRECT_TIMEOUT_MS = 10_000;
const PROXY_TIMEOUT_MS = 20_000;

/* ------------------------------------------------------------------ 参数 */

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

if (flag('help') || flag('h')) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
  process.exit(0);
}

/** apps/api/.env 里的 KEY=VALUE（支持引号），仅在进程环境缺失时兜底 */
function readDotEnv() {
  const envPath = resolve(repoRoot, 'apps', 'api', '.env');
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return out;
}

const dotEnv = readDotEnv();
const conf = (cliName, envName, fallback) =>
  opt(cliName) ?? process.env[envName]?.trim() ?? dotEnv[envName] ?? fallback;

const envName = opt('env') ?? 'beta';
const base = (opt('base') ?? conf('base', 'OAUTH_ISSUER_BASE', HOSTS[envName]))?.replace(/\/$/, '');
const clientId = conf('client-id', 'OAUTH_CLIENT_ID');
const clientSecret = conf('client-secret', 'OAUTH_CLIENT_SECRET');
const redirectUri = conf('redirect-uri', 'OAUTH_REDIRECT_URI');
const scope = conf('scope', 'OAUTH_SCOPE', 'base.profile');
const showToken = flag('show-token');
const outFile = opt('out');
const presetCode = opt('code');
const presetAccessToken = opt('access-token');

function die(message, hint) {
  console.error(`\n✖ ${message}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
}

if (!base) die('未确定 IDaaS 地址', '用 --env=beta|prod 或 --base=https://…');
if (!presetAccessToken) {
  if (!clientId) die('缺少 client_id', '用 --client-id= 或在 apps/api/.env 配 OAUTH_CLIENT_ID');
  if (!presetCode && !redirectUri) {
    die('缺少 redirect_uri', '必须与 IDaaS 注册值逐字符一致（协议/域名/端口/文根）');
  }
  if (!presetAccessToken && !clientSecret) {
    die('缺少 client_secret', '换取 access_token 必须提供；用 --client-secret= 或 OAUTH_CLIENT_SECRET');
  }
}

/* ------------------------------------------------------------- HTTP 出网 */

function proxyUrl() {
  if (flag('no-proxy')) return undefined;
  return (
    process.env.HTTPS_PROXY?.trim() ||
    process.env.https_proxy?.trim() ||
    dotEnv.HTTPS_PROXY ||
    undefined
  );
}

/**
 * 先直连、失败再按需回退代理 —— 与 ai-news-archive.service.ts 同一套路数。
 * 用 undici 自带 fetch：ProxyAgent 来自这个包，跨实例传 dispatcher 不保证生效。
 */
async function postJson(url, body) {
  const attempt = async (via, dispatcher, timeoutMs) => {
    const res = await undiciFetch(url, {
      method: 'POST',
      dispatcher,
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }
    return { via, status: res.status, json, text };
  };

  const forceProxy = flag('proxy');
  const proxy = proxyUrl();

  if (!forceProxy) {
    try {
      return await attempt('direct', undefined, DIRECT_TIMEOUT_MS);
    } catch (directError) {
      if (!proxy) throw directError;
      console.log(`  · 直连失败（${describe(directError)}），改走代理 ${proxy} 重试…`);
    }
  }
  if (!proxy) die('已指定 --proxy 但没有 HTTPS_PROXY', '在环境变量或 apps/api/.env 里配置');
  const agent = new ProxyAgent(proxy);
  try {
    return await attempt('proxy', agent, PROXY_TIMEOUT_MS);
  } finally {
    void agent.close().catch(() => undefined);
  }
}

/** undici 失败恒为 "fetch failed"，真实原因埋在 cause 里 */
function describe(error) {
  const parts = [];
  let cur = error;
  for (let i = 0; i < 4 && cur; i += 1) {
    if (cur.code) parts.push(String(cur.code));
    else if (cur.message) parts.push(String(cur.message));
    cur = cur.cause;
  }
  return parts.join(' → ') || String(error);
}

const mask = (value) =>
  !value ? '' : showToken ? value : `${String(value).slice(0, 8)}…${String(value).slice(-6)}（--show-token 看全量）`;

/* --------------------------------------------------------------- 取 code */

function buildAuthorizeUrl(state) {
  const qs = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope,
    display: 'page',
    state,
  });
  return `${base}/saaslogin1/oauth2/authorize?${qs.toString()}`;
}

/** 从用户粘贴的整条回调 URL 或裸 code 里取出 code */
function extractCode(input) {
  const raw = input.trim();
  if (!raw) return undefined;
  if (!raw.includes('?') && !raw.includes('=')) return raw;
  try {
    return new URL(raw).searchParams.get('code') ?? undefined;
  } catch {
    return new URLSearchParams(raw.replace(/^.*\?/, '')).get('code') ?? undefined;
  }
}

async function waitForLocalCallback(state) {
  const url = new URL(redirectUri);
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
    die(
      `--serve 要求 redirect_uri 指向本机，当前是 ${url.hostname}`,
      '回调地址是测试域名时请去掉 --serve，改用粘贴回调 URL 的方式',
    );
  }
  const port = Number(url.port || 80);

  return new Promise((resolveCode, rejectCode) => {
    const server = createServer((req, res) => {
      const incoming = new URL(req.url, `http://${url.host}`);
      if (incoming.pathname !== url.pathname) {
        res.writeHead(404).end('not found');
        return;
      }
      const code = incoming.searchParams.get('code');
      const returnedState = incoming.searchParams.get('state');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        `<meta charset="utf-8"><body style="font:16px/1.7 system-ui;padding:48px">` +
          (code ? '✅ 已收到授权码，回到终端看结果。' : '❌ 回调里没有 code。') +
          `</body>`,
      );
      server.close();
      if (!code) {
        rejectCode(new Error(`回调缺少 code：${incoming.search}`));
        return;
      }
      if (returnedState !== state) {
        console.log(`  ⚠ state 不一致：发出 ${state}，回来 ${returnedState}`);
      }
      resolveCode(code);
    });
    server.on('error', (error) =>
      rejectCode(new Error(`本地回调端口 ${port} 起不来：${error.message}`)),
    );
    server.listen(port, url.hostname, () => {
      console.log(`  · 本地回调服务已就绪：${redirectUri}`);
    });
  });
}

async function promptForCallback() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      '\n浏览器登录完成后，把地址栏里的整条回调 URL（或只把 code）粘到这里，回车：\n> ',
    );
    return extractCode(answer);
  } finally {
    rl.close();
  }
}

/* ------------------------------------------------------- 换 token / 取信息 */

async function exchangeCode(code) {
  console.log('\n[2/3] 用授权码换 access_token …');
  const { via, status, json, text } = await postJson(
    `${base}/saaslogin1/oauth2/accesstoken`,
    {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
    },
  );
  if (!json) {
    die(`accesstoken 返回的不是 JSON（HTTP ${status}，${via}）`, text.slice(0, 300));
  }
  if (json.errorCode || !json.access_token) {
    die(
      `换取 access_token 失败：${json.errorCode ?? `HTTP ${status}`} ${json.errorDesc ?? ''}`,
      'code 只有 30 分钟且一次性；redirect_uri 必须与授权请求完全一致',
    );
  }
  console.log(`  ✓ ${via} · HTTP ${status}`);
  console.log(`    access_token  : ${mask(json.access_token)}`);
  console.log(`    refresh_token : ${mask(json.refresh_token)}`);
  console.log(`    scope         : ${json.scope ?? '(未返回)'}`);
  console.log(`    expires_in    : ${json.expires_in ?? '(未返回)'}`);
  return json.access_token;
}

async function fetchUserInfo(accessToken) {
  console.log('\n[3/3] 取 userinfo …');
  const { via, status, json, text } = await postJson(
    `${base}/saaslogin1/oauth2/userinfo`,
    { client_id: clientId, access_token: accessToken, scope },
  );
  if (!json) die(`userinfo 返回的不是 JSON（HTTP ${status}，${via}）`, text.slice(0, 300));
  if (json.errorCode) {
    die(`userinfo 失败：${json.errorCode} ${json.errorDesc ?? ''}`, 'access_token 有效期 30 分钟');
  }
  console.log(`  ✓ ${via} · HTTP ${status}`);
  return json;
}

/* --------------------------------------------------------------- 结果分析 */

/** 平台需要的四类信息，以及各自可能的字段名（大小写与分隔符都忽略后比对） */
const NEEDS = [
  {
    label: '账号 / 邮箱（身份主键）',
    required: true,
    note: '决定能否按现有 members 邮箱匹配，拿不到就只能做 uuid 预绑定',
    keys: ['email', 'mail', 'account', 'useraccount', 'w3account', 'w3', 'loginname', 'upn'],
  },
  {
    label: '姓名',
    required: true,
    note: '写入成员 name；缺失只能先用账号占位',
    keys: ['name', 'username', 'displayname', 'cn', 'chinesename', 'fullname', 'employeename'],
  },
  {
    label: '岗位名称',
    required: false,
    note: '可用于展示与辅助分组；不要直接用它推导平台角色',
    keys: ['post', 'postname', 'position', 'jobtitle', 'title', 'job', 'duty', 'role'],
  },
  {
    label: '部门 / 组织',
    required: false,
    note: '可尝试映射到 deptIds，多半需要一张对照表',
    keys: ['dept', 'deptname', 'department', 'org', 'orgname', 'deptcode', 'orgpath', 'bg', 'bu'],
  },
  {
    label: '稳定唯一 ID',
    required: true,
    note: '写入成员 externalId，账号或邮箱变更后仍能认出同一个人',
    keys: ['uuid', 'sub', 'userid', 'employeeid', 'openid', 'id'],
  },
];

const normalizeKey = (key) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

function flatten(value, prefix = '', out = {}) {
  for (const [key, item] of Object.entries(value ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === 'object' && !Array.isArray(item)) flatten(item, path, out);
    else out[path] = item;
  }
  return out;
}

/** 中文按两格宽计算，否则表格在终端里会错位 */
function displayWidth(text) {
  let width = 0;
  for (const ch of String(text)) width += /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/.test(ch) ? 2 : 1;
  return width;
}

function pad(text, width) {
  return `${text}${' '.repeat(Math.max(0, width - displayWidth(text)))}`;
}

function sample(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.length}] ${JSON.stringify(value).slice(0, 60)}`;
  const text = String(value);
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

function report(profile) {
  const flat = flatten(profile);
  const entries = Object.entries(flat);

  console.log('\n──────── 1. userinfo 原始返回 ────────\n');
  console.log(JSON.stringify(profile, null, 2));

  console.log('\n──────── 2. 字段清单 ────────\n');
  const width = Math.max(12, ...entries.map(([k]) => k.length));
  for (const [key, value] of entries) {
    const type = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
    console.log(`  ${pad(key, width)}  ${pad(type, 7)}  ${sample(value)}`);
  }
  if (!entries.length) console.log('  （空对象）');

  console.log('\n──────── 3. 映射体检 ────────\n');
  const used = new Set();
  const missing = [];
  const LABEL_WIDTH = 24;
  for (const need of NEEDS) {
    // 按 need.keys 的先后顺序挑主选，而不是按返回顺序：email 比 account 更适合当主键，
    // 哪个字段先出现在响应里是上游决定的，不该影响我们的偏好。
    const hits = [];
    for (const wanted of need.keys) {
      for (const [key, value] of entries) {
        if (normalizeKey(key.split('.').pop()) === wanted && !hits.some(([k]) => k === key)) {
          hits.push([key, value]);
        }
      }
    }
    if (hits.length) {
      for (const [key] of hits) used.add(key);
      const [primaryKey, primaryValue] = hits[0];
      console.log(`  ✓ ${pad(need.label, LABEL_WIDTH)} ← ${primaryKey} = ${sample(primaryValue)}`);
      for (const [key, value] of hits.slice(1)) {
        console.log(`  ${pad('', LABEL_WIDTH + 2)}   备选 ${key} = ${sample(value)}`);
      }
    } else {
      if (need.required) missing.push(need.label);
      console.log(`  ${need.required ? '✖' : '·'} ${pad(need.label, LABEL_WIDTH)}   未匹配到字段`);
      console.log(`     ${need.note}`);
    }
  }

  const unmatched = entries.filter(([key]) => !used.has(key));
  if (unmatched.length) {
    console.log('\n  未归类字段（可能是别名，需人工确认）：');
    for (const [key, value] of unmatched) console.log(`     ${key} = ${sample(value)}`);
  }

  console.log('\n──────── 结论 ────────\n');
  if (missing.length) {
    console.log(`  缺少必需信息：${missing.join('、')}`);
    console.log('  → 需要找 IDaaS 管理员在管理平台为本应用补配附加属性后重跑；');
    console.log('    重跑只需 node apps/api/scripts/probe-uniportal-userinfo.mjs --access-token=<30分钟内的token>');
  } else {
    console.log('  必需信息齐备，可以按 docs/auth-oauth-login-design.md §5「首选」方案做邮箱/账号映射。');
  }
  console.log('  把上面第 1、2 段贴回设计文档 §5，即可定稿字段映射表。\n');
}

/* ------------------------------------------------------------------ main */

async function main() {
  console.log(`\nUniPortal userinfo 探针  ·  ${base}  ·  scope=${scope}`);
  console.log(`client_id=${clientId ?? '(未用)'}  redirect_uri=${redirectUri ?? '(未用)'}\n`);

  let accessToken = presetAccessToken;

  if (!accessToken) {
    let code = presetCode;
    if (!code) {
      const state = randomBytes(8).toString('hex');
      const authorizeUrl = buildAuthorizeUrl(state);
      console.log('[1/3] 在浏览器里打开下面这条链接完成登录：\n');
      console.log(`  ${authorizeUrl}\n`);
      code = flag('serve') ? await waitForLocalCallback(state) : await promptForCallback();
      if (!code) die('没拿到授权码');
      console.log(`  ✓ code = ${code.slice(0, 10)}…`);
    } else {
      console.log('[1/3] 使用命令行传入的 code');
    }
    accessToken = await exchangeCode(code);
  } else {
    console.log('[1-2/3] 使用命令行传入的 access_token，跳过授权与换码');
  }

  const profile = await fetchUserInfo(accessToken);
  report(profile);

  if (outFile) {
    const path = resolve(process.cwd(), outFile);
    writeFileSync(path, `${JSON.stringify(profile, null, 2)}\n`, 'utf8');
    console.log(`  原始 JSON 已另存：${path}\n`);
  }
}

main().catch((error) => {
  console.error(`\n✖ 探针失败：${describe(error)}\n`);
  process.exit(1);
});
