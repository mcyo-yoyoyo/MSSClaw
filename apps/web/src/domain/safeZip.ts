import { unzip, type Unzipped, type UnzipFileInfo } from 'fflate';
import { PACKAGE_UPLOAD_MAX_BYTES } from '@/domain/packageUpload';

const MIB = 1024 * 1024;

/**
 * ZIP 安全边界。上传包可到 200MiB，但浏览器不会无上限展开其内容。
 * 二进制文件只读取目录元数据，不参与详情页解压。
 */
export const PACKAGE_ZIP_LIMITS = {
  maxCompressedBytes: PACKAGE_UPLOAD_MAX_BYTES,
  maxEntries: 2_500,
  maxFiles: 2_000,
  maxTotalUncompressedBytes: 512 * MIB,
  maxSingleFileBytes: 256 * MIB,
  maxCompressionRatio: 200,
  compressionRatioMinBytes: 16 * MIB,
  maxPathLength: 1_024,
  maxMetadataFileBytes: 2 * MIB,
  maxMetadataTotalBytes: 6 * MIB,
  maxTextPreviewFileBytes: 1 * MIB,
  maxTextPreviewTotalBytes: 8 * MIB,
} as const;

export type PackageZipErrorCode =
  | 'aborted'
  | 'invalid_zip'
  | 'compressed_too_large'
  | 'too_many_entries'
  | 'too_many_files'
  | 'expanded_too_large'
  | 'single_file_too_large'
  | 'suspicious_ratio'
  | 'unsafe_path'
  | 'duplicate_path'
  | 'selected_file_too_large'
  | 'selected_total_too_large';

export class PackageZipError extends Error {
  constructor(
    readonly code: PackageZipErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PackageZipError';
  }
}

export interface SafeZipEntry {
  rawName: string;
  path: string;
  compressedSize: number;
  uncompressedSize: number;
  compression: number;
  isDirectory: boolean;
}

export interface SafeZipInspection {
  entries: SafeZipEntry[];
  fileCount: number;
  totalUncompressedBytes: number;
}

function zipBomb(message: string, code: PackageZipErrorCode): PackageZipError {
  return new PackageZipError(code, `ZIP 安全校验失败：${message}，疑似 ZIP bomb`);
}

function normalizeEntry(info: UnzipFileInfo): SafeZipEntry {
  const path = info.name.replace(/\\/g, '/');
  return {
    rawName: info.name,
    path,
    compressedSize: info.size,
    uncompressedSize: info.originalSize,
    compression: info.compression,
    isDirectory: path.endsWith('/'),
  };
}

function assertSafePath(entry: SafeZipEntry): void {
  const segments = entry.path.split('/').filter(Boolean);
  if (
    !entry.path ||
    entry.path.length > PACKAGE_ZIP_LIMITS.maxPathLength ||
    entry.path.startsWith('/') ||
    /^[a-zA-Z]:\//.test(entry.path) ||
    segments.some((segment) => segment === '..' || segment.includes('\0'))
  ) {
    throw new PackageZipError('unsafe_path', `ZIP 包含不安全路径：${entry.path || '（空路径）'}`);
  }
}

function invalidZipError(error: unknown): PackageZipError {
  if (error instanceof PackageZipError) return error;
  return new PackageZipError(
    'invalid_zip',
    error instanceof Error && error.message
      ? `无法解析 ZIP：${error.message}`
      : '无法解析 ZIP，文件可能已损坏或格式不受支持',
  );
}

/**
 * 只扫描中央目录，不解压文件内容。扫描在发现超限时立即中止，因此恶意超多条目不会遍历到底。
 */
export function inspectPackageZip(bytes: Uint8Array): Promise<SafeZipInspection> {
  if (bytes.byteLength > PACKAGE_ZIP_LIMITS.maxCompressedBytes) {
    return Promise.reject(
      new PackageZipError('compressed_too_large', 'ZIP 压缩包超过 200MB'),
    );
  }

  return new Promise((resolve, reject) => {
    const entries: SafeZipEntry[] = [];
    const seen = new Set<string>();
    let fileCount = 0;
    let totalUncompressedBytes = 0;

    try {
      unzip(
        bytes,
        {
          filter: (info) => {
            if (entries.length >= PACKAGE_ZIP_LIMITS.maxEntries) {
              throw zipBomb(
                `目录条目超过 ${PACKAGE_ZIP_LIMITS.maxEntries} 个`,
                'too_many_entries',
              );
            }

            const entry = normalizeEntry(info);
            assertSafePath(entry);
            const key = entry.path.replace(/\/$/, '');
            if (seen.has(key)) {
              throw new PackageZipError('duplicate_path', `ZIP 包含重复路径：${entry.path}`);
            }
            seen.add(key);
            entries.push(entry);

            if (!entry.isDirectory) {
              fileCount += 1;
              if (fileCount > PACKAGE_ZIP_LIMITS.maxFiles) {
                throw zipBomb(
                  `文件数量超过 ${PACKAGE_ZIP_LIMITS.maxFiles} 个`,
                  'too_many_files',
                );
              }
              if (entry.uncompressedSize > PACKAGE_ZIP_LIMITS.maxSingleFileBytes) {
                throw zipBomb(
                  `单文件 ${entry.path} 解压后超过 256MB`,
                  'single_file_too_large',
                );
              }
              totalUncompressedBytes += entry.uncompressedSize;
              if (totalUncompressedBytes > PACKAGE_ZIP_LIMITS.maxTotalUncompressedBytes) {
                throw zipBomb('解压后总大小超过 512MB', 'expanded_too_large');
              }
              if (
                entry.uncompressedSize >= PACKAGE_ZIP_LIMITS.compressionRatioMinBytes &&
                entry.uncompressedSize >
                  Math.max(1, entry.compressedSize) * PACKAGE_ZIP_LIMITS.maxCompressionRatio
              ) {
                throw zipBomb(
                  `文件 ${entry.path} 压缩比超过 ${PACKAGE_ZIP_LIMITS.maxCompressionRatio}:1`,
                  'suspicious_ratio',
                );
              }
            }
            return false;
          },
        },
        (error) => {
          if (error) reject(invalidZipError(error));
          else resolve({ entries, fileCount, totalUncompressedBytes });
        },
      );
    } catch (error) {
      reject(invalidZipError(error));
    }
  });
}

export interface SafeZipExtractionOptions {
  maxSelectedFileBytes: number;
  maxSelectedTotalBytes: number;
  signal?: AbortSignal;
}

/** 在已通过目录校验的 ZIP 中异步解压指定文件；其余文件不会分配解压内存。 */
export function extractInspectedZipEntries(
  bytes: Uint8Array,
  inspection: SafeZipInspection,
  selectedPaths: ReadonlySet<string>,
  options: SafeZipExtractionOptions,
): Promise<Record<string, Uint8Array>> {
  const selectedRawNames = new Set<string>();
  let selectedTotal = 0;

  for (const entry of inspection.entries) {
    if (entry.isDirectory || !selectedPaths.has(entry.path)) continue;
    if (entry.uncompressedSize > options.maxSelectedFileBytes) {
      return Promise.reject(
        new PackageZipError(
          'selected_file_too_large',
          `需要读取的文件 ${entry.path} 超过 ${Math.round(options.maxSelectedFileBytes / MIB)}MB 上限`,
        ),
      );
    }
    selectedTotal += entry.uncompressedSize;
    if (selectedTotal > options.maxSelectedTotalBytes) {
      return Promise.reject(
        new PackageZipError(
          'selected_total_too_large',
          `需要读取的文件合计超过 ${Math.round(options.maxSelectedTotalBytes / MIB)}MB 上限`,
        ),
      );
    }
    selectedRawNames.add(entry.rawName);
  }

  if (!selectedRawNames.size) return Promise.resolve({});

  return new Promise((resolve, reject) => {
    let settled = false;
    let terminate: (() => void) | undefined;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener('abort', onAbort);
      callback();
    };
    const onAbort = () => {
      terminate?.();
      finish(() => reject(new PackageZipError('aborted', 'ZIP 解压已取消')));
    };

    if (options.signal?.aborted) {
      onAbort();
      return;
    }
    options.signal?.addEventListener('abort', onAbort, { once: true });

    try {
      terminate = unzip(
        bytes,
        { filter: (info) => selectedRawNames.has(info.name) },
        (error, files: Unzipped) => {
          if (error) {
            finish(() => reject(invalidZipError(error)));
            return;
          }
          const normalized: Record<string, Uint8Array> = {};
          for (const [rawName, data] of Object.entries(files)) {
            normalized[rawName.replace(/\\/g, '/')] = data;
          }
          finish(() => resolve(normalized));
        },
      );
    } catch (error) {
      finish(() => reject(invalidZipError(error)));
    }
  });
}

/** 导入解析只读取匹配的元数据文件，不展开整个包。 */
export async function readPackageZipMetadata(
  bytes: Uint8Array,
  matches: (path: string) => boolean,
  signal?: AbortSignal,
): Promise<Record<string, Uint8Array>> {
  const inspection = await inspectPackageZip(bytes);
  const selected = new Set(
    inspection.entries
      .filter((entry) => !entry.isDirectory && matches(entry.path))
      .map((entry) => entry.path),
  );
  return extractInspectedZipEntries(bytes, inspection, selected, {
    maxSelectedFileBytes: PACKAGE_ZIP_LIMITS.maxMetadataFileBytes,
    maxSelectedTotalBytes: PACKAGE_ZIP_LIMITS.maxMetadataTotalBytes,
    signal,
  });
}

export function packageZipErrorMessage(error: unknown, fallback: string): string {
  return error instanceof PackageZipError ? error.message : fallback;
}
