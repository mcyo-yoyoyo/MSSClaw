import type { AppView, NavSection } from '@/domain/appView';
import { APP_VIEWS } from '@/domain/appView';
import { WORKSPACE_CONFIG_VIEW } from '@/domain/workspaceConfig';

/** 展示配置页本身始终可用，便于随时恢复完整菜单 */
export const PRESENTATION_CONFIG_VIEW = 'presentation' as const satisfies AppView;

export type NavPresetId = 'full' | 'customer' | 'standard' | 'custom';

export interface NavPresentationMeta {
  id: AppView;
  label: string;
  subtitle: string;
  icon: string;
  section: NavSection;
  /** 不可在配置页关闭（展示配置入口） */
  locked?: boolean;
  /** 不在侧栏展示（仍可深链重定向） */
  hiddenFromSidebar?: boolean;
}

export const NAV_PRESENTATION_META: NavPresentationMeta[] = [
  { id: 'home', label: '智能助理', subtitle: '输入即开始 · 工作台深入执行', icon: 'fa-comment-dots', section: 'workspace' },
  { id: 'task', label: '任务中心', subtitle: '当前会话 · 计划确认 · 交付物', icon: 'fa-list-check', section: 'workspace' },
  {
    id: 'ai-map',
    label: '案例',
    subtitle: 'AI 样板间 · 场景案例与能力组合沉淀',
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
  { id: 'prompts', label: '提示词', subtitle: '版本 · 审批 · 生命周期', icon: 'fa-file-code', section: 'platform' },
  { id: 'memory', label: '记忆', subtitle: 'Agent 长期记忆 · Reflection', icon: 'fa-brain', section: 'platform' },
  { id: 'kb', label: '知识库', subtitle: '企业文档 · RAG · 溯源', icon: 'fa-book-open', section: 'platform' },
  {
    id: 'cases',
    label: '案例库',
    subtitle: '已并入案例样板间',
    icon: 'fa-lightbulb',
    section: 'platform',
    hiddenFromSidebar: true,
  },
  { id: 'automation', label: '自动化', subtitle: '定时 · 告警 · 周报', icon: 'fa-bolt', section: 'ops' },
  { id: 'workflow', label: 'Workflow 画布', subtitle: 'LangGraph · 专家编排', icon: 'fa-diagram-project', section: 'ops' },
  { id: 'admin', label: '组织权限', subtitle: '组织 · 部门 · 角色 · 成员治理', icon: 'fa-shield-halved', section: 'system' },
  {
    id: PRESENTATION_CONFIG_VIEW,
    label: '展示配置',
    subtitle: '菜单可见性 · 客户演示方案',
    icon: 'fa-sliders',
    section: 'system',
    locked: true,
  },
  {
    id: WORKSPACE_CONFIG_VIEW,
    label: '组织与租户',
    subtitle: '租户 · 组织架构 · 部门与区域（仅系统管理员）',
    icon: 'fa-building',
    section: 'system',
    locked: true,
  },
  {
    id: 'portal-ops',
    label: '门户运营',
    subtitle: '前沿洞察与培训赋能上架 · 案例归案例样板间',
    icon: 'fa-newspaper',
    section: 'system',
    locked: true,
  },
];

export const NAV_PRESET_LABELS: Record<NavPresetId, { title: string; description: string }> = {
  full: {
    title: '完整产品',
    description: '全部菜单与专家平台页面，适合内部研发与运营',
  },
  customer: {
    title: '客户演示',
    description: '智能助理 + 场景地图 + 任务 + Agent + 知识库，便于对外讲解核心价值',
  },
  standard: {
    title: '标准能力',
    description:
      '智能助理 · 任务中心 · 场景地图（样板间）· Agent/Skill/Tool · 知识库 · 自动化；系统菜单默认隐藏',
  },
  custom: {
    title: '自定义',
    description: '逐项勾选侧栏菜单，灵活组合展示范围',
  },
};

const ALL_TRUE = Object.fromEntries(APP_VIEWS.map((v) => [v, true])) as Record<AppView, boolean>;
const ALL_FALSE = Object.fromEntries(APP_VIEWS.map((v) => [v, false])) as Record<AppView, boolean>;

export const NAV_PRESET_ENABLED: Record<Exclude<NavPresetId, 'custom'>, Record<AppView, boolean>> = {
  full: { ...ALL_TRUE, cases: false, 'agent-studio': false },
  customer: {
    ...ALL_TRUE,
    'agent-studio': false,
    skills: false,
    tools: false,
    prompts: false,
    memory: false,
    cases: false,
    automation: false,
    workflow: false,
    admin: false,
    presentation: true,
    'workspace-config': true,
    'portal-ops': true,
  },
  /** 标准能力：核心工作平台 + 能力沉淀；系统菜单全部关闭 */
  standard: {
    ...ALL_FALSE,
    home: true,
    task: true,
    'ai-map': true,
    agents: true,
    skills: true,
    tools: true,
    kb: true,
    cases: false,
    automation: true,
  },
};

/** 侧栏跳转优先级（不可访问时回退） */
export const NAV_FALLBACK_ORDER: AppView[] = [
  'home',
  'task',
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

export function getNavMeta(view: AppView): NavPresentationMeta | undefined {
  return NAV_PRESENTATION_META.find((m) => m.id === view);
}

export function getNavMetaLabel(view: AppView): string {
  return getNavMeta(view)?.label ?? view;
}
