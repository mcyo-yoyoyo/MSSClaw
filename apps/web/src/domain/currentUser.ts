import type { PlatformRole } from '@/domain/rbac';
import {
  formatOrgAffiliation,
  type DeptId,
  type OrgAffiliation,
  type RegionId,
} from '@/domain/orgTaxonomy';
import { useSessionStore } from '@/stores/sessionStore';

export function getCurrentUserId(): string {
  return useSessionStore.getState().getUserId();
}

export function getCurrentUserName(): string {
  return useSessionStore.getState().getUserName();
}

export function getCurrentPlatformRole(): PlatformRole {
  return useSessionStore.getState().getPlatformRole();
}

export function getCurrentOrgAffiliation(): OrgAffiliation {
  return useSessionStore.getState().getOrgAffiliation();
}

export function getCurrentDeptIds(): DeptId[] {
  return getCurrentOrgAffiliation().deptIds;
}

export function getCurrentRegionId(): RegionId | null {
  return getCurrentOrgAffiliation().regionId ?? null;
}

export function getCurrentOrgLabel(): string {
  return formatOrgAffiliation(getCurrentOrgAffiliation());
}

/** 系统管理员（平台级）才可管理租户配置等 */
export function isSystemAdmin(role?: PlatformRole): boolean {
  return (role ?? getCurrentPlatformRole()) === 'super_admin';
}
