import { strToU8, zipSync, unzipSync, strFromU8 } from 'fflate';
import type { PortalContentItem } from '@/domain/prototype/portalContent';
import {
  isThoughtLayerType,
  PORTAL_CONTENT_TYPE_LABELS,
} from '@/domain/prototype/portalContent';
import { sortThoughtLayerItems, toCaseOutcomeCard } from '@/domain/portalCase';
import {
  formatScenarioEnvLearnSection,
  isScenarioEnvFilled,
  TOOLKIT_LAYER_COPY,
  type ScenarioEnv,
} from '@/domain/scenarioEnv';
import {
  ARCHITECTURE_DOC_KIND_LABELS,
  type ScenarioArchitectureDoc,
} from '@/domain/scenarioArchitecture';
import type { PortalMapCard } from '@/domain/portalMap';

export function caseSlug(item: Pick<PortalContentItem, 'id' | 'title'>): string {
  const raw = item.title || item.id || 'case';
  return (
    raw
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'case'
  );
}

export function caseManifest(item: PortalContentItem) {
  return {
    manifestVersion: '1.0',
    format: 'mssclaw-case-package',
    id: item.id,
    type: item.type,
    title: item.title,
    description: item.desc,
    icon: item.icon,
    ownerDeptIds: item.ownerDeptIds || [],
    ownerRegionId: item.ownerRegionId ?? null,
    publisher: item.publisher || '',
    agentId: item.agentId || '',
    skillId: item.skillId || '',
    primarySkillId: item.primarySkillId || item.skillId || '',
    toolId: item.toolId || '',
    kbDocId: item.kbDocId || '',
    scenarioTags: item.scenarioTags || [],
    painPoint: item.painPoint || '',
    impactMetric: item.impactMetric || '',
    steps: item.steps || [],
    isGold: Boolean(item.isGold),
    packageVersion: item.packageVersion || '1.0.0',
    publishedAt: item.publishedAt,
    visibility: item.visibility || 'public',
    published: item.published !== false,
    previewFile: item.previewFile
      ? {
          name: item.previewFile.name,
          mimeType: item.previewFile.mimeType,
          size: item.previewFile.size,
          kind: item.previewFile.kind,
          dataUrl: item.previewFile.dataUrl,
        }
      : null,
    exportedAt: new Date().toISOString(),
  };
}

function yamlEscape(value: string): string {
  if (/[:#\n"'{}[\],|>&*?!%@`]/.test(value) || value !== value.trim()) {
    return JSON.stringify(value);
  }
  return value;
}

export function buildCaseMd(item: PortalContentItem): string {
  const card = toCaseOutcomeCard(item, PORTAL_CONTENT_TYPE_LABELS[item.type]);
  const steps = card.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
  return [
    '---',
    `name: ${yamlEscape(caseSlug(item))}`,
    `description: ${yamlEscape(item.desc || item.title)}`,
    `metadata:`,
    `  mssclaw:`,
    `    id: ${yamlEscape(item.id)}`,
    `    type: ${yamlEscape(item.type)}`,
    `    primarySkillId: ${yamlEscape(item.primarySkillId || item.skillId || '')}`,
    `    agentId: ${yamlEscape(item.agentId || '')}`,
    `    isGold: ${item.isGold ? 'true' : 'false'}`,
    '---',
    '',
    `# ${item.title}`,
    '',
    '## 痛点',
    '',
    card.painPoint,
    '',
    '## 成效指标',
    '',
    card.impactMetric,
    '',
    '## 打样步骤',
    '',
    steps,
    '',
    '## 适用',
    '',
    card.applicable,
    '',
  ].join('\n');
}

export function buildCasePackageFiles(item: PortalContentItem): Record<string, string> {
  const folder = caseSlug(item);
  const card = toCaseOutcomeCard(item, PORTAL_CONTENT_TYPE_LABELS[item.type]);
  const plan = card.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
  return {
    [`${folder}/CASE.md`]: buildCaseMd(item),
    [`${folder}/reference/outcome.md`]: `# 成效卡 · ${item.title}\n\n- 痛点：${card.painPoint}\n- 指标：${card.impactMetric}\n- ${card.applicable}\n`,
    [`${folder}/reference/plan.md`]: `# 打样计划 · ${item.title}\n\n${plan}\n`,
    [`${folder}/templates/demo-invoke.md`]: `# 演示调用\n\n优先 Skill：\`${item.primarySkillId || item.skillId || '（未绑定）'}\`\n优先 Agent：\`${item.agentId || '（未绑定）'}\`\n`,
    [`${folder}/assets/.gitkeep`]: '',
    ...(item.previewFile
      ? {
          [`${folder}/assets/preview-meta.json`]: JSON.stringify(
            {
              name: item.previewFile.name,
              mimeType: item.previewFile.mimeType,
              size: item.previewFile.size,
              kind: item.previewFile.kind,
            },
            null,
            2,
          ),
        }
      : {}),
    [`${folder}/README.md`]: `# ${item.title}\n\n类型：${PORTAL_CONTENT_TYPE_LABELS[item.type]}\n\n含 CASE.md、成效卡、学习/打样说明与 mssclaw.manifest.json，可导回 MSSClaw。\n`,
    [`${folder}/mssclaw.manifest.json`]: JSON.stringify(caseManifest(item), null, 2),
  };
}

/** 场景学习包目录：学习材料优先清单 + 准备层体外参照 */
export function buildScenarioLearnMd(
  scenarioLabel: string,
  items: PortalContentItem[],
  env?: ScenarioEnv | null,
): string {
  const ordered = sortThoughtLayerItems(items.filter((i) => isThoughtLayerType(i.type)));
  const lines = ordered.map((item, idx) => {
    const link = item.homepageUrl ? ` · [外链](${item.homepageUrl})` : '';
    const preview = item.previewFile ? ` · 含预览：${item.previewFile.name}` : '';
    return `${idx + 1}. **${PORTAL_CONTENT_TYPE_LABELS[item.type]}** · ${item.title}${link}${preview}`;
  });
  return [
    `# ${scenarioLabel} · 学习包`,
    '',
    TOOLKIT_LAYER_COPY.learnIntro,
    '',
    '## 学习清单',
    '',
    ...(lines.length ? lines : ['（暂无学习层内容）']),
    '',
    formatScenarioEnvLearnSection(env),
    '## 建议路径（1.0）',
    '',
    '1. 学习：先读「场景方案」与「前沿洞察」，对齐业务口径',
    TOOLKIT_LAYER_COPY.learnPathStep,
    '3. 学习：完成「培训案例」或外链授课',
    '4. 开干：结合能力沉淀自行打样，或回到平台「一键打样」',
    '',
  ].join('\n');
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

/** 下载单个案例为 .case.zip */
export function downloadCaseFile(item: PortalContentItem) {
  const files = buildCasePackageFiles(item);
  const zipped: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(files)) {
    zipped[path] = strToU8(content);
  }
  const bytes = zipSync(zipped, { level: 6 });
  downloadBinary(`${caseSlug(item)}.case.zip`, bytes, 'application/zip');
}

function scenarioSlug(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'scenario'
  );
}

/** 学习包条目：优先方案/培训/洞察；若无则回落含场景案例 */
function pickLearnPackItems(items: PortalContentItem[]): PortalContentItem[] {
  const narrative = items.filter(
    (i) =>
      i.type === 'playbook' ||
      i.type === 'training' ||
      i.type === 'news' ||
      i.type === 'insight',
  );
  const base = narrative.length ? narrative : items.filter((i) => isThoughtLayerType(i.type));
  return sortThoughtLayerItems(base);
}

/** 下载场景学习包（学习材料 + 准备清单）；不含架构打样卷 */
export function downloadScenarioCasePack(
  scenarioLabel: string,
  items: PortalContentItem[],
  env?: ScenarioEnv | null,
) {
  const packItems = pickLearnPackItems(items);
  if (!packItems.length && !isScenarioEnvFilled(env)) return;

  const slug = scenarioSlug(scenarioLabel);
  const zipped: Record<string, Uint8Array> = {};
  for (const item of packItems) {
    const files = buildCasePackageFiles(item);
    for (const [path, content] of Object.entries(files)) {
      zipped[`learn/${path}`] = strToU8(content);
    }
  }
  zipped[`${slug}/LEARN.md`] = strToU8(buildScenarioLearnMd(scenarioLabel, packItems, env));
  zipped[`${slug}/README.md`] = strToU8(
    [
      `# ${scenarioLabel} · 场景学习包`,
      '',
      '本卷为**学习包**（学习材料 + 准备清单）。',
      '可执行打样与架构 md 请另下「打样包」`.demo.zip`。',
      '',
      `- 学习层内容：${packItems.length} 个`,
      `- 入口：先读 LEARN.md`,
      '',
    ].join('\n'),
  );
  const bytes = zipSync(zipped, { level: 6 });
  downloadBinary(`${slug}.learn.zip`, bytes, 'application/zip');
}

export interface ScenarioDemoPackInput {
  scenarioId: string;
  scenarioLabel: string;
  agents: PortalMapCard[];
  skills: PortalMapCard[];
  tools: PortalMapCard[];
  architectureDocs: ScenarioArchitectureDoc[];
  /** 可打样场景案例（type=case） */
  caseItems: PortalContentItem[];
}

function buildScenarioDemoMd(input: ScenarioDemoPackInput): string {
  const agentLines = input.agents.map((a) => `- Agent · ${a.title}`);
  const skillLines = input.skills.map((s) => `- Skill · ${s.title}${s.meta ? ` (\`${s.meta}\`)` : ''}`);
  const toolLines = input.tools.map((t) => `- Tool · ${t.title}`);
  const archLines = input.architectureDocs.map(
    (d) => `- ${ARCHITECTURE_DOC_KIND_LABELS[d.kind]} · ${d.title} → \`architecture/${d.id}.md\``,
  );
  const caseLines = input.caseItems.map(
    (c) =>
      `- ${c.isGold ? '【金】' : ''}${c.title} · Skill \`${c.primarySkillId || c.skillId || '—'}\` / Agent \`${c.agentId || '—'}\``,
  );
  return [
    `# ${input.scenarioLabel} · 打样包`,
    '',
    '> 本卷为**能力层打样包**：挂载清单、架构 md、可打样案例。学习材料请另下 `.learn.zip`。',
    '',
    '## 挂载能力',
    '',
    '### Agent',
    ...(agentLines.length ? agentLines : ['- （无）']),
    '',
    '### Skill',
    ...(skillLines.length ? skillLines : ['- （无）']),
    '',
    '### Tool',
    ...(toolLines.length ? toolLines : ['- （无）']),
    '',
    '## 架构文件',
    '',
    ...(archLines.length ? archLines : ['- （无）']),
    '',
    '## 可打样案例',
    '',
    ...(caseLines.length ? caseLines : ['- （无 type=case 案例）']),
    '',
    '## 建议执行',
    '',
    '1. 阅读 `architecture/` 下设计与执行方案',
    '2. 回到平台对本场景点「一键打样」',
    '3. 或导入 `cases/` 下金牌案例包后按 templates/demo-invoke.md 调用',
    '',
  ].join('\n');
}

/** 下载场景打样包：架构 md + 能力挂载清单 + type=case 案例 */
export function downloadScenarioDemoPack(input: ScenarioDemoPackInput) {
  const hasCaps =
    input.agents.length +
      input.skills.length +
      input.tools.length +
      input.architectureDocs.length +
      input.caseItems.length >
    0;
  if (!hasCaps) return;

  const slug = scenarioSlug(input.scenarioLabel);
  const zipped: Record<string, Uint8Array> = {};
  zipped[`${slug}/DEMO.md`] = strToU8(buildScenarioDemoMd(input));
  zipped[`${slug}/README.md`] = strToU8(
    [
      `# ${input.scenarioLabel} · 场景打样包`,
      '',
      '本卷为**打样包**（能力层）。学习内容请另下 `.learn.zip`。',
      '',
      '入口：先读 DEMO.md，再打开 architecture/ 与 cases/。',
      '',
    ].join('\n'),
  );

  for (const d of input.architectureDocs) {
    zipped[`${slug}/architecture/${d.id}.md`] = strToU8(d.markdown);
  }

  for (const item of input.caseItems) {
    const files = buildCasePackageFiles(item);
    for (const [path, content] of Object.entries(files)) {
      zipped[`${slug}/cases/${path}`] = strToU8(content);
    }
  }

  const bytes = zipSync(zipped, { level: 6 });
  downloadBinary(`${slug}.demo.zip`, bytes, 'application/zip');
}

function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const arr = v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
  return arr.length ? arr : undefined;
}

export function parseCaseImport(raw: unknown): PortalContentItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const title =
    typeof o.title === 'string'
      ? o.title.trim()
      : typeof o.name === 'string'
        ? o.name.trim()
        : '';
  if (!title) return null;

  const typeRaw = typeof o.type === 'string' ? o.type : 'case';
  const type = (['case', 'playbook', 'insight', 'training', 'news'] as const).includes(
    typeRaw as PortalContentItem['type'],
  )
    ? (typeRaw as PortalContentItem['type'])
    : 'case';

  const desc =
    typeof o.description === 'string'
      ? o.description
      : typeof o.desc === 'string'
        ? o.desc
        : '';

  return {
    id: typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `portal-import-${Date.now()}`,
    type,
    title,
    desc,
    icon: typeof o.icon === 'string' ? o.icon : 'fa-lightbulb',
    ownerDeptIds: asStringArray(o.ownerDeptIds) as PortalContentItem['ownerDeptIds'],
    ownerRegionId:
      o.ownerRegionId === null || typeof o.ownerRegionId === 'string'
        ? (o.ownerRegionId as PortalContentItem['ownerRegionId'])
        : null,
    publisher: typeof o.publisher === 'string' ? o.publisher : 'Imported',
    homepageUrl:
      typeof o.homepageUrl === 'string' && o.homepageUrl.trim()
        ? o.homepageUrl.trim()
        : undefined,
    sourceType:
      o.sourceType === 'external' || o.sourceType === 'internal' ? o.sourceType : undefined,
    agentId: typeof o.agentId === 'string' && o.agentId ? o.agentId : undefined,
    skillId: typeof o.skillId === 'string' && o.skillId ? o.skillId : undefined,
    primarySkillId:
      typeof o.primarySkillId === 'string' && o.primarySkillId
        ? o.primarySkillId
        : undefined,
    toolId: typeof o.toolId === 'string' && o.toolId ? o.toolId : undefined,
    kbDocId: typeof o.kbDocId === 'string' && o.kbDocId ? o.kbDocId : undefined,
    scenarioTags: asStringArray(o.scenarioTags) || [],
    painPoint: typeof o.painPoint === 'string' ? o.painPoint : undefined,
    impactMetric: typeof o.impactMetric === 'string' ? o.impactMetric : undefined,
    steps: asStringArray(o.steps),
    isGold: o.isGold === true,
    packageVersion: typeof o.packageVersion === 'string' ? o.packageVersion : '1.0.0',
    publishedAt:
      typeof o.publishedAt === 'string' && o.publishedAt
        ? o.publishedAt
        : new Date().toISOString().slice(0, 10),
    visibility:
      typeof o.visibility === 'string'
        ? (o.visibility as PortalContentItem['visibility'])
        : 'public',
    published: o.published !== false,
    previewFile:
      o.previewFile && typeof o.previewFile === 'object'
        ? (() => {
            const f = o.previewFile as Record<string, unknown>;
            if (typeof f.dataUrl !== 'string' || typeof f.name !== 'string') return undefined;
            return {
              name: f.name,
              mimeType: typeof f.mimeType === 'string' ? f.mimeType : 'application/octet-stream',
              size: typeof f.size === 'number' ? f.size : 0,
              dataUrl: f.dataUrl,
              kind:
                f.kind === 'pdf' ||
                f.kind === 'pptx' ||
                f.kind === 'docx' ||
                f.kind === 'xlsx' ||
                f.kind === 'image'
                  ? f.kind
                  : 'other',
            };
          })()
        : undefined,
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

function parsePlanStepsFromMd(md: string): string[] {
  return md
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+\.\s*/, '').trim())
    .filter((line) => line && !line.startsWith('#') && line !== '（未配置）');
}

export function parseCaseZip(bytes: Uint8Array): PortalContentItem | null {
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
      const parsed = parseCaseImport(JSON.parse(manifestText) as unknown);
      if (parsed) {
        const planMd = findZipText(files, (p) =>
          p.replace(/\\/g, '/').endsWith('reference/plan.md'),
        );
        if (planMd) {
          const steps = parsePlanStepsFromMd(planMd);
          if (steps.length) parsed.steps = steps;
        }
        return parsed;
      }
    } catch {
      /* fall through */
    }
  }

  return null;
}

/** 统一导入：.case.zip / JSON */
export async function parseCaseUpload(file: File): Promise<PortalContentItem[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.zip') || name.endsWith('.case.zip')) {
    const buf = new Uint8Array(await file.arrayBuffer());
    const item = parseCaseZip(buf);
    return item ? [item] : [];
  }

  const text = await file.text();
  const json = JSON.parse(text) as unknown;
  const items = Array.isArray(json) ? json : [json];
  return items.map(parseCaseImport).filter((i): i is PortalContentItem => Boolean(i));
}
