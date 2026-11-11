import { skillDownloadUrl } from '@/domain/skillDownload';
import { strFromU8, strToU8, zip } from 'fflate';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';
import { buildSkillMd, parseSkillMd } from '@/domain/skillExport';
import { HQ_DEPTS, REGIONS } from '@/domain/orgTaxonomy';
import { inspectPackageZip, extractInspectedZipEntries, PACKAGE_ZIP_LIMITS } from '@/domain/safeZip';

export const BATCH_MAX_SKILLS = 100;
export const BATCH_MAX_BYTES = 200 * 1024 * 1024;
const stringList = z.array(z.string());
const extraSchema = z.object({
  downloadUrl: z.string().trim().refine(value => !value || Boolean(skillDownloadUrl(value)), '下载链接必须为 HTTP/HTTPS 地址').optional(),
  nameEn: z.string().optional(), descEn: z.string().optional(),
  businessScenarioId: z.enum(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']).optional(),
  planSteps: stringList.optional(), searchKeywords: stringList.optional(),
  usageNotes: z.string().optional(),
  envInfo: z.object({ dependencies: z.string().optional(), framework: z.string().optional(), runtimeVersion: z.string().optional(), hardwareNetwork: z.string().optional() }).optional(),
  cases: z.array(z.object({ title: z.string(), input: z.string().optional(), output: z.string().optional() })).optional(),
});
export type BatchSkillRow = {
  row: number; id: string; name: string; error?: string;
  skill?: PrototypeSkillSeed; files?: Record<string, Uint8Array>;
};

export function zipFiles(files: Record<string, Uint8Array>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => zip(files, { level: 6 }, (err, bytes) => err ? reject(err) : resolve(bytes)));
}

export async function readArchive(bytes: Uint8Array): Promise<Record<string, Uint8Array>> {
  const inspection = await inspectPackageZip(bytes);
  return extractInspectedZipEntries(bytes, inspection,
    new Set(inspection.entries.filter(e => !e.isDirectory).map(e => e.path)), {
      maxSelectedFileBytes: PACKAGE_ZIP_LIMITS.maxSingleFileBytes,
      maxSelectedTotalBytes: PACKAGE_ZIP_LIMITS.maxTotalUncompressedBytes,
    });
}

const safeId = (id: string) => /^[\w-]{1,128}$/.test(id);
const text = (row: Record<string, unknown>, key: string) => String(row[key] ?? '').trim();

/** Excel owns catalogue metadata; SKILL.md owns instructions. No remote blob URLs are imported. */
export async function parseSkillBatch(bytes: Uint8Array): Promise<BatchSkillRow[]> {
  if (bytes.byteLength > BATCH_MAX_BYTES) throw new Error('批量包不能超过 200 MiB');
  const files = await readArchive(bytes);
  if (!files['skills.xlsx']) throw new Error('ZIP 根目录缺少 skills.xlsx');
  if (Object.keys(files).some(p => p !== 'skills.xlsx' && !p.startsWith('skills/'))) {
    throw new Error('ZIP 顶层只能包含 skills/ 和 skills.xlsx');
  }
  // XLSX is itself a ZIP: validate its expansion before SheetJS allocates workbook contents.
  await inspectPackageZip(files['skills.xlsx']);
  const workbook = XLSX.read(files['skills.xlsx'], { type: 'array', sheetRows: BATCH_MAX_SKILLS + 2 });
  const sheet = workbook.Sheets['Skills'];
  if (!sheet) throw new Error('Excel 缺少 Skills 工作表');
  const range = XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref'] || 'A1');
  if (range.e.r > BATCH_MAX_SKILLS) throw new Error(`每批最多 ${BATCH_MAX_SKILLS} 个 Skill`);
  const header = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] ?? [];
  for (const key of ['格式版本', 'Skill ID', '目录路径', '名称', '版本', '应用领域编码', '应用区域编码', '可见性']) {
    if (!header.includes(key)) throw new Error(`Excel 缺少列：${key}`);
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (!rows.length) throw new Error('Excel 没有 Skill 数据');
  const ids = rows.map(r => text(r, 'Skill ID'));
  const paths = rows.map(r => text(r, '目录路径'));
  const unmatched = Object.keys(files).find(p => p.startsWith('skills/') && !paths.some(path => path && p.startsWith(path)));
  if (unmatched) throw new Error(`文件没有对应的 Excel 目录记录：${unmatched}`);
  return rows.map((row, index) => {
    const id = ids[index];
    const name = text(row, '名称');
    try {
      if (text(row, '格式版本') !== '1') throw new Error('不支持的格式版本');
      if (!safeId(id)) throw new Error('Skill ID 只允许字母、数字、下划线和连字符，最长 128 字符');
      if (ids.filter(value => value === id).length > 1) throw new Error('Excel 内 Skill ID 重复');
      const path = paths[index];
      if (path !== `skills/${id}/`) throw new Error(`目录路径应为 skills/${id}/`);
      if (paths.filter(value => value === path).length > 1) throw new Error('Excel 内目录重复');
      if (!name || !text(row, '版本')) throw new Error('名称和版本不能为空');
      const md = files[`${path}SKILL.md`];
      if (!md) throw new Error('目录缺少 SKILL.md');
      if (md.length > 2 * 1024 * 1024) throw new Error('SKILL.md 超过 2 MiB');
      const parsed = parseSkillMd(strFromU8(md), id);
      if (!parsed) throw new Error('SKILL.md 无法解析');
      const dept = text(row, '应用领域编码');
      const region = text(row, '应用区域编码');
      if (dept && !HQ_DEPTS.some(d => d.id === dept)) throw new Error(`未知应用领域编码：${dept}`);
      if (region && !REGIONS.some(r => r.id === region)) throw new Error(`未知应用区域编码：${region}`);
      const visibility = z.enum(['public', 'org', 'private']).parse(text(row, '可见性'));
      if (visibility === 'org' && !dept) throw new Error('部门可见时应用领域必填');
      const category = z.enum(['office', 'manage', 'process', 'experience']).parse(text(row, '分类') || 'office');
      const tags = stringList.parse(JSON.parse(text(row, '标签JSON') || '[]'));
      const extra = extraSchema.parse(JSON.parse(text(row, '其他配置JSON') || '{}'));
      const command = text(row, '调用命令');
      const skill: PrototypeSkillSeed = {
        ...parsed, ...extra, id, name, nameZh: name, desc: text(row, '描述'), descZh: text(row, '描述'),
        version: text(row, '版本'), author: text(row, '作者') || 'Imported',
        command: command ? (command.startsWith('/') ? command : `/${command}`) : parsed.command,
        category, tags, visibility, ownerDeptIds: dept ? [dept] : [], ownerRegionId: region || null,
        ownerRegionIds: region ? [region] : [], sourceType: 'internal', published: false, callable: false,
        invokes: 0, connector: text(row, '连接器'), icon: text(row, '图标') || 'fa-cube',
      };
      const contents = Object.fromEntries(Object.entries(files).filter(([p]) => p.startsWith(path)).map(([p, data]) => [p.slice(path.length), data]));
      return { row: index + 2, id, name, skill, files: contents };
    } catch (e) {
      return { row: index + 2, id, name, error: e instanceof Error ? e.message : '数据无效' };
    }
  });
}

export async function buildSkillBatch(
  skills: PrototypeSkillSeed[],
  loadPackage: (skill: PrototypeSkillSeed) => Promise<Uint8Array>,
  progress: (message: string) => void = () => {},
): Promise<Uint8Array> {
  if (!skills.length || skills.length > BATCH_MAX_SKILLS) throw new Error(`请选择 1–${BATCH_MAX_SKILLS} 个 Skill`);
  const files: Record<string, Uint8Array> = {};
  const rows: Record<string, unknown>[] = [];
  let expanded = 0;
  for (const skill of skills) {
    if (!safeId(skill.id)) throw new Error(`不支持的 Skill ID：${skill.id}`);
    if (rows.some(row => row['Skill ID'] === skill.id)) throw new Error(`Skill ID 重复：${skill.id}`);
    progress(`正在打包 ${rows.length + 1}/${skills.length}：${skill.name}`);
    const prefix = `skills/${skill.id}/`;
    let contents: Record<string, Uint8Array>;
    if (skill.packageBlob) {
      contents = await readArchive(await loadPackage(skill));
      // Remove only a common wrapper directory; preserve every resource, including binary files.
      if (!contents['SKILL.md']) {
        const roots = Object.keys(contents).filter(p => p.endsWith('/SKILL.md'));
        const root = roots.length === 1 ? roots[0].slice(0, -'SKILL.md'.length) : '';
        if (!root || !Object.keys(contents).every(p => p.startsWith(root))) {
          throw new Error(`${skill.name}：技能包没有唯一根目录 SKILL.md，请先整理原始包`);
        }
        contents = Object.fromEntries(Object.entries(contents).map(([p, data]) => [p.slice(root.length), data]));
      }
    } else {
      contents = { 'SKILL.md': strToU8(buildSkillMd(skill)) };
    }
    for (const [p, data] of Object.entries(contents)) {
      expanded += data.length;
      if (expanded > PACKAGE_ZIP_LIMITS.maxTotalUncompressedBytes) throw new Error('导出解压后内容超过 512 MiB，请分批导出');
      files[prefix + p] = data;
    }
    rows.push({
      '格式版本': '1', 'Skill ID': skill.id, '目录路径': prefix, '名称': skill.nameZh || skill.name,
      '版本': skill.version || '1.0.0', '描述': skill.descZh || skill.desc, '调用命令': skill.command,
      '应用领域编码': skill.ownerDeptIds?.[0] || '',
      '应用领域': HQ_DEPTS.find(d => d.id === skill.ownerDeptIds?.[0])?.label || '',
      '应用区域编码': skill.ownerRegionId || '',
      '应用区域': REGIONS.find(r => r.id === skill.ownerRegionId)?.label || '不限区域',
      '可见性': skill.visibility || 'org', '分类': skill.category, '作者': skill.author,
      '连接器': skill.connector, '图标': skill.icon, '标签JSON': JSON.stringify(skill.tags || []),
      '文件来源': skill.packageBlob ? '原始技能包' : '根据平台正文生成',
      '其他配置JSON': JSON.stringify(extraSchema.parse(skill)),
    });
  }
  for (const row of rows) {
    for (const [column, value] of Object.entries(row)) {
      if (typeof value === 'string' && value.length > 32767) throw new Error(`${row['名称']}：${column} 超过 Excel 单元格长度限制`);
    }
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Skills');
  files['skills.xlsx'] = new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
  progress('正在压缩 ZIP…');
  const bytes = await zipFiles(files);
  if (bytes.length > BATCH_MAX_BYTES) throw new Error('导出包超过 200 MiB，请分批导出');
  await inspectPackageZip(bytes);
  return bytes;
}
