/**
 * UniPortal(IDaaS) OAuth2 配置。
 *
 * 设计要点：所有「配错了会导致登录失败」的项都能被 validateOAuthConfig() 自检出来，
 * 并由 /api/v1/auth/oauth/diagnostics 暴露给部署人员——内网首次部署时先打这个接口，
 * 不用等真人去点登录才发现少配了一个环境变量。
 */

export type AuthMode = 'password' | 'oauth';

export interface OAuthConfig {
  mode: AuthMode;
  issuerBase: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  display: string;
  logoutRedirect: string;
  stateTtlMs: number;
  sessionTtlHours: number;
  httpTimeoutMs: number;
  proxyEnabled: boolean;
  proxyUrl: string;
  jitProvision: boolean;
  defaultRole: string;
  allowedEmailDomains: string[];
  /** 上游只给工号不给邮箱时，用它补成 <账号>@<域> 去匹配成员表 */
  defaultEmailDomain: string;
  /** 打开后把 userinfo 原始 JSON 写进日志（含个人信息），仅排障期间临时开 */
  debugUserInfo: boolean;
  /** 诊断接口开关，上线稳定后可关 */
  diagnosticsEnabled: boolean;
  /** userinfo 字段别名，逗号分隔；留空用内置默认值 */
  fieldAliases: Record<IdentityField, string[]>;
}

export type IdentityField = 'email' | 'account' | 'name' | 'externalId' | 'postName' | 'orgPath';

/**
 * 字段别名默认值。上游到底叫什么名字要实测（见 scripts/probe-uniportal-userinfo.mjs），
 * 这里尽量把常见写法都列上；万一还是没覆盖到，用 OAUTH_FIELD_* 环境变量补，
 * **不需要改代码重新打包**——这是内网排障时最省时间的一个设计。
 */
export const DEFAULT_FIELD_ALIASES: Record<IdentityField, string[]> = {
  email: ['email', 'mail', 'emailAddress', 'userEmail'],
  account: ['w3Account', 'w3account', 'account', 'userAccount', 'loginName', 'uid', 'upn'],
  name: ['userName', 'name', 'displayName', 'cn', 'chineseName', 'fullName', 'employeeName'],
  externalId: ['uuid', 'sub', 'userId', 'employeeId', 'openId'],
  postName: ['postName', 'post', 'position', 'jobTitle', 'title', 'duty'],
  orgPath: ['deptName', 'dept', 'department', 'orgName', 'orgPath', 'org', 'deptCode'],
};

const FIELD_ENV: Record<IdentityField, string> = {
  email: 'OAUTH_FIELD_EMAIL',
  account: 'OAUTH_FIELD_ACCOUNT',
  name: 'OAUTH_FIELD_NAME',
  externalId: 'OAUTH_FIELD_EXTERNAL_ID',
  postName: 'OAUTH_FIELD_POST',
  orgPath: 'OAUTH_FIELD_ORG',
};

function str(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes';
}

function int(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function list(name: string): string[] {
  return str(name)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function authMode(): AuthMode {
  return str('AUTH_MODE', 'password').toLowerCase() === 'oauth' ? 'oauth' : 'password';
}

let cached: OAuthConfig | null = null;

export function oauthConfig(): OAuthConfig {
  if (cached) return cached;
  const fieldAliases = {} as Record<IdentityField, string[]>;
  for (const field of Object.keys(FIELD_ENV) as IdentityField[]) {
    const override = list(FIELD_ENV[field]);
    fieldAliases[field] = override.length ? override : DEFAULT_FIELD_ALIASES[field];
  }

  cached = {
    mode: authMode(),
    issuerBase: str('OAUTH_ISSUER_BASE').replace(/\/$/, ''),
    clientId: str('OAUTH_CLIENT_ID'),
    clientSecret: str('OAUTH_CLIENT_SECRET'),
    redirectUri: str('OAUTH_REDIRECT_URI'),
    scope: str('OAUTH_SCOPE', 'base.profile'),
    display: str('OAUTH_DISPLAY', 'page'),
    logoutRedirect: str('OAUTH_LOGOUT_REDIRECT'),
    stateTtlMs: int('OAUTH_STATE_TTL_MS', 600_000),
    sessionTtlHours: int('OAUTH_SESSION_TTL_HOURS', 12),
    httpTimeoutMs: int('OAUTH_HTTP_TIMEOUT_MS', 8000),
    proxyEnabled: bool('OAUTH_PROXY_ENABLED', false),
    proxyUrl: str('HTTPS_PROXY') || str('https_proxy'),
    jitProvision: bool('OAUTH_JIT_PROVISION', false),
    defaultRole: str('OAUTH_DEFAULT_ROLE', 'business_user'),
    allowedEmailDomains: list('OAUTH_ALLOWED_EMAIL_DOMAINS').map((d) => d.toLowerCase()),
    defaultEmailDomain: str('OAUTH_DEFAULT_EMAIL_DOMAIN').toLowerCase().replace(/^@/, ''),
    debugUserInfo: bool('OAUTH_DEBUG_USERINFO', false),
    diagnosticsEnabled: bool('OAUTH_DIAGNOSTICS', true),
    fieldAliases,
  };
  return cached;
}

/** 测试用：环境变量改了之后强制重读 */
export function resetOAuthConfigCache(): void {
  cached = null;
}

export interface ConfigCheck {
  key: string;
  ok: boolean;
  level: 'error' | 'warn' | 'info';
  detail: string;
}

/**
 * 配置自检。返回的每一条都直接可读，不需要再对着文档翻。
 * 只在 AUTH_MODE=oauth 时检查 OAuth 项；password 模式下只回一条 info。
 */
export function validateOAuthConfig(config = oauthConfig()): ConfigCheck[] {
  const checks: ConfigCheck[] = [];
  const push = (key: string, ok: boolean, level: ConfigCheck['level'], detail: string) =>
    checks.push({ key, ok, level, detail });

  push('AUTH_MODE', true, 'info', `${config.mode}${config.mode === 'password' ? '（账号密码登录，OAuth 项不生效）' : '（企业统一身份登录）'}`);
  if (config.mode !== 'oauth') return checks;

  push(
    'OAUTH_ISSUER_BASE',
    /^https?:\/\/[^/]+$/.test(config.issuerBase),
    'error',
    config.issuerBase || '未配置。测试 https://uniportal-beta.huawei.com，生产 https://uniportal.huawei.com',
  );
  push('OAUTH_CLIENT_ID', Boolean(config.clientId), 'error', config.clientId || '未配置');
  push(
    'OAUTH_CLIENT_SECRET',
    Boolean(config.clientSecret),
    'error',
    config.clientSecret ? `已配置（${config.clientSecret.length} 位）` : '未配置，换取 access_token 会失败',
  );

  // redirect_uri 是最容易配错的一项：IDaaS 按「协议+域名+端口+文根」逐字符比对
  let redirectOk = false;
  let redirectDetail = config.redirectUri || '未配置';
  if (config.redirectUri) {
    try {
      const url = new URL(config.redirectUri);
      if (url.hash) redirectDetail = `${config.redirectUri} —— 不能带 # 片段（服务端收不到，IDaaS 也不保证保留）`;
      else if (url.search) redirectDetail = `${config.redirectUri} —— 不能带 query 参数`;
      else {
        redirectOk = true;
        redirectDetail = `${config.redirectUri}（须与 IDaaS 注册值逐字符一致：协议/域名/端口/文根）`;
      }
    } catch {
      redirectDetail = `${config.redirectUri} —— 不是合法的绝对 URL`;
    }
  }
  push('OAUTH_REDIRECT_URI', redirectOk, 'error', redirectDetail);

  push(
    'OAUTH_LOGOUT_REDIRECT',
    Boolean(config.logoutRedirect),
    'warn',
    config.logoutRedirect || '未配置，退出后不会跳回本站（登录仍可用）',
  );
  push('OAUTH_SCOPE', Boolean(config.scope), 'warn', config.scope);
  push(
    'OAUTH_SESSION_TTL_HOURS',
    config.sessionTtlHours > 0 && config.sessionTtlHours <= 24 * 7,
    'warn',
    `${config.sessionTtlHours} 小时`,
  );
  push(
    'OAUTH_PROXY_ENABLED',
    true,
    'info',
    config.proxyEnabled
      ? `开启，代理 ${config.proxyUrl || '(HTTPS_PROXY 未配置，开了也没用)'}`
      : '关闭（先直连；若内网需代理出网再开）',
  );
  push(
    'OAUTH_JIT_PROVISION',
    true,
    'info',
    config.jitProvision
      ? `开启，新用户自动建号为 ${config.defaultRole}${config.allowedEmailDomains.length ? `（限 ${config.allowedEmailDomains.join('/')}）` : '（未限邮箱域，建议配 OAUTH_ALLOWED_EMAIL_DOMAINS）'}`
      : '关闭，未登记的用户会被拒绝登录',
  );
  if (config.jitProvision && !config.allowedEmailDomains.length) {
    push('OAUTH_ALLOWED_EMAIL_DOMAINS', false, 'warn', '开了 JIT 却没限邮箱域，任何能通过 IDaaS 的账号都会被建号');
  }
  if (config.debugUserInfo) {
    push('OAUTH_DEBUG_USERINFO', false, 'warn', '已开启：userinfo 原始内容会进日志（含个人信息），排障完请关掉');
  }
  return checks;
}

export function configErrors(checks: ConfigCheck[]): ConfigCheck[] {
  return checks.filter((check) => !check.ok && check.level === 'error');
}
