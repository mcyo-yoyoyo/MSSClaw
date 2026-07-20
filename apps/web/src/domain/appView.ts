export const APP_VIEWS = [
  'home',
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
  { id: 'home', label: '首页', subtitle: 'AI助手开工 · AI广场找场景与工具', icon: 'fa-house', section: 'workspace' },
  { id: 'task', label: '任务', subtitle: '当前会话 · 计划确认 · 交付物', icon: 'fa-list-check', section: 'workspace' },
  {
    id: 'ai-map',
    label: '案例',
    subtitle: '样板间 · 可复制业务场景包',
    icon: 'fa-map',
    section: 'platform',
  },
  { id: 'agents', label: '专家', subtitle: '配置 · 发布 · 调用', icon: 'fa-robot', section: 'platform' },
  { id: 'skills', label: '技能', subtitle: '能力资产 · 挂载编排', icon: 'fa-cube', section: 'platform' },
  { id: 'tools', label: '工具', subtitle: '连接器 · 外部 API', icon: 'fa-plug', section: 'platform' },
  { id: 'memory', label: '记忆', subtitle: 'Agent 长期记忆 · Reflection', icon: 'fa-brain', section: 'platform' },
  { id: 'kb', label: '知识', subtitle: '企业文档 · RAG · 溯源', icon: 'fa-book-open', section: 'platform' },
  { id: 'prompts', label: '提示词', subtitle: '版本 · 审批 · 生命周期', icon: 'fa-file-code', section: 'platform' },
  { id: 'automation', label: '自动化', subtitle: '定时 · 告警 · 周报', icon: 'fa-bolt', section: 'ops' },
  { id: 'workflow', label: '工作流', subtitle: 'LangGraph · 专家编排', icon: 'fa-diagram-project', section: 'ops' },
];

export const NAV_SECTION_LABELS: Record<NavSection, string> = {
  workspace: '工作平台',
  platform: '能力沉淀',
  ops: '运营编排',
  system: '系统设置',
};

/** AppView 占位页（尚未实现的视图） */
export const APP_VIEW_PLACEHOLDERS: Partial<
  Record<AppView, { title: string; description: string; icon: string; phase: string }>
> = {};

export function isAppViewPlaceholder(view: AppView): boolean {
  return view in APP_VIEW_PLACEHOLDERS;
}
