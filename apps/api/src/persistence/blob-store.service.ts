import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

export type BlobMeta = {
  id: string;
  workspaceId: string;
  name: string;
  mimeType: string;
  size: number;
  sha256: string;
  createdAt: string;
};

const MAX_BYTES = Number(process.env.BLOB_MAX_BYTES ?? 12 * 1024 * 1024);

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

  async putBase64(
    workspaceId: string,
    input: { name: string; mimeType?: string; dataBase64: string },
  ): Promise<BlobMeta & { url: string }> {
    const raw = Buffer.from(input.dataBase64, 'base64');
    if (!raw.length) throw new Error('empty_blob');
    if (raw.length > MAX_BYTES) {
      throw new Error(`blob_too_large:${MAX_BYTES}`);
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

  async get(workspaceId: string, id: string): Promise<{ meta: BlobMeta; buffer: Buffer }> {
    try {
      const metaRaw = await fs.readFile(this.metaPath(workspaceId, id), 'utf8');
      const meta = JSON.parse(metaRaw) as BlobMeta;
      const buffer = await fs.readFile(this.binPath(workspaceId, id));
      return { meta, buffer };
    } catch {
      throw new NotFoundException('blob_not_found');
    }
  }
}
