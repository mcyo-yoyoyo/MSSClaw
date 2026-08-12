import type { AssetVisibility, OrgAffiliation } from '@/domain/orgTaxonomy';
import type { PlatformRole } from '@/domain/rbac';
import type { OwnableAsset } from '@/domain/assetFilters';

export interface AssetViewerContext {
  userId?: string;
  userName?: string;
  affiliation: OrgAffiliation;
  role?: PlatformRole;
}

/**
 * 组织数据权限（MSS 集市 Skill / Agent 等）：
 * - public：不区分登录人领域/区域，全员可见
 * - org（卡片角标「领域」）：仅当资产归属命中观众「本领域或本区域」时可见
 * - private：仅发布方
 *
 * 平台运营（super_admin）旁路全部。
 */
export const ORG_DATA_PERMISSION_ENABLED = true;

/** 平台运营可旁路资产可见性，查看/管理全部 Skill */
export function canBypassAssetVisibility(role?: PlatformRole): boolean {
  return role === 'super_admin';
}

function isAssetPublisher(asset: OwnableAsset, viewer: AssetViewerContext): boolean {
  if (viewer.userId && asset.publisherUserId === viewer.userId) return true;
  if (
    viewer.userName &&
    (asset.publisher === viewer.userName || asset.author === viewer.userName)
  ) {
    return true;
  }
  return false;
}

function assetRegionIds(asset: OwnableAsset): string[] {
  // 勿用 `ownerRegionIds ?? ownerRegionId`：空数组 [] 会挡住单值 ownerRegionId
  if (Array.isArray(asset.ownerRegionIds) && asset.ownerRegionIds.length > 0) {
    return asset.ownerRegionIds;
  }
  return asset.ownerRegionId ? [asset.ownerRegionId] : [];
}

/**
 * 「领域」范围可见：本领域 **或** 本区域命中即可（与侧栏筛选无关，是登录归属权限）。
 * - 资产未声明任何领域/区域：不放行（避免 org 技能被当成全员）
 * - 领域命中：观众 deptIds 与资产 ownerDeptIds 有交集
 * - 区域命中：观众 regionId 落在资产区域列表中（观众无区域=机关岗，不能靠区域命中）
 */
export function matchesAssetOrgScope(asset: OwnableAsset, affiliation: OrgAffiliation): boolean {
  const viewerDepts = affiliation.deptIds ?? [];
  const viewerRegion = affiliation.regionId ?? null;
  const assetDepts = asset.ownerDeptIds ?? [];
  const assetRegions = assetRegionIds(asset);

  if (assetDepts.length === 0 && assetRegions.length === 0) return false;

  const deptHit =
    assetDepts.length > 0 && viewerDepts.some((d) => assetDepts.includes(d));
  const regionHit =
    Boolean(viewerRegion) &&
    assetRegions.length > 0 &&
    assetRegions.includes(viewerRegion as string);

  return deptHit || regionHit;
}

/**
 * 资产可见性：
 * - public：全员（含跨部门/跨区域），角标「公开」
 * - private：仅发布方
 * - org：角标「领域」——按本领域或本区域匹配；发布方可见；超管旁路
 */
export function canViewAsset(asset: OwnableAsset, viewer: AssetViewerContext): boolean {
  if (canBypassAssetVisibility(viewer.role)) return true;

  const vis = (asset.visibility ?? 'public') as AssetVisibility;
  if (vis === 'public') return true;

  if (isAssetPublisher(asset, viewer)) return true;
  if (vis === 'private') return false;

  // org（及未知非 public）
  if (!ORG_DATA_PERMISSION_ENABLED) {
    return true;
  }
  return matchesAssetOrgScope(asset, viewer.affiliation);
}
