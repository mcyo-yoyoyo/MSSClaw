import { getDeptLabel, getRegionLabel, type DeptId, type RegionId } from '@/domain/orgTaxonomy';
import { SKILL_ROLE_CATEGORIES, SKILL_ROLE_BY_ID, type SkillRoleId } from '@/domain/skillRoles';

/** 卡片上展示的组织轴标签（数字员工角色 / 区域 / 领域） */
export type OrgAxisTag = {
  axis: 'global' | 'region' | 'dept';
  id: string;
  label: string;
};

const ROLE_LABEL = Object.fromEntries(
  SKILL_ROLE_CATEGORIES.map((r) => [r.id, r.label]),
) as Record<SkillRoleId, string>;

/** 展示用区域（不含中国区演示入口时仍可映射） */
const REGION_SHOW: RegionId[] = ['apac', 'mea', 'latam', 'europe', 'eurasia', 'china'];

/** 展示用领域（与演示口径对齐） */
const DEPT_SHOW: DeptId[] = [
  'gtm',
  'mkt',
  'ecommerce',
  'service',
  'channel',
  'retail',
  'hr',
  'quality',
];

export function getSkillOrgAxisTags(skill: {
  id: string;
  ownerDeptIds?: DeptId[];
  ownerRegionId?: RegionId | null;
}): OrgAxisTag[] {
  const tags: OrgAxisTag[] = [];
  const role = SKILL_ROLE_BY_ID[skill.id];
  if (role) {
    tags.push({ axis: 'global', id: role, label: ROLE_LABEL[role] });
  }
  if (skill.ownerRegionId && REGION_SHOW.includes(skill.ownerRegionId)) {
    tags.push({
      axis: 'region',
      id: skill.ownerRegionId,
      label: getRegionLabel(skill.ownerRegionId),
    });
  }
  const dept = (skill.ownerDeptIds ?? []).find((d) => DEPT_SHOW.includes(d));
  if (dept) {
    tags.push({ axis: 'dept', id: dept, label: getDeptLabel(dept) });
  }
  return tags.slice(0, 3);
}

export function getScenarioOrgAxisTags(input: {
  primarySkillId?: string | null;
  ownerDeptIds?: DeptId[];
  ownerRegionId?: RegionId | null;
}): OrgAxisTag[] {
  const tags: OrgAxisTag[] = [];
  if (input.primarySkillId) {
    const role = SKILL_ROLE_BY_ID[input.primarySkillId];
    if (role) {
      tags.push({ axis: 'global', id: role, label: ROLE_LABEL[role] });
    }
  }
  if (input.ownerRegionId && REGION_SHOW.includes(input.ownerRegionId)) {
    tags.push({
      axis: 'region',
      id: input.ownerRegionId,
      label: getRegionLabel(input.ownerRegionId),
    });
  }
  const dept = (input.ownerDeptIds ?? []).find((d) => DEPT_SHOW.includes(d));
  if (dept) {
    tags.push({ axis: 'dept', id: dept, label: getDeptLabel(dept) });
  }
  return tags.slice(0, 3);
}

/** 筛选下拉：区域二级 */
export const REGION_FILTER_OPTIONS: RegionId[] = [
  'china',
  'apac',
  'mea',
  'latam',
  'europe',
  'eurasia',
];

/** 筛选下拉：领域二级 */
export const DEPT_FILTER_OPTIONS: DeptId[] = DEPT_SHOW;

/** AI任务 · 组织视角多选（轴内 OR，轴间 AND；空选=全部） */
export type OrgPerspectiveSelection = {
  global: SkillRoleId[];
  region: RegionId[];
  dept: DeptId[];
};

export function emptyOrgPerspectiveSelection(): OrgPerspectiveSelection {
  return { global: [], region: [], dept: [] };
}

export function isOrgPerspectiveEmpty(sel: OrgPerspectiveSelection): boolean {
  return !sel.global.length && !sel.region.length && !sel.dept.length;
}

export function selectionSummaryLabel(sel: OrgPerspectiveSelection): string {
  if (isOrgPerspectiveEmpty(sel)) return '全部';
  const parts: string[] = [];
  for (const id of sel.global) {
    const label = ROLE_LABEL[id];
    if (label) parts.push(label);
  }
  for (const id of sel.region) parts.push(getRegionLabel(id));
  for (const id of sel.dept) parts.push(getDeptLabel(id));
  if (parts.length <= 2) return parts.join(' · ');
  return `${parts.slice(0, 2).join(' · ')} +${parts.length - 2}`;
}

export function skillMatchesOrgPerspectiveSelection(
  skill: { id: string; ownerDeptIds?: DeptId[]; ownerRegionId?: RegionId | null },
  sel: OrgPerspectiveSelection,
): boolean {
  if (isOrgPerspectiveEmpty(sel)) return true;
  const role = SKILL_ROLE_BY_ID[skill.id];
  const roleOk = !sel.global.length || (!!role && sel.global.includes(role));
  const regionOk =
    !sel.region.length || (!!skill.ownerRegionId && sel.region.includes(skill.ownerRegionId));
  const deptOk =
    !sel.dept.length || (skill.ownerDeptIds ?? []).some((d) => sel.dept.includes(d));
  return roleOk && regionOk && deptOk;
}

/** 场景案例：按代表案例归属做组织视角过滤 */
export function scenarioMatchesOrgPerspectiveSelection(
  input: {
    primarySkillId?: string | null;
    ownerDeptIds?: DeptId[];
    ownerRegionId?: RegionId | null;
  },
  sel: OrgPerspectiveSelection,
): boolean {
  return skillMatchesOrgPerspectiveSelection(
    {
      id: input.primarySkillId ?? '',
      ownerDeptIds: input.ownerDeptIds,
      ownerRegionId: input.ownerRegionId,
    },
    sel,
  );
}
