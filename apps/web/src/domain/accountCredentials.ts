/**
 * 账号密码：落 Nest platform-docs（auth-credentials），内存态运行。
 * 不再写入 localStorage。
 */

import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  peekPlatformDocMemory,
  scheduleSavePlatformDoc,
  setPlatformDocMemory,
} from '@/api/platformDocsApi';

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
};

const DEFAULT_POLICY: AuthPolicy = { allowDemoPassword: true };
export const DEFAULT_ACCOUNT_PASSWORD = 'mssclaw';

let memory: CredPayload = {
  policy: { ...DEFAULT_POLICY },
  credentials: {},
};
let hydratedWs: string | null = null;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().replace(/@company\.com$/i, '@huawei.com');
}

function bytesToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes.buffer);
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(digest);
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  return sha256Hex(`${salt}:${password}`);
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
    credentials:
      p.credentials && typeof p.credentials === 'object' ? { ...p.credentials } : {},
  };
}

async function flush(): Promise<void> {
  const ws = currentWorkspaceId();
  setPlatformDocMemory(ws, 'auth-credentials', memory);
  if (!canUsePlatformDocsApi()) {
    throw new Error('共享服务未连通，无法保存账号密码。请先部署 Nest /api。');
  }
  await scheduleSavePlatformDoc(ws, 'auth-credentials', memory, 200);
}

export async function hydrateAccountCredentials(workspaceId?: string): Promise<void> {
  const ws = workspaceId || currentWorkspaceId();
  if (hydratedWs === ws && Object.keys(memory.credentials).length) return;
  try {
    const remote = await fetchPlatformDoc<unknown>(ws, 'auth-credentials');
    if (remote) {
      memory = normalizePayload(remote);
      hydratedWs = ws;
      return;
    }
  } catch {
    /* keep memory */
  }
  const peeked = peekPlatformDocMemory<unknown>(ws, 'auth-credentials');
  if (peeked) memory = normalizePayload(peeked);
  hydratedWs = ws;
}

export function loadAuthPolicy(): AuthPolicy {
  return { ...memory.policy };
}

export async function saveAuthPolicy(policy: AuthPolicy): Promise<void> {
  memory = { ...memory, policy: { ...policy } };
  await flush();
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
  try {
    await hydrateAccountCredentials();
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
    return {
      ok: false,
      error: err instanceof Error ? err.message : '保存密码失败',
    };
  }
}

export async function clearAccountPassword(email: string): Promise<void> {
  await hydrateAccountCredentials();
  const next = { ...memory.credentials };
  delete next[normalizeEmail(email)];
  memory = { ...memory, credentials: next };
  await flush();
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

export async function migrateInitAllPasswordsToMssclaw(
  emails: string[],
): Promise<{ ran: boolean; ok: number }> {
  await hydrateAccountCredentials();
  const missing = emails.filter((e) => !hasCredential(e));
  if (!missing.length) return { ran: false, ok: 0 };
  const { ok } = await setPasswordsForEmails(missing, DEFAULT_ACCOUNT_PASSWORD);
  return { ran: true, ok };
}

export async function ensureMissingPasswords(
  emails: string[],
  password: string = DEFAULT_ACCOUNT_PASSWORD,
): Promise<number> {
  await hydrateAccountCredentials();
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
