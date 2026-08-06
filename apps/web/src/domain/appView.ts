export const APP_VIEWS = [
  'home',
  'market-external',
  'market-internal',
  'market-projects',
  'ai-brief',
  'market-tool',
  'ai-map',
  'task',
  'messages',
  'agents',
  'agent-studio',
  'skills',
  'kb',
  'cases',
  'automation',
  'workflow',
  'tools',
  'memory',
  'prompts',
  'admin',
  'presentation',
  'workspace-config',
  'portal-ops',
] as const;
export type AppView = (typeof APP_VIEWS)[number];

/** Views that mount expert platform pages (iteration 9) */
export const PLATFORM_VIEWS = ['agent-studio', 'workflow', 'tools', 'memory', 'prompts', 'admin'] as const;
export type PlatformView = (typeof PLATFORM_VIEWS)[number];

export function isPlatformView(view: AppView): view is PlatformView {
  return (PLATFORM_VIEWS as readonly string[]).includes(view);
}

export const NAV_SECTIONS = ['workspace', 'platform', 'ops', 'system'] as const;
export type NavSection = (typeof NAV_SECTIONS)[number];

export interface AppViewNavItem {
  id: AppView;
  label: string;
  subtitle: string;
  icon: string;
  section: NavSection;
}

export const APP_VIEW_NAV: AppViewNavItem[] = [
  {
    id: 'home',
    label: '首页',
    subtitle: '入口总览 · 最近使用（最近任务见标准/完整）',
    icon: 'fa-house',
    section: 'workspace',
  },
  { id: 'task', label: '任务记录', subtitle: '进度 · 结果 · 历史会话（标准/完整）', icon: 'fa-list-check', section: 'workspace' },
  {
    id: 'ai-map',
    label: '场景案例',
    subtitle: '样板间进阶 · 内容由门户运营上架',
    icon: 'fa-map',
    section: 'platform',
  },
  { id: 'skills', label: '配置技能', subtitle: '上架 · 挂载 · 导出（运营）', icon: 'fa-cube', section: 'platform' },
  { id: 'agents', label: '配置专家', subtitle: '上架 · 发布 · 编排（运营）', icon: 'fa-robot', section: 'platform' },
  { id: 'tools', label: '配置工具', subtitle: '连接器 · 外部 API · 上架', icon: 'fa-plug', section: 'platform' },
  { id: 'kb', label: '管理知识', subtitle: '企业文档 · RAG · 溯源治理', icon: 'fa-book-open', section: 'platform' },
  { id: 'memory', label: '管理记忆', subtitle: 'Agent 长期记忆 · Reflection', icon: 'fa-brain', section: 'platform' },
  { id: 'automation', label: '自动化设置', subtitle: '定时 · 告警 · 周报', icon: 'fa-bolt', section: 'platform' },
  { id: 'workflow', label: '工作流设置', subtitle: 'LangGraph · 专家编排', icon: 'fa-diagram-project', section: 'platform' },
  { id: 'prompts', label: '提示词', subtitle: '暂不开放 · 草稿/审批资产库（保留）', icon: 'fa-file-code', section: 'platform' },
];

/**
 * 顶栏「管理后台」下拉顺序；侧栏能力配置 / 系统设置内项与之对齐。
 * （提示词等未进下拉的项排在同段末尾）
 */
export const ADMIN_MENU_VIEWS = [
  'portal-ops',
  'skills',
  'agents',
  'tools',
  'kb',
  'memory',
  'automation',
  'workflow',
  'admin',
  'presentation',
  'workspace-config',
] as const satisfies readonly AppView[];

export function adminMenuOrderIndex(view: AppView): number {
  const i = (ADMIN_MENU_VIEWS as readonly string[]).indexOf(view);
  return i >= 0 ? i : ADMIN_MENU_VIEWS.length + 50;
}

export function sortByAdminMenuOrder<T extends { id: AppView }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => adminMenuOrderIndex(a.id) - adminMenuOrderIndex(b.id),
  );
}
/**
 * 全角色统一的一级分类（侧栏与展示配置共用）：
 * 工作平台 → 能力配置 → 系统设置。
 * `ops` 仅保留兼容旧折叠状态，不再作为独立一级菜单。
 */
export const NAV_SECTION_LABELS: Record<NavSection, string> = {
  workspace: '工作平台',
  platform: '能力配置',
  ops: '能力配置',
  system: '系统设置',
};

/** 侧栏实际渲染的一级分类顺序（全角色一致） */
export const SIDEBAR_NAV_SECTIONS = ['workspace', 'platform', 'system'] as const satisfies readonly NavSection[];

/** AppView 占位页（尚未实现的视图） */
export const APP_VIEW_PLACEHOLDERS: Partial<
  Record<AppView, { title: string; description: string; icon: string; phase: string }>
> = {};

export function isAppViewPlaceholder(view: AppView): boolean {
  return view in APP_VIEW_PLACEHOLDERS;
}
