import type { AppView, NavSection } from '@/domain/appView';
import { APP_VIEWS } from '@/domain/appView';
import { WORKSPACE_CONFIG_VIEW } from '@/domain/workspaceConfig';
import { PlatformRoleSchema, ROLE_LABELS, type PlatformRole } from '@/domain/rbac';

/** 展示配置页本身：仅平台运营 */
export const PRESENTATION_CONFIG_VIEW = 'presentation' as const satisfies AppView;

export type NavPresetId = 'full' | 'customer' | 'standard' | 'custom';

/**
 * 可配置的侧栏槽位：含 AppView + 业务壳专属「协作空间」（slot id 仍为 warroom）。
 * 协作空间不是独立路由页，而是任务区下的会话分组入口。
 */
export type NavSlotId = AppView | 'warroom';

/**
 * 业务壳可配置槽位：仅「工作平台」相关。
 * 能力配置 / 系统设置属于运营壳，不应出现在业务用户/访客的展示配置里。
 */
export const BUSINESS_SHELL_SLOT_IDS: readonly NavSlotId[] = [
  'home',
  'me',
  'market-external',
  'market-internal',
  'market-projects',
  'ai-brief',
  'ai-tasks',
  'market-tool',
  'task',
  'warroom',
  'messages',
  'ai-map',
] as const;

export function isBusinessShellSlot(slot: NavSlotId): boolean {
  return (BUSINESS_SHELL_SLOT_IDS as readonly string[]).includes(slot);
}

export function isBusinessShellRole(role: PlatformRole): boolean {
  return role === 'business_user' || role === 'viewer';
}

export interface NavPresentationMeta {
  id: NavSlotId;
  label: string;
  subtitle: string;
  icon: string;
  section: NavSection;
  /** 展示配置中不可关闭（超管治理入口） */
  locked?: boolean;
  /** 不在侧栏展示（仍可深链） */
  hiddenFromSidebar?: boolean;
  /** 仅平台运营角色可配置为开启 */
  adminOnly?: boolean;
}

export const NAV_PRESENTATION_META: NavPresentationMeta[] = [
  {
    id: 'home',
    label: '首页',
    subtitle: '入口总览 · 工具货架与场景入口',
    icon: 'fa-house',
    section: 'workspace',
  },
  {
    id: 'me',
    label: '个人中心',
    subtitle: '收藏 · 最近 · 任务回收（标准/完整）',
    icon: 'fa-user',
    section: 'workspace',
    hiddenFromSidebar: true,
  },
  {
    id: 'ai-tasks',
    label: 'AI任务',
    subtitle: '按 Agent / Skill 归档的历史执行 · 完整产品顶栏入口',
    icon: 'fa-robot',
    section: 'workspace',
    hiddenFromSidebar: true,
  },
  {
    id: 'market-external',
    label: '外部工具精选',
    subtitle: '外部 / SaaS 工具货架 · 顶栏入口',
    icon: 'fa-globe',
    section: 'workspace',
    hiddenFromSidebar: true,
  },
  {
    id: 'market-internal',
    label: '公司工具推荐',
    subtitle: '公司办公工具货架 · 顶栏入口',
    icon: 'fa-building',
    section: 'workspace',
    hiddenFromSidebar: true,
  },
  {
    id: 'market-projects',
    label: 'MSS工具集市',
    subtitle: 'MSS 建设集市 · 顶栏入口',
    icon: 'fa-layer-group',
    section: 'workspace',
    hiddenFromSidebar: true,
  },
  {
    id: 'ai-brief',
    label: 'AI快讯',
    subtitle: '每日 AI 产业动态 · 顶栏入口',
    icon: 'fa-newspaper',
    section: 'workspace',
    hiddenFromSidebar: true,
  },
  {
    id: 'market-tool',
    label: '工具详情',
    subtitle: '货架工具详情 · 深链入口',
    icon: 'fa-circle-info',
    section: 'workspace',
    hiddenFromSidebar: true,
  },
  { id: 'task', label: '任务记录', subtitle: '进度 · 结果 · 历史会话（标准/完整）', icon: 'fa-list-check', section: 'workspace' },
  {
    id: 'warroom',
    label: '协作空间',
    subtitle: '多人协作会话 · 成员与 AI 权限（侧栏一级入口）',
    icon: 'fa-comments',
    section: 'workspace',
  },
  {
    id: 'messages',
    label: '我的消息',
    subtitle: '推送通知 · 顶栏铃铛入口',
    icon: 'fa-bell',
    section: 'workspace',
    hiddenFromSidebar: true,
  },
  {
    id: 'ai-map',
    label: '场景案例',
    subtitle: '样板间进阶深潜 · 内容由门户运营上架（业务默认可关）',
    icon: 'fa-map',
    section: 'platform',
    /** 项目详情进阶；配置入口在系统设置 · 门户运营 */
    hiddenFromSidebar: true,
  },
  {
    id: 'approvals',
    label: '审批中心',
    subtitle: '上架 · 更新 · 下架全流程单据',
    icon: 'fa-clipboard-check',
    section: 'platform',
  },
  { id: 'skills', label: '配置Skill', subtitle: '上架 · 挂载 · 导出（运营）', icon: 'fa-cube', section: 'platform' },
  { id: 'agents', label: '配置Agent', subtitle: '上架 · 发布 · 编排（运营）', icon: 'fa-robot', section: 'platform' },
  {
    id: 'agent-studio',
    label: 'Agent Studio',
    subtitle: '已并入配置Agent',
    icon: 'fa-wand-magic-sparkles',
    section: 'platform',
    hiddenFromSidebar: true,
  },
  { id: 'tools', label: '配置工具', subtitle: '连接器 · 外部 API · 上架', icon: 'fa-plug', section: 'platform' },
  { id: 'kb', label: '管理知识', subtitle: '企业文档 · RAG · 溯源治理', icon: 'fa-book-open', section: 'platform' },
  { id: 'memory', label: '管理记忆', subtitle: 'Agent 长期记忆 · Reflection', icon: 'fa-brain', section: 'platform' },
  { id: 'automation', label: '自动化设置', subtitle: '定时 · 告警 · 周报', icon: 'fa-bolt', section: 'platform' },
  { id: 'workflow', label: '工作流设置', subtitle: 'LangGraph · 专家编排', icon: 'fa-diagram-project', section: 'platform' },
  {
    id: 'prompts',
    label: '提示词',
    subtitle: '暂不开放 · 草稿/审批资产库（默认关）',
    icon: 'fa-file-code',
    section: 'platform',
  },
  {
    id: 'cases',
    label: '案例库',
    subtitle: '已并入案例样板间',
    icon: 'fa-lightbulb',
    section: 'platform',
    hiddenFromSidebar: true,
  },
  {
    id: 'portal-ops',
    label: '门户运营',
    subtitle: '场景方案包 · 工具 How to',
    icon: 'fa-newspaper',
    section: 'system',
    locked: true,
    adminOnly: true,
  },
  {
    id: 'model-ops',
    label: '模型配置',
    subtitle: '平台模型目录 · 组织默认 · API 凭证',
    icon: 'fa-microchip',
    section: 'system',
    locked: true,
    adminOnly: true,
  },
  {
    id: 'executions',
    label: '执行历史',
    subtitle: 'Agent/Skill 运行落库记录',
    icon: 'fa-clock-rotate-left',
    section: 'system',
  },
  {
    id: 'admin',
    label: '组织权限',
    subtitle: '成员 · 角色归属标签 · 部门字典（短期不做数据权限）',
    icon: 'fa-shield-halved',
    section: 'system',
    adminOnly: true,
  },
  {
    id: PRESENTATION_CONFIG_VIEW,
    label: '展示配置',
    subtitle: '按角色配置侧栏菜单',
    icon: 'fa-sliders',
    section: 'system',
    locked: true,
    adminOnly: true,
  },
  {
    id: WORKSPACE_CONFIG_VIEW,
    label: '租户配置',
    subtitle: '数据空间启停 · 顶栏租户列表（非资产可见性）',
    icon: 'fa-building',
    section: 'system',
    locked: true,
    adminOnly: true,
  },
];

export const NAV_SLOT_IDS: NavSlotId[] = NAV_PRESENTATION_META.map((m) => m.id);

export const CONFIGURABLE_ROLES: PlatformRole[] = PlatformRoleSchema.options;

export const NAV_PRESET_LABELS: Record<NavPresetId, { title: string; description: string }> = {
  customer: {
    title: 'MVP演示',
    description:
      '适合内网演示与学习：业务逛三货架、下载 Skill/Agent；不开放在线打样、任务记录与 AI 任务。能力开发只配「技能」。',
  },
  standard: {
    title: '标准能力',
    description:
      '在 MVP 上加「能跑」：业务可打样执行并查看任务记录；仍无协作空间与 AI 任务顶栏。超管加开知识库、自动化与租户配置。',
  },
  full: {
    title: '完整产品',
    description:
      '全量开放：业务可用协作空间与 AI 任务；能力开发开放专家/工具/知识/记忆/工作流等完整配置（提示词默认仍关）。',
  },
  custom: {
    title: '自定义',
    description: '不套用三档模板，按角色逐项勾选侧栏与入口；适合特殊试点或灰度。',
  },
};

function allSlots(on: boolean): Record<NavSlotId, boolean> {
  return Object.fromEntries(NAV_SLOT_IDS.map((id) => [id, on])) as Record<NavSlotId, boolean>;
}

function withAdminLocks(base: Record<NavSlotId, boolean>, role: PlatformRole): Record<NavSlotId, boolean> {
  const next = { ...base };
  for (const meta of NAV_PRESENTATION_META) {
    if (meta.adminOnly) {
      next[meta.id] = role === 'super_admin' ? true : false;
    }
  }
  // 展示配置入口不可被关掉
  if (role === 'super_admin') next[PRESENTATION_CONFIG_VIEW] = true;
  return next;
}

/**
 * MVP 菜单矩阵（三方案递增；超管 ≠ 直接完整版）：
 * - 业务用户：工作平台 = 首页 · 三货架（任务记录仅标准/完整）
 * - 只读访客：工作平台 = 首页 · 三货架
 * - 能力开发：工作平台 + 仅「配置技能」（无专家/工具/知识/协作空间；完整产品再开）
 * - 平台运营：专家/技能/工具 + 系统治理项（展示/租户/组织/门户）
 */
function marketSlotsOn(base: Record<NavSlotId, boolean>): Record<NavSlotId, boolean> {
  return {
    ...base,
    me: true,
    'market-external': true,
    'market-internal': true,
    'market-projects': true,
    'ai-brief': true,
    'market-tool': true,
  };
}

function mvpForRole(role: PlatformRole): Record<NavSlotId, boolean> {
  const off = allSlots(false);
  if (role === 'capability_ops') {
    return withAdminLocks(
      marketSlotsOn({
        ...off,
        home: true,
        // 运营需「调用」Skill 进入执行面；业务侧仍关任务记录
        task: true,
        warroom: false,
        messages: true,
        'ai-map': true,
        agents: false,
        skills: true,
        tools: false,
        kb: false,
        executions: true,
        approvals: true,
      }),
      role,
    );
  }
  if (role === 'super_admin') {
    const locked = withAdminLocks(
      marketSlotsOn({
        ...off,
        home: true,
        // 与 warroom / Agent·Skill「调用」对齐；业务用户仍无任务侧栏
        task: true,
        warroom: true,
        messages: true,
        'ai-map': true,
        agents: true,
        skills: true,
        tools: true,
        executions: true,
        approvals: true,
      }),
      role,
    );
    // MVP：弱化租户配置入口（能力保留，标准/完整方案再默认打开）
    return { ...locked, 'workspace-config': false };
  }
  if (role === 'viewer') {
    return withAdminLocks(
      marketSlotsOn({
        ...off,
        home: true,
        task: false,
        warroom: false,
        messages: true,
        'ai-map': true,
      }),
      role,
    );
  }
  // 业务用户：首页 · 三货架；MVP 无任务记录（标准/完整再开）
  return withAdminLocks(
    marketSlotsOn({
      ...off,
      home: true,
      task: false,
      warroom: false,
      messages: true,
      'ai-map': true,
    }),
    role,
  );
}

/**
 * 业务壳硬约束（所有方案）：剥离能力配置/系统设置槽位。
 * 业务用户侧栏只有工作平台；完整能力在运营/超管角色上配置。
 */
export function clampBusinessShellSlots(matrix: RoleNavMatrix): RoleNavMatrix {
  const next = { ...matrix };
  for (const role of ['business_user', 'viewer'] as PlatformRole[]) {
    const row = { ...next[role] };
    for (const id of NAV_SLOT_IDS) {
      if (!isBusinessShellSlot(id)) row[id] = false;
    }
    if (role === 'viewer') {
      row.task = false;
      row.warroom = false;
    }
    next[role] = withAdminLocks(row, role);
  }
  return next;
}

/** MVP/标准方案：业务侧额外关闭协作空间 */
export function clampBusinessMvpSlots(matrix: RoleNavMatrix): RoleNavMatrix {
  const next = clampBusinessShellSlots(matrix);
  next.business_user = { ...next.business_user, warroom: false, 'ai-tasks': false };
  next.viewer = { ...next.viewer, warroom: false, task: false, 'ai-tasks': false };
  // MVP / 标准：全角色关闭 AI任务顶栏（仅完整产品开放）
  next.capability_ops = { ...next.capability_ops, 'ai-tasks': false };
  next.super_admin = { ...next.super_admin, 'ai-tasks': false };
  return next;
}

function standardForRole(role: PlatformRole): Record<NavSlotId, boolean> {
  const base = mvpForRole(role);
  // 标准能力：仅超管加开知识/自动化/租户配置；能力开发仍维持「仅配置技能」
  if (role === 'super_admin') {
    return withAdminLocks(
      { ...base, tools: true, kb: true, automation: true, 'workspace-config': true, task: true },
      role,
    );
  }
  // 业务 / 能力开发：相对 MVP 加回任务记录
  if (role === 'business_user' || role === 'capability_ops') {
    return withAdminLocks({ ...base, task: true }, role);
  }
  return base;
}

/** 配置矩阵是否勾选（展示配置 UI 用；不掺运行时 RBAC） */
export function isSlotConfiguredOn(
  matrix: RoleNavMatrix,
  role: PlatformRole,
  slot: NavSlotId,
): boolean {
  const meta = NAV_PRESENTATION_META.find((m) => m.id === slot);
  if (meta?.adminOnly && role !== 'super_admin') return false;
  return matrix[role]?.[slot] === true;
}

function fullForRole(role: PlatformRole): Record<NavSlotId, boolean> {
  // 业务壳完整版：工作平台可开协作空间 + AI任务顶栏；绝不塞运营配置项
  if (role === 'business_user') {
    return withAdminLocks(
      marketSlotsOn({
        ...allSlots(false),
        home: true,
        task: true,
        'ai-tasks': true,
        warroom: true,
        messages: true,
        'ai-map': true,
      }),
      role,
    );
  }
  if (role === 'viewer') {
    return withAdminLocks(
      marketSlotsOn({
        ...allSlots(false),
        home: true,
        messages: true,
        'ai-map': true,
      }),
      role,
    );
  }
  const on = allSlots(true);
  on.cases = false;
  on['agent-studio'] = false;
  // 提示词中心暂不开放侧栏（代码与路由保留）
  on.prompts = false;
  on['ai-tasks'] = true;
  return withAdminLocks(on, role);
}

export type RoleNavMatrix = Record<PlatformRole, Record<NavSlotId, boolean>>;

export function buildRoleNavPreset(preset: Exclude<NavPresetId, 'custom'>): RoleNavMatrix {
  const builder =
    preset === 'full' ? fullForRole : preset === 'standard' ? standardForRole : mvpForRole;
  const matrix = {
    super_admin: builder('super_admin'),
    capability_ops: builder('capability_ops'),
    business_user: builder('business_user'),
    viewer: builder('viewer'),
  };
  // 任何命名预设都先按壳剥离业务侧运营项；MVP/标准再关协作空间
  if (preset === 'customer' || preset === 'standard') {
    return clampBusinessMvpSlots(matrix);
  }
  return clampBusinessShellSlots(matrix);
}

/** 兼容旧版全局 enabled → 铺到各角色（业务角色默认关掉协作空间） */
export function migrateLegacyEnabled(enabled: Partial<Record<string, boolean>>): RoleNavMatrix {
  const matrix = buildRoleNavPreset('customer');
  for (const role of CONFIGURABLE_ROLES) {
    for (const id of APP_VIEWS) {
      if (typeof enabled[id] === 'boolean') {
        matrix[role][id] = enabled[id]!;
      }
    }
    // 旧配置无 warroom：业务/访客默认关，运营默认开
    if (typeof enabled.warroom !== 'boolean') {
      matrix[role].warroom = role === 'business_user' || role === 'viewer' ? false : true;
    } else {
      matrix[role].warroom = enabled.warroom;
    }
    matrix[role] = withAdminLocks(matrix[role], role);
  }
  return matrix;
}

function navPresetFlags(
  overrides: Partial<Record<AppView, boolean>>,
  defaultEnabled = false,
): Record<AppView, boolean> {
  const base = Object.fromEntries(APP_VIEWS.map((v) => [v, defaultEnabled])) as Record<
    AppView,
    boolean
  >;
  return { ...base, ...overrides };
}

/** @deprecated 仅用于旧 preset 结构兼容；请用 buildRoleNavPreset */
export const NAV_PRESET_ENABLED: Record<Exclude<NavPresetId, 'custom'>, Record<AppView, boolean>> = {
  full: navPresetFlags(
    Object.fromEntries(
      APP_VIEWS.map((v) => [v, v !== 'cases' && v !== 'agent-studio']),
    ) as Partial<Record<AppView, boolean>>,
    true,
  ),
  customer: navPresetFlags({
    home: true,
    me: true,
    'market-external': true,
    'market-internal': true,
    'market-projects': true,
    'ai-brief': true,
    task: true,
    messages: true,
    'ai-map': true,
    skills: true,
    'portal-ops': true,
    'model-ops': true,
    approvals: true,
    admin: true,
  }),
  standard: navPresetFlags({
    home: true,
    me: true,
    'market-external': true,
    'market-internal': true,
    'market-projects': true,
    'ai-brief': true,
    task: true,
    messages: true,
    'ai-map': true,
    skills: true,
    'portal-ops': true,
    'model-ops': true,
    approvals: true,
    admin: true,
  }),
};

export const NAV_FALLBACK_ORDER: AppView[] = [
  'home',
  'me',
  'market-external',
  'market-internal',
  'market-projects',
  'ai-brief',
  'ai-tasks',
  'market-tool',
  'task',
  'messages',
  'ai-map',
  'skills',
  'agents',
  'tools',
  'kb',
  'memory',
  'automation',
  'workflow',
  'prompts',
  'admin',
  PRESENTATION_CONFIG_VIEW,
  WORKSPACE_CONFIG_VIEW,
  'portal-ops',
  'model-ops',
  'approvals',
  'executions',
];

export function getNavMeta(slot: NavSlotId): NavPresentationMeta | undefined {
  return NAV_PRESENTATION_META.find((m) => m.id === slot);
}

export function getNavMetaLabel(slot: NavSlotId | string): string {
  if (slot === 'warroom') return '协作空间';
  return getNavMeta(slot as NavSlotId)?.label ?? ROLE_LABELS[slot as PlatformRole] ?? String(slot);
}

export function isAppViewSlot(slot: NavSlotId): slot is AppView {
  return (APP_VIEWS as readonly string[]).includes(slot);
}
