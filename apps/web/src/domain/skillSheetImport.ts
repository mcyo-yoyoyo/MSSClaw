/**
 * [INPUT]: 读取 Excel 明细、Skill 目录与组织字典。
 * [OUTPUT]: 解析行并生成新增、更新、未变或错误的预览。
 * [POS]: 后台导入只写明细里的业务字段，复用导出投影比对。
 * [PROTOCOL]: Update this header on change, then check AGENTS.md
 */
import * as XLSX from 'xlsx';
import { DEFAULT_BUSINESS_SCENARIO_CATEGORIES, getBusinessScenarioCatalog } from '@/domain/businessScenarios';
import { HQ_DEPTS, REGIONS, type OrgUnit } from '@/domain/orgTaxonomy';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';
import { inspectPackageZip, PACKAGE_ZIP_LIMITS } from '@/domain/safeZip';
import { skillDisplayName } from '@/domain/skillDisplay';
import { skillSheetMetadata, SKILL_SHEET_COLUMNS } from '@/domain/skillSheetColumns';
import { SKILL_VISIBILITY_OPTIONS } from '@/domain/skillVisibility';

export type SkillSheetRow = {
  row: number;
  name: string;
  cells: Record<string, string>;
  error?: string;
};

export type SkillSheetPatch = Partial<Pick<PrototypeSkillSeed,
  'author' | 'nameEn' | 'command' | 'tags' | 'searchKeywords' | 'usageNotes' | 'callable'
  | 'featuredInMssMarket' | 'ownerDeptIds' | 'ownerRegionIds' | 'businessScenarioId'
  | 'visibility' | 'sourceLabel' | 'sourceType'
>>;

export type SkillSheetPlan = {
  patch?: SkillSheetPatch;
  action: 'create' | 'update' | 'unchanged' | 'invalid';
  changes: string[];
  skill?: PrototypeSkillSeed;
  existing?: PrototypeSkillSeed;
  error?: string;
};

const normalizedName = (name: string) => name.trim().normalize('NFC');
const splitList = (value: string) => [...new Set(value.split(/[、,，;；\n]/).map(s => s.trim()).filter(Boolean))];

// 仅略过原 .xls 的逐字填写说明，缺名称的实际业务行仍提示错误。
function isTemplateNote(cells: Record<string, string>) {
  const keys = Object.keys(cells);
  if (keys.length === 1 && ['内部平台（员工助手等）', '外部平台（GitHub等）'].includes(cells.来源)) return true;
  if (keys.length === 2 && cells.来源 === '外部' && cells.创建者 === 'GitHub（链接）') return true;
  if (keys.length === 3 && cells.Skill名称 === 'XX' && cells.来源 === '内部' && cells.创建者 === '员工助手') return true;
  return !cells.Skill名称 && cells.来源 === '创建者提供' && cells.创建者 === '姓名 工号'
    && cells.业务场景 === '是否方便改中文' && cells.创建时间 === '能否记录到年月日时分秒？';
}

function readSheet(sheet: XLSX.WorkSheet): SkillSheetRow[] | undefined {
  // 跳过纯格式的空白格。按实际单元格坐标保留 Excel 行号。
  const lines = new Map<number, Map<number, string>>();
  for (const [address, cell] of Object.entries(sheet)) {
    if (address.startsWith('!') || cell.v == null) continue;
    const value = XLSX.utils.format_cell(cell).trim();
    if (!value) continue;
    const { r, c } = XLSX.utils.decode_cell(address);
    const line = lines.get(r) ?? new Map<number, string>();
    line.set(c, value);
    lines.set(r, line);
  }
  const sorted = [...lines].sort(([left], [right]) => left - right);
  const header = sorted.find(([, line]) => [...line.values()].includes('Skill名称'));
  if (!header) return;
  const [headerIndex, columns] = header;
  const recognized = new Set<string>(SKILL_SHEET_COLUMNS);
  const fields = [...columns.values()].filter(value => recognized.has(value));
  if (new Set(fields).size !== fields.length) throw new Error('Excel 明细中含有重复列名');
  const templateNotes = sorted.some(([index, line]) => index < headerIndex && [...line.values()].includes('变更：'));
  const rows: SkillSheetRow[] = [];
  const counts = new Map<string, number>();
  for (const [index, line] of sorted) {
    if (index <= headerIndex) continue;
    const cells: Record<string, string> = {};
    for (const [c, value] of line) {
      const field = columns.get(c);
      if (field && recognized.has(field)) cells[field] = value;
    }
    if (!Object.keys(cells).length || (templateNotes && isTemplateNote(cells))) continue;
    const name = normalizedName(cells.Skill名称 || '');
    counts.set(name, (counts.get(name) ?? 0) + 1);
    rows.push({ row: index + 1, name, cells });
  }
  for (const row of rows) {
    if (!row.name) row.error = '缺少 Skill名称';
    else if (counts.get(row.name)! > 1) row.error = 'Excel 中 Skill名称重复';
  }
  return rows;
}

export async function parseSkillSheet(bytes: Uint8Array): Promise<SkillSheetRow[]> {
  if (bytes.byteLength > PACKAGE_ZIP_LIMITS.maxCompressedBytes) throw new Error('Excel 文件超过 200 MiB');
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const { entries } = await inspectPackageZip(bytes);
    if (!entries.some(entry => entry.path === 'xl/workbook.xml')) throw new Error('请选择 Excel 明细表（.xls 或 .xlsx）');
  } else if (bytes[0] !== 0xd0 || bytes[1] !== 0xcf) {
    throw new Error('请选择 Excel 明细表（.xls 或 .xlsx）');
  }
  const book = XLSX.read(bytes, { type: 'array' });
  const names = [...new Set(['技能明细', ...book.SheetNames])];
  for (const name of names) {
    if (!book.Sheets[name]) continue;
    const rows = readSheet(book.Sheets[name]);
    if (!rows) continue;
    if (!rows.length) throw new Error('Excel 明细表没有待导入的 Skill');
    return rows;
  }
  throw new Error('未找到包含「Skill名称」列的明细表');
}

function draftSkill(name: string): PrototypeSkillSeed {
  return {
    id: '', name, nameZh: name, desc: '', category: 'office', command: '',
    author: '', version: '1.0.0', connector: '', published: false, callable: false,
    invokes: 0, icon: 'fa-cube', tags: [], visibility: 'org',
  };
}

function lookupOrgIds(value: string, units: OrgUnit[]) {
  return [...new Set(splitList(value).map(token => {
    const match = units.find(unit => unit.id === token || unit.label === token);
    if (!match) throw new Error(`未知组织名称或编码「${token}」`);
    return match.id;
  }))];
}

function yesNo(value: string): boolean {
  if (['是', 'true', '1'].includes(value.toLowerCase())) return true;
  if (['否', 'false', '0'].includes(value.toLowerCase())) return false;
  throw new Error('请填写「是」或「否」');
}

function metadataPatch(field: string, value: string): SkillSheetPatch | undefined {
  switch (field) {
    case '创建者': return { author: value };
    case '英文名称': return { nameEn: value };
    case '调用指令': return { command: value.startsWith('/') ? value : `/${value}` };
    case '运营标签': return { tags: splitList(value) };
    case '搜索关键词': return { searchKeywords: splitList(value) };
    case '使用须知摘要': return { usageNotes: value };
    case '是否可调用': return { callable: yesNo(value) };
    case '是否精选推荐': return { featuredInMssMarket: yesNo(value) };
    case '领域信息': return { ownerDeptIds: lookupOrgIds(value, HQ_DEPTS) };
    case '区域信息': return { ownerRegionIds: lookupOrgIds(value, REGIONS) };
    case '业务场景': {
      const categories = [...getBusinessScenarioCatalog(), ...DEFAULT_BUSINESS_SCENARIO_CATEGORIES];
      const match = categories.find(item => [item.id, item.label, item.fullLabel].includes(value));
      if (!match) throw new Error(`未知业务场景「${value}」`);
      return { businessScenarioId: match.id };
    }
    case '可见范围': {
      const match = SKILL_VISIBILITY_OPTIONS.find(item => item.value === value || item.label === value);
      if (!match) throw new Error('请填写「部门可见」或「全部门可见」');
      return { visibility: match.value };
    }
    case '来源': {
      if (/^(外部(?:平台)?(?:[（(].*)?|external)$/i.test(value)) return { sourceLabel: value, sourceType: 'external' };
      if (/^(创建者提供|内部(?:平台)?(?:[（(].*)?|internal)$/i.test(value)) return { sourceLabel: value, sourceType: 'internal' };
      return { sourceLabel: value };
    }
    default: return;
  }
}

export function skillSheetUpdatePatch(plan: SkillSheetPlan): SkillSheetPatch {
  if (plan.action !== 'update' || !plan.patch) throw new Error('此行没有可更新的字段');
  return plan.patch;
}

export function planSkillSheetRow(row: SkillSheetRow, skills: PrototypeSkillSeed[]): SkillSheetPlan {
  const invalid = (error: string): SkillSheetPlan => ({ action: 'invalid', changes: [], error });
  if (row.error) return invalid(row.error);
  const matches = skills.filter(skill => normalizedName(skillDisplayName(skill)) === row.name);
  if (matches.length > 1) return invalid('目录中存在多个同名 Skill，无法确定更新对象');
  const existing = matches[0];
  const skill = existing ? { ...existing } : draftSkill(row.name);
  const before: Record<string, string> = skillSheetMetadata(skill);
  const changes: string[] = [];
  const patch: SkillSheetPatch = {};
  for (const [field, value] of Object.entries(row.cells)) {
    if (!value || value === before[field]?.trim()) continue;
    try {
      const edits = metadataPatch(field, value);
      if (!edits) continue;
      const candidate = { ...skill, ...edits };
      if (edits.ownerRegionIds) candidate.ownerRegionId = edits.ownerRegionIds[0] ?? null;
      const projected: Record<string, string> = skillSheetMetadata(candidate);
      if (projected[field] === before[field]) continue;
      Object.assign(patch, edits);
      Object.assign(skill, candidate);
      changes.push(field);
    } catch (error) {
      return invalid(`${field}：${error instanceof Error ? error.message : '无效值'}`);
    }
  }
  if (!existing) return { action: 'create', skill, changes };
  if (!changes.length) return { action: 'unchanged', existing, skill: existing, changes };
  return { action: 'update', skill, existing, changes, patch };
}
