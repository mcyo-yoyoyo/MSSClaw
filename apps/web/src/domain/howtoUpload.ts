import type { PlazaGuideType, PlazaToolGuide } from '@/domain/plazaToolGuides';

/** 本地演示：文件转 data URL 存 localStorage；大视频请用外链 */
export const HOWTO_UPLOAD_MAX_MB = 3;
const MAX_BYTES = HOWTO_UPLOAD_MAX_MB * 1024 * 1024;

const ACCEPT_BY_TYPE: Partial<Record<PlazaGuideType, string>> = {
  image: 'image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif',
  pdf: 'application/pdf,.pdf',
  ppt: '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation',
  video: 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov',
  text: 'image/*,.pdf,.ppt,.pptx,.png,.jpg,.jpeg,.webp',
};

export function howtoUploadAccept(type: PlazaGuideType): string | null {
  return ACCEPT_BY_TYPE[type] ?? null;
}

export function guideAllowsUpload(type: PlazaGuideType): boolean {
  return type !== 'link';
}

export function isHowtoDataUrl(url: string | undefined): boolean {
  return Boolean(url && url.startsWith('data:'));
}

export function formatHowtoFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function assertAccept(type: PlazaGuideType, file: File) {
  const name = file.name.toLowerCase();
  const mime = (file.type || '').toLowerCase();
  if (type === 'image') {
    if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/.test(name)) return;
    throw new Error('请上传图片（png / jpg / webp / gif）');
  }
  if (type === 'pdf') {
    if (mime.includes('pdf') || name.endsWith('.pdf')) return;
    throw new Error('请上传 PDF 文件');
  }
  if (type === 'ppt') {
    if (mime.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx')) return;
    throw new Error('请上传 PPT / PPTX');
  }
  if (type === 'video') {
    if (mime.startsWith('video/') || /\.(mp4|webm|mov)$/.test(name)) return;
    throw new Error('请上传视频（mp4 / webm）');
  }
  // text 附件：放宽
}

export async function readHowtoUploadFile(
  file: File,
  type: PlazaGuideType,
): Promise<{ dataUrl: string; fileName: string; size: number }> {
  if (!guideAllowsUpload(type)) {
    throw new Error('外链类型请直接填写 URL');
  }
  if (file.size > MAX_BYTES) {
    throw new Error(
      `文件超过 ${HOWTO_UPLOAD_MAX_MB}MB。大文件请上传到网盘/对象存储后填链接`,
    );
  }
  assertAccept(type, file);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
  if (!dataUrl.startsWith('data:')) {
    throw new Error('文件读取异常');
  }
  return { dataUrl, fileName: file.name, size: file.size };
}

/** 打开资源：外链新窗口；本地 data URL 触发下载（PDF 也可尝试预览） */
export function openHowtoResource(guide: Pick<PlazaToolGuide, 'url' | 'fileName' | 'title' | 'type'>) {
  const url = guide.url;
  if (!url || url === '#') return false;

  if (isHowtoDataUrl(url)) {
    const a = document.createElement('a');
    a.href = url;
    a.download = guide.fileName || `${guide.title || 'howto'}`;
    // PDF / 图片：优先新标签预览
    if (guide.type === 'pdf' || guide.type === 'image' || url.startsWith('data:image')) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.removeAttribute('download');
    }
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  }

  const win = window.open(url, '_blank', 'noopener,noreferrer');
  return Boolean(win);
}
