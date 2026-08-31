import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const srcRoot = fileURLToPath(new URL('../src/', import.meta.url));

async function listTsxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return listTsxFiles(path);
      return Promise.resolve(entry.isFile() && entry.name.endsWith('.tsx') ? [path] : []);
    }),
  );
  return nested.flat();
}

/** 提取 JSX opening tag；需要跳过箭头函数里的 `>`，所以不能用简单的 `[^>]+`。 */
function openingTags(source: string): Array<{ start: number; text: string }> {
  const tags: Array<{ start: number; text: string }> = [];
  let cursor = 0;
  while (cursor < source.length) {
    const start = source.indexOf('<', cursor);
    if (start < 0) break;
    if (!/^<(?:div|button)\b/.test(source.slice(start))) {
      cursor = start + 1;
      continue;
    }

    let quote: '"' | "'" | '`' | null = null;
    let escaped = false;
    let braceDepth = 0;
    let end = start + 1;
    for (; end < source.length; end += 1) {
      const char = source[end];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'" || char === '`') quote = char;
      else if (char === '{') braceDepth += 1;
      else if (char === '}') braceDepth = Math.max(0, braceDepth - 1);
      else if (char === '>' && braceDepth === 0) break;
    }
    tags.push({ start, text: source.slice(start, end + 1) });
    cursor = end + 1;
  }
  return tags;
}

test('全屏弹窗遮罩不得绑定点击关闭事件', async () => {
  const violations: string[] = [];
  for (const file of await listTsxFiles(srcRoot)) {
    const source = await readFile(file, 'utf8');
    for (const tag of openingTags(source)) {
      const isFullscreenOverlay = /\bfixed inset-0\b/.test(tag.text);
      const isCloseBackdrop =
        /\babsolute inset-0\b/.test(tag.text) && /aria-label=["'][^"']*关闭/.test(tag.text);
      const hasPointerDismiss = /\bon(?:Click|MouseDown|PointerDown)\s*=/.test(tag.text);
      if ((!isFullscreenOverlay && !isCloseBackdrop) || !hasPointerDismiss) continue;
      const line = source.slice(0, tag.start).split('\n').length;
      violations.push(`${relative(srcRoot, file)}:${line}`);
    }
  }

  assert.deepEqual(
    violations,
    [],
    `以下全屏遮罩仍绑定了指针事件，点击阴影可能关闭弹窗：\n${violations.join('\n')}`,
  );
});
