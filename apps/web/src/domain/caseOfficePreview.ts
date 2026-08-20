import { unzipSync, strFromU8 } from 'fflate';
import * as XLSX from 'xlsx';
import type { PortalCasePreviewFile } from '@/domain/prototype/portalContent';
import { resolvePreviewSrc } from '@/domain/casePreview';

async function fileToBytes(file: PortalCasePreviewFile): Promise<Uint8Array | null> {
  if (file.dataUrl?.startsWith('data:')) {
    const comma = file.dataUrl.indexOf(',');
    const b64 = comma >= 0 ? file.dataUrl.slice(comma + 1) : file.dataUrl;
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  }
  const src = resolvePreviewSrc(file);
  if (!src) return null;
  const res = await fetch(src);
  if (!res.ok) return null;
  return new Uint8Array(await res.arrayBuffer());
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
  | { kind: 'xlsx'; sheets: { name: string; rows: string[][] }[] };

/** 从 dataUrl / blob url 解析 Office 附件为可渲染结构 */
export async function parseOfficePreview(
  file: PortalCasePreviewFile,
): Promise<OfficePreviewPayload | null> {
  try {
    const bytes = await fileToBytes(file);
    if (!bytes) return null;

    if (file.kind === 'xlsx') {
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

    if (file.kind === 'docx') {
      const files = unzipSync(bytes);
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
  } catch {
    return null;
  }
  return null;
}
