import type { PortalCasePreviewFile, PortalContentItem } from '@/domain/prototype/portalContent';
import { apiUrl, isApiEnabled, apiAuthHeaders, getApiBase } from '@/api/client';
import { packageUploadSizeError } from '@/domain/packageUpload';

export type UploadedBlob = {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
};

export type DownloadableBlob = Pick<UploadedBlob, 'url' | 'name'>;
export type DeletableBlob = Partial<Pick<UploadedBlob, 'id' | 'url'>>;

type PackageUploadContext = {
  workspaceId: string;
  apiBase: string;
  uploadUrl: string;
  deleteUrl: string;
  authHeaders: Record<string, string>;
  deleteToken: string;
};

/**
 * 删除凭证只存在于不可枚举的内存属性中；JSON.stringify 和对象展开都不会
 * 把 token 带入持久化 packageBlob。
 */
export type UploadedPackageBlob = UploadedBlob & {
  readonly __packageUploadContext: PackageUploadContext;
};

export type WorkspaceBlobDeleteOptions = {
  deleteToken: string;
  /** 留空字符串表示上传时使用同源 API。 */
  apiBase?: string;
  authHeaders?: Record<string, string>;
};

function apiUrlForBase(apiBase: string, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return apiBase ? `${apiBase.replace(/\/$/, '')}${normalized}` : normalized;
}

function freezeRequestUrl(url: string): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) return url;
  if (typeof location === 'undefined') return url;
  return new URL(url, location.origin).toString();
}

function resolveWorkspaceBlobUrlForBase(url: string, apiBase: string): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//')) return url;
  return apiUrlForBase(apiBase, url);
}

function packageUploadContext(blob: string | DeletableBlob): PackageUploadContext | undefined {
  if (typeof blob === 'string') return undefined;
  return (blob as Partial<UploadedPackageBlob>).__packageUploadContext;
}

function sameHeaders(left: Record<string, string>, right: Record<string, string>): boolean {
  const leftEntries = Object.entries(left).sort(([a], [b]) => a.localeCompare(b));
  const rightEntries = Object.entries(right).sort(([a], [b]) => a.localeCompare(b));
  return (
    leftEntries.length === rightEntries.length &&
    leftEntries.every(([key, value], index) => {
      const candidate = rightEntries[index];
      return candidate?.[0] === key && candidate[1] === value;
    })
  );
}

/** 上传期间 workspace、API 基址或鉴权配置变化后，旧响应不得写入当前表单。 */
export function isPackageUploadContextCurrent(
  blob: UploadedPackageBlob,
  workspaceId: string,
): boolean {
  const context = blob.__packageUploadContext;
  const currentApiBase = getApiBase();
  const currentUploadUrl = freezeRequestUrl(
    apiUrlForBase(
      currentApiBase,
      `/api/v1/workspaces/${workspaceId}/blobs/packages`,
    ),
  );
  return (
    context.workspaceId === workspaceId &&
    context.apiBase === currentApiBase &&
    context.uploadUrl === currentUploadUrl &&
    sameHeaders(context.authHeaders, apiAuthHeaders())
  );
}

function packageDeleteUrl(uploadUrl: string, responseUrl: string, blobId: string): string {
  const effectiveUploadUrl = responseUrl || uploadUrl;
  try {
    const absoluteUploadUrl = freezeRequestUrl(effectiveUploadUrl);
    const url = new URL(
      absoluteUploadUrl,
      typeof location === 'undefined' ? 'http://mssclaw.local' : location.origin,
    );
    const match = url.pathname.match(/^(.*\/)packages\/?$/);
    if (!match?.[1]) throw new Error('unexpected_package_upload_url');
    url.pathname = `${match[1]}${encodeURIComponent(blobId)}`;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    const fallback = effectiveUploadUrl.replace(
      /\/packages\/?(?:[?#].*)?$/,
      `/${encodeURIComponent(blobId)}`,
    );
    return freezeRequestUrl(fallback);
  }
}

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

function resolveWorkspaceBlobId(blob: string | DeletableBlob): string {
  const explicitId = typeof blob === 'string' ? '' : blob.id?.trim();
  if (explicitId) return explicitId;

  const candidate = typeof blob === 'string' ? blob.trim() : blob.url?.trim() || '';
  if (candidate && !candidate.includes('/') && !candidate.includes('?')) return candidate;
  try {
    const pathname = new URL(candidate, 'http://mssclaw.local').pathname;
    const match = pathname.match(/\/blobs\/([^/]+)\/?$/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // 统一在下方返回可诊断错误。
  }
  throw new Error('blob_id_required');
}

/** 删除未被记录引用的临时 blob；调用方决定是否忽略清理失败。 */
export async function deleteWorkspaceBlob(
  workspaceId: string,
  blob: string | DeletableBlob,
  options?: WorkspaceBlobDeleteOptions,
): Promise<void> {
  const uploadContext = packageUploadContext(blob);
  const targetWorkspaceId = uploadContext?.workspaceId ?? workspaceId;
  const deleteToken = uploadContext?.deleteToken ?? options?.deleteToken?.trim();
  if (!deleteToken) throw new Error('blob_delete_token_required');

  const targetApiBase = uploadContext?.apiBase ?? options?.apiBase ?? getApiBase();
  const authHeaders = uploadContext?.authHeaders ?? options?.authHeaders ?? apiAuthHeaders();
  const blobId = resolveWorkspaceBlobId(blob);
  const deleteUrl =
    uploadContext?.deleteUrl ??
    apiUrlForBase(
      targetApiBase,
      `/api/v1/workspaces/${targetWorkspaceId}/blobs/${encodeURIComponent(blobId)}`,
    );
  const res = await fetch(
    deleteUrl,
    {
      method: 'DELETE',
      headers: {
        ...authHeaders,
        'X-Blob-Delete-Token': deleteToken,
      },
    },
  );
  // 清理为幂等操作：已不存在等价于删除成功。
  if (res.ok || res.status === 404) return;
  const text = await res.text().catch(() => '');
  throw new Error(`blob_delete_failed:${res.status}:${text.slice(0, 120)}`);
}

/**
 * Skill / Agent 原始包使用二进制请求上传，避免大文件转 data URL / base64 时的体积与内存膨胀。
 */
export async function uploadWorkspacePackage(
  workspaceId: string,
  file: File,
): Promise<UploadedPackageBlob> {
  const sizeError = packageUploadSizeError(file);
  if (sizeError) throw new Error(`package_too_large:${sizeError}`);

  const apiBase = getApiBase();
  const authHeaders = apiAuthHeaders();
  const uploadUrl = freezeRequestUrl(
    apiUrlForBase(apiBase, `/api/v1/workspaces/${workspaceId}/blobs/packages`),
  );
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
      ...authHeaders,
    },
    body: file,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`package_upload_failed:${res.status}:${text.slice(0, 120)}`);
  }
  const uploaded = (await res.json()) as UploadedBlob & { deleteToken?: unknown };
  const deleteToken =
    typeof uploaded.deleteToken === 'string' ? uploaded.deleteToken.trim() : '';
  if (!deleteToken) throw new Error('package_upload_missing_delete_token');

  const result: UploadedBlob = {
    id: uploaded.id,
    url: resolveWorkspaceBlobUrlForBase(uploaded.url, apiBase),
    name: uploaded.name,
    mimeType: uploaded.mimeType,
    size: uploaded.size,
  };
  Object.defineProperty(result, '__packageUploadContext', {
    value: {
      workspaceId,
      apiBase,
      uploadUrl,
      deleteUrl: packageDeleteUrl(uploadUrl, res.url, uploaded.id),
      authHeaders,
      deleteToken,
    } satisfies PackageUploadContext,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return result as UploadedPackageBlob;
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
