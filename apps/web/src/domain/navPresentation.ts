import type { AppView, NavSection } from '@/domain/appView';
import { APP_VIEWS } from '@/domain/appView';
import { WORKSPACE_CONFIG_VIEW } from '@/domain/workspaceConfig';
import { PlatformRoleSchema, ROLE_LABELS, type PlatformRole } from '@/domain/rbac';

/** 展示配置页本身：仅超级管理员 */
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
  /** 仅超级管理员角色可配置为开启 */
  adminOnly?: boolean;
}

export const NAV_PRESENTATION_META: NavPresentationMeta[] = [
  {
    id: 'home',
    label: '首页',
    subtitle: '业务：找案例 · 做任务；运营：预览广场（学/干）',
    icon: 'fa-house',
    section: 'workspace',
  },
  { id: 'task', label: '任务记录', subtitle: '进度 · 结果 · 历史会话', icon: 'fa-list-check', section: 'workspace' },
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
    label: '案例样板间',
    subtitle: '完整案例库 · 由找案例/场景卡进入',
    icon: 'fa-map',
    section: 'platform',
    hiddenFromSidebar: true,
  },
  { id: 'agents', label: '配置专家', subtitle: '上架 · 发布 · 编排（运营）', icon: 'fa-robot', section: 'platform' },
  {
    id: 'agent-studio',
    label: 'Agent Studio',
    subtitle: '已并入配置专家',
    icon: 'fa-wand-magic-sparkles',
    section: 'platform',
    hiddenFromSidebar: true,
  },
  { id: 'skills', label: '配置技能', subtitle: '上架 · 挂载 · 导出（运营）', icon: 'fa-cube', section: 'platform' },
  { id: 'tools', label: '配置工具', subtitle: '连接器 · 外部 API · 上架', icon: 'fa-plug', section: 'platform' },
  { id: 'kb', label: '管理知识', subtitle: '企业文档 · RAG · 溯源治理', icon: 'fa-book-open', section: 'platform' },
  { id: 'memory', label: '管理记忆', subtitle: 'Agent 长期记忆 · Reflection', icon: 'fa-brain', section: 'platform' },
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
  { id: 'automation', label: '自动化设置', subtitle: '定时 · 告警 · 周报', icon: 'fa-bolt', section: 'platform' },
  { id: 'workflow', label: '工作流设置', subtitle: 'LangGraph · 专家编排', icon: 'fa-diagram-project', section: 'platform' },
  {
    id: 'portal-ops',
    label: '门户运营',
    subtitle: '前沿洞察与培训赋能上架',
    icon: 'fa-newspaper',
    section: 'system',
    locked: true,
    adminOnly: true,
  },
  {
    id: 'admin',
    label: '组织权限',
    subtitle: '组织 · 部门 · 角色 · 成员治理',
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
    subtitle: '数据空间 · 租户（仅超级管理员）',
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
      '业务=找案例/做任务/任务记录；运营=专家/技能/工具；超管=+组织/展示/租户/门户（非完整能力集）',
  },
  standard: {
    title: '标准能力',
    description: '在 MVP 上为运营/超管增加管理知识 · 自动化设置（业务仍无协作空间）',
  },
  full: {
    title: '完整产品',
    description:
      '业务可开协作空间；运营/超管开放记忆/工作流等完整能力配置（提示词仍默认关）',
  },
  custom: {
    title: '自定义',
    description: '按角色勾选：业务/访客只配工作平台；运营/超管配能力配置与系统设置',
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
 * - 业务用户：工作平台 = 找案例 · 做任务 · 任务记录（协作空间关）
 * - 只读访客：工作平台 = 找案例
 * - 能力运营：工作平台 + 配置专家/技能/工具
 * - 超级管理员：同能力运营 MVP + 系统治理项（展示/租户/组织/门户）
 */
function mvpForRole(role: PlatformRole): Record<NavSlotId, boolean> {
  const off = allSlots(false);
  if (role === 'super_admin' || role === 'capability_ops') {
    return withAdminLocks(
      {
        ...off,
        home: true,
        task: true,
        warroom: true,
        messages: true,
        'ai-map': true,
        agents: true,
        skills: true,
        tools: true,
      },
      role,
    );
  }
  if (role === 'viewer') {
    return withAdminLocks(
      {
        ...off,
        home: true,
        task: false,
        warroom: false,
        messages: true,
        'ai-map': true,
      },
      role,
    );
  }
  // 业务用户：找案例 · 做任务 · 任务记录；无协作空间
  return withAdminLocks(
    {
      ...off,
      home: true,
      task: true,
      warroom: false,
      messages: true,
      'ai-map': true,
    },
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
  next.business_user = { ...next.business_user, warroom: false };
  next.viewer = { ...next.viewer, warroom: false, task: false };
  return next;
}

function standardForRole(role: PlatformRole): Record<NavSlotId, boolean> {
  const base = mvpForRole(role);
  if (role === 'super_admin' || role === 'capability_ops') {
    return withAdminLocks(
      { ...base, tools: true, kb: true, automation: true },
      role,
    );
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
  // 业务壳完整版：工作平台可开协作空间，绝不塞运营配置项
  if (role === 'business_user') {
    return withAdminLocks(
      {
        ...allSlots(false),
        home: true,
        task: true,
        warroom: true,
        messages: true,
        'ai-map': true,
      },
      role,
    );
  }
  if (role === 'viewer') {
    return withAdminLocks(
      {
        ...allSlots(false),
        home: true,
        messages: true,
        'ai-map': true,
      },
      role,
    );
  }
  const on = allSlots(true);
  on.cases = false;
  on['agent-studio'] = false;
  // 提示词中心暂不开放侧栏（代码与路由保留）
  on.prompts = false;
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

/** @deprecated 仅用于旧 preset 结构兼容；请用 buildRoleNavPreset */
export const NAV_PRESET_ENABLED: Record<Exclude<NavPresetId, 'custom'>, Record<AppView, boolean>> = {
  full: Object.fromEntries(APP_VIEWS.map((v) => [v, v !== 'cases' && v !== 'agent-studio'])) as Record<
    AppView,
    boolean
  >,
  customer: {
    ...Object.fromEntries(APP_VIEWS.map((v) => [v, false])),
    home: true,
    task: true,
    messages: true,
    'ai-map': true,
    agents: true,
    skills: true,
    'portal-ops': true,
    admin: true,
  } as Record<AppView, boolean>,
  standard: {
    ...Object.fromEntries(APP_VIEWS.map((v) => [v, false])),
    home: true,
    task: true,
    messages: true,
    'ai-map': true,
    agents: true,
    skills: true,
    tools: true,
    kb: true,
    automation: true,
    'portal-ops': true,
    admin: true,
  } as Record<AppView, boolean>,
};

export const NAV_FALLBACK_ORDER: AppView[] = [
  'home',
  'task',
  'messages',
  'ai-map',
  'agents',
  'skills',
  'kb',
  'tools',
  'automation',
  'workflow',
  'memory',
  'prompts',
  'admin',
  PRESENTATION_CONFIG_VIEW,
  WORKSPACE_CONFIG_VIEW,
  'portal-ops',
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
