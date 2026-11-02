import { createHash, randomBytes, scrypt, timingSafeEqual } from 'crypto';

/**
 * 成员密码。新密码一律 scrypt；sha256-salt 是前端「组织权限」页在浏览器里算好上传的旧格式，
 * 登录成功后由服务端改存为 scrypt。
 */
export type PasswordAlgorithm = 'scrypt' | 'sha256-salt';

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function scryptHex(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS, (error, key) =>
      error ? reject(error) : resolve(key.toString('hex')),
    );
  });
}

function sameHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

export async function hashPassword(password: string): Promise<{ algorithm: PasswordAlgorithm; salt: string; passwordHash: string }> {
  const salt = randomBytes(16).toString('hex');
  return { algorithm: 'scrypt', salt, passwordHash: await scryptHex(password, salt) };
}

/** needsRehash：旧格式校验通过，调用方应改存为 scrypt */
export async function verifyPassword(
  credential: { algorithm: string; salt: string; passwordHash: string },
  password: string,
): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (credential.algorithm === 'scrypt') {
    return { ok: sameHex(await scryptHex(password, credential.salt), credential.passwordHash), needsRehash: false };
  }
  const legacy = createHash('sha256').update(`${credential.salt}:${password}`, 'utf8').digest('hex');
  const ok = sameHex(legacy, credential.passwordHash);
  return { ok, needsRehash: ok };
}
