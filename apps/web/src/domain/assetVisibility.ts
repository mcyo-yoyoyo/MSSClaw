import type { AssetVisibility, OrgAffiliation } from '@/domain/orgTaxonomy';
import type { PlatformRole } from '@/domain/rbac';
import type { OwnableAsset } from '@/domain/assetFilters';

export interface AssetViewerContext {
  userId?: string;
  userName?: string;
  affiliation: OrgAffiliation;
  role?: PlatformRole;
}

/** 运营侧可看全部资产（演示够用：超管 + 工作区管理员） */
export function canBypassAssetVisibility(role?: PlatformRole): boolean {
  return role === 'super_admin' || role === 'workspace_admin';
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
 * 资产可见性：
 * - public：全员
 * - private：仅发布方
 * - org：有区域则同区域；否则同职能；发布方始终可见
 * - 超管 / Workspace Admin 旁路
 */
export function canViewAsset(asset: OwnableAsset, viewer: AssetViewerContext): boolean {
  if (canBypassAssetVisibility(viewer.role)) return true;

  const vis = (asset.visibility ?? 'public') as AssetVisibility;
  if (vis === 'public') return true;

  if (isAssetPublisher(asset, viewer)) return true;
  if (vis === 'private') return false;

  // org
  const viewerDepts = viewer.affiliation.deptIds ?? [];
  const viewerRegion = viewer.affiliation.regionId ?? null;
  const assetDepts = asset.ownerDeptIds ?? [];
  const assetRegions =
    asset.ownerRegionIds ?? (asset.ownerRegionId ? [asset.ownerRegionId] : []);

  // 区域资产：必须以区域匹配（避免跨区因职能重叠误见）
  if (assetRegions.length > 0) {
    return Boolean(viewerRegion && assetRegions.includes(viewerRegion));
  }
  // 机关资产：职能有交集
  if (assetDepts.length > 0) {
    return viewerDepts.some((d) => assetDepts.includes(d));
  }
  return false;
}
