import type { PortalCasePreviewFile } from '@/domain/prototype/portalContent';

const MAX_BYTES = 3 * 1024 * 1024;

const ACCEPT =
  '.pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.gif,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*';

export const CASE_PREVIEW_ACCEPT = ACCEPT;
export const CASE_PREVIEW_MAX_MB = 3;

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
  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/.test(name)) return 'image';
  return 'other';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function previewKindLabel(kind: PortalCasePreviewFile['kind']): string {
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
    default:
      return '文件';
  }
}

export function previewKindIcon(kind: PortalCasePreviewFile['kind']): string {
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
    default:
      return 'fa-file';
  }
}

export async function readCasePreviewFile(file: File): Promise<PortalCasePreviewFile> {
  if (file.size > MAX_BYTES) {
    throw new Error(`文件超过 ${CASE_PREVIEW_MAX_MB}MB，请压缩后上传`);
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

export function downloadPreviewFile(file: PortalCasePreviewFile) {
  const anchor = document.createElement('a');
  anchor.href = file.dataUrl;
  anchor.download = file.name;
  anchor.click();
}
