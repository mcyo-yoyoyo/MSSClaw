import { useEffect, useRef } from 'react';
import {
  deleteWorkspaceBlob,
  isPackageUploadContextCurrent,
  type UploadedPackageBlob,
} from '@/api/blobApi';
import { currentWorkspaceId } from '@/api/platformDocsApi';

type TemporaryBlob = {
  workspaceId: string;
  blob: UploadedPackageBlob;
};

type BlobIdentity = Pick<UploadedPackageBlob, 'id' | 'url'>;

function trackingKey(entry: TemporaryBlob): string {
  return `${entry.workspaceId}\n${entry.blob.id}\n${entry.blob.url}`;
}

function sameBlob(entry: TemporaryBlob, blob: BlobIdentity): boolean {
  return entry.blob.id === blob.id && entry.blob.url === blob.url;
}

/**
 * 只记录当前弹窗会话中新上传的 blob。初始已有 blob 从不会进入集合，
 * 因此取消、重选与移除都不会误删打开弹窗前的资源。
 */
export function useTemporaryWorkspaceBlobs(sessionKey: string | null) {
  const blobsRef = useRef(new Map<string, TemporaryBlob>());
  const generationRef = useRef(0);

  const deleteQuietly = (entry: TemporaryBlob) => {
    void deleteWorkspaceBlob(entry.workspaceId, entry.blob).catch(() => undefined);
  };

  const cleanup = (keepBlob?: BlobIdentity) => {
    for (const [key, entry] of blobsRef.current) {
      if (keepBlob && sameBlob(entry, keepBlob)) continue;
      blobsRef.current.delete(key);
      deleteQuietly(entry);
    }
    if (keepBlob) {
      for (const [key, entry] of blobsRef.current) {
        if (sameBlob(entry, keepBlob)) blobsRef.current.delete(key);
      }
    }
  };

  useEffect(() => {
    generationRef.current += 1;
    cleanup();
    return () => {
      generationRef.current += 1;
      cleanup();
    };
    // cleanup 只操作 ref；sessionKey 切换才代表一轮编辑结束。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  return {
    currentGeneration: () => generationRef.current,
    isCurrent: (generation: number) => generation === generationRef.current,
    /** 返回 false 表示上传完成时弹窗会话已结束，该 blob 已安排删除。 */
    trackUploaded: (
      workspaceId: string,
      blob: UploadedPackageBlob,
      generation: number,
    ): boolean => {
      const entry = { workspaceId, blob };
      if (
        generation !== generationRef.current ||
        !isPackageUploadContextCurrent(blob, currentWorkspaceId())
      ) {
        deleteQuietly(entry);
        return false;
      }
      blobsRef.current.set(trackingKey(entry), entry);
      return true;
    },
    discard: (blob: BlobIdentity | undefined) => {
      if (!blob) return;
      for (const [key, entry] of blobsRef.current) {
        if (!sameBlob(entry, blob)) continue;
        blobsRef.current.delete(key);
        deleteQuietly(entry);
      }
    },
    /** 保存前再次校验，覆盖上传完成后才切换 workspace / API 的情况。 */
    canCommit: (blob: BlobIdentity | undefined): boolean => {
      if (!blob) return true;
      const match = [...blobsRef.current.entries()].find(([, entry]) => sameBlob(entry, blob));
      if (!match) return true;
      const [key, entry] = match;
      if (isPackageUploadContextCurrent(entry.blob, currentWorkspaceId())) return true;
      blobsRef.current.delete(key);
      deleteQuietly(entry);
      return false;
    },
    /** 结束本轮编辑；保存时传入最终被记录引用的新 blob id。 */
    finish: (keepBlob?: BlobIdentity) => {
      generationRef.current += 1;
      cleanup(keepBlob);
    },
  };
}
