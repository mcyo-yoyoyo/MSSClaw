import type { PortalCasePreviewFile, PortalContentItem } from '@/domain/prototype/portalContent';
import { apiUrl, isApiEnabled, apiAuthHeaders } from '@/api/client';

export type UploadedBlob = {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
};

export async function uploadWorkspaceBlob(
  workspaceId: string,
  file: Pick<PortalCasePreviewFile, 'name' | 'mimeType' | 'dataUrl'>,
): Promise<UploadedBlob> {
  if (!file.dataUrl?.startsWith('data:')) {
    throw new Error('blob_requires_dataUrl');
  }
  const comma = file.dataUrl.indexOf(',');
  const dataBase64 = comma >= 0 ? file.dataUrl.slice(comma + 1) : file.dataUrl;
  const res = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/blobs`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...apiAuthHeaders(),
    },
    body: JSON.stringify({
      name: file.name,
      mimeType: file.mimeType,
      dataBase64,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`blob_upload_failed:${res.status}:${text.slice(0, 120)}`);
  }
  return (await res.json()) as UploadedBlob;
}

async function externalizeOne(
  workspaceId: string,
  file: PortalCasePreviewFile | null | undefined,
): Promise<PortalCasePreviewFile | null | undefined> {
  if (!file) return file;
  if (file.blobId && file.url && !file.dataUrl) return file;
  if (!file.dataUrl?.startsWith('data:')) return file;
  // 已有 blob 且仍带 dataUrl：清掉内联即可
  if (file.blobId && file.url) {
    return { ...file, dataUrl: undefined };
  }
  const uploaded = await uploadWorkspaceBlob(workspaceId, file);
  return {
    name: file.name,
    mimeType: file.mimeType || uploaded.mimeType,
    size: file.size || uploaded.size,
    kind: file.kind,
    blobId: uploaded.id,
    url: uploaded.url,
    dataUrl: undefined,
  };
}

/** 将门户附件 dataUrl 外提到 API 磁盘，缩小 JSON / localStorage */
export async function externalizePortalItemAttachments(
  workspaceId: string,
  items: PortalContentItem[],
): Promise<PortalContentItem[]> {
  if (!isApiEnabled()) return items;
  const out: PortalContentItem[] = [];
  for (const item of items) {
    const previewFile = await externalizeOne(workspaceId, item.previewFile ?? null);
    const layoutPreviewFile = await externalizeOne(
      workspaceId,
      item.layoutPreviewFile ?? null,
    );
    out.push({
      ...item,
      previewFile: previewFile ?? null,
      layoutPreviewFile: layoutPreviewFile ?? null,
    });
  }
  return out;
}
