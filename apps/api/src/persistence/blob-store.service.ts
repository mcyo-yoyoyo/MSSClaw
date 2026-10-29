import { Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { Readable } from 'stream';

export type BlobMeta = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  sha256: string;
  createdAt: string;
  deleteCapabilityHash?: string;
};

export type UploadedBlob = Omit<BlobMeta, 'deleteCapabilityHash'> & { url: string };
export type UploadedDeletableBlob = UploadedBlob & { deleteToken: string };
export type UploadedPackageBlob = UploadedDeletableBlob;

const DEFAULT_BLOB_MAX_BYTES = 100 * 1024 * 1024;
const DEFAULT_PACKAGE_BLOB_MAX_BYTES = 200 * 1024 * 1024;
const GENERATED_BLOB_ID = /^[0-9a-f]{32}$/;
const GENERATED_DELETE_TOKEN = /^[A-Za-z0-9_-]{43}$/;
const STORED_CAPABILITY_HASH = /^[0-9a-f]{64}$/;
const INVALID_CAPABILITY_HASH = Buffer.alloc(32);

function isMissingObject(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } } | null;
  return e?.name === 'NoSuchKey' || e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} 未配置：文件存储使用 S3 兼容对象存储，配置见 deploy/api.env.example`);
  }
  return value;
}

function uploadedBlob(meta: BlobMeta): UploadedBlob {
  const { deleteCapabilityHash: _privateCapability, ...publicMeta } = meta;
  return {
    ...publicMeta,
    url: `/api/v1/blobs/${meta.id}`,
  };
}

export function packageArchiveMimeType(name: string): string | undefined {
  const lower = name.trim().toLowerCase();
  if (lower.endsWith('.zip')) return 'application/zip';
  if (lower.endsWith('.tar')) return 'application/x-tar';
  if (lower.endsWith('.tgz') || lower.endsWith('.gz')) return 'application/gzip';
  return undefined;
}

function configuredPositiveBytes(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * 文件存于 S3 兼容对象存储（本地 / 内网为 MinIO）。每个文件两个对象：
 * `<id>.bin` 为内容，`<id>.json` 为元数据；meta 最后写入，读取以 meta 为准。
 */
@Injectable()
export class BlobStoreService implements OnModuleInit {
  private readonly logger = new Logger(BlobStoreService.name);
  private readonly endpoint = requiredEnv('S3_ENDPOINT');
  private readonly bucket = requiredEnv('S3_BUCKET');
  private readonly s3 = new S3Client({
    endpoint: this.endpoint,
    region: process.env.S3_REGION?.trim() || 'us-east-1',
    // 自建 S3（MinIO 等）按 endpoint/bucket/key 寻址，不依赖桶名 DNS。
    forcePathStyle: true,
    credentials: {
      accessKeyId: requiredEnv('S3_ACCESS_KEY'),
      secretAccessKey: requiredEnv('S3_SECRET_KEY'),
    },
  });

  /** 启动即校验连通性与桶，避免首次上传时才暴露配置错误。 */
  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (err) {
      const reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      throw new Error(`对象存储不可用（${this.endpoint}，桶 ${this.bucket}）：${reason}`);
    }
    this.logger.log(`object storage ready: ${this.endpoint}/${this.bucket}`);
  }

  private key(id: string, ext: 'bin' | 'json') {
    return `${id}.${ext}`;
  }

  private async readMeta(id: string): Promise<BlobMeta> {
    const res = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: this.key(id, 'json') }),
    );
    return JSON.parse(await res.Body!.transformToString('utf8')) as BlobMeta;
  }

  private async removeObject(key: string) {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  /** 内容已写入后提交 meta；meta 写失败则清掉内容，不留不可达的孤儿对象。 */
  private async commitMeta(meta: BlobMeta) {
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.key(meta.id, 'json'),
          Body: JSON.stringify(meta, null, 2),
          ContentType: 'application/json',
        }),
      );
    } catch (err) {
      await this.removeObject(this.key(meta.id, 'bin')).catch(() => undefined);
      throw err;
    }
  }

  packageBlobMaxBytes(): number {
    return configuredPositiveBytes('PACKAGE_BLOB_MAX_BYTES', DEFAULT_PACKAGE_BLOB_MAX_BYTES);
  }

  async putBase64(
    input: { name: string; mimeType?: string; dataBase64: string },
  ): Promise<UploadedDeletableBlob> {
    const raw = Buffer.from(input.dataBase64, 'base64');
    if (!raw.length) throw new Error('empty_blob');
    const maxBytes = configuredPositiveBytes('BLOB_MAX_BYTES', DEFAULT_BLOB_MAX_BYTES);
    if (raw.length > maxBytes) {
      throw new Error(`blob_too_large:${maxBytes}`);
    }
    const id = randomUUID().replace(/-/g, '');
    const deleteToken = randomBytes(32).toString('base64url');
    const deleteCapabilityHash = createHash('sha256').update(deleteToken).digest('hex');
    const meta: BlobMeta = {
      id,
      name: input.name || 'file.bin',
      mimeType: input.mimeType || 'application/octet-stream',
      size: raw.length,
      sha256: createHash('sha256').update(raw).digest('hex'),
      createdAt: new Date().toISOString(),
      deleteCapabilityHash,
    };
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.key(id, 'bin'),
        Body: raw,
        ContentType: meta.mimeType,
      }),
    );
    await this.commitMeta(meta);
    this.logger.log(`blob stored ${id} (${meta.size}B)`);
    return { ...uploadedBlob(meta), deleteToken };
  }

  async putPackageStream(
    input: {
      name: string;
      stream: Readable;
      contentLength?: number;
      /** null 仅用于已鉴权的运营后台上传；普通调用仍使用配置上限。 */
      maxBytes?: number | null;
    },
  ): Promise<UploadedPackageBlob> {
    const mimeType = packageArchiveMimeType(input.name);
    if (!mimeType) throw new Error('unsupported_package_type');

    const maxBytes = input.maxBytes === null
      ? null
      : input.maxBytes ?? this.packageBlobMaxBytes();
    if (maxBytes !== null && input.contentLength !== undefined && input.contentLength > maxBytes) {
      throw new Error(`package_blob_too_large:${maxBytes}`);
    }

    const id = randomUUID().replace(/-/g, '');
    const deleteToken = randomBytes(32).toString('base64url');
    const deleteCapabilityHash = createHash('sha256').update(deleteToken).digest('hex');
    const hash = createHash('sha256');
    let size = 0;
    let limitError: Error | undefined;

    // 边读边计数：超限时中断流，分片上传由 lib-storage 自动 abort，不留半成品。
    async function* counted(source: Readable) {
      for await (const chunk of source) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += bytes.length;
        if (maxBytes !== null && size > maxBytes) {
          throw (limitError = new Error(`package_blob_too_large:${maxBytes}`));
        }
        hash.update(bytes);
        yield bytes;
      }
    }

    const binKey = this.key(id, 'bin');
    try {
      await new Upload({
        client: this.s3,
        params: {
          Bucket: this.bucket,
          Key: binKey,
          Body: Readable.from(counted(input.stream)),
          ContentType: mimeType,
        },
      }).done();
    } catch (err) {
      throw limitError ?? err;
    }
    if (!size) {
      await this.removeObject(binKey).catch(() => undefined);
      throw new Error('empty_blob');
    }

    const meta: BlobMeta = {
      id,
      name: input.name || 'package.bin',
      mimeType,
      size,
      sha256: hash.digest('hex'),
      createdAt: new Date().toISOString(),
      deleteCapabilityHash,
    };
    await this.commitMeta(meta);
    this.logger.log(`package blob stored ${id} (${meta.size}B)`);
    return { ...uploadedBlob(meta), deleteToken };
  }

  async get(
    id: string,
  ): Promise<{ meta: BlobMeta; size: number; stream: Readable }> {
    if (!GENERATED_BLOB_ID.test(id)) throw new NotFoundException('blob_not_found');
    try {
      const meta = await this.readMeta(id);
      const res = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: this.key(id, 'bin') }),
      );
      return { meta, size: res.ContentLength ?? meta.size, stream: res.Body as Readable };
    } catch (err) {
      if (isMissingObject(err)) throw new NotFoundException('blob_not_found');
      throw err;
    }
  }

  async delete(id: string, deleteToken?: string): Promise<void> {
    if (!GENERATED_BLOB_ID.test(id)) throw new Error('invalid_blob_id');

    let meta: BlobMeta;
    try {
      meta = await this.readMeta(id);
    } catch (err) {
      if (isMissingObject(err)) throw new Error('blob_not_found');
      throw err;
    }

    const providedHash = createHash('sha256').update(deleteToken ?? '').digest();
    const storedCapabilityHash =
      typeof meta.deleteCapabilityHash === 'string' &&
      STORED_CAPABILITY_HASH.test(meta.deleteCapabilityHash)
        ? meta.deleteCapabilityHash
        : undefined;
    const expectedHash = storedCapabilityHash
      ? Buffer.from(storedCapabilityHash, 'hex')
      : INVALID_CAPABILITY_HASH;
    const capabilityMatches = timingSafeEqual(providedHash, expectedHash);
    if (
      !storedCapabilityHash ||
      !GENERATED_DELETE_TOKEN.test(deleteToken ?? '') ||
      !capabilityMatches
    ) {
      throw new Error('blob_delete_denied');
    }

    // 先删 meta：读取以 meta 为准，删完立即不可见；内容删除失败只会留下不可达对象。
    await this.removeObject(this.key(id, 'json'));
    await this.removeObject(this.key(id, 'bin'));
    this.logger.log(`blob deleted ${id}`);
  }
}
