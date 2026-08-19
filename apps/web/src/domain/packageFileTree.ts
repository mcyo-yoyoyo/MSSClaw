import { strFromU8, unzipSync } from 'fflate';
import {
  extractInspectedZipEntries,
  inspectPackageZip,
  PACKAGE_ZIP_LIMITS,
  type SafeZipEntry,
} from '@/domain/safeZip';

/**
 * 资源包（zip）→ 分层文件树。Skill 文件包与 Agent 执行包共用。
 *
 * 只存 blob 引用、按需在浏览器内解压：包内可能有几十个文件，把解压结果写进
 * CenterRecord 那条 JSON 会迅速撑爆（SQLite 单条 JSON 读写要整体反序列化）。
 * 原始 zip 保留在 blob 中，下载功能可直接复用。
 */

export interface PackageFile {
  /** 包内完整路径，如 prompts/review.md */
  path: string;
  name: string;
  size: number;
  /** 文本类文件的内容；二进制文件为 undefined，只展示元信息 */
  text?: string;
  isBinary: boolean;
  /** 文本未预览时的明确原因，例如超过单文件或总预览预算。 */
  previewMessage?: string;
}

export interface PackageDir {
  name: string;
  path: string;
  dirs: PackageDir[];
  files: PackageFile[];
}

/** 可直接预览的文本类扩展名；其余按二进制处理，只显示大小与类型 */
const TEXT_EXT = new Set([
  'md', 'markdown', 'txt', 'json', 'yaml', 'yml', 'csv', 'tsv',
  'js', 'ts', 'tsx', 'jsx', 'py', 'sh', 'bat', 'sql', 'html', 'css',
  'xml', 'ini', 'toml', 'env', 'gitignore', 'log',
]);

export function isTextPath(path: string): boolean {
  const name = path.split('/').pop() ?? '';
  if (!name.includes('.')) return false;
  return TEXT_EXT.has(name.split('.').pop()!.toLowerCase());
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

interface TreeEntry {
  path: string;
  size: number;
  isDirectory: boolean;
  data?: Uint8Array;
  previewMessage?: string;
}

/** 解压并构建分层目录树；仅供可信的小型同步调用，UI 与上传解析走异步安全版本。 */
export function buildPackageFileTree(bytes: Uint8Array): {
  root: PackageDir;
  fileCount: number;
} {
  const entries = unzipSync(bytes);
  return buildTree(
    Object.entries(entries).map(([path, data]) => ({
      path: path.replace(/\\/g, '/'),
      size: data.length,
      isDirectory: path.endsWith('/'),
      data,
    })),
  );
}

function ignoredPath(path: string): boolean {
  return path.startsWith('__MACOSX/') || path.split('/').pop() === '.DS_Store';
}

function previewPriority(entry: SafeZipEntry): number {
  const name = entry.path.split('/').pop()?.toLowerCase() ?? '';
  if (name === 'skill.md' || name === 'agent.md') return 0;
  if (name === 'mssclaw.manifest.json') return 1;
  if (name === 'readme.md' || name === 'readme') return 2;
  return 3;
}

/**
 * 安全异步目录树：先校验中央目录，再只异步解压有限的文本预览。
 * 二进制内容和超出预览预算的文本不会解压进浏览器内存。
 */
export async function buildPackageFileTreeAsync(
  bytes: Uint8Array,
  signal?: AbortSignal,
): Promise<{ root: PackageDir; fileCount: number; totalUncompressedBytes: number }> {
  const inspection = await inspectPackageZip(bytes);
  const previewMessages = new Map<string, string>();
  const selected = new Set<string>();
  let previewTotal = 0;

  const candidates = inspection.entries
    .filter(
      (entry) =>
        !entry.isDirectory && !ignoredPath(entry.path) && isTextPath(entry.path),
    )
    .sort((a, b) => previewPriority(a) - previewPriority(b));

  for (const entry of candidates) {
    if (entry.uncompressedSize > PACKAGE_ZIP_LIMITS.maxTextPreviewFileBytes) {
      previewMessages.set(
        entry.path,
        `文本文件超过 ${formatBytes(PACKAGE_ZIP_LIMITS.maxTextPreviewFileBytes)} 预览上限，请下载原包查看。`,
      );
      continue;
    }
    if (
      previewTotal + entry.uncompressedSize >
      PACKAGE_ZIP_LIMITS.maxTextPreviewTotalBytes
    ) {
      previewMessages.set(
        entry.path,
        `包内文本预览合计超过 ${formatBytes(PACKAGE_ZIP_LIMITS.maxTextPreviewTotalBytes)}，请下载原包查看。`,
      );
      continue;
    }
    selected.add(entry.path);
    previewTotal += entry.uncompressedSize;
  }

  const extracted = await extractInspectedZipEntries(bytes, inspection, selected, {
    maxSelectedFileBytes: PACKAGE_ZIP_LIMITS.maxTextPreviewFileBytes,
    maxSelectedTotalBytes: PACKAGE_ZIP_LIMITS.maxTextPreviewTotalBytes,
    signal,
  });
  const tree = buildTree(
    inspection.entries.map((entry) => ({
      path: entry.path,
      size: entry.uncompressedSize,
      isDirectory: entry.isDirectory,
      data: extracted[entry.path],
      previewMessage: previewMessages.get(entry.path),
    })),
  );
  return { ...tree, totalUncompressedBytes: inspection.totalUncompressedBytes };
}

function buildTree(entries: TreeEntry[]): {
  root: PackageDir;
  fileCount: number;
} {
  const root: PackageDir = { name: '', path: '', dirs: [], files: [] };
  let fileCount = 0;

  const ensureDir = (segments: string[]): PackageDir => {
    let cur = root;
    const walked: string[] = [];
    for (const seg of segments) {
      walked.push(seg);
      let next = cur.dirs.find((d) => d.name === seg);
      if (!next) {
        next = { name: seg, path: walked.join('/'), dirs: [], files: [] };
        cur.dirs.push(next);
      }
      cur = next;
    }
    return cur;
  };

  for (const entry of entries) {
    const path = entry.path.replace(/\\/g, '/');
    // zip 里的目录项以 / 结尾且长度为 0，建空目录即可
    if (entry.isDirectory || path.endsWith('/')) {
      ensureDir(path.split('/').filter(Boolean));
      continue;
    }
    // macOS 打包残留，展示出来只会干扰
    if (ignoredPath(path)) continue;

    const segments = path.split('/').filter(Boolean);
    const name = segments.pop()!;
    const dir = ensureDir(segments);
    let isBinary = !isTextPath(path);
    const text = !isBinary && entry.data ? safeDecode(entry.data) : undefined;
    if (!isBinary && entry.data && text === undefined) isBinary = true;
    dir.files.push({
      path,
      name,
      size: entry.size,
      isBinary,
      text,
      previewMessage: isBinary ? undefined : entry.previewMessage,
    });
    fileCount += 1;
  }

  sortDir(root);
  return { root, fileCount };
}

function safeDecode(data: Uint8Array): string | undefined {
  try {
    return strFromU8(data);
  } catch {
    // 声明为文本但实际不是合法 UTF-8：降级为二进制，避免渲染乱码
    return undefined;
  }
}

/** 目录在前、文件在后，各自按名称排序，保证展示顺序稳定 */
function sortDir(dir: PackageDir) {
  dir.dirs.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  dir.files.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  dir.dirs.forEach(sortDir);
}

/** 说明入口文件优先于按名称排序的第一个文件 */
const ENTRY_FILE_NAMES = ['skill.md', 'agent.md', 'readme.md', 'readme'];

/**
 * 打开「文件」Tab 时默认选中的文件，避免右侧空白。
 * 优先根目录说明文件 → 任意文本文件 → 兜底第一个文件。
 */
export function firstPreviewableFile(dir: PackageDir): PackageFile | null {
  const entry = dir.files.find(
    (f) => !f.isBinary && ENTRY_FILE_NAMES.includes(f.name.toLowerCase()),
  );
  if (entry) return entry;
  const text = dir.files.find((f) => !f.isBinary);
  if (text) return text;
  for (const sub of dir.dirs) {
    const found = firstPreviewableFile(sub);
    if (found) return found;
  }
  return dir.files[0] ?? null;
}
