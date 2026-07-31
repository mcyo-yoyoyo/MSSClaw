/**
 * 短期生产：账号密码由平台运营配置，浏览器本地哈希存储（非服务端 IAM）。
 * 正式 SSO/JWT 上线前，用于关掉「全员演示密码」漏洞。
 */

const CREDS_KEY = 'mssclaw_account_creds_v1';
const POLICY_KEY = 'mssclaw_auth_policy_v1';

export type AccountCredential = {
  salt: string;
  hash: string;
  updatedAt: string;
};

type CredMap = Record<string, AccountCredential>;

export type AuthPolicy = {
  /** 未单独设密时是否允许演示密码登录（生产应关闭） */
  allowDemoPassword: boolean;
};

const DEFAULT_POLICY: AuthPolicy = { allowDemoPassword: true };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

function loadCreds(): CredMap {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CredMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveCreds(map: CredMap) {
  localStorage.setItem(CREDS_KEY, JSON.stringify(map));
}

export function loadAuthPolicy(): AuthPolicy {
  try {
    const raw = localStorage.getItem(POLICY_KEY);
    if (!raw) return { ...DEFAULT_POLICY };
    const parsed = JSON.parse(raw) as Partial<AuthPolicy>;
    return {
      allowDemoPassword:
        typeof parsed.allowDemoPassword === 'boolean'
          ? parsed.allowDemoPassword
          : DEFAULT_POLICY.allowDemoPassword,
    };
  } catch {
    return { ...DEFAULT_POLICY };
  }
}

export function saveAuthPolicy(policy: AuthPolicy) {
  localStorage.setItem(POLICY_KEY, JSON.stringify(policy));
}

export function setAllowDemoPassword(allow: boolean) {
  saveAuthPolicy({ ...loadAuthPolicy(), allowDemoPassword: allow });
}

export function hasCredential(email: string): boolean {
  return Boolean(loadCreds()[normalizeEmail(email)]);
}

export function listCredentialEmails(): string[] {
  return Object.keys(loadCreds()).sort();
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
  const salt = randomSalt();
  const hash = await hashPassword(password, salt);
  const map = loadCreds();
  map[e] = { salt, hash, updatedAt: new Date().toISOString() };
  saveCreds(map);
  return { ok: true };
}

export function clearAccountPassword(email: string) {
  const map = loadCreds();
  delete map[normalizeEmail(email)];
  saveCreds(map);
}

export async function verifyAccountPassword(
  email: string,
  password: string,
): Promise<'match' | 'mismatch' | 'unset'> {
  const cred = loadCreds()[normalizeEmail(email)];
  if (!cred) return 'unset';
  const hash = await hashPassword(password, cred.salt);
  return hash === cred.hash ? 'match' : 'mismatch';
}

/** 批量：每行 `邮箱,密码` 或 `邮箱 密码` / Tab 分隔 */
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

/** 生成临时密码（邀请/重置时展示一次） */
export function generateTempPassword(length = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}
