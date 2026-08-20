import type { AssetVisibility } from '@/domain/orgTaxonomy';

/** Skill Hub 只提供部门内与跨部门两档可见范围。 */
export type SkillVisibility = Extract<AssetVisibility, 'org' | 'public'>;

export const SKILL_VISIBILITY_LABELS: Record<SkillVisibility, string> = {
  org: '部门可见',
  public: '全部门可见',
};

export const SKILL_VISIBILITY_OPTIONS: ReadonlyArray<{
  value: SkillVisibility;
  label: string;
}> = [
  { value: 'org', label: SKILL_VISIBILITY_LABELS.org },
  { value: 'public', label: SKILL_VISIBILITY_LABELS.public },
];

/**
 * 编辑 Skill 时把历史 private 安全收敛为部门可见，避免旧资产在移除
 * “仅发布方”选项后被意外扩大到全部门。
 */
export function normalizeSkillVisibility(
  visibility: AssetVisibility | string | undefined,
  fallback: SkillVisibility = 'public',
): SkillVisibility {
  if (visibility === 'public') return 'public';
  if (visibility === 'org' || visibility === 'private') return 'org';
  return fallback;
}

export function getSkillVisibilityLabel(
  visibility: AssetVisibility | string | undefined,
): string {
  return SKILL_VISIBILITY_LABELS[normalizeSkillVisibility(visibility, 'public')];
}
