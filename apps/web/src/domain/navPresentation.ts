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
}

export const NAV_PRESENTATION_META: NavPresentationMeta[] = [
  { id: 'home', label: '智能助理', subtitle: '意图输入 · 提交进任务中心', icon: 'fa-comment-dots', section: 'workspace' },
  { id: 'task', label: '任务中心', subtitle: '计划确认 · 对话 · 交付物', icon: 'fa-list-check', section: 'workspace' },
  { id: 'agents', label: 'Agent 中心', subtitle: '配置 · 发布 · 调用', icon: 'fa-robot', section: 'platform' },
  { id: 'agent-studio', label: 'Agent Studio', subtitle: '专家编排 · Persona · Skill 绑定', icon: 'fa-wand-magic-sparkles', section: 'platform' },
  { id: 'skills', label: 'Skill 中心', subtitle: '能力资产 · 挂载编排', icon: 'fa-cube', section: 'platform' },
  { id: 'tools', label: 'Tool 中心', subtitle: '连接器 · 外部 API', icon: 'fa-plug', section: 'platform' },
  { id: 'prompts', label: 'Prompt 中心', subtitle: '版本 · 审批 · 生命周期', icon: 'fa-file-code', section: 'platform' },
  { id: 'memory', label: 'Memory 中心', subtitle: 'Agent 长期记忆 · Reflection', icon: 'fa-brain', section: 'platform' },
  { id: 'kb', label: '知识库', subtitle: '企业文档 · RAG · 溯源', icon: 'fa-book-open', section: 'platform' },
  { id: 'automation', label: '自动化编排', subtitle: '定时 · 告警 · 周报', icon: 'fa-bolt', section: 'ops' },
  { id: 'workflow', label: 'Workflow 画布', subtitle: 'LangGraph · 专家编排', icon: 'fa-diagram-project', section: 'ops' },
  { id: 'admin', label: '权限管理', subtitle: 'RBAC 矩阵 · 企业治理', icon: 'fa-shield-halved', section: 'system' },
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
    label: '租户配置',
    subtitle: '添加 / 删除租户 · 名称 · 语言 · 可见性（仅系统管理员）',
    icon: 'fa-building',
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
    description: '智能助理 + 任务 + Agent + 知识库，便于对外讲解核心价值',
  },
  standard: {
    title: '标准能力',
    description: '工作台 + 主要能力中心，隐藏专家 Studio 与底层资产页',
  },
  custom: {
    title: '自定义',
    description: '逐项勾选侧栏菜单，灵活组合展示范围',
  },
};

const ALL_TRUE = Object.fromEntries(APP_VIEWS.map((v) => [v, true])) as Record<AppView, boolean>;

export const NAV_PRESET_ENABLED: Record<Exclude<NavPresetId, 'custom'>, Record<AppView, boolean>> = {
  full: { ...ALL_TRUE },
  customer: {
    ...ALL_TRUE,
    'agent-studio': false,
    skills: false,
    tools: false,
    prompts: false,
    memory: false,
    automation: false,
    workflow: false,
    admin: false,
    presentation: true,
    'workspace-config': true,
  },
  standard: {
    ...ALL_TRUE,
    'agent-studio': false,
    tools: false,
    prompts: false,
    memory: false,
    workflow: false,
    admin: false,
    presentation: true,
    'workspace-config': true,
  },
};

/** 侧栏跳转优先级（不可访问时回退） */
export const NAV_FALLBACK_ORDER: AppView[] = [
  'home',
  'task',
  'agents',
  'skills',
  'kb',
  'automation',
  'workflow',
  'tools',
  'memory',
  'prompts',
  'agent-studio',
  'admin',
  PRESENTATION_CONFIG_VIEW,
  WORKSPACE_CONFIG_VIEW,
];

export function getNavMeta(view: AppView): NavPresentationMeta | undefined {
  return NAV_PRESENTATION_META.find((m) => m.id === view);
}

export function getNavMetaLabel(view: AppView): string {
  return getNavMeta(view)?.label ?? view;
}
