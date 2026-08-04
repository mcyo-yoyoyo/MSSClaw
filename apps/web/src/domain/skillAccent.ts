/** 统一标识黑（MSS 集市 / 技能 / 专家列表；不再用红黄蓝绿多色） */
export const DEFAULT_SKILL_ACCENT = '#18181b';

/** @deprecated 已废弃多色预设，保留空数组兼容旧引用 */
export const SKILL_ACCENT_PRESETS = [] as const;

export type SkillAccentId = string;

export function resolveSkillAccentColor(_accentColor?: string | null): string {
  return DEFAULT_SKILL_ACCENT;
}

/** 列表左边线 / 色点：固定黑色 */
export function accentColorFromId(_id: string): string {
  return DEFAULT_SKILL_ACCENT;
}
