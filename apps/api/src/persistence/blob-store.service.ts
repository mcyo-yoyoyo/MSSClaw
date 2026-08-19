import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { createReadStream, promises as fs, type ReadStream } from 'fs';
import * as path from 'path';
import type { Readable } from 'stream';

export type BlobMeta = {
  id: string;
  workspaceId: string;
  name: string;
  mimeType: string;
  size: number;
  sha256: string;
  createdAt: string;
};

const DEFAULT_BLOB_MAX_BYTES = 12 * 1024 * 1024;
const DEFAULT_PACKAGE_BLOB_MAX_BYTES = 200 * 1024 * 1024;
const GENERATED_BLOB_ID = /^[0-9a-f]{32}$/;

function isFileSystemError(err: unknown, code: string): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === code;
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

@Injectable()
export class BlobStoreService {
  private readonly logger = new Logger(BlobStoreService.name);
  private readonly root = path.resolve(
    process.env.BLOB_ROOT ?? path.join(process.cwd(), 'data', 'blobs'),
  );

  private workspaceDir(workspaceId: string) {
    return path.join(this.root, workspaceId.replace(/[^a-zA-Z0-9_-]/g, '_'));
  }

  private metaPath(workspaceId: string, id: string) {
    return path.join(this.workspaceDir(workspaceId), `${id}.json`);
  }

  private binPath(workspaceId: string, id: string) {
    return path.join(this.workspaceDir(workspaceId), `${id}.bin`);
  }

  packageBlobMaxBytes(): number {
    return configuredPositiveBytes('PACKAGE_BLOB_MAX_BYTES', DEFAULT_PACKAGE_BLOB_MAX_BYTES);
  }

  async putBase64(
    workspaceId: string,
    input: { name: string; mimeType?: string; dataBase64: string },
  ): Promise<BlobMeta & { url: string }> {
    const raw = Buffer.from(input.dataBase64, 'base64');
    if (!raw.length) throw new Error('empty_blob');
    const maxBytes = configuredPositiveBytes('BLOB_MAX_BYTES', DEFAULT_BLOB_MAX_BYTES);
    if (raw.length > maxBytes) {
      throw new Error(`blob_too_large:${maxBytes}`);
    }
    const id = randomUUID().replace(/-/g, '');
    const dir = this.workspaceDir(workspaceId);
    await fs.mkdir(dir, { recursive: true });
    const sha256 = createHash('sha256').update(raw).digest('hex');
    const meta: BlobMeta = {
      id,
      workspaceId,
      name: input.name || 'file.bin',
      mimeType: input.mimeType || 'application/octet-stream',
      size: raw.length,
      sha256,
      createdAt: new Date().toISOString(),
    };
    await fs.writeFile(this.binPath(workspaceId, id), raw);
    await fs.writeFile(this.metaPath(workspaceId, id), JSON.stringify(meta, null, 2), 'utf8');
    this.logger.log(`blob stored ${workspaceId}/${id} (${meta.size}B)`);
    return {
      ...meta,
      url: `/api/v1/workspaces/${workspaceId}/blobs/${id}`,
    };
  }

  async putPackageStream(
    workspaceId: string,
    input: {
      name: string;
      stream: Readable;
      contentLength?: number;
    },
  ): Promise<BlobMeta & { url: string }> {
    const mimeType = packageArchiveMimeType(input.name);
    if (!mimeType) throw new Error('unsupported_package_type');

    const maxBytes = this.packageBlobMaxBytes();
    if (input.contentLength !== undefined && input.contentLength > maxBytes) {
      throw new Error(`package_blob_too_large:${maxBytes}`);
    }

    const id = randomUUID().replace(/-/g, '');
    const dir = this.workspaceDir(workspaceId);
    const binPath = this.binPath(workspaceId, id);
    const metaPath = this.metaPath(workspaceId, id);
    const tempSuffix = `${id}.${randomUUID().replace(/-/g, '')}.upload`;
    const tempBinPath = path.join(dir, `${tempSuffix}.bin.tmp`);
    const tempMetaPath = path.join(dir, `${tempSuffix}.json.tmp`);
    let committedBin = false;
    let committedMeta = false;

    await fs.mkdir(dir, { recursive: true });
    try {
      const hash = createHash('sha256');
      let size = 0;
      const handle = await fs.open(tempBinPath, 'wx');
      try {
        for await (const chunk of input.stream) {
          const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          size += bytes.length;
          if (size > maxBytes) {
            throw new Error(`package_blob_too_large:${maxBytes}`);
          }
          hash.update(bytes);

          let offset = 0;
          while (offset < bytes.length) {
            const { bytesWritten } = await handle.write(
              bytes,
              offset,
              bytes.length - offset,
              null,
            );
            if (!bytesWritten) throw new Error('blob_write_failed');
            offset += bytesWritten;
          }
        }
        if (!size) throw new Error('empty_blob');
        await handle.sync();
      } finally {
        await handle.close();
      }

      const meta: BlobMeta = {
        id,
        workspaceId,
        name: input.name || 'package.bin',
        mimeType,
        size,
        sha256: hash.digest('hex'),
        createdAt: new Date().toISOString(),
      };
      await fs.writeFile(tempMetaPath, JSON.stringify(meta, null, 2), {
        encoding: 'utf8',
        flag: 'wx',
      });

      // 两个临时文件均写完后才提交；meta 最后落位，使半成品不会被 GET 看见。
      await fs.rename(tempBinPath, binPath);
      committedBin = true;
      await fs.rename(tempMetaPath, metaPath);
      committedMeta = true;

      this.logger.log(`package blob stored ${workspaceId}/${id} (${meta.size}B)`);
      return {
        ...meta,
        url: `/api/v1/workspaces/${workspaceId}/blobs/${id}`,
      };
    } catch (err) {
      await Promise.allSettled([
        fs.unlink(tempBinPath),
        fs.unlink(tempMetaPath),
        ...(committedBin && !committedMeta ? [fs.unlink(binPath)] : []),
      ]);
      throw err;
    }
  }

  async get(
    workspaceId: string,
    id: string,
  ): Promise<{ meta: BlobMeta; size: number; stream: ReadStream }> {
    if (!GENERATED_BLOB_ID.test(id)) throw new NotFoundException('blob_not_found');
    try {
      const metaRaw = await fs.readFile(this.metaPath(workspaceId, id), 'utf8');
      const meta = JSON.parse(metaRaw) as BlobMeta;
      const binPath = this.binPath(workspaceId, id);
      const stat = await fs.stat(binPath);
      if (!stat.isFile()) throw new Error('blob_not_file');
      return { meta, size: stat.size, stream: createReadStream(binPath) };
    } catch {
      throw new NotFoundException('blob_not_found');
    }
  }

  async delete(workspaceId: string, id: string): Promise<void> {
    if (!GENERATED_BLOB_ID.test(id)) throw new Error('invalid_blob_id');

    const dir = this.workspaceDir(workspaceId);
    const binPath = this.binPath(workspaceId, id);
    const metaPath = this.metaPath(workspaceId, id);
    try {
      const [binStat, metaStat] = await Promise.all([fs.lstat(binPath), fs.lstat(metaPath)]);
      if (!binStat.isFile() || !metaStat.isFile()) throw new Error('blob_not_found');
    } catch (err) {
      if (err instanceof Error && err.message === 'blob_not_found') throw err;
      if (isFileSystemError(err, 'ENOENT')) throw new Error('blob_not_found');
      throw err;
    }

    const deleteToken = randomUUID().replace(/-/g, '');
    const stagedBinPath = path.join(dir, `.${id}.${deleteToken}.delete.bin.tmp`);
    const stagedMetaPath = path.join(dir, `.${id}.${deleteToken}.delete.json.tmp`);
    let binStaged = false;
    let metaStaged = false;

    try {
      await fs.rename(binPath, stagedBinPath);
      binStaged = true;
      await fs.rename(metaPath, stagedMetaPath);
      metaStaged = true;
    } catch (err) {
      // 若第二次 rename 失败，尽力把已暂存文件恢复，避免留下可见的半删除状态。
      await Promise.allSettled([
        ...(metaStaged ? [fs.rename(stagedMetaPath, metaPath)] : []),
        ...(binStaged ? [fs.rename(stagedBinPath, binPath)] : []),
      ]);
      if (isFileSystemError(err, 'ENOENT') && !binStaged) {
        throw new Error('blob_not_found');
      }
      throw err;
    }

    const results = await Promise.allSettled([
      fs.unlink(stagedBinPath),
      fs.unlink(stagedMetaPath),
    ]);
    const failed = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failed) throw failed.reason;
    this.logger.log(`blob deleted ${workspaceId}/${id}`);
  }
}
