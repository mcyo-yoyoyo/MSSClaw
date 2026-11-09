import { z } from 'zod';
import { inflateRawSync } from 'zlib';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

export function safePath(value: string): boolean {
  return Boolean(value) && !value.startsWith('/') && !value.includes('\\') && !value.includes(':') && !value.includes('\0') && value.split('/').every((s) => s !== '..' && s !== '.' && s !== '');
}
const relativePath = z.string().max(240).refine(safePath, 'invalid_relative_path');
export const ManifestSchema = z.object({
  entry: relativePath,
  runtime: z.enum(['python3', 'node']),
  image: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._/:@-]*$/).optional(),
  timeoutSec: z.number().int().min(1).max(1800).default(120),
  memoryMb: z.number().int().min(64).max(4096).default(512),
  inputs: z.object({ extensions: z.array(z.string().regex(/^\.[a-z0-9]+$/)).min(1), maxCount: z.number().int().min(1).max(20) }),
  outputs: z.array(z.object({ pattern: relativePath.refine((v) => !v.includes('/'), 'output_must_be_top_level'), mime: z.enum(['text/markdown', 'text/plain', 'application/json', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png']) })).min(1).max(20),
  platforms: z.array(z.enum(['linux', 'darwin', 'win32'])).min(1),
});
export type SkillManifest = z.infer<typeof ManifestSchema>;
export const MAX_PACKAGE_BYTES = 100 * 1024 * 1024;

/** 先验证整个目录，再写文件；不支持链接、加密和 ZIP64。 */
export function unpackZip(data: Buffer): Map<string, Buffer> {
  if (data.length > MAX_PACKAGE_BYTES) throw new Error('package_too_large');
  let end = data.length - 22;
  while (end >= Math.max(0, data.length - 65557) && data.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0 || end < data.length - 65557) throw new Error('invalid_zip');
  const count = data.readUInt16LE(end + 10);
  if (!count || count > 1000 || data.readUInt16LE(end + 4) !== 0 || data.readUInt16LE(end + 6) !== 0) throw new Error('zip_limits');
  let offset = data.readUInt32LE(end + 16), total = 0;
  const files = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    if (data.readUInt32LE(offset) !== 0x02014b50) throw new Error('invalid_zip_directory');
    const flags = data.readUInt16LE(offset + 8), method = data.readUInt16LE(offset + 10);
    const compressed = data.readUInt32LE(offset + 20), size = data.readUInt32LE(offset + 24);
    const nameLength = data.readUInt16LE(offset + 28), extra = data.readUInt16LE(offset + 30), comment = data.readUInt16LE(offset + 32);
    const mode = data.readUInt32LE(offset + 38) >>> 16, local = data.readUInt32LE(offset + 42);
    const name = data.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    offset += 46 + nameLength + extra + comment;
    if (!safePath(name.replace(/\/$/, '')) || ![0, 0x8000, 0x4000].includes(mode & 0xf000) || (flags & 1)) throw new Error('unsafe_zip_entry');
    if (name.endsWith('/')) continue;
    total += size;
    if (total > MAX_PACKAGE_BYTES || files.has(name) || ![0, 8].includes(method)) throw new Error('zip_limits');
    if (data.readUInt32LE(local) !== 0x04034b50) throw new Error('invalid_zip_header');
    const start = local + 30 + data.readUInt16LE(local + 26) + data.readUInt16LE(local + 28);
    const bytes = data.subarray(start, start + compressed);
    const content = method === 8 ? inflateRawSync(bytes, { maxOutputLength: Math.max(1, size) }) : bytes;
    if (content.length !== size) throw new Error('zip_size_mismatch');
    files.set(name, content);
  }
  return files;
}
export function validatePackage(data: Buffer) {
  const files = unpackZip(data);
  const manifest = ManifestSchema.parse(JSON.parse(files.get('skill.json')?.toString('utf8') ?? '{}'));
  if (!files.has(manifest.entry)) throw new Error('entry_not_found');
  return { files, manifest };
}
export async function extractPackage(data: Buffer, target: string) {
  const validated = validatePackage(data);
  for (const [name, content] of validated.files) {
    const path = join(target, name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, { mode: 0o644 });
  }
  return validated.manifest;
}
