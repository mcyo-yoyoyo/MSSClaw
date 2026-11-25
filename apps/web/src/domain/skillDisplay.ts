/**
 * [INPUT]: 读取统一的目录展示名与多语言描述。
 * [OUTPUT]: 提供 Skill 标题、技术名和表单主字段同步。
 * [POS]: 页面与编辑器通过此模块读取名称。
 * [PROTOCOL]: Update this header on change, then check AGENTS.md
 */
import type { PrototypeSkillSeed } from '@/domain/prototype/types';

import { hasCjk, SKILL_NAME_ZH_BY_ID, skillDisplayName, type SkillNameFields } from '../../../api/src/data/skill-display-name';
export { SKILL_NAME_ZH_BY_ID, skillDisplayName };

/** 英文技术名（有中文主标题时作副标题） */
export function skillTechnicalName(skill: SkillNameFields): string | undefined {
  const display = skillDisplayName(skill);
  const en = skill.nameEn?.trim();
  if (en && en !== display) return en;
  const raw = skill.name?.trim();
  if (raw && raw !== display && !hasCjk(raw)) return raw;
  return undefined;
}

/** 列表/卡片默认展示中文描述 */
export function skillDisplayDesc(
  skill: Pick<PrototypeSkillSeed, 'desc' | 'descZh' | 'descEn'>,
): string {
  return (skill.descZh || skill.desc || skill.descEn || '').trim();
}

/** 保存时同步主字段 name/desc = 中文（兼容旧读取路径） */
export function syncSkillZhPrimary<T extends PrototypeSkillSeed>(skill: T): T {
  const nameZh = (skill.nameZh || skillDisplayName(skill) || '').trim();
  const descZh = (skill.descZh || skill.desc || '').trim();
  return {
    ...skill,
    nameZh,
    descZh,
    name: nameZh || (skill.nameEn || skill.name || '').trim(),
    desc: descZh || (skill.descEn || skill.desc || '').trim(),
  };
}

/** 为种子 Skill 补齐 nameZh / nameEn，不改动已有显式配置 */
export function withSkillDisplayNames<T extends PrototypeSkillSeed>(skill: T): T {
  const nameZh = skill.nameZh?.trim() || SKILL_NAME_ZH_BY_ID[skill.id] || undefined;
  const nameEn =
    skill.nameEn?.trim() ||
    (skill.name && !hasCjk(skill.name) ? skill.name.trim() : undefined);
  if (!nameZh && !nameEn) return skill;
  return {
    ...skill,
    ...(nameZh ? { nameZh } : {}),
    ...(nameEn ? { nameEn } : {}),
  };
}
