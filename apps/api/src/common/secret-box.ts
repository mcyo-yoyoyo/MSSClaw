import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * 模型 API Key 加密存储：AES-256-GCM，密钥由部署环境变量 LLM_KEY_SECRET 派生。
 * 密文形如 enc:v1:<base64(iv | tag | ciphertext)>；不带前缀的旧值按明文读出。
 * LLM_KEY_SECRET 丢失或改动后，已存的密文无法解开，只能重新填写各模型的 Key。
 */

const PREFIX = 'enc:v1:';

export function hasSecretKey(): boolean {
  return Boolean(process.env.LLM_KEY_SECRET?.trim());
}

function key(): Buffer {
  const secret = process.env.LLM_KEY_SECRET?.trim();
  if (!secret) throw new Error('LLM_KEY_SECRET 未配置：模型 API Key 需要它加密存储');
  return createHash('sha256').update(secret, 'utf8').digest();
}

export function encryptSecret(plain: string): string {
  if (!plain || plain.startsWith(PREFIX)) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}

export function decryptSecret(value: string): string {
  if (!value?.startsWith(PREFIX)) return value;
  const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
}
