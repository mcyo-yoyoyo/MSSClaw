import {
  CHINA_REGION_ID,
  HQ_REGION_ID,
  getDeptLabel,
  getRegionLabel,
  regionMatchesSelection,
  sortDeptIdsByLabel,
  sortRegionIdsByLabel,
  type DeptId,
  type OrgAffiliation,
  type RegionId,
} from '@/domain/orgTaxonomy';
import type { PlatformRole } from '@/domain/rbac';
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

/** 展示用区域 */
const REGION_SHOW: RegionId[] = [
  HQ_REGION_ID,
  'apac',
  'mea',
  'latam',
  'europe',
  'eurasia',
  CHINA_REGION_ID,
];

/** 展示用领域（与左栏展示序对齐） */
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

/** 筛选下拉：区域二级（全量字典） */
export const REGION_FILTER_OPTIONS: RegionId[] = [
  HQ_REGION_ID,
  'apac',
  'mea',
  'latam',
  'europe',
  'eurasia',
  CHINA_REGION_ID,
];

/** 筛选下拉：领域二级（全量字典） */
export const DEPT_FILTER_OPTIONS: DeptId[] = DEPT_SHOW;

/**
 * 左侧「领域 / 区域」菜单是否展示全量选项。
 * 短期上线：全角色看全量，不做菜单级数据权限；成员归属标签仍保留，供后续
 * MSS 工具集市 Agent/Skill「本组织可见」匹配职能/区域。
 */
export function hasFullOrgFilterCatalog(_role?: PlatformRole): boolean {
  void _role;
  return true;
}

/**
 * 视角筛选项 · 领域：短期全量；后续若恢复菜单裁剪，非全量角色仅本人所属职能。
 */
export function getScopedDeptFilterOptions(
  affiliation: OrgAffiliation,
  role?: PlatformRole,
): DeptId[] {
  if (hasFullOrgFilterCatalog(role)) {
    return sortDeptIdsByLabel([...DEPT_FILTER_OPTIONS]);
  }
  const mine = (affiliation.deptIds ?? []).filter((d) => DEPT_FILTER_OPTIONS.includes(d));
  return sortDeptIdsByLabel(mine);
}

/**
 * 视角筛选项 · 区域：短期全量；后续若恢复菜单裁剪，一线仅本区域、机关岗至少「机关」。
 */
export function getScopedRegionFilterOptions(
  affiliation: OrgAffiliation,
  role?: PlatformRole,
): RegionId[] {
  if (hasFullOrgFilterCatalog(role)) {
    return sortRegionIdsByLabel([...REGION_FILTER_OPTIONS]);
  }
  if (affiliation.regionId && REGION_FILTER_OPTIONS.includes(affiliation.regionId)) {
    return sortRegionIdsByLabel([affiliation.regionId]);
  }
  return [HQ_REGION_ID];
}

/** 去掉越权勾选（换账号后）；短期全量目录下等同透传 */
export function clampOrgPerspectiveSelection(
  sel: OrgPerspectiveSelection,
  affiliation: OrgAffiliation,
  role?: PlatformRole,
): OrgPerspectiveSelection {
  const depts = new Set(getScopedDeptFilterOptions(affiliation, role));
  const regions = new Set(getScopedRegionFilterOptions(affiliation, role));
  return {
    global: sel.global,
    dept: sel.dept.filter((d) => depts.has(d)),
    region: sel.region.filter((r) => regions.has(r)),
  };
}

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
  const regionOk = regionMatchesSelection(skill.ownerRegionId, sel.region);
  const deptOk =
    !sel.dept.length || (skill.ownerDeptIds ?? []).some((d) => sel.dept.includes(d));
  return roleOk && regionOk && deptOk;
}

/**
 * 场景叙事过滤：部门/区域按归属；全球角色轴仅在挂了主 Skill 时生效。
 * 无 primarySkillId 的洞察/方案/课件不因全球轴被误杀。
 */
export function scenarioMatchesOrgPerspectiveSelection(
  input: {
    primarySkillId?: string | null;
    ownerDeptIds?: DeptId[];
    ownerRegionId?: RegionId | null;
  },
  sel: OrgPerspectiveSelection,
): boolean {
  if (isOrgPerspectiveEmpty(sel)) return true;
  const regionOk = regionMatchesSelection(input.ownerRegionId, sel.region);
  const deptOk =
    !sel.dept.length || (input.ownerDeptIds ?? []).some((d) => sel.dept.includes(d));
  if (!regionOk || !deptOk) return false;
  if (!sel.global.length) return true;
  const skillId = input.primarySkillId?.trim();
  if (!skillId) return true;
  const role = SKILL_ROLE_BY_ID[skillId];
  return !!role && sel.global.includes(role);
}

/** 多条内容：任一命中即通过（找案例场景级过滤） */
export function anyItemMatchesOrgPerspective(
  items: Array<{
    primarySkillId?: string | null;
    skillId?: string | null;
    ownerDeptIds?: DeptId[];
    ownerRegionId?: RegionId | null;
  }>,
  sel: OrgPerspectiveSelection,
): boolean {
  if (isOrgPerspectiveEmpty(sel)) return true;
  if (!items.length) return false;
  return items.some((item) =>
    scenarioMatchesOrgPerspectiveSelection(
      {
        primarySkillId: item.primarySkillId || item.skillId || null,
        ownerDeptIds: item.ownerDeptIds,
        ownerRegionId: item.ownerRegionId ?? null,
      },
      sel,
    ),
  );
}
