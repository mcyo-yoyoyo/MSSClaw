/**
 * MSS 组织与门户内容模型（步骤 0 数据字典）
 *
 * 组织双轴：
 * - NP（HQ Dept）：GTM / MKT / 电商 / 零售 / 服务 / 渠道 / HR / 财经 / 质量与运营
 * - 区域（Region）：中国 / 亚太 / 中东非 / 拉美 / 欧洲 / 欧亚
 *
 * 区域与租户解耦：区域仅为标签/筛选轴，不单独成租户。
 * 外部工具一期以「登记深链 + 元数据」为主。
 */

/** NP（原机关职能） */
export type DeptId =
  | 'gtm'
  | 'mkt'
  | 'ecommerce'
  | 'retail'
  | 'service'
  | 'channel'
  | 'hr'
  | 'finance'
  | 'quality';

/** 一线区域 */
export type RegionId = 'china' | 'apac' | 'mea' | 'latam' | 'europe' | 'eurasia';

/** 首页/门户筛选轴 */
export type OrgAxis = 'dept' | 'region';

/**
 * 门户/资产内容类型（步骤 2+ 将逐步落地）
 * skill/tool/agent — 平台内能力
 * external_tool — 外部工具深链登记
 * case/insight/training/news — 场景化知识地图内容
 */
export type PortalAssetType =
  | 'skill'
  | 'tool'
  | 'agent'
  | 'external_tool'
  | 'case'
  | 'insight'
  | 'training'
  | 'news';

export type AssetSourceType = 'internal' | 'external';
export type AssetVisibility = 'public' | 'org' | 'private';
export type AssetPublishStatus = 'draft' | 'published';

/** 用户组织归属（挂在成员 / Session） */
export interface OrgAffiliation {
  /** 所属机关职能（可多选） */
  deptIds: DeptId[];
  /** 所属一线区域（一线人员必填；机关可空） */
  regionId?: RegionId | null;
}

/**
 * 资产归属与上架元数据（Skill/Tool/Agent/门户内容共用字段约定）
 * 步骤 2 起写入种子与编辑表单；步骤 0 仅定模型。
 */
export interface AssetOwnershipMeta {
  ownerDeptIds?: DeptId[];
  ownerRegionId?: RegionId | null;
  publisher?: string;
  publisherUserId?: string;
  sourceType?: AssetSourceType;
  visibility?: AssetVisibility;
  publishStatus?: AssetPublishStatus;
  /** 外部工具主页 / 深链 */
  homepageUrl?: string;
  scenarioTags?: string[];
}

export const HQ_DEPTS: { id: DeptId; label: string; short?: string }[] = [
  { id: 'gtm', label: 'GTM' },
  { id: 'mkt', label: 'MKT' },
  { id: 'ecommerce', label: '电商' },
  { id: 'retail', label: '零售' },
  { id: 'service', label: '服务' },
  { id: 'channel', label: '渠道' },
  { id: 'hr', label: 'HR' },
  { id: 'finance', label: '财经' },
  { id: 'quality', label: '质量与运营' },
];

export const REGIONS: { id: RegionId; label: string }[] = [
  { id: 'china', label: '中国' },
  { id: 'apac', label: '亚太' },
  { id: 'mea', label: '中东非' },
  { id: 'latam', label: '拉美' },
  { id: 'europe', label: '欧洲' },
  { id: 'eurasia', label: '欧亚' },
];

export const PORTAL_ASSET_TYPE_LABELS: Record<PortalAssetType, string> = {
  skill: 'Skill',
  tool: '工具',
  agent: 'Agent',
  external_tool: '外部工具',
  case: '案例',
  insight: '洞察',
  training: '培训赋能',
  news: '前沿洞察',
};

export const ASSET_VISIBILITY_LABELS: Record<AssetVisibility, string> = {
  public: '全员可见',
  org: '本组织可见',
  private: '仅发布方',
};

const DEPT_LABEL_MAP = Object.fromEntries(HQ_DEPTS.map((d) => [d.id, d.label])) as Record<
  DeptId,
  string
>;
const REGION_LABEL_MAP = Object.fromEntries(REGIONS.map((r) => [r.id, r.label])) as Record<
  RegionId,
  string
>;

export function getDeptLabel(id: DeptId): string {
  return DEPT_LABEL_MAP[id] ?? id;
}

export function getRegionLabel(id: RegionId): string {
  return REGION_LABEL_MAP[id] ?? id;
}

export function isDeptId(value: string): value is DeptId {
  return HQ_DEPTS.some((d) => d.id === value);
}

export function isRegionId(value: string): value is RegionId {
  return REGIONS.some((r) => r.id === value);
}

/** 规范化归属：过滤非法 id，去重 */
export function normalizeOrgAffiliation(
  input?: Partial<OrgAffiliation> | null,
): OrgAffiliation {
  const deptIds = [...new Set((input?.deptIds ?? []).filter(isDeptId))];
  const regionId =
    input?.regionId && isRegionId(input.regionId) ? input.regionId : null;
  return { deptIds, regionId };
}

export function formatOrgAffiliation(aff: OrgAffiliation): string {
  const depts = aff.deptIds.map(getDeptLabel).join('、') || '未指定职能';
  const region = aff.regionId ? getRegionLabel(aff.regionId) : '机关/未挂区域';
  return `${depts} · ${region}`;
}
