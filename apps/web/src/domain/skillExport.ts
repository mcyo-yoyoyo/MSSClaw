/**
 * [INPUT]: 读取 Skill 信息、互动统计和归档包。
 * [OUTPUT]: 生成独立包和批量明细，解析单项上传及历史归档。
 * [POS]: 连接运营导出、详情下载和编辑器的包格式。
 * [PROTOCOL]: Update this header on change, then check AGENTS.md
 */
import { fetchPackageBlob } from '@/api/blobApi';
import { SKILL_SHEET_COLUMNS, skillSheetMetadata } from '@/domain/skillSheetColumns';
import { skillDisplayName } from '@/domain/skillDisplay';
import { formatVersion } from '@/domain/formatVersion';
import { strToU8, zipSync, unzipSync, strFromU8 } from 'fflate';
import * as XLSX from 'xlsx';
import type { EfficiencyCategory, PrototypeSkillSeed } from '@/domain/prototype/types';
import { getSkillPack } from '@/domain/skills/catalog';
import {
  readPackageZipMetadata,
  type PackageArchiveInspectionOptions,
} from '@/domain/safeZip';

const VALID_CATEGORIES: EfficiencyCategory[] = ['office', 'manage', 'process', 'experience'];

export function skillSlug(skill: Pick<PrototypeSkillSeed, 'id' | 'name' | 'command'>): string {
  const fromCmd = skill.command?.replace(/^\//, '').trim();
  const raw = fromCmd || skill.name || skill.id || 'skill';
  return raw
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'skill';
}

/** 平台元数据（放在包内，便于再导入 MSSClaw） */
export function skillManifest(skill: PrototypeSkillSeed) {
  const pack = getSkillPack(skill.id);
  const featured = Boolean(skill.featuredInMssMarket ?? skill.featuredInDoTask);
  return {
    manifestVersion: '2.1',
    format: 'mssclaw-skill-package',
    id: skill.id,
    name: skill.nameZh || skill.name,
    nameZh: skill.nameZh || skill.name,
    nameEn: skill.nameEn || '',
    description: skill.descZh || skill.desc,
    descZh: skill.descZh || skill.desc,
    descEn: skill.descEn || '',
    command: skill.command,
    category: skill.category,
    version: skill.version || '1.0.0',
    author: skill.author,
    connector: skill.connector || '',
    tags: skill.tags || [],
    searchKeywords: skill.searchKeywords || [],
    published: !!skill.published,
    callable: typeof skill.callable === 'boolean' ? skill.callable : !!skill.published,
    featuredInDoTask: featured,
    featuredInMssMarket: featured,
    visibility: skill.visibility || 'org',
    icon: skill.icon,
    iconUrl: skill.iconUrl,
    instructions: skill.instructions || '',
    planSteps: skill.planSteps || [],
    demoPrompt: pack?.demoPrompt || '',
    exportedAt: new Date().toISOString(),
  };
}

function yamlEscape(value: string): string {
  if (/[:#\n"'{}[\],|>&*?!%@`]/.test(value) || value !== value.trim()) {
    return JSON.stringify(value);
  }
  return value;
}

/** 生成符合 Agent Skill 约定的 SKILL.md（frontmatter + 正文） */
export function buildSkillMd(skill: PrototypeSkillSeed): string {
  const title = skill.nameZh || skill.name;
  const desc = skill.descZh || skill.desc || title;
  const body =
    skill.instructions?.trim() ||
    `# ${title}\n\n${desc}\n\n在对话中输入 \`${skill.command}\` 调用本 Skill。`;
  const lines = [
    '---',
    `name: ${yamlEscape(skillSlug(skill))}`,
    `description: ${yamlEscape(desc)}`,
    `metadata:`,
    `  mssclaw:`,
    `    id: ${yamlEscape(skill.id)}`,
    `    nameZh: ${yamlEscape(skill.nameZh || skill.name)}`,
    `    nameEn: ${yamlEscape(skill.nameEn || '')}`,
    `    descZh: ${yamlEscape(skill.descZh || skill.desc || '')}`,
    `    descEn: ${yamlEscape(skill.descEn || '')}`,
    `    command: ${yamlEscape(skill.command)}`,
    `    category: ${yamlEscape(skill.category)}`,
    `    version: ${yamlEscape(skill.version || '1.0.0')}`,
    `    tags: ${JSON.stringify(skill.tags || [])}`,
    `    searchKeywords: ${JSON.stringify(skill.searchKeywords || [])}`,
    `    visibility: ${yamlEscape(skill.visibility || 'org')}`,
    '---',
    '',
    body.startsWith('#') ? body : `# ${title}\n\n${body}`,
    '',
  ];
  return lines.join('\n');
}

function buildPlanMd(skill: PrototypeSkillSeed): string {
  const steps = skill.planSteps?.length
    ? skill.planSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')
    : '1. （未配置计划步骤）';
  return `# 执行计划 · ${skill.name}\n\n${steps}\n`;
}

function buildDemoTemplate(skill: PrototypeSkillSeed): string {
  const pack = getSkillPack(skill.id);
  const prompt = pack?.demoPrompt?.trim() || `${skill.command} `;
  return `# 演示提示词模板\n\n在 AI任务或任务对话中发送：\n\n\`\`\`\n${prompt}\n\`\`\`\n`;
}

function buildReadme(skill: PrototypeSkillSeed, folder: string): string {
  return `# ${skill.name} Skill Package

本包遵循 Agent Skill 目录约定，可在 Cursor / 兼容运行时中使用，也可导回 MSSClaw。

\`\`\`
${folder}/
├── SKILL.md                 # 主指令（必选）
├── reference/
│   └── plan.md              # 默认执行计划
├── templates/
│   └── demo-prompt.md       # 演示调用提示词
├── assets/                  # 附件占位（截图、样例数据等）
│   └── .gitkeep
└── mssclaw.manifest.json    # MSSClaw 平台元数据（再导入用）
\`\`\`

- 调用指令：\`${skill.command}\`
- 版本：${skill.version || '1.0.0'}
`;
}

/** 组装 Skill 包内文件（相对路径 → 文本） */
export function buildPackageFiles(skill: PrototypeSkillSeed): Record<string, string> {
  const folder = skillSlug(skill);
  return {
    [`${folder}/SKILL.md`]: buildSkillMd(skill),
    [`${folder}/reference/plan.md`]: buildPlanMd(skill),
    [`${folder}/templates/demo-prompt.md`]: buildDemoTemplate(skill),
    [`${folder}/assets/.gitkeep`]: '',
    [`${folder}/README.md`]: buildReadme(skill, folder),
    [`${folder}/mssclaw.manifest.json`]: JSON.stringify(skillManifest(skill), null, 2),
  };
}

function downloadBinary(filename: string, data: Uint8Array, mime: string) {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const blob = new Blob([copy], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** 下载单个 Skill 为 ZIP 包（SKILL.md + reference/templates/assets） */
export function downloadSkillFile(skill: PrototypeSkillSeed) {
  const files = buildPackageFiles(skill);
  const zipped: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(files)) {
    zipped[path] = strToU8(content);
  }
  const bytes = zipSync(zipped, { level: 6 });
  downloadBinary(`${skillSlug(skill)}.skill.zip`, bytes, 'application/zip');
}

/** 运营分析用：单 Skill 调用与上架状态字段 */
export function skillOpsAnalyticsRow(
  skill: PrototypeSkillSeed,
  engagement?: { likes: number; dislikes: number; downloads: number },
) {
  const invokeCount = Number(skill.invokes) || 0;
  const published = !!skill.published;
  const callable = typeof skill.callable === 'boolean' ? skill.callable : published;
  const hasBody = Boolean(skill.instructions?.trim());
  return {
    id: skill.id,
    nameZh: skill.nameZh || skill.name,
    nameEn: skill.nameEn || '',
    descZh: skill.descZh || skill.desc || '',
    descEn: skill.descEn || '',
    command: skill.command,
    category: skill.category,
    version: skill.version || '1.0.0',
    author: skill.author,
    publisher: skill.publisher || skill.author,
    createdAt: skill.createdAt || '',
    updatedAt: skill.updatedAt || '',
    updatedBy: skill.updatedBy || '',
    ownerDeptIds: skill.ownerDeptIds || [],
    ownerRegionId: skill.ownerRegionId ?? null,
    visibility: skill.visibility || 'org',
    /** 是否已上架可调用（可执行模型任务） */
    publishedExecutable: published && callable,
    /** 是否精选露出到「MSS · 场景技能」 */
    featuredInDoTask: !!(skill.featuredInMssMarket ?? skill.featuredInDoTask),
    businessScenarioId: skill.businessScenarioId ?? null,
    /** 演示调用次数（非真实 Token 链路） */
    invokeCount,
    likes: engagement?.likes ?? 0,
    dislikes: engagement?.dislikes ?? 0,
    downloads: engagement?.downloads ?? 0,
    usageNotes: skill.usageNotes || '',
    caseCount: skill.cases?.length ?? 0,
    /** 是否具备可注入正文（具备执行内容） */
    hasExecutableBody: hasBody,
    /** 实际上可对话执行：已上架且有正文 */
    runnableNow: published && callable && hasBody,
    tags: skill.tags || [],
    searchKeywords: skill.searchKeywords || [],
    sourceType: skill.sourceType,
  };
}

export interface SkillExportMetrics {
  likes: number;
  dislikes: number;
  downloads: number;
  views?: number;
  downloads30d?: number;
  likeUsers?: string[];
  dislikeUsers?: string[];
}

/** 批量导入和单独导出的 Excel 都读取同一张明细工作表。 */
function buildSkillsOpsWorkbook(
  skills: PrototypeSkillSeed[],
  engagementById?: Record<string, SkillExportMetrics>,
) {
  const rows = skills.map((s) =>
    skillOpsAnalyticsRow(s, engagementById?.[s.id]),
  );
  const totalInvokes = rows.reduce((n, r) => n + r.invokeCount, 0);
  const executableCount = rows.filter((r) => r.publishedExecutable).length;
  const runnableCount = rows.filter((r) => r.runnableNow).length;
  const featuredCount = rows.filter((r) => r.featuredInDoTask).length;
  const byVisibility = rows.reduce(
    (acc, r) => {
      const key = r.visibility || 'org';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const departmentVisibleCount = (byVisibility.org || 0) + (byVisibility.private || 0);
  const topInvoked = [...rows].sort((a, b) => b.invokeCount - a.invokeCount).slice(0, 10);

  const detailSheet = skills.map((skill) => {
    const metrics = engagementById?.[skill.id];
    const versions = (skill.versions ?? []).map(version =>
      [formatVersion(version.version), version.publishedAt, version.notes].filter(Boolean).join(' · '));
    const detail: Partial<Record<typeof SKILL_SHEET_COLUMNS[number], string | number>> = {
      ...skillSheetMetadata(skill),
      SkillID: skill.id,
      创建时间: skill.createdAt,
      更新者: skill.updatedBy,
      更新时间: skill.updatedAt,
      最近更新日期: skill.updatedAt,
      历史版本更新记录: versions.length ? versions.join('\n') : skill.version && formatVersion(skill.version),
      具备执行正文: skill.instructions?.trim() ? '是' : '否',
      案例条数: skill.cases?.length ?? 0,
      演示调用次数: skill.invokes,
      页面访问量: metrics?.views,
      Skill下载总量: metrics?.downloads,
      近30天下载总量: metrics?.downloads30d,
      点赞量: metrics?.likes,
      点赞用户名工号: metrics?.likeUsers?.join('、'),
      点踩量: metrics?.dislikes,
      点踩用户名工号: metrics?.dislikeUsers?.join('、'),
    };
    return SKILL_SHEET_COLUMNS.map(column => {
      const value = detail[column] ?? '';
      if (typeof value === 'string' && value.length > 32767) {
        throw new Error(`${skillDisplayName(skill)}的「${column}」超出 Excel 单元格长度限制`);
      }
      return value;
    });
  });

  const summarySheet = [
    { 指标: '导出时间', 值: new Date().toISOString() },
    { 指标: 'Skill 总数', 值: rows.length },
    { 指标: '已上架可调用数', 值: executableCount },
    { 指标: '当前可对话执行数', 值: runnableCount },
    { 指标: '精选Skill Hub推荐数', 值: featuredCount },
    { 指标: '演示调用总次数', 值: totalInvokes },
    { 指标: '真实调用/Token', 值: '—（预留，待模型计量对接）' },
    { 指标: '可见-全部门', 值: byVisibility.public || 0 },
    { 指标: '可见-部门', 值: departmentVisibleCount },
  ];

  const topSheet = topInvoked.length
    ? topInvoked.map((r, i) => ({
        排名: i + 1,
        技能ID: r.id,
        中文名称: r.nameZh,
        调用指令: r.command,
        演示调用次数: r.invokeCount,
        已上架可调用: r.publishedExecutable ? '是' : '否',
      }))
    : [{ 排名: '', 说明: '暂无调用数据' }];

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.json_to_sheet(summarySheet);
  const wsDetail = XLSX.utils.aoa_to_sheet([[...SKILL_SHEET_COLUMNS], ...detailSheet]);
  const wsTop = XLSX.utils.json_to_sheet(topSheet);
  wsDetail['!cols'] = SKILL_SHEET_COLUMNS.map((k) => ({
    wch: Math.min(28, Math.max(12, String(k).length + 4)),
  }));
  XLSX.utils.book_append_sheet(wb, wsDetail, '技能明细');
  XLSX.utils.book_append_sheet(wb, wsSummary, '汇总');
  XLSX.utils.book_append_sheet(wb, wsTop, '调用Top10');
  return wb;
}

/**
 * 导出全部 Skill 运营清单（Excel .xlsx）。
 * 预留列与尚未采集的指标留空。
 */
export function downloadAllSkillsFile(
  skills: PrototypeSkillSeed[],
  engagementById?: Record<string, SkillExportMetrics>,
) {
  const wb = buildSkillsOpsWorkbook(skills, engagementById);
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `mssclaw-skills-ops-${stamp}.xlsx`);
}

/** 文件名仅替换操作系统保留字符。名称相同时用外层目录区分，包名保留原样。 */
function skillPackageFileName(skill: PrototypeSkillSeed): string {
  const base = skillDisplayName(skill).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/[. ]+$/, '') || 'Skill';
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(base);
  return `${reserved ? '_' : ''}${base}.zip`;
}

/** 保留上传包的原始字节。纯文本 Skill 沿用标准包生成流程。 */
export async function buildSkillsExportArchive(
  skills: PrototypeSkillSeed[],
  engagementById?: Record<string, SkillExportMetrics>,
) {
  const zipped: Record<string, Uint8Array> = {};
  const wb = buildSkillsOpsWorkbook(skills, engagementById);
  zipped['Skill明细表.xlsx'] = new Uint8Array(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }));

  const paths = new Set<string>();
  for (const [index, skill] of skills.entries()) {
    const name = skillPackageFileName(skill);
    const canonicalName = name.normalize('NFC').toLowerCase();
    const path = paths.has(canonicalName) ? `skills/${index + 1}/${name}` : `skills/${name}`;
    paths.add(canonicalName);
    if (skill.packageBlob) {
      try {
        const response = await fetchPackageBlob(skill.packageBlob.url);
        zipped[path] = new Uint8Array(await response.arrayBuffer());
      } catch {
        throw new Error(`无法读取「${skillDisplayName(skill)}」的文件包，请重试`);
      }
    } else {
      const files = Object.entries(buildPackageFiles(skill)).map(([key, text]) => [key, strToU8(text)] as const);
      zipped[path] = zipSync(Object.fromEntries(files), { level: 6 });
    }
  }
  const bulkManifest = {
    manifestVersion: '3.0',
    format: 'mssclaw-skills-detail-export',
    exportedAt: new Date().toISOString(),
    skillCount: skills.length,
    skills: skills.map((s) => skillManifest(s)),
  };
  zipped['manifest.json'] = strToU8(JSON.stringify(bulkManifest, null, 2));
  return zipSync(zipped, { level: 0 });
}

export async function downloadAllSkillsZip(
  skills: PrototypeSkillSeed[],
  engagementById?: Record<string, SkillExportMetrics>,
) {
  const bytes = await buildSkillsExportArchive(skills, engagementById);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBinary(`mssclaw-skills-export-${stamp}.zip`, bytes, 'application/zip');
}

export function parseSkillImport(raw: unknown): PrototypeSkillSeed | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  if (!name) return null;

  const categoryRaw = typeof o.category === 'string' ? o.category : 'office';
  const category = VALID_CATEGORIES.includes(categoryRaw as EfficiencyCategory)
    ? (categoryRaw as EfficiencyCategory)
    : 'office';

  let command = typeof o.command === 'string' ? o.command.trim() : '';
  if (!command) command = `/${name.replace(/\s+/g, '').toLowerCase()}`;
  if (!command.startsWith('/')) command = `/${command}`;

  const desc =
    typeof o.description === 'string'
      ? o.description
      : typeof o.desc === 'string'
        ? o.desc
        : '';

  const instructions = typeof o.instructions === 'string' ? o.instructions : undefined;
  const planSteps = Array.isArray(o.planSteps)
    ? o.planSteps.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : undefined;

  const nameZh =
    typeof o.nameZh === 'string' && o.nameZh.trim()
      ? o.nameZh.trim()
      : /[\u4e00-\u9fff]/.test(name)
        ? name
        : '';
  const nameEn =
    typeof o.nameEn === 'string' && o.nameEn.trim()
      ? o.nameEn.trim()
      : /[\u4e00-\u9fff]/.test(name)
        ? ''
        : name;
  const descZh = typeof o.descZh === 'string' ? o.descZh : desc;
  const descEn = typeof o.descEn === 'string' ? o.descEn : '';
  const searchKeywords = Array.isArray(o.searchKeywords)
    ? o.searchKeywords.filter((t): t is string => typeof t === 'string')
    : [];
  const callable = typeof o.callable === 'boolean' ? o.callable : undefined;
  const featured =
    typeof o.featuredInMssMarket === 'boolean'
      ? o.featuredInMssMarket
      : typeof o.featuredInDoTask === 'boolean'
        ? o.featuredInDoTask
        : undefined;

  return {
    id: typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `skill-import-${Date.now()}`,
    name: nameZh || nameEn || name,
    desc: descZh || descEn || desc,
    nameZh: nameZh || name,
    nameEn,
    descZh,
    descEn,
    category,
    command,
    author: typeof o.author === 'string' ? o.author : 'Imported',
    version: typeof o.version === 'string' ? o.version : '1.0.0',
    connector: typeof o.connector === 'string' ? o.connector : '',
    // 导入默认草稿：不可调用、部门可见（需审批后上架/全部门可见）
    published: false,
    ...(typeof callable === 'boolean' ? { callable } : {}),
    ...(typeof featured === 'boolean'
      ? { featuredInMssMarket: featured }
      : {}),
    visibility: 'org',
    invokes: typeof o.invokes === 'number' ? o.invokes : 0,
    icon: typeof o.icon === 'string' ? o.icon : 'fa-cube',
    iconUrl: typeof o.iconUrl === 'string' && o.iconUrl.trim() ? o.iconUrl.trim() : undefined,
    tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === 'string') : [],
    searchKeywords,
    ...(instructions ? { instructions } : {}),
    ...(planSteps?.length ? { planSteps } : {}),
  };
}

function parseFrontmatter(md: string): { meta: Record<string, string>; body: string } {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: md.trim() };
  const meta: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      try {
        val = JSON.parse(val) as string;
      } catch {
        val = val.slice(1, -1);
      }
    }
    meta[m[1]!] = val;
  }
  return { meta, body: match[2]!.trim() };
}

function parsePlanStepsFromMd(md: string): string[] {
  return md
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+\.\s*/, '').trim())
    .filter((line) => line && !line.startsWith('#') && line !== '（未配置计划步骤）');
}

/** 从 SKILL.md 文本解析为平台 Skill */
export function parseSkillMd(md: string, fallbackId?: string): PrototypeSkillSeed | null {
  const { meta, body } = parseFrontmatter(md);
  const name = (meta.name || '').trim();
  if (!name && !body) return null;

  let command = (meta.command || '').trim();
  if (!command && meta.name) command = `/${meta.name}`;
  if (command && !command.startsWith('/')) command = `/${command}`;

  const categoryRaw = meta.category || 'office';
  const category = VALID_CATEGORIES.includes(categoryRaw as EfficiencyCategory)
    ? (categoryRaw as EfficiencyCategory)
    : 'office';

  const displayName = name || 'Imported Skill';
  const desc = meta.description || body.slice(0, 120);
  const hasZh = /[\u4e00-\u9fff]/.test(displayName + desc);
  return {
    id: fallbackId || `skill-import-${Date.now()}`,
    name: displayName,
    desc,
    nameZh: hasZh ? displayName : displayName,
    nameEn: hasZh ? '' : displayName,
    descZh: desc,
    descEn: '',
    category,
    command: command || '/imported-skill',
    author: meta.author || 'Imported',
    version: meta.version || '1.0.0',
    connector: meta.connector || '',
    published: false,
    visibility: 'org',
    invokes: 0,
    icon: 'fa-cube',
    tags: [],
    searchKeywords: [],
    instructions: body || undefined,
  };
}

function findZipText(
  files: Record<string, Uint8Array>,
  matcher: (path: string) => boolean,
): string | null {
  const key = Object.keys(files).find(matcher);
  if (!key) return null;
  return strFromU8(files[key]!);
}

/** 解析 ZIP Skill 包 */
export function parseSkillZip(bytes: Uint8Array): PrototypeSkillSeed | null {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    return null;
  }

  return parseSkillZipFiles(files);
}

/** 上传导入专用：只异步解压有限的 manifest / SKILL.md / plan.md。 */
export async function parseSkillZipAsync(
  bytes: Uint8Array,
  options: PackageArchiveInspectionOptions = {},
): Promise<PrototypeSkillSeed | null> {
  const files = await readPackageZipMetadata(bytes, (path) => {
    const normalized = path.replace(/\\/g, '/');
    return (
      normalized.endsWith('mssclaw.manifest.json') ||
      normalized.endsWith('/SKILL.md') ||
      normalized === 'SKILL.md' ||
      normalized.endsWith('reference/plan.md')
    );
  }, options);
  return parseSkillZipFiles(files);
}

function parseSkillZipFiles(files: Record<string, Uint8Array>): PrototypeSkillSeed | null {

  const manifestText = findZipText(
    files,
    (p) => p.replace(/\\/g, '/').endsWith('mssclaw.manifest.json'),
  );
  if (manifestText) {
    try {
      const parsed = parseSkillImport(JSON.parse(manifestText) as unknown);
      if (parsed) {
        const skillMd = findZipText(files, (p) => p.replace(/\\/g, '/').endsWith('/SKILL.md') || p.replace(/\\/g, '/').endsWith('SKILL.md'));
        if (skillMd) {
          const fromMd = parseSkillMd(skillMd, parsed.id);
          if (fromMd?.instructions) parsed.instructions = fromMd.instructions;
        }
        const planMd = findZipText(files, (p) => p.replace(/\\/g, '/').endsWith('reference/plan.md'));
        if (planMd) {
          const steps = parsePlanStepsFromMd(planMd);
          if (steps.length) parsed.planSteps = steps;
        }
        return parsed;
      }
    } catch {
      /* fall through to SKILL.md */
    }
  }

  const skillMd = findZipText(
    files,
    (p) => {
      const n = p.replace(/\\/g, '/');
      return n.endsWith('/SKILL.md') || n === 'SKILL.md' || n.endsWith('SKILL.md');
    },
  );
  if (!skillMd) return null;

  const skill = parseSkillMd(skillMd);
  if (!skill) return null;

  const planMd = findZipText(files, (p) => p.replace(/\\/g, '/').endsWith('reference/plan.md'));
  if (planMd) {
    const steps = parsePlanStepsFromMd(planMd);
    if (steps.length) skill.planSteps = steps;
  }
  return skill;
}

/** 从批量导出 ZIP 中解析所有 Skill 子包 */
function parseSkillsBulkZip(files: Record<string, Uint8Array>): PrototypeSkillSeed[] {
  /* 按 skills/ 下的目录前缀分组 */
  const skillDirs = new Set<string>();
  for (const path of Object.keys(files)) {
    const normalized = path.replace(/\\/g, '/');
    if (normalized.startsWith('skills/')) {
      const segments = normalized.slice('skills/'.length).split('/');
      if (segments.length >= 2) {
        skillDirs.add(`skills/${segments[0]}`);
      }
    }
  }

  const results: PrototypeSkillSeed[] = [];
  for (const dir of skillDirs) {
    /* 收集该子目录下的所有文件 */
    const subFiles: Record<string, Uint8Array> = {};
    const prefix = dir + '/';
    for (const [path, data] of Object.entries(files)) {
      const normalized = path.replace(/\\/g, '/');
      if (normalized.startsWith(prefix)) {
        /* 将 skills/{slug}/xxx 截取为 {slug}/xxx，与 parseSkillZipFiles 期望的结构一致 */
        const relPath = normalized.slice('skills/'.length);
        subFiles[relPath] = data;
      }
    }
    const skill = parseSkillZipFiles(subFiles);
    if (skill) results.push(skill);
  }
  return results;
}

/** 统一导入入口：ZIP 包 / SKILL.md / JSON */
export async function parseSkillUpload(
  file: File,
  options: PackageArchiveInspectionOptions = {},
): Promise<PrototypeSkillSeed[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.zip') || name.endsWith('.skill.zip')) {
    const buf = new Uint8Array(await file.arrayBuffer());

    /* 先提取文件列表，判断是否为批量导出包 */
    const bulkOptions: PackageArchiveInspectionOptions = {
      ...options,
      maxCompressedBytes: null,
    };
    const files = await readPackageZipMetadata(buf, (path) => {
      const n = path.replace(/\\/g, '/');
      return (
        n === 'manifest.json' ||
        n.endsWith('/mssclaw.manifest.json') ||
        n.endsWith('/SKILL.md') ||
        n === 'SKILL.md' ||
        n.endsWith('reference/plan.md')
      );
    }, bulkOptions);

    const bulkManifestText = files['manifest.json'] ? strFromU8(files['manifest.json']) : null;
    if (bulkManifestText) {
      try {
        const parsed = JSON.parse(bulkManifestText) as Record<string, unknown>;
        if (parsed.format === 'mssclaw-skills-bulk-export') {
          return parseSkillsBulkZip(files);
        }
      } catch {
        /* not a bulk export, fall through to single-skill parsing */
      }
    }

    /* 单个 Skill 包 */
    const skill = parseSkillZipFiles(files);
    return skill ? [skill] : [];
  }

  const text = await file.text();

  if (name.endsWith('.md') || name.endsWith('skill.md')) {
    const skill = parseSkillMd(text);
    return skill ? [skill] : [];
  }

  const json = JSON.parse(text) as unknown;
  const items = Array.isArray(json) ? json : [json];
  return items.map(parseSkillImport).filter((s): s is PrototypeSkillSeed => Boolean(s));
}
