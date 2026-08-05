import type {
  PortalCasePreviewFile,
  PortalContentItem,
} from '@/domain/prototype/portalContent';
import { apiUrl } from '@/api/client';

const MAX_BYTES_LOCAL = 3 * 1024 * 1024;
const MAX_BYTES_BLOB = 12 * 1024 * 1024;

const ACCEPT =
  '.pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mov,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*,video/*';

/** 版式视觉预览仅允许 PDF / 图片（走原生在线预览） */
const LAYOUT_ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.webp,.gif,application/pdf,image/png,image/jpeg,image/webp,image/gif';

export const CASE_PREVIEW_ACCEPT = ACCEPT;
export const CASE_LAYOUT_PREVIEW_ACCEPT = LAYOUT_ACCEPT;
/** 离线 localStorage 上限说明；API 在线外提 blob 时可到 12MB */
export const CASE_PREVIEW_MAX_MB = 3;
export const CASE_PREVIEW_BLOB_MAX_MB = 12;

export function detectPreviewKind(file: File): PortalCasePreviewFile['kind'] {
  const name = file.name.toLowerCase();
  const mime = (file.type || '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (
    mime.includes('presentation') ||
    name.endsWith('.pptx') ||
    name.endsWith('.ppt')
  ) {
    return 'pptx';
  }
  if (mime.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) return 'docx';
  if (mime.includes('sheet') || name.endsWith('.xlsx') || name.endsWith('.xls')) return 'xlsx';
  if (mime.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/.test(name)) return 'video';
  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/.test(name)) return 'image';
  return 'other';
}

export function isNativeVisualPreviewKind(
  kind: PortalCasePreviewFile['kind'] | undefined | null,
): boolean {
  return kind === 'pdf' || kind === 'image' || kind === 'video';
}

/** PPT/Word 无版式预览件时仅能文本大纲，建议另传 PDF/图片 */
export function needsLayoutPreviewCompanion(
  kind: PortalCasePreviewFile['kind'] | undefined | null,
): boolean {
  return kind === 'pptx' || kind === 'docx';
}

export function hasPreviewPayload(
  file: PortalCasePreviewFile | null | undefined,
): boolean {
  return Boolean(file && (file.dataUrl || file.url));
}

/** 浏览器可加载的 src（相对 API 路径会拼 apiUrl） */
export function resolvePreviewSrc(file: PortalCasePreviewFile): string | null {
  if (file.dataUrl) return file.dataUrl;
  if (!file.url) return null;
  if (
    file.url.startsWith('data:') ||
    file.url.startsWith('blob:') ||
    file.url.startsWith('http://') ||
    file.url.startsWith('https://')
  ) {
    return file.url;
  }
  if (file.url.startsWith('/')) return apiUrl(file.url);
  return file.url;
}

/** 业务侧在线预览优先用视觉预览件 */
export function resolveOnlinePreviewFile(
  item: Pick<PortalContentItem, 'previewFile' | 'layoutPreviewFile'>,
): PortalCasePreviewFile | null {
  if (hasPreviewPayload(item.layoutPreviewFile)) return item.layoutPreviewFile!;
  if (hasPreviewPayload(item.previewFile)) return item.previewFile!;
  return null;
}

/** 下载原件：优先主附件；仅有视觉件时回落视觉件 */
export function resolveDownloadOriginalFile(
  item: Pick<PortalContentItem, 'previewFile' | 'layoutPreviewFile'>,
): PortalCasePreviewFile | null {
  if (hasPreviewPayload(item.previewFile)) return item.previewFile!;
  if (hasPreviewPayload(item.layoutPreviewFile)) return item.layoutPreviewFile!;
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function previewKindLabel(kind: PortalCasePreviewFile['kind'] | 'link'): string {
  switch (kind) {
    case 'pdf':
      return 'PDF';
    case 'pptx':
      return 'PPT';
    case 'docx':
      return 'Word';
    case 'xlsx':
      return 'Excel';
    case 'image':
      return '图片';
    case 'video':
      return '视频';
    case 'link':
      return '链接';
    default:
      return '文件';
  }
}

export function previewKindIcon(kind: PortalCasePreviewFile['kind'] | 'link'): string {
  switch (kind) {
    case 'pdf':
      return 'fa-file-pdf';
    case 'pptx':
      return 'fa-file-powerpoint';
    case 'docx':
      return 'fa-file-word';
    case 'xlsx':
      return 'fa-file-excel';
    case 'image':
      return 'fa-file-image';
    case 'video':
      return 'fa-file-video';
    case 'link':
      return 'fa-link';
    default:
      return 'fa-file';
  }
}

export async function readCasePreviewFile(
  file: File,
  opts?: { allowBlobQuota?: boolean },
): Promise<PortalCasePreviewFile> {
  const max = opts?.allowBlobQuota ? MAX_BYTES_BLOB : MAX_BYTES_LOCAL;
  const maxMb = opts?.allowBlobQuota ? CASE_PREVIEW_BLOB_MAX_MB : CASE_PREVIEW_MAX_MB;
  if (file.size > max) {
    throw new Error(
      opts?.allowBlobQuota
        ? `文件超过 ${maxMb}MB，请压缩后上传或改用外链`
        : `文件超过 ${maxMb}MB（离线缓存上限）。连接共享 API 后可上传至 ${CASE_PREVIEW_BLOB_MAX_MB}MB，或改用外链`,
    );
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
  if (!dataUrl.startsWith('data:')) {
    throw new Error('文件读取异常');
  }
  return {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    dataUrl,
    kind: detectPreviewKind(file),
  };
}

/** 视觉预览件：仅 PDF / 图片 */
export async function readCaseLayoutPreviewFile(
  file: File,
  opts?: { allowBlobQuota?: boolean },
): Promise<PortalCasePreviewFile> {
  const preview = await readCasePreviewFile(file, opts);
  if (preview.kind !== 'pdf' && preview.kind !== 'image') {
    throw new Error('视觉预览仅支持 PDF 或图片');
  }
  return preview;
}

export function downloadPreviewFile(file: PortalCasePreviewFile) {
  const href = resolvePreviewSrc(file);
  if (!href) return;
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = file.name;
  if (!href.startsWith('data:')) {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }
  anchor.click();
}
