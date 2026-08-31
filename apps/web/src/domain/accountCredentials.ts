/**
 * 账号密码：落 Nest platform-docs（auth-credentials），内存态运行。
 * 不再写入 localStorage。
 *
 * 写入安全约束（不可放宽）：
 * 1. 只有「确实从服务端读到过当前工作区的凭证文档」之后才允许写回。否则一次失败的
 *    读取会让空内存把线上全部密码覆盖成默认口令。
 * 2. 写入携带 revision，由服务端做 compare-and-swap；冲突或失败时本地作废 hydration
 *    状态，强制下次重新读取，避免用陈旧快照二次覆盖别人的修改。
 */

import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  peekPlatformDocMemory,
  savePlatformDoc,
} from '@/api/platformDocsApi';
import { sha256 } from '@noble/hashes/sha2.js';

export type AccountCredential = {
  salt: string;
  hash: string;
  updatedAt: string;
};

type CredMap = Record<string, AccountCredential>;

export type AuthPolicy = {
  allowDemoPassword: boolean;
};

type CredPayload = {
  policy: AuthPolicy;
  credentials: CredMap;
  /** 服务端乐观锁版本；本地存的是「已知的服务端版本」 */
  revision: number;
};

const DEFAULT_POLICY: AuthPolicy = { allowDemoPassword: true };
export const DEFAULT_ACCOUNT_PASSWORD = 'mssclaw';

/** 未 hydrate 就写入会覆盖线上密码，统一用这个错误挡住 */
const NOT_HYDRATED_ERROR =
  '尚未读取到服务端的账号密码配置，已阻止写入以免覆盖现有密码。请刷新页面后重试。';
const CONFLICT_ERROR = '账号密码配置已被其他管理员更新，请刷新页面后重新提交。';

let memory: CredPayload = {
  policy: { ...DEFAULT_POLICY },
  credentials: {},
  revision: 0,
};
/** 仅在「服务端读取成功」后置位；读失败绝不置位 */
let hydratedWs: string | null = null;
let hydrateInflight: { ws: string; promise: Promise<boolean> } | null = null;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().replace(/@company\.com$/i, '@huawei.com');
}

function bytesToHex(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes.buffer);
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const digest = await subtle.digest('SHA-256', data);
    return bytesToHex(digest);
  }
  // 普通内网 HTTP 不是 secure context，浏览器会隐藏 crypto.subtle。
  // 兼容路径保持与 WebCrypto / Nest createHash 完全相同的 SHA-256 字节结果。
  return bytesToHex(sha256(data));
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  return sha256Hex(`${salt}:${password}`);
}

function normalizeCredentials(raw: unknown): CredMap {
  if (!raw || typeof raw !== 'object') return {};
  const out: CredMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const cred = value as Partial<AccountCredential> | null;
    if (!cred || typeof cred.salt !== 'string' || typeof cred.hash !== 'string') continue;
    // 服务端与登录都按归一化邮箱查找，本地必须用同一套 key，否则设的密码查不到。
    const email = normalizeEmail(key);
    if (!email) continue;
    const next: AccountCredential = {
      salt: cred.salt,
      hash: cred.hash,
      updatedAt: typeof cred.updatedAt === 'string' ? cred.updatedAt : '',
    };
    const prev = out[email];
    if (prev && prev.updatedAt >= next.updatedAt) continue;
    out[email] = next;
  }
  return out;
}

function normalizePayload(raw: unknown): CredPayload {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Partial<CredPayload>;
  return {
    policy: {
      allowDemoPassword:
        typeof p.policy?.allowDemoPassword === 'boolean'
          ? p.policy.allowDemoPassword
          : DEFAULT_POLICY.allowDemoPassword,
    },
    credentials: normalizeCredentials(p.credentials),
    revision:
      typeof p.revision === 'number' && Number.isSafeInteger(p.revision) && p.revision >= 0
        ? p.revision
        : 0,
  };
}

function isConflict(error: unknown): boolean {
  return error instanceof Error && /_409$/.test(error.message);
}

/**
 * 写回服务端。必须已 hydrate；服务端按 revision 做 CAS 并回写规范化 payload。
 * 任何失败都会作废 hydration，杜绝「拿失败后的本地快照再覆盖一次」。
 */
async function flush(): Promise<void> {
  const ws = currentWorkspaceId();
  if (hydratedWs !== ws) throw new Error(NOT_HYDRATED_ERROR);
  if (!canUsePlatformDocsApi()) {
    throw new Error('共享服务未连通，无法保存账号密码。请先部署 Nest /api。');
  }
  try {
    await savePlatformDoc(ws, 'auth-credentials', memory);
  } catch (error) {
    hydratedWs = null;
    throw isConflict(error) ? new Error(CONFLICT_ERROR) : error;
  }
  // savePlatformDoc 会把服务端回写的 canonical payload（含新 revision）放进会话缓存。
  const canonical = peekPlatformDocMemory<unknown>(ws, 'auth-credentials');
  if (canonical) memory = normalizePayload(canonical);
}

/**
 * 从服务端读取凭证文档。返回是否读取成功——调用方据此决定能否写入。
 * 非 super_admin 会被服务端 403，此处静默返回 false（只读场景不受影响）。
 */
export async function hydrateAccountCredentials(workspaceId?: string): Promise<boolean> {
  const ws = workspaceId || currentWorkspaceId();
  if (hydratedWs === ws) return true;
  if (!canUsePlatformDocsApi()) return false;
  if (hydrateInflight && hydrateInflight.ws === ws) return hydrateInflight.promise;

  const promise = (async () => {
    try {
      // fresh：凭证是权威数据，绝不用会话缓存冒充数据库状态。
      const remote = await fetchPlatformDoc<unknown>(ws, 'auth-credentials', {
        fresh: true,
      });
      memory = normalizePayload(remote ?? {});
      hydratedWs = ws;
      return true;
    } catch {
      // 读失败保持未 hydrate：后续写入会被 flush() 拒绝，而不是覆盖线上数据。
      return false;
    } finally {
      hydrateInflight = null;
    }
  })();
  hydrateInflight = { ws, promise };
  return promise;
}

/** 当前是否已持有服务端凭证快照（可写） */
export function isCredentialsHydrated(): boolean {
  return hydratedWs === currentWorkspaceId();
}

export function loadAuthPolicy(): AuthPolicy {
  return { ...memory.policy };
}

export async function saveAuthPolicy(policy: AuthPolicy): Promise<void> {
  const hydrated = await hydrateAccountCredentials();
  if (!hydrated) throw new Error(NOT_HYDRATED_ERROR);
  const previous = memory;
  memory = { ...memory, policy: { ...policy } };
  try {
    await flush();
  } catch (error) {
    memory = previous;
    throw error;
  }
}

export async function setAllowDemoPassword(allow: boolean): Promise<void> {
  await saveAuthPolicy({ ...loadAuthPolicy(), allowDemoPassword: allow });
}

export function hasCredential(email: string): boolean {
  return Boolean(memory.credentials[normalizeEmail(email)]);
}

export function listCredentialEmails(): string[] {
  return Object.keys(memory.credentials).sort();
}

export async function setAccountPassword(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const e = normalizeEmail(email);
  if (!e || !e.includes('@')) return { ok: false, error: '邮箱无效' };
  if (!password || password.length < 6) {
    return { ok: false, error: '密码至少 6 位' };
  }
  // 必须先拿到服务端快照：否则这次写入会把别人的密码一起抹掉。
  if (!(await hydrateAccountCredentials())) {
    return { ok: false, error: NOT_HYDRATED_ERROR };
  }
  const previous = memory;
  try {
    const salt = randomSalt();
    const hash = await hashPassword(password, salt);
    memory = {
      ...memory,
      credentials: {
        ...memory.credentials,
        [e]: { salt, hash, updatedAt: new Date().toISOString() },
      },
    };
    await flush();
    return { ok: true };
  } catch (err) {
    memory = previous;
    return {
      ok: false,
      error: err instanceof Error ? err.message : '保存密码失败',
    };
  }
}

export async function clearAccountPassword(email: string): Promise<void> {
  const hydrated = await hydrateAccountCredentials();
  if (!hydrated) throw new Error(NOT_HYDRATED_ERROR);
  const previous = memory;
  const next = { ...memory.credentials };
  delete next[normalizeEmail(email)];
  memory = { ...memory, credentials: next };
  try {
    await flush();
  } catch (error) {
    memory = previous;
    throw error;
  }
}

/** @deprecated 域名迁移已在服务端 normalize */
export function migrateCredentialEmailDomain() {
  /* no-op：不再使用 localStorage */
}

export async function verifyAccountPassword(
  email: string,
  password: string,
): Promise<'match' | 'mismatch' | 'unset'> {
  await hydrateAccountCredentials();
  const cred = memory.credentials[normalizeEmail(email)];
  if (!cred) return 'unset';
  const hash = await hashPassword(password, cred.salt);
  return hash === cred.hash ? 'match' : 'mismatch';
}

export async function batchSetAccountPasswords(
  text: string,
): Promise<{ ok: number; fail: { line: string; error: string }[] }> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  let ok = 0;
  const fail: { line: string; error: string }[] = [];
  for (const line of lines) {
    const parts = line.includes(',')
      ? line.split(',')
      : line.includes('\t')
        ? line.split('\t')
        : line.split(/\s+/);
    const email = (parts[0] ?? '').trim();
    const password = (parts.slice(1).join(' ') || '').trim();
    const result = await setAccountPassword(email, password);
    if (result.ok) ok += 1;
    else fail.push({ line, error: result.error });
  }
  return { ok, fail };
}

export async function setPasswordsForEmails(
  emails: string[],
  password: string = DEFAULT_ACCOUNT_PASSWORD,
): Promise<{ ok: number; fail: string[] }> {
  const unique = [...new Set(emails.map(normalizeEmail).filter((e) => e.includes('@')))];
  let ok = 0;
  const fail: string[] = [];
  for (const email of unique) {
    const r = await setAccountPassword(email, password);
    if (r.ok) ok += 1;
    else fail.push(email);
  }
  return { ok, fail };
}

/**
 * 为尚未设密的账号补默认口令。
 *
 * 危险操作：只允许 super_admin 在「组织权限」里显式触发，禁止在模块加载 / 启动流程里
 * 自动调用——自动调用一旦撞上「凭证读取失败」就会把全部账号重置成默认口令。
 * 这里额外要求 hydration 成功，读不到就直接放弃。
 */
export async function ensureMissingPasswords(
  emails: string[],
  password: string = DEFAULT_ACCOUNT_PASSWORD,
): Promise<number> {
  if (!(await hydrateAccountCredentials())) return 0;
  let n = 0;
  for (const email of emails) {
    if (hasCredential(email)) continue;
    const r = await setAccountPassword(email, password);
    if (r.ok) n += 1;
  }
  return n;
}

export function generateTempPassword(length = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}
