import { strToU8, zipSync, unzipSync, strFromU8 } from 'fflate';
import * as XLSX from 'xlsx';
import type { EfficiencyCategory, PrototypeSkillSeed } from '@/domain/prototype/types';
import { getSkillPack } from '@/domain/skills/catalog';
import { ASSET_VISIBILITY_LABELS, getDeptLabel, getRegionLabel } from '@/domain/orgTaxonomy';
import type { AssetVisibility, DeptId, RegionId } from '@/domain/orgTaxonomy';

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
    visibility: skill.visibility || 'org',
    icon: skill.icon,
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
export function buildSkillPackageFiles(skill: PrototypeSkillSeed): Record<string, string> {
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
  const files = buildSkillPackageFiles(skill);
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
  const hasBody = Boolean(skill.instructions?.trim());
  return {
    id: skill.id,
    nameZh: skill.nameZh || skill.name,
    nameEn: skill.nameEn || '',
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
    publishedExecutable: published,
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
    runnableNow: published && hasBody,
    tags: skill.tags || [],
    searchKeywords: skill.searchKeywords || [],
    sourceType: skill.sourceType || 'internal',
  };
}

/**
 * 导出全部 Skill 运营清单（Excel .xlsx）。
 * MVP 字段对齐需求；调用总量/Token 列预留为「—」（暂无模型计量）。
 */
export function downloadAllSkillsFile(
  skills: PrototypeSkillSeed[],
  engagementById?: Record<string, { likes: number; dislikes: number; downloads: number }>,
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
  const topInvoked = [...rows].sort((a, b) => b.invokeCount - a.invokeCount).slice(0, 10);

  const detailSheet =
    rows.length > 0
      ? rows.map((r) => {
          const vis = (r.visibility || 'org') as AssetVisibility;
          return {
            Skill名称: r.nameZh,
            SkillID: r.id,
            创建者: r.author,
            创建时间: r.createdAt || '—',
            更新者: r.updatedBy || '—',
            最近更新日期: r.updatedAt || '—',
            历史版本更新记录: r.version ? `当前 v${r.version}` : '—',
            领域信息: (r.ownerDeptIds as DeptId[]).map(getDeptLabel).join('、') || '',
            区域信息: r.ownerRegionId ? getRegionLabel(r.ownerRegionId as RegionId) : '',
            业务场景: r.businessScenarioId ?? '',
            页面访问量: '—',
            Skill下载总量: r.downloads,
            近30天下载总量: '—',
            点赞量: r.likes,
            点踩量: r.dislikes,
            点踩用户名工号: '—',
            调用总次数预留: '—',
            Token消耗总量预留: '—',
            Token消耗均量预留: '—',
            近30天调用量预留: '—',
            英文名称: r.nameEn,
            调用指令: r.command,
            可见范围: ASSET_VISIBILITY_LABELS[vis] ?? String(vis),
            已上架可调用: r.publishedExecutable ? '是' : '否',
            精选MSS场景技能: r.featuredInDoTask ? '是' : '否',
            演示调用次数: r.invokeCount,
            具备执行正文: r.hasExecutableBody ? '是' : '否',
            使用须知摘要: (r.usageNotes || '').slice(0, 80),
            案例条数: r.caseCount,
            运营标签: (r.tags || []).join('、'),
            搜索关键词: (r.searchKeywords || []).join('、'),
          };
        })
      : [{ 说明: '当前无 Skill 数据' }];

  const summarySheet = [
    { 指标: '导出时间', 值: new Date().toISOString() },
    { 指标: 'Skill 总数', 值: rows.length },
    { 指标: '已上架可调用数', 值: executableCount },
    { 指标: '当前可对话执行数', 值: runnableCount },
    { 指标: '精选MSS场景技能数', 值: featuredCount },
    { 指标: '演示调用总次数', 值: totalInvokes },
    { 指标: '真实调用/Token', 值: '—（预留，待模型计量对接）' },
    { 指标: '可见-全员', 值: byVisibility.public || 0 },
    { 指标: '可见-本组织', 值: byVisibility.org || 0 },
    { 指标: '可见-仅发布方', 值: byVisibility.private || 0 },
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
  const wsDetail = XLSX.utils.json_to_sheet(detailSheet);
  const wsTop = XLSX.utils.json_to_sheet(topSheet);
  const detailKeys = Object.keys(detailSheet[0] ?? {});
  wsDetail['!cols'] = detailKeys.map((k) => ({
    wch: Math.min(28, Math.max(12, String(k).length + 4)),
  }));
  XLSX.utils.book_append_sheet(wb, wsSummary, '汇总');
  XLSX.utils.book_append_sheet(wb, wsDetail, '技能明细');
  XLSX.utils.book_append_sheet(wb, wsTop, '调用Top10');

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `mssclaw-skills-ops-${stamp}.xlsx`);
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
    // 导入默认草稿：不可调用，组织内可见（需审批后上架/公开）
    published: false,
    visibility: 'org',
    invokes: typeof o.invokes === 'number' ? o.invokes : 0,
    icon: typeof o.icon === 'string' ? o.icon : 'fa-cube',
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

/** 统一导入入口：ZIP 包 / SKILL.md / JSON */
export async function parseSkillUpload(file: File): Promise<PrototypeSkillSeed[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.zip') || name.endsWith('.skill.zip')) {
    const buf = new Uint8Array(await file.arrayBuffer());
    const skill = parseSkillZip(buf);
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
