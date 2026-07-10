import type { EfficiencyCategory, PrototypeSkillSeed } from '@/domain/prototype/types';
import { downloadBlob } from '@/lib/download';

const VALID_CATEGORIES: EfficiencyCategory[] = ['office', 'manage', 'process', 'experience'];

export function skillManifest(skill: PrototypeSkillSeed) {
  return {
    manifestVersion: '1.2',
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
    exportedAt: new Date().toISOString(),
  };
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
  };
}

export function downloadSkillFile(skill: PrototypeSkillSeed) {
  const safeName = skill.name.replace(/[^\w\u4e00-\u9fff-]+/g, '_') || 'skill';
  downloadBlob(`${safeName}.skill.json`, JSON.stringify(skillManifest(skill), null, 2));
}

export function downloadAllSkillsFile(skills: PrototypeSkillSeed[]) {
  downloadBlob('mssclaw-skills.json', JSON.stringify(skills.map(skillManifest), null, 2));
}
