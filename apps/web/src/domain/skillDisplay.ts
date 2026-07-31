import type { PrototypeSkillSeed } from '@/domain/prototype/types';

/** 列表/卡片默认展示中文名 */
export function skillDisplayName(skill: Pick<PrototypeSkillSeed, 'name' | 'nameZh' | 'nameEn'>): string {
  return (skill.nameZh || skill.name || skill.nameEn || '未命名技能').trim();
}

/** 列表/卡片默认展示中文描述 */
export function skillDisplayDesc(
  skill: Pick<PrototypeSkillSeed, 'desc' | 'descZh' | 'descEn'>,
): string {
  return (skill.descZh || skill.desc || skill.descEn || '').trim();
}

/** 保存时同步主字段 name/desc = 中文（兼容旧读取路径） */
export function syncSkillZhPrimary<T extends PrototypeSkillSeed>(skill: T): T {
  const nameZh = (skill.nameZh || skill.name || '').trim();
  const descZh = (skill.descZh || skill.desc || '').trim();
  return {
    ...skill,
    nameZh,
    descZh,
    name: nameZh || (skill.nameEn || skill.name || '').trim(),
    desc: descZh || (skill.descEn || skill.desc || '').trim(),
  };
}
