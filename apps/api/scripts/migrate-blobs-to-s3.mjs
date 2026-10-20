/**
 * 一次性迁移：把旧版本地磁盘 blob（BLOB_ROOT/<工作区>/<id>.bin + <id>.json）复制到 S3 兼容对象存储。
 * 对象键不分工作区：<id>.bin、<id>.json（文件 id 为随机 32 位十六进制，跨工作区不会重复）。
 *
 * 用法（在 apps/api 下）：npm run migrate:blobs
 *   读取 .env 里的 S3_ENDPOINT / S3_BUCKET / S3_ACCESS_KEY / S3_SECRET_KEY，来源目录取 BLOB_ROOT（默认 apps/api/data/blobs）。
 * 可重复执行：对象存储里已有同大小内容和 meta 的文件直接跳过；只复制，不删除本地文件。
 */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const BLOB_ID = /^[0-9a-f]{32}$/;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`${name} 未配置（见 deploy/api.env.example）`);
    process.exit(2);
  }
  return value;
}

const root = path.resolve(
  process.env.BLOB_ROOT ?? path.join(fileURLToPath(new URL('../', import.meta.url)), 'data', 'blobs'),
);
const bucket = requiredEnv('S3_BUCKET');
const s3 = new S3Client({
  endpoint: requiredEnv('S3_ENDPOINT'),
  region: process.env.S3_REGION?.trim() || 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: requiredEnv('S3_ACCESS_KEY'),
    secretAccessKey: requiredEnv('S3_SECRET_KEY'),
  },
});

async function remoteSize(key) {
  try {
    return (await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))).ContentLength;
  } catch (err) {
    if (err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404) return undefined;
    throw err;
  }
}

async function sha256File(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

const report = { copied: 0, skipped: 0, failed: [], warnings: [] };

let workspaceDirs;
try {
  workspaceDirs = (await readdir(root, { withFileTypes: true })).filter((d) => d.isDirectory());
} catch (err) {
  console.error(`读取来源目录失败：${root}（${err.message}）`);
  process.exit(2);
}
console.log(`来源 ${root} → 桶 ${bucket}（${process.env.S3_ENDPOINT}），${workspaceDirs.length} 个工作区目录`);

for (const dir of workspaceDirs) {
  const dirPath = path.join(root, dir.name);
  const names = new Set(await readdir(dirPath));
  for (const name of names) {
    // 只认正式文件；上传/删除过程中的 .tmp 暂存文件和点开头的文件都不迁移。
    if (!name.endsWith('.bin') || name.startsWith('.')) continue;
    const id = name.slice(0, -'.bin'.length);
    if (!BLOB_ID.test(id)) continue;
    if (!names.has(`${id}.json`)) {
      report.warnings.push(`${dir.name}/${name}：没有对应的 .json，属于不可访问的孤儿文件，未迁移`);
    }
  }

  for (const name of names) {
    if (!name.endsWith('.json') || name.startsWith('.')) continue;
    const id = name.slice(0, -'.json'.length);
    if (!BLOB_ID.test(id)) continue;
    const label = `${dir.name}/${id}`;
    const binPath = path.join(dirPath, `${id}.bin`);
    const binKey = `${id}.bin`;
    const metaKey = `${id}.json`;
    try {
      const metaRaw = await readFile(path.join(dirPath, name), 'utf8');
      const meta = JSON.parse(metaRaw);
      const { size } = await stat(binPath);

      if ((await remoteSize(metaKey)) !== undefined && (await remoteSize(binKey)) === size) {
        report.skipped += 1;
        continue;
      }

      const sha256 = await sha256File(binPath);
      if (meta.size !== size || meta.sha256 !== sha256) {
        report.warnings.push(`${label}：本地内容与 meta 记录不一致（size/sha256），按现有内容原样迁移`);
      }

      await new Upload({
        client: s3,
        params: {
          Bucket: bucket,
          Key: binKey,
          Body: createReadStream(binPath),
          ContentType: meta.mimeType || 'application/octet-stream',
        },
      }).done();
      // 内容写完并核对大小后才写 meta，与 API 的提交顺序一致。
      const uploaded = await remoteSize(binKey);
      if (uploaded !== size) throw new Error(`上传后大小不符：本地 ${size}B，对象存储 ${uploaded}B`);
      await s3.send(
        new PutObjectCommand({ Bucket: bucket, Key: metaKey, Body: metaRaw, ContentType: 'application/json' }),
      );
      report.copied += 1;
    } catch (err) {
      report.failed.push(`${label}：${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

console.log(`完成：复制 ${report.copied}，已存在跳过 ${report.skipped}，失败 ${report.failed.length}`);
for (const line of report.warnings) console.warn(`  警告 ${line}`);
for (const line of report.failed) console.error(`  失败 ${line}`);
process.exit(report.failed.length ? 1 : 0);
