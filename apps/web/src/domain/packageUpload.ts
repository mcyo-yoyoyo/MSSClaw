/** Skill / Agent 原始包统一限制。普通附件继续使用各自的大小规则。 */
export const PACKAGE_UPLOAD_MAX_MIB = 200;
export const PACKAGE_UPLOAD_MAX_BYTES = PACKAGE_UPLOAD_MAX_MIB * 1024 * 1024;
export const PACKAGE_UPLOAD_MAX_LABEL = `${PACKAGE_UPLOAD_MAX_MIB}MB`;

export function packageUploadSizeError(file: Pick<File, 'size'>): string | null {
  return file.size > PACKAGE_UPLOAD_MAX_BYTES
    ? `包体积超过 ${PACKAGE_UPLOAD_MAX_LABEL}，请精简后再上传`
    : null;
}

export function formatPackageSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
