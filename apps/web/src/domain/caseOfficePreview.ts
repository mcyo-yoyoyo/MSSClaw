import { unzipSync, strFromU8 } from 'fflate';
import * as XLSX from 'xlsx';
import type { PortalCasePreviewFile } from '@/domain/prototype/portalContent';

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function stripXml(xml: string): string {
  return xml
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/a:p>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export type OfficePreviewPayload =
  | { kind: 'docx'; paragraphs: string[] }
  | { kind: 'pptx'; slides: { title: string; body: string }[] }
  | { kind: 'xlsx'; sheets: { name: string; rows: string[][] }[] };

/** 从 dataUrl 解析 Office 附件为可渲染结构（演示环境本地解析，无需外链） */
export async function parseOfficePreview(
  file: PortalCasePreviewFile,
): Promise<OfficePreviewPayload | null> {
  try {
    if (file.kind === 'xlsx') {
      const bytes = dataUrlToBytes(file.dataUrl);
      const wb = XLSX.read(bytes, { type: 'array' });
      const sheets = wb.SheetNames.slice(0, 6).map((name) => {
        const sheet = wb.Sheets[name];
        const rows = (XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
          raw: false,
        }) as unknown[][])
          .slice(0, 40)
          .map((row) =>
            (row as unknown[]).slice(0, 12).map((cell) => String(cell ?? '')),
          );
        return { name, rows };
      });
      return { kind: 'xlsx', sheets };
    }

    if (file.kind === 'docx' || file.kind === 'pptx') {
      const bytes = dataUrlToBytes(file.dataUrl);
      const files = unzipSync(bytes);
      if (file.kind === 'docx') {
        const entry =
          files['word/document.xml'] ||
          Object.entries(files).find(([k]) => k.endsWith('word/document.xml'))?.[1];
        if (!entry) return null;
        const text = stripXml(strFromU8(entry));
        const paragraphs = text
          .split('\n')
          .map((p) => p.trim())
          .filter(Boolean)
          .slice(0, 80);
        return { kind: 'docx', paragraphs };
      }

      const slideKeys = Object.keys(files)
        .filter((k) => /ppt\/slides\/slide\d+\.xml$/i.test(k.replace(/\\/g, '/')))
        .sort((a, b) => {
          const na = Number(/slide(\d+)/i.exec(a)?.[1] ?? 0);
          const nb = Number(/slide(\d+)/i.exec(b)?.[1] ?? 0);
          return na - nb;
        })
        .slice(0, 12);

      const slides = slideKeys.map((key, i) => {
        const xml = strFromU8(files[key]!);
        const text = stripXml(xml);
        const lines = text
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        return {
          title: lines[0] || `第 ${i + 1} 页`,
          body: lines.slice(1).join('\n') || lines[0] || '（本页无可提取文本，可下载原件查看）',
        };
      });
      return { kind: 'pptx', slides };
    }
  } catch {
    return null;
  }
  return null;
}
