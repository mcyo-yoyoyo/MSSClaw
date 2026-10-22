/**
 * 站内公告正文：纯文本 + 单独成行的图片标记 `![说明](/api/v1/blobs/<id>)`。
 * 只认平台上传的图片（相对路径的 blob 地址）；外部链接、其它 Markdown 写法一律按纯文本显示。
 */

export const ANNOUNCEMENT_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
export const ANNOUNCEMENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const ANNOUNCEMENT_IMAGE_MAX_COUNT = 9;

export type AnnouncementBodyBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; alt: string; url: string };

const IMAGE_LINE = /^!\[([^\]\n]*)\]\((\/api\/v1\/blobs\/[A-Za-z0-9_-]+)\)$/;

function imageOf(line: string): { alt: string; url: string } | null {
  const match = IMAGE_LINE.exec(line.trim());
  return match ? { alt: match[1].trim(), url: match[2] } : null;
}

/** 拆成文字块和图片块；相邻的文字行合成一块，保留原有换行 */
export function parseAnnouncementBody(body: string): AnnouncementBodyBlock[] {
  const blocks: AnnouncementBodyBlock[] = [];
  let text: string[] = [];
  const flush = () => {
    const joined = text.join('\n').replace(/^\n+|\n+$/g, '');
    if (joined) blocks.push({ type: 'text', text: joined });
    text = [];
  };
  for (const line of body.replace(/\r\n/g, '\n').split('\n')) {
    const image = imageOf(line);
    if (image) {
      flush();
      blocks.push({ type: 'image', ...image });
    } else {
      text.push(line);
    }
  }
  flush();
  return blocks;
}

export function countAnnouncementImages(body: string): number {
  return parseAnnouncementBody(body).filter((block) => block.type === 'image').length;
}

/** 列表摘要：图片换成「[图片]」 */
export function announcementSummary(body: string): string {
  return body
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => (imageOf(line) ? '[图片]' : line))
    .join('\n');
}

/** 插入用的标记；说明里的方括号和换行会破坏标记，先去掉 */
export function announcementImageMarkdown(fileName: string, blobId: string): string {
  const alt = fileName.replace(/\.[^.]+$/, '').replace(/[[\]\n\r]/g, ' ').trim();
  return `![${alt}](/api/v1/blobs/${blobId})`;
}

/** 在光标处插入一行图片，保证它前后各自换行、独占一行；返回新正文和插入后光标位置 */
export function insertImageLine(body: string, cursor: number, line: string): { body: string; cursor: number } {
  const at = Math.max(0, Math.min(cursor, body.length));
  const before = body.slice(0, at);
  const after = body.slice(at);
  const lead = before && !before.endsWith('\n') ? '\n' : '';
  const trail = after.startsWith('\n') ? '' : '\n';
  const next = `${before}${lead}${line}${trail}${after}`;
  // 图片行后面一定跟着一个换行（补的或原有的），光标放到它之后，接着打字就是新的一行
  return { body: next, cursor: before.length + lead.length + line.length + 1 };
}
