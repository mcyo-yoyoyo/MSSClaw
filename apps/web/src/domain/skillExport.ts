import { strToU8, zipSync, unzipSync, strFromU8 } from 'fflate';
import type { EfficiencyCategory, PrototypeSkillSeed } from '@/domain/prototype/types';
import { downloadBlob } from '@/lib/download';
import { getSkillPack } from '@/domain/skills/catalog';

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
    manifestVersion: '2.0',
    format: 'mssclaw-skill-package',
    id: skill.id,
    name: skill.name,
    description: skill.desc,
    command: skill.command,
    category: skill.category,
    version: skill.version || '1.0.0',
    author: skill.author,
    connector: skill.connector || '',
    tags: skill.tags || [],
    published: !!skill.published,
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
  const body =
    skill.instructions?.trim() ||
    `# ${skill.name}\n\n${skill.desc}\n\n在对话中输入 \`${skill.command}\` 调用本 Skill。`;
  const lines = [
    '---',
    `name: ${yamlEscape(skillSlug(skill))}`,
    `description: ${yamlEscape(skill.desc || skill.name)}`,
    `metadata:`,
    `  mssclaw:`,
    `    id: ${yamlEscape(skill.id)}`,
    `    command: ${yamlEscape(skill.command)}`,
    `    category: ${yamlEscape(skill.category)}`,
    `    version: ${yamlEscape(skill.version || '1.0.0')}`,
    `    connector: ${yamlEscape(skill.connector || '')}`,
    `    tags: ${JSON.stringify(skill.tags || [])}`,
    '---',
    '',
    body.startsWith('#') ? body : `# ${skill.name}\n\n${body}`,
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

/** 批量仍导出 JSON 清单（便于平台备份）；单技能请用 ZIP 包 */
export function downloadAllSkillsFile(skills: PrototypeSkillSeed[]) {
  downloadBlob('mssclaw-skills.json', JSON.stringify(skills.map(skillManifest), null, 2));
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

  return {
    id: typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `skill-import-${Date.now()}`,
    name,
    desc,
    category,
    command,
    author: typeof o.author === 'string' ? o.author : 'Imported',
    version: typeof o.version === 'string' ? o.version : '1.0.0',
    connector: typeof o.connector === 'string' ? o.connector : '',
    published: o.published !== false,
    invokes: typeof o.invokes === 'number' ? o.invokes : 0,
    icon: typeof o.icon === 'string' ? o.icon : 'fa-cube',
    tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === 'string') : [],
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

  return {
    id: fallbackId || `skill-import-${Date.now()}`,
    name: name || 'Imported Skill',
    desc: meta.description || body.slice(0, 120),
    category,
    command: command || '/imported-skill',
    author: meta.author || 'Imported',
    version: meta.version || '1.0.0',
    connector: meta.connector || '',
    published: true,
    invokes: 0,
    icon: 'fa-cube',
    tags: [],
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
