/** 资产详情页「分享」：复制「【平台名】标题｜一句话简介」+ 链接 */

const PLATFORM_NAME = 'MSS AI提效平台';
const BRIEF_MAX = 60;

/** 一句话简介：取第一句，过长截断 */
export function oneLineBrief(text: string | undefined | null): string {
  const first = (text ?? '').trim().split(/[。！？!?\n]/)[0]?.trim() ?? '';
  return first.length > BRIEF_MAX ? `${first.slice(0, BRIEF_MAX)}…` : first;
}

export function assetShareText(title: string, summary: string | undefined | null, url: string): string {
  const brief = oneLineBrief(summary);
  return `【${PLATFORM_NAME}】${title.trim()}${brief ? `｜${brief}` : ''}\n${url}`;
}

/** 内网多为 http，拿不到 navigator.clipboard 时退回 execCommand */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 退回下面的兼容写法 */
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } finally {
    textarea.remove();
  }
}
