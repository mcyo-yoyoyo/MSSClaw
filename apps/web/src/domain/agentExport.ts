import { strToU8, zipSync, unzipSync, strFromU8 } from 'fflate';
import type { EfficiencyCategory, PrototypeAgentSeed } from '@/domain/prototype/types';
import { getAgentPack } from '@/domain/agents/catalog';
import { buildAgentDemoPrompt, getAgentSystemPrompt } from '@/domain/agents/runtime';

const VALID_CATEGORIES: EfficiencyCategory[] = ['office', 'manage', 'process', 'experience'];

export function agentSlug(agent: Pick<PrototypeAgentSeed, 'id' | 'name'>): string {
  const raw = agent.name || agent.id || 'agent';
  return raw
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'agent';
}

export function agentManifest(agent: PrototypeAgentSeed) {
  const pack = getAgentPack(agent.id);
  return {
    manifestVersion: '2.0',
    format: 'mssclaw-agent-package',
    id: agent.id,
    name: agent.name,
    description: agent.desc,
    category: agent.category,
    version: '1.0.0',
    author: agent.author,
    skillIds: agent.skillIds || [],
    primarySkillId: pack?.primarySkillId || agent.skillIds[0] || '',
    chatId: agent.chatId,
    systemPrompt: getAgentSystemPrompt(agent) || '',
    demoPrompt: pack?.demoPrompt || buildAgentDemoPrompt(agent),
    planSteps: pack?.planSteps || [],
    published: !!agent.published,
    icon: agent.icon,
    exportedAt: new Date().toISOString(),
  };
}

function yamlEscape(value: string): string {
  if (/[:#\n"'{}[\],|>&*?!%@`]/.test(value) || value !== value.trim()) {
    return JSON.stringify(value);
  }
  return value;
}

export function buildAgentMd(agent: PrototypeAgentSeed): string {
  const persona = getAgentSystemPrompt(agent) || agent.desc;
  const pack = getAgentPack(agent.id);
  const skills = (agent.skillIds || []).join(', ');
  return [
    '---',
    `name: ${yamlEscape(agentSlug(agent))}`,
    `description: ${yamlEscape(agent.desc || agent.name)}`,
    `metadata:`,
    `  mssclaw:`,
    `    id: ${yamlEscape(agent.id)}`,
    `    category: ${yamlEscape(agent.category)}`,
    `    primarySkillId: ${yamlEscape(pack?.primarySkillId || agent.skillIds[0] || '')}`,
    `    skillIds: ${JSON.stringify(agent.skillIds || [])}`,
    '---',
    '',
    `# ${agent.name}`,
    '',
    '## Persona',
    '',
    persona,
    '',
    '## 挂载 Skills',
    '',
    skills || '（无）',
    '',
    '## 演示任务',
    '',
    '```',
    pack?.demoPrompt || buildAgentDemoPrompt(agent),
    '```',
    '',
  ].join('\n');
}

export function buildAgentPackageFiles(agent: PrototypeAgentSeed): Record<string, string> {
  const folder = agentSlug(agent);
  const pack = getAgentPack(agent.id);
  const plan = (pack?.planSteps || [])
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n') || '1. （未配置）';
  return {
    [`${folder}/AGENT.md`]: buildAgentMd(agent),
    [`${folder}/reference/plan.md`]: `# 编排计划 · ${agent.name}\n\n${plan}\n`,
    [`${folder}/templates/demo-prompt.md`]: `# 演示提示词\n\n\`\`\`\n${pack?.demoPrompt || buildAgentDemoPrompt(agent)}\n\`\`\`\n`,
    [`${folder}/assets/.gitkeep`]: '',
    [`${folder}/README.md`]: `# ${agent.name} Agent Package\n\n含 AGENT.md（Persona）、reference/plan.md、templates/demo-prompt.md、mssclaw.manifest.json。\n`,
    [`${folder}/mssclaw.manifest.json`]: JSON.stringify(agentManifest(agent), null, 2),
  };
}

function downloadBinary(filename: string, data: Uint8Array, mime: string) {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const blob = new Blob([copy], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadAgentFile(agent: PrototypeAgentSeed) {
  const files = buildAgentPackageFiles(agent);
  const zipped: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(files)) {
    zipped[path] = strToU8(content);
  }
  downloadBinary(`${agentSlug(agent)}.agent.zip`, zipSync(zipped, { level: 6 }), 'application/zip');
}

export function downloadAllAgentsFile(agents: PrototypeAgentSeed[]) {
  const blob = new Blob([JSON.stringify(agents.map(agentManifest), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mssclaw-agents.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function parseAgentImport(raw: unknown): PrototypeAgentSeed | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  if (!name) return null;
  const categoryRaw = typeof o.category === 'string' ? o.category : 'office';
  const category = VALID_CATEGORIES.includes(categoryRaw as EfficiencyCategory)
    ? (categoryRaw as EfficiencyCategory)
    : 'office';
  const skillIds = Array.isArray(o.skillIds)
    ? o.skillIds.filter((id): id is string => typeof id === 'string')
    : [];
  return {
    id: typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `agent-import-${Date.now()}`,
    name,
    desc: typeof o.description === 'string' ? o.description : typeof o.desc === 'string' ? o.desc : '',
    category,
    bizLine: typeof o.bizLine === 'string' ? o.bizLine : category,
    homeTag: 'mkt',
    author: typeof o.author === 'string' ? o.author : 'Imported',
    published: o.published !== false,
    invokes: typeof o.invokes === 'number' ? o.invokes : 0,
    skillIds,
    chatId: typeof o.chatId === 'string' ? o.chatId : 'marketing',
    icon: typeof o.icon === 'string' ? o.icon : 'fa-robot',
    color: 'from-zinc-700 to-zinc-900',
    systemPrompt: typeof o.systemPrompt === 'string' ? o.systemPrompt : '',
    demoPrompt: typeof o.demoPrompt === 'string' ? o.demoPrompt : undefined,
    primarySkillId: typeof o.primarySkillId === 'string' ? o.primarySkillId : skillIds[0],
    planSteps: Array.isArray(o.planSteps)
      ? o.planSteps.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      : undefined,
  };
}

function findZipText(files: Record<string, Uint8Array>, endsWith: string): string | null {
  const key = Object.keys(files).find((p) => p.replace(/\\/g, '/').endsWith(endsWith));
  return key ? strFromU8(files[key]!) : null;
}

export function parseAgentZip(bytes: Uint8Array): PrototypeAgentSeed | null {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    return null;
  }
  const manifest = findZipText(files, 'mssclaw.manifest.json');
  if (manifest) {
    try {
      return parseAgentImport(JSON.parse(manifest) as unknown);
    } catch {
      /* fallthrough */
    }
  }
  return null;
}

export async function parseAgentUpload(file: File): Promise<PrototypeAgentSeed[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.zip') || name.endsWith('.agent.zip')) {
    const skill = parseAgentZip(new Uint8Array(await file.arrayBuffer()));
    return skill ? [skill] : [];
  }
  const json = JSON.parse(await file.text()) as unknown;
  const items = Array.isArray(json) ? json : [json];
  return items.map(parseAgentImport).filter((a): a is PrototypeAgentSeed => Boolean(a));
}
