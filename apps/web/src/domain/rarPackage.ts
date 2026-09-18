import { zip, type AsyncZippable } from 'fflate';
import { createExtractorFromData, type Extractor } from 'node-unrar-js';
import unrarWasmUrl from 'node-unrar-js/esm/js/unrar.wasm?url';
import { PACKAGE_UPLOAD_MAX_BYTES, PACKAGE_UPLOAD_MAX_LABEL } from '@/domain/packageUpload';
import { RAR_UNAVAILABLE_MESSAGE } from '@/domain/rarUpload';
import {
  assertSafeArchivePath,
  PACKAGE_ZIP_LIMITS,
  PackageZipError,
  type PackageZipErrorCode,
} from '@/domain/safeZip';

/**
 * RAR → ZIP。上传后的解析、原包留档、详情页目录树与下载都只认 ZIP，
 * 所以 RAR 先在浏览器里整体转换。安全边界与 ZIP 共用 PACKAGE_ZIP_LIMITS，
 * 超限在读文件头阶段就会拦下，不会分配解压内存。
 */

export type RarExtractor = Pick<Extractor<Uint8Array>, 'getFileList' | 'extract'>;
export type OpenRarArchive = (data: ArrayBuffer) => Promise<RarExtractor>;

const MIB = 1024 * 1024;
/** "Rar!\x1a\x07"，其后 RAR4 为 00、RAR5 为 01 00 */
const RAR_SIGNATURE = [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07];
const ENCRYPTED_MESSAGE = 'RAR 压缩包设置了密码，请去掉密码后重新打包';

export function rarZipFileName(name: string): string {
  return name.replace(/\.rar$/i, '.zip');
}

function limitError(message: string, code: PackageZipErrorCode): PackageZipError {
  return new PackageZipError(code, `RAR 安全校验失败：${message}`);
}

/** unrar 的异常带 reason（UnrarError）；其余异常一律按无法解析处理。 */
function rarError(error: unknown): PackageZipError {
  if (error instanceof PackageZipError) return error;
  const reason = error instanceof Error && 'reason' in error ? error.reason : undefined;
  switch (reason) {
    case 'ERAR_MISSING_PASSWORD':
    case 'ERAR_BAD_PASSWORD':
      return new PackageZipError('encrypted_rar', ENCRYPTED_MESSAGE);
    case 'ERAR_BAD_DATA':
      return new PackageZipError('invalid_rar', 'RAR 文件已损坏（数据校验失败），请重新打包');
    case 'ERAR_NO_MEMORY':
      return new PackageZipError('invalid_rar', '解压 RAR 时内存不足，请精简后重试，或改用 ZIP 上传');
    default:
      return new PackageZipError(
        'invalid_rar',
        '无法解析 RAR，文件可能已损坏或格式不受支持，请改用 ZIP 上传',
      );
  }
}

/**
 * node-unrar-js 把「当前解压器」挂在全局唯一的 WASM 实例上，
 * 两个转换交错执行会读到对方的数据，所以一次只转换一个包。
 */
let pending: Promise<unknown> = Promise.resolve();

function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = pending.then(task);
  pending = run.catch(() => undefined);
  return run;
}

/**
 * 只读文件头做校验。生成器必须遍历到底，解压库才会关闭归档、释放 WASM 内存，
 * 所以发现问题先记下，遍历完再抛。
 */
function inspectRar(extractor: RarExtractor): void {
  const { arcHeader, fileHeaders } = extractor.getFileList();
  let failure: unknown = arcHeader.flags.volume
    ? new PackageZipError('multi_volume_rar', '暂不支持分卷 RAR，请合并成一个压缩包后再上传')
    : undefined;
  const seen = new Set<string>();
  let entries = 0;
  let fileCount = 0;
  let totalBytes = 0;

  for (const header of fileHeaders) {
    if (failure) continue;
    try {
      entries += 1;
      if (entries > PACKAGE_ZIP_LIMITS.maxEntries) {
        throw limitError(`目录条目超过 ${PACKAGE_ZIP_LIMITS.maxEntries} 个`, 'too_many_entries');
      }
      const path = header.name.replace(/\\/g, '/').replace(/\/+$/, '');
      assertSafeArchivePath(path, 'RAR');
      if (seen.has(path)) {
        throw new PackageZipError('duplicate_path', `RAR 包含重复路径：${path}`);
      }
      seen.add(path);
      if (header.flags.directory) continue;
      if (header.flags.encrypted) throw new PackageZipError('encrypted_rar', ENCRYPTED_MESSAGE);

      fileCount += 1;
      if (fileCount > PACKAGE_ZIP_LIMITS.maxFiles) {
        throw limitError(`文件数量超过 ${PACKAGE_ZIP_LIMITS.maxFiles} 个`, 'too_many_files');
      }
      if (header.unpSize > PACKAGE_ZIP_LIMITS.maxSingleFileBytes) {
        throw limitError(
          `单文件 ${path} 解压后超过 ${PACKAGE_ZIP_LIMITS.maxSingleFileBytes / MIB}MB`,
          'single_file_too_large',
        );
      }
      totalBytes += header.unpSize;
      if (totalBytes > PACKAGE_ZIP_LIMITS.maxTotalUncompressedBytes) {
        throw limitError(
          `解压后总大小超过 ${PACKAGE_ZIP_LIMITS.maxTotalUncompressedBytes / MIB}MB`,
          'expanded_too_large',
        );
      }
      if (
        header.unpSize >= PACKAGE_ZIP_LIMITS.compressionRatioMinBytes &&
        header.unpSize > Math.max(1, header.packSize) * PACKAGE_ZIP_LIMITS.maxCompressionRatio
      ) {
        throw limitError(
          `文件 ${path} 压缩比超过 ${PACKAGE_ZIP_LIMITS.maxCompressionRatio}:1，疑似压缩炸弹`,
          'suspicious_ratio',
        );
      }
    } catch (error) {
      failure = error;
    }
  }

  if (failure) throw failure;
  if (!fileCount) throw new PackageZipError('empty_archive', 'RAR 压缩包里没有文件');
}

function readRarFiles(extractor: RarExtractor): AsyncZippable {
  const files: AsyncZippable = {};
  for (const { fileHeader, extraction } of extractor.extract().files) {
    if (fileHeader.flags.directory || !extraction) continue;
    files[fileHeader.name.replace(/\\/g, '/')] = extraction;
  }
  return files;
}

async function extractRar(data: ArrayBuffer, openArchive: OpenRarArchive): Promise<AsyncZippable> {
  let extractor: RarExtractor;
  try {
    extractor = await openArchive(data);
  } catch {
    // 此时还没读归档内容，失败只可能是 WASM 下载或初始化出错。
    throw new PackageZipError('rar_unavailable', RAR_UNAVAILABLE_MESSAGE);
  }
  try {
    // 从这里起全部同步执行，其他转换插不进来（见 exclusive）。
    inspectRar(extractor);
    return readRarFiles(extractor);
  } catch (error) {
    throw rarError(error);
  }
}

function zipFiles(files: AsyncZippable): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(files, (error, data) => (error ? reject(error) : resolve(data)));
  });
}

export async function convertRarToZip(
  data: ArrayBuffer,
  openArchive: OpenRarArchive,
): Promise<Uint8Array> {
  if (data.byteLength > PACKAGE_ZIP_LIMITS.maxCompressedBytes) {
    throw new PackageZipError('compressed_too_large', `RAR 压缩包超过 ${PACKAGE_UPLOAD_MAX_LABEL}`);
  }
  const head = new Uint8Array(data, 0, Math.min(data.byteLength, RAR_SIGNATURE.length));
  if (!RAR_SIGNATURE.every((byte, index) => head[index] === byte)) {
    throw new PackageZipError('invalid_rar', '文件扩展名是 .rar，但内容不是 RAR 压缩包');
  }

  const files = await exclusive(() => extractRar(data, openArchive));
  let zipped: Uint8Array;
  try {
    zipped = await zipFiles(files);
  } catch {
    throw new PackageZipError('invalid_rar', 'RAR 转换为 ZIP 失败，请改用 ZIP 上传');
  }
  if (zipped.byteLength > PACKAGE_UPLOAD_MAX_BYTES) {
    throw new PackageZipError(
      'compressed_too_large',
      `RAR 转成 ZIP 后超过 ${PACKAGE_UPLOAD_MAX_LABEL}，请精简后再上传`,
    );
  }
  return zipped;
}

/** WASM 只在第一次转换时下载；以二进制传入，不依赖服务器给 .wasm 配的 MIME。 */
let unrarWasm: Promise<ArrayBuffer> | undefined;

function loadUnrarWasm(): Promise<ArrayBuffer> {
  if (!unrarWasm) {
    unrarWasm = fetch(unrarWasmUrl).then((res) => {
      if (!res.ok) throw new Error(`unrar_wasm_http_${res.status}`);
      return res.arrayBuffer();
    });
    // 下载失败后允许下次重试
    unrarWasm.catch(() => {
      unrarWasm = undefined;
    });
  }
  return unrarWasm;
}

/** 浏览器入口：读取用户选中的 .rar，返回内容相同的 .zip 文件。 */
export async function rarFileToZipFile(file: File): Promise<File> {
  const zipped = await convertRarToZip(await file.arrayBuffer(), async (data) =>
    createExtractorFromData({ data, wasmBinary: await loadUnrarWasm() }),
  );
  // fflate 的输出由普通 ArrayBuffer 承载，可直接作为 BlobPart，无需再复制一份
  return new File([zipped as Uint8Array<ArrayBuffer>], rarZipFileName(file.name), {
    type: 'application/zip',
    lastModified: file.lastModified,
  });
}
