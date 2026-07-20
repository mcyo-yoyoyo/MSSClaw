import { strToU8, zipSync, unzipSync, strFromU8 } from 'fflate';
import type { PortalContentItem } from '@/domain/prototype/portalContent';
import { PORTAL_CONTENT_TYPE_LABELS } from '@/domain/prototype/portalContent';
import { toCaseOutcomeCard } from '@/domain/portalCase';

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
    [`${folder}/README.md`]: `# ${item.title} Case Package\n\n含 CASE.md、成效卡、打样计划与 mssclaw.manifest.json，可导回 MSSClaw 样板间。\n`,
    [`${folder}/mssclaw.manifest.json`]: JSON.stringify(caseManifest(item), null, 2),
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

/** 下载场景下多个案例为一个汇总包；仅 1 条时仍导出单案例 .case.zip */
export function downloadScenarioCasePack(
  scenarioLabel: string,
  items: PortalContentItem[],
) {
  if (!items.length) return;
  if (items.length === 1) {
    downloadCaseFile(items[0]!);
    return;
  }
  const zipped: Record<string, Uint8Array> = {};
  for (const item of items) {
    const files = buildCasePackageFiles(item);
    for (const [path, content] of Object.entries(files)) {
      zipped[path] = strToU8(content);
    }
  }
  const slug =
    scenarioLabel
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'scenario';
  zipped[`${slug}/README.md`] = strToU8(
    `# ${scenarioLabel} · 场景案例包\n\n含 ${items.length} 个案例包，可分别导入 MSSClaw 样板间。\n`,
  );
  const bytes = zipSync(zipped, { level: 6 });
  downloadBinary(`${slug}.cases.zip`, bytes, 'application/zip');
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
  const type = (['case', 'insight', 'training', 'news'] as const).includes(
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
