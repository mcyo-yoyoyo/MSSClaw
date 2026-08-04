/**
 * MSS 组织与门户内容模型（步骤 0 数据字典）
 *
 * 组织双轴：
 * - NP（HQ Dept）：GTM / MKT / 电商 / 服务 / 渠道 / 零售 / HR / 质运 / 财经
 * - 区域（Region）：中国 / 亚太 / 中东非 / 拉美 / 欧洲 / 欧亚
 *
 * 部门/区域字典可在「组织权限 → 部门区域」中编辑；运行时以 HQ_DEPTS / REGIONS 为准
 *（由 orgTaxonomyStore 同步）。区域与租户解耦：区域仅为标签/筛选轴，不单独成租户。
 */

/** 机关职能 id（可扩展自定义编码） */
export type DeptId = string;

/** 一线区域 id（可扩展自定义编码） */
export type RegionId = string;

export interface OrgUnit {
  id: string;
  label: string;
  short?: string;
}

/** 首页/门户筛选轴 */
export type OrgAxis = 'dept' | 'region';

/**
 * 门户/资产内容类型（步骤 2+ 将逐步落地）
 * skill/tool/agent — 平台内能力
 * external_tool — 外部工具深链登记
 * case/playbook/insight/training/news — 场景化知识地图内容
 */
export type PortalAssetType =
  | 'skill'
  | 'tool'
  | 'agent'
  | 'external_tool'
  | 'case'
  | 'playbook'
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

/** 左栏领域展示序（全部由 UI 置顶；财经等未列入的项排在末尾） */
export const DEPT_DISPLAY_ORDER: DeptId[] = [
  'gtm',
  'mkt',
  'ecommerce',
  'service',
  'channel',
  'retail',
  'hr',
  'quality',
];

export const DEFAULT_HQ_DEPTS: OrgUnit[] = [
  { id: 'gtm', label: 'GTM' },
  { id: 'mkt', label: 'MKT' },
  { id: 'ecommerce', label: '电商' },
  { id: 'service', label: '服务' },
  { id: 'channel', label: '渠道' },
  { id: 'retail', label: '零售' },
  { id: 'hr', label: 'HR' },
  { id: 'quality', label: '质运' },
  { id: 'finance', label: '财经' },
];

/** 机关（HQ）区域 id：无一线区域归属时使用 */
export const HQ_REGION_ID = 'hq';
/** 中国区区域 id */
export const CHINA_REGION_ID = 'china';

export const DEFAULT_REGIONS: OrgUnit[] = [
  { id: HQ_REGION_ID, label: '机关' },
  { id: 'apac', label: '亚太' },
  { id: 'mea', label: '中东非' },
  { id: 'latam', label: '拉美' },
  { id: 'europe', label: '欧洲' },
  { id: 'eurasia', label: '欧亚' },
  { id: CHINA_REGION_ID, label: '中国区' },
];

/** 运行时部门字典（可被 orgTaxonomyStore 原地更新） */
export const HQ_DEPTS: OrgUnit[] = [...DEFAULT_HQ_DEPTS];

/** 运行时区域字典（可被 orgTaxonomyStore 原地更新） */
export const REGIONS: OrgUnit[] = [...DEFAULT_REGIONS];

export const PORTAL_ASSET_TYPE_LABELS: Record<PortalAssetType, string> = {
  skill: 'Skill',
  tool: '工具',
  agent: 'Agent',
  external_tool: '外部工具',
  case: '场景案例',
  playbook: '场景方案',
  insight: '前沿洞察',
  training: '培训课件',
  news: '前沿洞察',
};

export const ASSET_VISIBILITY_LABELS: Record<AssetVisibility, string> = {
  public: '全员可见',
  org: '本组织可见',
  private: '仅发布方',
};

let DEPT_LABEL_MAP: Record<string, string> = Object.fromEntries(
  HQ_DEPTS.map((d) => [d.id, d.label]),
);
let REGION_LABEL_MAP: Record<string, string> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r.label]),
);

function rebuildLabelMaps() {
  DEPT_LABEL_MAP = Object.fromEntries(HQ_DEPTS.map((d) => [d.id, d.label]));
  REGION_LABEL_MAP = Object.fromEntries(REGIONS.map((r) => [r.id, r.label]));
}

/** 同步运行时字典（store 持久化后调用） */
export function setOrgTaxonomy(depts: OrgUnit[], regions: OrgUnit[]) {
  HQ_DEPTS.splice(0, HQ_DEPTS.length, ...depts);
  REGIONS.splice(0, REGIONS.length, ...regions);
  rebuildLabelMaps();
}

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
  const region = aff.regionId ? getRegionLabel(aff.regionId) : '机关';
  return `${depts} · ${region}`;
}

/** 领域选项：按产品指定序（「全部」由 UI 置顶，不在此列） */
export function sortDeptIdsByLabel(ids: DeptId[]): DeptId[] {
  const order = new Map(DEPT_DISPLAY_ORDER.map((id, i) => [id, i]));
  return [...ids].sort((a, b) => {
    const ai = order.has(a) ? order.get(a)! : 1000 + a.charCodeAt(0);
    const bi = order.has(b) ? order.get(b)! : 1000 + b.charCodeAt(0);
    if (ai !== bi) return ai - bi;
    return getDeptLabel(a).localeCompare(getDeptLabel(b), 'zh-CN');
  });
}

/**
 * 区域选项排序：机关强制最前，中国区强制最后，其余按标签拼音。
 * 「全部」由 UI 置顶，不在此列。
 */
export function sortRegionIdsByLabel(ids: RegionId[]): RegionId[] {
  const set = new Set(ids);
  const out: RegionId[] = [];
  if (set.has(HQ_REGION_ID)) out.push(HQ_REGION_ID);
  const mid = ids
    .filter((id) => id !== HQ_REGION_ID && id !== CHINA_REGION_ID)
    .sort((a, b) => getRegionLabel(a).localeCompare(getRegionLabel(b), 'zh-CN'));
  out.push(...mid);
  if (set.has(CHINA_REGION_ID)) out.push(CHINA_REGION_ID);
  return out;
}

/** 资产区域是否命中筛选（机关 = 无一线区域或显式 hq） */
export function regionMatchesSelection(
  ownerRegionId: RegionId | null | undefined,
  selected: RegionId[],
): boolean {
  if (!selected.length) return true;
  return selected.some((id) => {
    if (id === HQ_REGION_ID) return !ownerRegionId || ownerRegionId === HQ_REGION_ID;
    return ownerRegionId === id;
  });
}
