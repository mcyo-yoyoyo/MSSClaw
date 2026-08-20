import type { AssetSourceType, DeptId, OrgAffiliation, RegionId } from '@/domain/orgTaxonomy';
import type { PlatformRole } from '@/domain/rbac';
import { canViewAsset } from '@/domain/assetVisibility';

export type AssetScopeFilter =
  | 'all'
  | 'mine'
  | 'external'
  | 'internal'
  /** Skill 可见范围筛选（与创建技能口径对齐） */
  | 'visibility_org'
  | 'visibility_public'
  | 'visibility_private';
export type DeptFilter = DeptId | 'all';
export type RegionFilter = RegionId | 'all';
/** 提效场景：办公 / 管理 / 流程（不含体验，与产品口径对齐） */
export type EfficiencyFilter = 'all' | 'office' | 'manage' | 'process';

export const EFFICIENCY_FILTER_OPTIONS: { id: EfficiencyFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'manage', label: '管理提效' },
  { id: 'process', label: '流程提效' },
  { id: 'office', label: '办公提效' },
];

export interface OwnableAsset {
  author?: string;
  publisher?: string;
  publisherUserId?: string;
  sourceType?: AssetSourceType;
  ownerDeptIds?: DeptId[];
  ownerRegionId?: RegionId | null;
  ownerRegionIds?: RegionId[];
  visibility?: string;
}

export interface AssetFilterInput {
  deptFilter: DeptFilter;
  regionFilter: RegionFilter;
  scopeFilter: AssetScopeFilter;
  currentUserId?: string;
  currentUserName?: string;
  affiliation?: OrgAffiliation;
  role?: PlatformRole;
  /** 默认 true：列表始终套可见性 */
  enforceVisibility?: boolean;
}

/** Skill / Tool / Agent 共用的组织与范围筛选（含可见性） */
export function matchesAssetOrgFilters(asset: OwnableAsset, input: AssetFilterInput): boolean {
  const {
    deptFilter,
    regionFilter,
    scopeFilter,
    currentUserId,
    currentUserName,
    affiliation,
    role,
    enforceVisibility = true,
  } = input;
  const source = asset.sourceType ?? 'internal';

  if (enforceVisibility && affiliation) {
    if (
      !canViewAsset(asset, {
        userId: currentUserId,
        userName: currentUserName,
        affiliation,
        role,
      })
    ) {
      return false;
    }
  }

  if (scopeFilter === 'external' && source !== 'external') return false;
  if (scopeFilter === 'internal' && source === 'external') return false;
  if (scopeFilter === 'mine') {
    const mineById = currentUserId && asset.publisherUserId === currentUserId;
    const mineByName =
      currentUserName &&
      (asset.publisher === currentUserName || asset.author === currentUserName);
    if (!mineById && !mineByName) return false;
  }
  const visibility = asset.visibility ?? 'org';
  if (scopeFilter === 'visibility_org' && visibility !== 'org') return false;
  if (scopeFilter === 'visibility_public' && visibility !== 'public') return false;
  if (scopeFilter === 'visibility_private' && visibility !== 'private') return false;

  if (deptFilter !== 'all') {
    const depts = asset.ownerDeptIds ?? [];
    if (depts.length > 0 && !depts.includes(deptFilter)) return false;
  }

  if (regionFilter !== 'all') {
    const regions =
      Array.isArray(asset.ownerRegionIds) && asset.ownerRegionIds.length > 0
        ? asset.ownerRegionIds
        : asset.ownerRegionId
          ? [asset.ownerRegionId]
          : [];
    if (regions.length > 0 && !regions.includes(regionFilter)) return false;
  }

  return true;
}

export const ASSET_SCOPE_OPTIONS: { id: AssetScopeFilter; label: string }[] = [
  { id: 'all', label: '全部范围' },
  { id: 'mine', label: '我构建的' },
  { id: 'internal', label: '内部能力' },
  { id: 'external', label: '外部工具' },
];

/** 配置技能页：范围与创建技能可见口径对齐 */
export const SKILL_VISIBILITY_SCOPE_OPTIONS: { id: AssetScopeFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'mine', label: '我自己' },
  { id: 'visibility_org', label: '部门可见' },
  { id: 'visibility_public', label: '全部门可见' },
];
