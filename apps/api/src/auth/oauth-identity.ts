import type { IdentityField, OAuthConfig } from './oauth.config';

export interface ExtractedIdentity {
  email: string;
  account: string;
  name: string;
  externalId: string;
  postName: string;
  orgPath: string;
  /** 每个字段最终取自哪个 key，排障时直接看这个 */
  matchedKeys: Partial<Record<IdentityField, string>>;
  /** userinfo 里出现过的全部 key（扁平化后），字段没取到时用来对照 */
  availableKeys: string[];
}

function flatten(value: unknown, prefix = '', out: Record<string, unknown> = {}): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === 'object' && !Array.isArray(item)) flatten(item, path, out);
    else out[path] = item;
  }
  return out;
}

const normalize = (key: string): string => key.toLowerCase().replace(/[^a-z0-9]/g, '');

function pick(
  flat: Record<string, unknown>,
  aliases: string[],
): { key: string; value: string } | null {
  // 按 aliases 的先后顺序挑，而不是按上游返回顺序：谁先出现在响应里是上游决定的，
  // 不该影响我们的偏好（例如 email 应优先于 account 当身份主键）。
  for (const alias of aliases) {
    const wanted = normalize(alias);
    for (const [key, raw] of Object.entries(flat)) {
      const leaf = key.split('.').pop() ?? key;
      if (normalize(leaf) !== wanted) continue;
      const text = raw === null || raw === undefined ? '' : String(raw).trim();
      if (text) return { key, value: text };
    }
  }
  return null;
}

/**
 * 从 userinfo 里抽取平台需要的身份字段。
 *
 * 上游字段名在部署前是未知的（管理平台按应用配附加属性），所以这里：
 *   1. 每个字段都按一串别名去找，大小写与下划线/连字符都忽略；
 *   2. 命中的 key 记在 matchedKeys 里，没命中时把 availableKeys 全量返回。
 * 两者都会进日志与诊断接口——内网第一次真人登录失败时，看一眼日志就知道
 * 上游字段到底叫什么，然后用 OAUTH_FIELD_* 环境变量纠正，不必改代码重新发版。
 */
export function extractIdentity(profile: unknown, config: OAuthConfig): ExtractedIdentity {
  const flat = flatten(profile);
  const matchedKeys: Partial<Record<IdentityField, string>> = {};
  const value = (field: IdentityField): string => {
    const hit = pick(flat, config.fieldAliases[field]);
    if (!hit) return '';
    matchedKeys[field] = hit.key;
    return hit.value;
  };

  return {
    email: value('email'),
    account: value('account'),
    name: value('name'),
    externalId: value('externalId'),
    postName: value('postName'),
    orgPath: value('orgPath'),
    matchedKeys,
    availableKeys: Object.keys(flat),
  };
}

/**
 * 账号不一定是邮箱形式（可能是 w3 工号）。平台成员表以邮箱为主键，
 * 所以这里把裸账号补成邮箱；已经是邮箱的原样返回。
 */
export function toEmailCandidate(identity: ExtractedIdentity, defaultDomain: string): string {
  if (identity.email.includes('@')) return identity.email.toLowerCase();
  if (identity.account.includes('@')) return identity.account.toLowerCase();
  if (identity.account && defaultDomain) return `${identity.account}@${defaultDomain}`.toLowerCase();
  return '';
}

/** 给日志用的一行摘要：只说哪个字段取自哪个 key，不打印值本身（除非开了 debug） */
export function describeIdentity(identity: ExtractedIdentity): string {
  const parts = (Object.keys(identity.matchedKeys) as IdentityField[]).map(
    (field) => `${field}←${identity.matchedKeys[field]}`,
  );
  const missing = (['email', 'account', 'name', 'externalId'] as IdentityField[]).filter(
    (field) => !identity.matchedKeys[field],
  );
  return [
    parts.length ? parts.join(' ') : '无字段命中',
    missing.length ? `缺失[${missing.join(',')}]` : '',
    `上游共 ${identity.availableKeys.length} 个字段: ${identity.availableKeys.join(',') || '(空)'}`,
  ]
    .filter(Boolean)
    .join(' | ');
}
