import type { AssetVisibility, OrgAffiliation } from '@/domain/orgTaxonomy';
import type { PlatformRole } from '@/domain/rbac';
import type { OwnableAsset } from '@/domain/assetFilters';

export interface AssetViewerContext {
  userId?: string;
  userName?: string;
  affiliation: OrgAffiliation;
  role?: PlatformRole;
}

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

/**
 * 是否属于资产「所属组织」：
 * - 声明了职能：须与观众职能有交集
 * - 声明了区域：观众有区域时须匹配；观众无区域（总部岗）不挡区域
 * - 未声明职能/区域：不再放行（避免脏缓存导致业务用户看见全站技能）
 */
export function matchesAssetOrgScope(asset: OwnableAsset, affiliation: OrgAffiliation): boolean {
  const viewerDepts = affiliation.deptIds ?? [];
  const viewerRegion = affiliation.regionId ?? null;
  const assetDepts = asset.ownerDeptIds ?? [];
  // 勿用 `ownerRegionIds ?? ownerRegionId`：空数组 [] 会挡住单值 ownerRegionId
  const assetRegions =
    Array.isArray(asset.ownerRegionIds) && asset.ownerRegionIds.length > 0
      ? asset.ownerRegionIds
      : asset.ownerRegionId
        ? [asset.ownerRegionId]
        : [];

  if (assetDepts.length === 0 && assetRegions.length === 0) return false;

  const deptOk =
    assetDepts.length === 0 || viewerDepts.some((d) => assetDepts.includes(d));
  // 资产绑了区域时：观众有区域必须命中；总部岗（无区域）可看各区域组织资产
  const regionOk =
    assetRegions.length === 0 ||
    !viewerRegion ||
    assetRegions.includes(viewerRegion);

  // 观众有职能时，资产若声明了职能则必须命中（禁止「只靠区域」跨职能看见）
  if (viewerDepts.length > 0 && assetDepts.length > 0 && !deptOk) return false;

  return deptOk && regionOk;
}

/**
 * 资产可见性：
 * - public：全员（含跨部门）
 * - private：仅发布方
 * - org：发布方，或所属组织（职能/区域）内成员；缺省按 org
 * - 平台运营旁路全部
 */
export function canViewAsset(asset: OwnableAsset, viewer: AssetViewerContext): boolean {
  if (canBypassAssetVisibility(viewer.role)) return true;

  const vis = (asset.visibility ?? 'org') as AssetVisibility;
  if (vis === 'public') return true;

  if (isAssetPublisher(asset, viewer)) return true;
  if (vis === 'private') return false;

  // org（及未知值）：所属组织内可见，避免跨部门看到未公开资产
  return matchesAssetOrgScope(asset, viewer.affiliation);
}
