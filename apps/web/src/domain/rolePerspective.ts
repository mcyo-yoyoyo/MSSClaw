import type { PlatformRole } from '@/domain/rbac';
import {
  HQ_DEPTS,
  REGIONS,
  getDeptLabel,
  getRegionLabel,
  type DeptId,
  type OrgAffiliation,
  type RegionId,
} from '@/domain/orgTaxonomy';
import { isSystemAdmin } from '@/domain/currentUser';

/** 是否拥有全球全职能视角（超级管理员） */
export function hasGlobalOrgScope(role?: PlatformRole): boolean {
  return isSystemAdmin(role);
}

/** 对话助理可见的机关职能 chips */
export function getVisibleHomeDepts(
  affiliation: OrgAffiliation,
  role?: PlatformRole,
): DeptId[] {
  if (hasGlobalOrgScope(role)) return HQ_DEPTS.map((d) => d.id);
  if (affiliation.deptIds?.length) return affiliation.deptIds;
  return HQ_DEPTS.map((d) => d.id);
}

/** 对话助理可见的一线区域 chips */
export function getVisibleHomeRegions(
  affiliation: OrgAffiliation,
  role?: PlatformRole,
): RegionId[] {
  if (hasGlobalOrgScope(role)) return REGIONS.map((r) => r.id);
  if (affiliation.regionId) return [affiliation.regionId];
  return REGIONS.map((r) => r.id);
}

const ROLE_TITLE: Record<PlatformRole, string> = {
  super_admin: '管理员',
  capability_ops: '运营',
  business_user: '经理',
  viewer: '专员',
};

/**
 * 组织 + 职能 + 角色组合的视角名称
 */
export function formatRolePerspective(input: {
  platformRole: PlatformRole;
  deptIds?: DeptId[];
  regionId?: RegionId | null;
}): string {
  if (hasGlobalOrgScope(input.platformRole)) {
    return '全球管理员视角';
  }

  const depts = input.deptIds ?? [];
  const deptPart =
    depts.length === 0
      ? '综合'
      : depts.length === 1
        ? getDeptLabel(depts[0]!)
        : depts
            .slice(0, 2)
            .map(getDeptLabel)
            .join('/');

  const titleBase = ROLE_TITLE[input.platformRole] ?? '成员';
  const fieldTitle =
    input.platformRole === 'business_user' ? '主管' : titleBase;
  const hqTitle =
    input.platformRole === 'business_user' ? '经理' : titleBase;

  if (input.regionId) {
    return `${getRegionLabel(input.regionId)}${deptPart}${fieldTitle}`;
  }
  return `机关全球${deptPart}${hqTitle}`;
}
