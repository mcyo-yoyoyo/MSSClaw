import type { AppView, NavSection } from '@/domain/appView';
import { APP_VIEWS } from '@/domain/appView';
import { WORKSPACE_CONFIG_VIEW } from '@/domain/workspaceConfig';
import { PlatformRoleSchema, ROLE_LABELS, type PlatformRole } from '@/domain/rbac';

/** 展示配置页本身：仅超级管理员 */
export const PRESENTATION_CONFIG_VIEW = 'presentation' as const satisfies AppView;

export type NavPresetId = 'full' | 'customer' | 'standard' | 'custom';

/**
 * 可配置的侧栏槽位：含 AppView + 业务壳专属「群聊」。
 * 群聊不是独立路由页，而是任务区下的会话分组入口。
 */
export type NavSlotId = AppView | 'warroom';

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
  { id: 'home', label: '逛广场', subtitle: '找场景 · 开工（AI任务 / AI广场）', icon: 'fa-house', section: 'workspace' },
  { id: 'task', label: '做任务', subtitle: '计划确认 · 执行 · 交付物', icon: 'fa-list-check', section: 'workspace' },
  {
    id: 'warroom',
    label: '群聊',
    subtitle: '协作室 · 群组会话（业务侧栏一级入口）',
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
    label: '学案例',
    subtitle: '样板间 · 可复制业务场景包',
    icon: 'fa-map',
    section: 'platform',
  },
  { id: 'agents', label: '专家', subtitle: '配置 · 发布 · 调用', icon: 'fa-robot', section: 'platform' },
  {
    id: 'agent-studio',
    label: 'Agent Studio',
    subtitle: '已并入专家页配置',
    icon: 'fa-wand-magic-sparkles',
    section: 'platform',
    hiddenFromSidebar: true,
  },
  { id: 'skills', label: '技能', subtitle: '能力资产 · 挂载编排', icon: 'fa-cube', section: 'platform' },
  { id: 'tools', label: '工具', subtitle: '连接器 · 外部 API', icon: 'fa-plug', section: 'platform' },
  { id: 'memory', label: '记忆', subtitle: 'Agent 长期记忆 · Reflection', icon: 'fa-brain', section: 'platform' },
  { id: 'kb', label: '知识', subtitle: '企业文档 · RAG · 溯源', icon: 'fa-book-open', section: 'platform' },
  { id: 'prompts', label: '提示词', subtitle: '版本 · 审批 · 生命周期', icon: 'fa-file-code', section: 'platform' },
  {
    id: 'cases',
    label: '案例库',
    subtitle: '已并入案例样板间',
    icon: 'fa-lightbulb',
    section: 'platform',
    hiddenFromSidebar: true,
  },
  { id: 'automation', label: '自动化', subtitle: '定时 · 告警 · 周报', icon: 'fa-bolt', section: 'ops' },
  { id: 'workflow', label: '工作流', subtitle: 'LangGraph · 专家编排', icon: 'fa-diagram-project', section: 'ops' },
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
    description: '按角色裁剪：业务侧无群聊；运营侧保留专家/技能；治理仅超管',
  },
  standard: {
    title: '标准能力',
    description: 'MVP 基础上为运营角色增加工具 · 知识 · 自动化',
  },
  full: {
    title: '完整产品',
    description: '各角色开放完整能力菜单（治理入口仍仅超管）',
  },
  custom: {
    title: '自定义',
    description: '按角色逐项勾选侧栏菜单',
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

/** MVP：业务/访客无群聊；运营有任务+群聊+专家技能 */
function mvpForRole(role: PlatformRole): Record<NavSlotId, boolean> {
  const off = allSlots(false);
  if (role === 'super_admin') {
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
        admin: true,
        'portal-ops': true,
        presentation: true,
        'workspace-config': true,
      },
      role,
    );
  }
  if (role === 'capability_ops') {
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
      },
      role,
    );
  }
  if (role === 'viewer') {
    // 只读：可看广场发现/案例/已有任务结果；无群聊、不强调执行入口
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
  // 业务用户：广场 · 任务 · 案例 · 消息；无群聊
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

function standardForRole(role: PlatformRole): Record<NavSlotId, boolean> {
  const base = mvpForRole(role);
  if (role === 'super_admin' || role === 'capability_ops') {
    return { ...base, tools: true, kb: true, automation: true };
  }
  return base;
}

function fullForRole(role: PlatformRole): Record<NavSlotId, boolean> {
  const on = allSlots(true);
  on.cases = false;
  on['agent-studio'] = false;
  return withAdminLocks(on, role);
}

export type RoleNavMatrix = Record<PlatformRole, Record<NavSlotId, boolean>>;

export function buildRoleNavPreset(preset: Exclude<NavPresetId, 'custom'>): RoleNavMatrix {
  const builder =
    preset === 'full' ? fullForRole : preset === 'standard' ? standardForRole : mvpForRole;
  return {
    super_admin: builder('super_admin'),
    capability_ops: builder('capability_ops'),
    business_user: builder('business_user'),
    viewer: builder('viewer'),
  };
}

/** 兼容旧版全局 enabled → 铺到各角色（业务角色默认关掉群聊） */
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
  if (slot === 'warroom') return '群聊';
  return getNavMeta(slot as NavSlotId)?.label ?? ROLE_LABELS[slot as PlatformRole] ?? String(slot);
}

export function isAppViewSlot(slot: NavSlotId): slot is AppView {
  return (APP_VIEWS as readonly string[]).includes(slot);
}
