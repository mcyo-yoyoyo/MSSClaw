/** 创建技能时可选的标识色（替代复杂 Logo） */
export const SKILL_ACCENT_PRESETS = [
  { id: 'slate', label: '石墨', color: '#3f3f46' },
  { id: 'red', label: '华为红', color: '#cf0a2c' },
  { id: 'blue', label: '海蓝', color: '#2563eb' },
  { id: 'teal', label: '青绿', color: '#0d9488' },
  { id: 'amber', label: '琥珀', color: '#d97706' },
  { id: 'violet', label: '青紫', color: '#7c3aed' },
] as const;

export type SkillAccentId = (typeof SKILL_ACCENT_PRESETS)[number]['id'];

export const DEFAULT_SKILL_ACCENT = SKILL_ACCENT_PRESETS[0].color;

export function resolveSkillAccentColor(accentColor?: string | null): string {
  if (accentColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(accentColor)) {
    return accentColor;
  }
  return DEFAULT_SKILL_ACCENT;
}

/** 无自定义色时按 id 稳定取色（专家/工具运营卡去 logo 用） */
export function accentColorFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h + id.charCodeAt(i) * (i + 1)) % 997;
  return SKILL_ACCENT_PRESETS[h % SKILL_ACCENT_PRESETS.length].color;
}
