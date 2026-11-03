import * as XLSX from 'xlsx';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { MemberImportRow } from '@/api/orgAdminApi';

/** 模板列 → 导入字段；表头按名称匹配，列顺序可以调整 */
export const IMPORT_COLUMNS = [
  { key: 'name', header: '姓名', note: '新成员必填；已有成员留空表示不改' },
  { key: 'email', header: '邮箱', note: '必填，登录账号，按邮箱判断新增还是更新（不区分大小写）' },
  { key: 'region', header: '区域', note: '只能从单元格下拉选择当前系统中的区域，只能选一个；留空表示不设置 / 不改' },
  { key: 'domains', header: '领域', note: '只能从单元格下拉选择当前系统中的领域，只能选一个；留空表示不设置 / 不改' },
] as const satisfies readonly { key: keyof MemberImportRow; header: string; note: string }[];

export const MEMBER_TEMPLATE_FILE = '成员批量导入模板.xlsx';

const TEMPLATE_DATA_ROWS = 500;
const OPTIONS_SHEET = '选项';

export interface TemplateChoice {
  id: string;
  name: string;
  enabled?: boolean;
  sort?: number;
}

interface TemplateDictionaries {
  regions: TemplateChoice[];
  domains: TemplateChoice[];
}

function selectableNames(items: TemplateChoice[]): string[] {
  return items
    .filter((item) => item.enabled !== false && item.name.trim())
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name, 'zh'))
    .map((item) => item.name.trim());
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function listValidation(sqref: string, formula: string, title: string): string {
  return `<dataValidation type="list" allowBlank="1" showErrorMessage="1" showInputMessage="1" errorStyle="stop" errorTitle="${escapeXml(title)}" error="请从下拉列表中选择，不能填写列表以外的内容" promptTitle="${escapeXml(title)}" prompt="点击单元格右侧箭头，从当前系统数据中选择" sqref="${sqref}"><formula1>${escapeXml(formula)}</formula1></dataValidation>`;
}

/** SheetJS 社区版不写出下拉，生成后再把列表校验写进工作表。 */
function applyDropdowns(bytes: Uint8Array, validations: string[]): Uint8Array {
  if (!validations.length) return bytes;
  const files = unzipSync(bytes);
  const path = 'xl/worksheets/sheet1.xml';
  const sheet = files[path];
  if (!sheet) return bytes;
  const xml = strFromU8(sheet);
  const block = `<dataValidations count="${validations.length}">${validations.join('')}</dataValidations>`;
  const next = xml.includes('</sheetData>')
    ? xml.replace('</sheetData>', `</sheetData>${block}`)
    : xml.replace('</worksheet>', `${block}</worksheet>`);
  files[path] = strToU8(next);
  return zipSync(files);
}

export function buildMemberTemplate({ regions, domains }: TemplateDictionaries): Uint8Array {
  const regionNames = selectableNames(regions);
  const domainNames = selectableNames(domains);
  const sheet = XLSX.utils.aoa_to_sheet([
    IMPORT_COLUMNS.map((column) => column.header),
    ['张三', 'zhangsan@huawei.com', regionNames[0] ?? '', domainNames[0] ?? ''],
  ]);
  sheet['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 16 }, { wch: 16 }];

  const guideRows: (string | number)[][] = [
    ['列', '说明'],
    ...IMPORT_COLUMNS.map((column) => [column.header, column.note]),
    [],
    ['整批校验', '任何一行有错，整批都不会导入；页面会列出每一行的错误，改好后重新上传即可'],
    ['角色和密码', '模板不含角色和初始密码。新成员使用默认角色，初始密码为「邮箱+123456」；已有成员再导入不会改密码'],
    [],
  ];
  const longest = Math.max(regionNames.length, domainNames.length);
  guideRows.push(['当前可选区域', '当前可选领域']);
  for (let i = 0; i < longest; i += 1) {
    guideRows.push([regionNames[i] ?? '', domainNames[i] ?? '']);
  }
  if (!longest) guideRows.push(['（系统里还没有可选择的区域）', '（系统里还没有可选择的领域）']);
  const guide = XLSX.utils.aoa_to_sheet(guideRows);
  guide['!cols'] = [{ wch: 18 }, { wch: 72 }];

  const optionRows: string[][] = [['区域', '领域']];
  for (let i = 0; i < longest; i += 1) optionRows.push([regionNames[i] ?? '', domainNames[i] ?? '']);
  const options = XLSX.utils.aoa_to_sheet(optionRows.length > 1 ? optionRows : [['区域', '领域']]);

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, '成员');
  XLSX.utils.book_append_sheet(book, guide, '填写说明');
  XLSX.utils.book_append_sheet(book, options, OPTIONS_SHEET);
  book.Workbook = { Sheets: [{ Hidden: 0 }, { Hidden: 0 }, { Hidden: 1 }] };

  const written = XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer | Uint8Array;
  const bytes = written instanceof Uint8Array ? written : new Uint8Array(written);
  const lastRow = TEMPLATE_DATA_ROWS + 1;
  const validations: string[] = [];
  if (regionNames.length) {
    validations.push(listValidation(`C2:C${lastRow}`, `'${OPTIONS_SHEET}'!$A$2:$A$${regionNames.length + 1}`, '选择区域'));
  }
  if (domainNames.length) {
    validations.push(listValidation(`D2:D${lastRow}`, `'${OPTIONS_SHEET}'!$B$2:$B$${domainNames.length + 1}`, '选择领域'));
  }
  return applyDropdowns(bytes, validations);
}

export function downloadMemberTemplate(dictionaries: TemplateDictionaries) {
  const bytes = buildMemberTemplate(dictionaries);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = MEMBER_TEMPLATE_FILE;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type ParsedSheet = { ok: true; rows: MemberImportRow[] } | { ok: false; error: string };

/** 读第一个工作表；row 是 Excel 里的行号，方便对照报错 */
export async function parseMemberSheet(file: File): Promise<ParsedSheet> {
  let book: XLSX.WorkBook;
  try {
    book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  } catch {
    return { ok: false, error: '文件读不出来，请上传 .xlsx / .xls / .csv' };
  }
  const first = book.SheetNames[0];
  if (!first) return { ok: false, error: '文件里没有工作表' };
  const grid = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[first], { header: 1, defval: '', raw: false, blankrows: true });
  const headerIndex = grid.findIndex((line) => line.some((cell) => String(cell).trim() === '邮箱'));
  if (headerIndex < 0) return { ok: false, error: '没有找到表头「邮箱」，请使用下载的模板' };

  const header = grid[headerIndex].map((cell) => String(cell).trim());
  const columnOf = new Map(IMPORT_COLUMNS.map((column) => [column.key, header.indexOf(column.header)]));
  const rows: MemberImportRow[] = [];
  grid.slice(headerIndex + 1).forEach((line, offset) => {
    const value = (key: (typeof IMPORT_COLUMNS)[number]['key']) => {
      const index = columnOf.get(key) ?? -1;
      return index >= 0 ? String(line[index] ?? '').trim() : '';
    };
    const row: MemberImportRow = {
      row: headerIndex + offset + 2,
      name: value('name'),
      email: value('email'),
      region: value('region'),
      domains: value('domains'),
    };
    if (IMPORT_COLUMNS.some((column) => row[column.key])) rows.push(row);
  });
  if (!rows.length) return { ok: false, error: '表格里没有数据行' };
  return { ok: true, rows };
}
