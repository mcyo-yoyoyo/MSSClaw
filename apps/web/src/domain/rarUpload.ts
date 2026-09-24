import { PackageZipError } from '@/domain/safeZip';

/** 文件选择框额外接受 RAR；选中后在浏览器里转成 ZIP，之后仍走原有的 ZIP 链路。 */
export const RAR_PACKAGE_ACCEPT = '.rar,application/vnd.rar,application/x-rar-compressed';

export const RAR_UNAVAILABLE_MESSAGE = 'RAR 解压组件加载失败，请刷新页面后重试，或改用 ZIP 上传';

export function isRarPackageName(name: string): boolean {
  return name.trim().toLowerCase().endsWith('.rar');
}

/**
 * 上传前整理包文件：RAR 转成 ZIP，其他格式原样返回。
 * 解压组件（含 WASM）只在选中 RAR 时按需加载，不进首屏包。
 */
export async function normalizePackageUploadFile(
  file: File,
  options: { maxBytes?: number | null } = {},
): Promise<File> {
  if (!isRarPackageName(file.name)) return file;
  let rar: typeof import('@/domain/rarPackage');
  try {
    rar = await import('@/domain/rarPackage');
  } catch {
    throw new PackageZipError('rar_unavailable', RAR_UNAVAILABLE_MESSAGE);
  }
  return rar.rarFileToZipFile(
    file,
    options.maxBytes === undefined ? undefined : options.maxBytes,
  );
}
