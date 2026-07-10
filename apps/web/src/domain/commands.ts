import type { AppView } from '@/domain/appView';

export interface AppCommand {
  id: string;
  label: string;
  icon: string;
  keywords?: string;
  view?: AppView;
  run: () => void;
}

export interface AppCommandHandlers {
  goto: (view: AppView) => void;
  invokeAgentById: (agentId: string) => void;
  invokeSkillById?: (skillId: string) => void;
  openWarRoom: () => void;
  newTask: () => void;
  exportArtifact: () => void;
  pushToGroup: () => void;
  openSettings: () => void;
}

export interface AppCommandMarketplace {
  agents: { id: string; name: string; icon: string }[];
  skills: { id: string; name: string; command: string }[];
}

const NAV_COMMANDS = (h: AppCommandHandlers): AppCommand[] => [
  { id: 'goto-home', label: '打开智能助理', icon: 'fa-comment-dots', view: 'home', run: () => h.goto('home') },
  { id: 'goto-task', label: '打开任务中心', icon: 'fa-list-check', view: 'task', run: () => h.goto('task') },
  { id: 'goto-agents', label: '打开 Agent 中心', icon: 'fa-robot', view: 'agents', run: () => h.goto('agents') },
  {
    id: 'goto-agent-studio',
    label: '打开 Agent Studio',
    icon: 'fa-wand-magic-sparkles',
    keywords: 'studio expert',
    view: 'agent-studio',
    run: () => h.goto('agent-studio'),
  },
  { id: 'goto-skills', label: '打开 Skill 中心', icon: 'fa-cube', view: 'skills', run: () => h.goto('skills') },
  { id: 'goto-tools', label: '打开 Tool 中心', icon: 'fa-plug', keywords: 'connector tool', view: 'tools', run: () => h.goto('tools') },
  { id: 'goto-prompts', label: '打开 Prompt 中心', icon: 'fa-file-code', view: 'prompts', run: () => h.goto('prompts') },
  { id: 'goto-memory', label: '打开 Memory 中心', icon: 'fa-brain', view: 'memory', run: () => h.goto('memory') },
  { id: 'goto-kb', label: '打开知识库', icon: 'fa-book-open', view: 'kb', run: () => h.goto('kb') },
  { id: 'goto-automation', label: '打开自动化编排', icon: 'fa-bolt', view: 'automation', run: () => h.goto('automation') },
  {
    id: 'goto-workflow',
    label: '打开 Workflow 画布',
    icon: 'fa-diagram-project',
    keywords: 'langgraph workflow',
    view: 'workflow',
    run: () => h.goto('workflow'),
  },
  { id: 'goto-admin', label: '打开权限管理', icon: 'fa-shield-halved', keywords: 'rbac admin', view: 'admin', run: () => h.goto('admin') },
  {
    id: 'goto-presentation',
    label: '打开展示配置',
    icon: 'fa-sliders',
    keywords: 'menu nav presentation demo',
    view: 'presentation',
    run: () => h.goto('presentation'),
  },
  {
    id: 'goto-workspace-config',
    label: '打开租户配置',
    icon: 'fa-building',
    keywords: 'workspace tenant 租户 事业部',
    view: 'workspace-config',
    run: () => h.goto('workspace-config'),
  },
  { id: 'goto-warroom', label: '打开 WarRoom', icon: 'fa-users', run: () => h.openWarRoom() },
  { id: 'new-session', label: '新建任务', icon: 'fa-plus', view: 'task', run: () => h.newTask() },
  { id: 'export', label: '导出交付物', icon: 'fa-file-export', run: () => h.exportArtifact() },
  { id: 'push', label: '推送到作战室', icon: 'fa-paper-plane', run: () => h.pushToGroup() },
  { id: 'settings', label: '打开设置抽屉', icon: 'fa-gear', run: () => h.openSettings() },
];

export function buildAppCommands(
  h: AppCommandHandlers,
  market?: AppCommandMarketplace,
  options?: { isViewEnabled?: (view: AppView) => boolean },
): AppCommand[] {
  const allow = options?.isViewEnabled ?? (() => true);
  const nav = NAV_COMMANDS(h).filter((c) => !c.view || allow(c.view));

  const agentCommands: AppCommand[] = (market?.agents ?? []).slice(0, 12).map((a) => ({
    id: `agent-${a.id}`,
    label: `调用 ${a.name}`,
    icon: a.icon || 'fa-robot',
    keywords: `${a.name} agent`,
    run: () => h.invokeAgentById(a.id),
  }));

  const skillCommands: AppCommand[] = h.invokeSkillById
    ? (market?.skills ?? []).slice(0, 15).map((s) => ({
        id: `skill-${s.id}`,
        label: `${s.command} · ${s.name}`,
        icon: 'fa-cube',
        keywords: `${s.name} ${s.command} skill`,
        run: () => h.invokeSkillById!(s.id),
      }))
    : [];

  return [...nav, ...agentCommands, ...skillCommands];
}

export function filterAppCommands(commands: AppCommand[], query: string): AppCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter(
    (c) =>
      c.label.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.keywords?.toLowerCase().includes(q) ?? false),
  );
}
