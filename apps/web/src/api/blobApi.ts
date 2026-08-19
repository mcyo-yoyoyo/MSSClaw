import type { PortalCasePreviewFile, PortalContentItem } from '@/domain/prototype/portalContent';
import { apiUrl, isApiEnabled, apiAuthHeaders } from '@/api/client';
import { packageUploadSizeError } from '@/domain/packageUpload';

export type UploadedBlob = {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
};

export type DownloadableBlob = Pick<UploadedBlob, 'url' | 'name'>;

/** 兼容存量相对路径与跨域 API 基址；绝对 URL / blob URL 保持原样。 */
export function resolveWorkspaceBlobUrl(url: string): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//')) return url;
  return apiUrl(url);
}

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
  const uploaded = (await res.json()) as UploadedBlob;
  return { ...uploaded, url: resolveWorkspaceBlobUrl(uploaded.url) };
}

/** package blob 为受保护资源，读取时统一携带 API key / 会话鉴权。 */
export async function fetchPackageBlob(url: string, signal?: AbortSignal): Promise<Response> {
  const res = await fetch(resolveWorkspaceBlobUrl(url), {
    headers: apiAuthHeaders(),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`package_download_failed:${res.status}:${text.slice(0, 120)}`);
  }
  return res;
}

/** 鉴权拉取后通过临时 blob URL 下载；点击触发后释放 URL，避免大包长期占用内存。 */
export async function downloadPackageBlob(pkg: DownloadableBlob): Promise<void> {
  const res = await fetchPackageBlob(pkg.url);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  try {
    link.href = objectUrl;
    link.download = pkg.name;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  }
}

/**
 * Skill / Agent 原始包使用二进制请求上传，避免大文件转 data URL / base64 时的体积与内存膨胀。
 */
export async function uploadWorkspacePackage(
  workspaceId: string,
  file: File,
): Promise<UploadedBlob> {
  const sizeError = packageUploadSizeError(file);
  if (sizeError) throw new Error(`package_too_large:${sizeError}`);

  const res = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/blobs/packages`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
      ...apiAuthHeaders(),
    },
    body: file,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`package_upload_failed:${res.status}:${text.slice(0, 120)}`);
  }
  const uploaded = (await res.json()) as UploadedBlob;
  return { ...uploaded, url: resolveWorkspaceBlobUrl(uploaded.url) };
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
