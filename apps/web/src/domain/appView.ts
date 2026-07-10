export const APP_VIEWS = [
  'home',
  'task',
  'agents',
  'agent-studio',
  'skills',
  'kb',
  'automation',
  'workflow',
  'tools',
  'memory',
  'prompts',
  'admin',
  'presentation',
  'workspace-config',
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
  { id: 'home', label: '智能助理', subtitle: '意图输入 · 提交进任务中心', icon: 'fa-comment-dots', section: 'workspace' },
  { id: 'task', label: '任务中心', subtitle: '计划确认 · 对话 · 交付物', icon: 'fa-list-check', section: 'workspace' },
  { id: 'agents', label: 'Agent 中心', subtitle: '配置 · 发布 · 调用', icon: 'fa-robot', section: 'platform' },
  { id: 'skills', label: 'Skill 中心', subtitle: '能力资产 · 挂载编排', icon: 'fa-cube', section: 'platform' },
  { id: 'tools', label: 'Tool 中心', subtitle: '连接器 · 外部 API', icon: 'fa-plug', section: 'platform' },
  { id: 'prompts', label: 'Prompt 中心', subtitle: '版本 · 审批 · 生命周期', icon: 'fa-file-code', section: 'platform' },
  { id: 'memory', label: 'Memory 中心', subtitle: 'Agent 长期记忆 · Reflection', icon: 'fa-brain', section: 'platform' },
  { id: 'kb', label: '知识库', subtitle: '企业文档 · RAG · 溯源', icon: 'fa-book-open', section: 'platform' },
  { id: 'automation', label: '自动化编排', subtitle: '定时 · 告警 · 周报', icon: 'fa-bolt', section: 'ops' },
  { id: 'workflow', label: 'Workflow 画布', subtitle: 'LangGraph · 专家编排', icon: 'fa-diagram-project', section: 'ops' },
];

export const NAV_SECTION_LABELS: Record<NavSection, string> = {
  workspace: '工作台',
  platform: '能力平台',
  ops: '运营编排',
  system: '系统',
};

/** AppView 占位页（尚未实现的视图） */
export const APP_VIEW_PLACEHOLDERS: Partial<
  Record<AppView, { title: string; description: string; icon: string; phase: string }>
> = {};

export function isAppViewPlaceholder(view: AppView): boolean {
  return view in APP_VIEW_PLACEHOLDERS;
}
