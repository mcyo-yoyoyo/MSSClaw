/**
 * 组织权限 · 成员批量导入模板（CSV，Excel 可直接打开）
 */

export const MEMBER_IMPORT_CSV_HEADERS = [
  '邮箱',
  '密码',
  '角色',
  '姓名',
  '部门',
  '区域',
] as const;

/** 带说明行 + 示例行的导入模板正文（不含 BOM） */
export function buildMemberImportTemplateCsv(): string {
  const header = MEMBER_IMPORT_CSV_HEADERS.join(',');
  const guide = [
    '# 填写说明（以 # 开头的行导入时会忽略）',
    '# 1. 必填：邮箱、密码（密码至少 6 位）',
    '# 2. 角色填写：业务用户 / 能力开发 / 只读访客（也可写英文 business_user / capability_ops / viewer）',
    '# 3. 姓名、部门、区域可选；部门/区域请填「部门」页中的中文名称，如 GTM、亚太',
    '# 4. 已存在的邮箱会更新角色并重置密码；新邮箱会直接激活',
  ].join('\n');
  const samples = [
    'alice@huawei.com,Passw0rd1,业务用户,Alice,GTM,亚太',
    'bob@huawei.com,Passw0rd1,只读访客,Bob,MKT,欧洲',
    'carol@huawei.com,Passw0rd1,能力开发,Carol,质运,',
  ].join('\n');
  return `${guide}\n${header}\n${samples}\n`;
}

export function downloadMemberImportTemplate() {
  const csv = `\uFEFF${buildMemberImportTemplateCsv()}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'MSS-成员导入模板.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** 从上传的 CSV/文本文件读取内容 */
export function readImportFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file, 'UTF-8');
  });
}
