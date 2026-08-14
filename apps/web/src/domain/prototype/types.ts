/** 与根目录 index.html 设计稿对齐的原始种子类型（单一数据源） */

import type { BusinessScenarioId } from '@/domain/businessScenarios';
import type {
  ExternalToolTypeId,
  ToolRegion,
} from '@/domain/externalToolTaxonomy';
import type {
  AssetSourceType,
  AssetVisibility,
  DeptId,
  RegionId,
} from '@/domain/orgTaxonomy';

export type EfficiencyCategory = 'office' | 'manage' | 'process' | 'experience';

/** @deprecated 请优先使用 DeptId（domain/orgTaxonomy）；保持兼容首页既有命名 */
export type HomeCategory = DeptId;

/** Skill / Tool 共用的归属与上架字段 */
export interface AssetOwnershipFields {
  ownerDeptIds?: DeptId[];
  ownerRegionId?: RegionId | null;
  /** 多区域（历史字段）；与 ownerRegionId 并存时以非空数组为准 */
  ownerRegionIds?: RegionId[];
  publisher?: string;
  publisherUserId?: string;
  sourceType?: AssetSourceType;
  visibility?: AssetVisibility;
  homepageUrl?: string;
  scenarioTags?: string[];
}

export interface PrototypeAgentSeed {
  id: string;
  name: string;
  desc: string;
  category: EfficiencyCategory;
  bizLine: string;
  homeTag: HomeCategory;
  author: string;
  /** 能力上架：通过审批后可供调用（目录可见） */
  published: boolean;
  /**
   * 精选露出：出现在业务「做任务 · 场景专家」。
   * 未设置时回退短名单（营销/知识门面专家）。
   */
  featuredInDoTask?: boolean;
  invokes: number;
  skillIds: string[];
  chatId: string;
  icon: string;
  color: string;
  /**
   * 数字员工形象：系统预设头像 id（见 agentAvatars）
   * 与 avatarUrl 二选一优先；有自定义上传时以 avatarUrl 为准
   */
  avatarPresetId?: string;
  /** 自定义上传头像（data URL 或 https） */
  avatarUrl?: string;
  systemPrompt?: string;
  /** 调用时优先挂载的主 Skill */
  primarySkillId?: string;
  /** 专家中心「调用」演示任务（可覆盖 pack） */
  demoPrompt?: string;
  /** 多 Skill 编排计划步骤 */
  planSteps?: string[];
  /** 归属机关职能（可多选；缺省回退 homeTag） */
  ownerDeptIds?: DeptId[];
  /** 相关一线区域（用于区域轴筛选） */
  ownerRegionIds?: RegionId[];
  publisher?: string;
  publisherUserId?: string;
  sourceType?: AssetSourceType;
  visibility?: AssetVisibility;
  /** 场景地图聚合标签（与 Tool/门户 content 对齐） */
  scenarioTags?: string[];
  /** 业务场景分类（与业务用户 MSS 集市视角对齐；缺省回退技能/静态映射） */
  businessScenarioId?: BusinessScenarioId;
}

export interface PrototypeSkillSeed extends AssetOwnershipFields {
  id: string;
  /**
   * 主展示名（兼容旧数据）——写入时与 nameZh 同步；列表默认展示中文。
   */
  name: string;
  desc: string;
  /** 中文名称（默认展示） */
  nameZh?: string;
  /** 英文名称 */
  nameEn?: string;
  /** 中文描述（默认展示） */
  descZh?: string;
  /** 英文描述 */
  descEn?: string;
  category: EfficiencyCategory;
  command: string;
  author: string;
  version: string;
  connector: string;
  /**
   * 能力上架：通过审批后可供模型/对话调用。
   * 1.0 默认 false；勾选「申请上架可调用」才进审批。
   */
  published: boolean;
  /**
   * 精选露出：出现在「MSS工具集市 · 场景技能」。
   * 未设置时回退静态 HOME_BUSINESS_SKILLS 白名单。
   * @deprecated 语义等同 featuredInMssMarket；保留字段兼容旧数据
   */
  featuredInDoTask?: boolean;
  /**
   * 精选露出到 MSS 场景技能（优先于 featuredInDoTask）。
   */
  featuredInMssMarket?: boolean;
  /** MSS 场景技能所属业务场景（精选露出时用于筛选；缺省回退静态映射表） */
  businessScenarioId?: BusinessScenarioId;
  invokes: number;
  icon: string;
  /** 自定义头像（data URL 或站点相对路径）；GitHub Pages 下相对路径需带仓库前缀 */
  iconUrl?: string;
  /** 列表左边线统一黑色；不再使用多色标识 */
  accentColor?: string;
  /** 业务/运营手打标签 */
  tags: string[];
  /** 模型/启发式识别的搜索关键词（可编辑） */
  searchKeywords?: string[];
  /** 平台对话执行时注入的 Skill 正文（可 run） */
  instructions?: string;
  /** 挂载该 Skill 时的默认执行计划步骤 */
  planSteps?: string[];
  /** 使用须知（前置条件 / 权限 / 注意 / 限制，运营录入） */
  usageNotes?: string;
  /** 落地案例（标题、输入、输出，运营录入） */
  cases?: SkillCaseItem[];
  /** 环境与适配信息 */
  envInfo?: SkillEnvInfo;
  /** 版本清单（完整产品；当前版本仍以 version 字段为准） */
  versions?: SkillVersionRecord[];
  /** 安全扫描结果（对接 IT 后写入；缺省视为未上线） */
  securityScan?: {
    status: 'not_connected' | 'pending' | 'passed' | 'failed';
    reportNote?: string;
    scannedAt?: string;
  };
  /** 审计时间戳（ISO 日期或 YYYY-MM-DD） */
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/** Skill 历史版本行 */
export interface SkillVersionRecord {
  version: string;
  notes?: string;
  publishedAt?: string;
  status?: 'active' | 'retired';
}

/** Skill 案例条目 */
export interface SkillCaseItem {
  title: string;
  input?: string;
  output?: string;
}

/** Skill 环境适配 */
export interface SkillEnvInfo {
  dependencies?: string;
  framework?: string;
  runtimeVersion?: string;
  hardwareNetwork?: string;
}

/**
 * 门户 Tool 资产（含内部连接器元数据 + 外部深链工具）
 * 外部工具：sourceType=external + homepageUrl
 */
export interface PrototypeToolSeed extends AssetOwnershipFields {
  id: string;
  name: string;
  desc: string;
  /** 展示用分类标签 */
  category: 'connector' | 'external' | 'platform';
  author: string;
  /** 能力上架：进入工具目录 / 可被技能挂载 */
  published: boolean;
  /**
   * 精选露出：可出现在对应货架「精选推荐」。
   * 未设置时回退 PLAZA_TOOL_PICKS 静态精选。
   */
  featuredInFindCases?: boolean;
  /** 货架业务场景筛选；缺省回退 toolBusinessScenarios 静态映射 */
  businessScenarioIds?: BusinessScenarioId[];
  /**
   * 上架到哪一业务货架。
   * - external → 外部工具精选
   * - internal → 公司工具推荐
   * - none → 仅配置目录
   * 缺省按 sourceType + 标签（ai-saas / hw-internal）推断。
   */
  marketShelf?: 'external' | 'internal' | 'none';
  /**
   * 外精选卡主标题（应用场景名）。缺省按 AI 能力分类 + 业务场景推断。
   */
  marketTitle?: string;
  invokes: number;
  icon: string;
  /** 外精选 / 公司工具 Logo（可上传；缺省可由官网 URL 初始化 favicon） */
  logoUrl?: string;
  tags: string[];
  /** 内部连接器类型提示 */
  connectorType?: string;
  /** 外部目录：海外 / 国内 */
  region?: ToolRegion;
  /** 外部目录：工具类型（Demo 对齐） */
  toolTypeId?: ExternalToolTypeId | string;
  /** 卡片核心作用（优先于 desc 展示） */
  cardSummary?: string;
  /** 厂商 / 公司 */
  company?: string;
  /** 帮助文档 */
  docsUrl?: string;
  /** 官方介绍或演示 */
  mediaUrl?: string;
  /** 官方截图 */
  screenshotUrl?: string;
  /** 公开版本文案 */
  versionLabel?: string;
  /** 最适合场景 */
  bestFor?: string;
  /** 产品详细介绍 */
  productIntro?: string;
}

export interface PrototypeKbCollection {
  id: string;
  name: string;
  icon: string;
  desc?: string;
}

export interface PrototypeKbDocument {
  id: string;
  title: string;
  desc: string;
  collection: string;
  type: string;
  size: string;
  pages: number;
  clearance: string;
  indexed: boolean;
  chunks: number;
  tags: string[];
  updatedAt: string;
  author: string;
  chunkTexts?: string[];
}

export interface PrototypeAutomation {
  id: string;
  name: string;
  desc: string;
  agentId: string;
  skillIds: string[];
  schedule: string;
  enabled: boolean;
  lastRun: string;
}

export interface PrototypeWorkspace {
  id: string;
  label: string;
  short: string;
}
