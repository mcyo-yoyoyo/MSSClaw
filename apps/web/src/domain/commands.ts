import type { AppView } from '@/domain/appView';
import { openFindCases, openUseSkills } from '@/domain/openHomeJourney';

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
  {
    id: 'goto-find-cases',
    label: '找案例',
    icon: 'fa-compass',
    keywords: '案例 学 找案例 预览广场 portal 场景 样板 发现 广场',
    view: 'home',
    run: () => openFindCases(),
  },
  {
    id: 'goto-use-skills',
    label: '做任务',
    icon: 'fa-cube',
    keywords: '做任务 干 技能库 技能 assistant 开工 home 新建任务',
    view: 'home',
    run: () => openUseSkills(),
  },
  {
    id: 'goto-ai-map',
    label: '案例样板间',
    icon: 'fa-map',
    keywords: 'portal map 门户 场景 案例 样板 场景库 案例地图 打开案例',
    view: 'ai-map',
    run: () => h.goto('ai-map'),
  },
  {
    id: 'goto-task',
    label: '任务记录',
    icon: 'fa-list-check',
    keywords: '任务记录 历史 任务 task 执行',
    view: 'task',
    run: () => h.goto('task'),
  },
  {
    id: 'goto-agents',
    label: '配置专家',
    icon: 'fa-robot',
    keywords: '配置专家 专家 运营 agent studio 专家配置',
    view: 'agents',
    run: () => h.goto('agents'),
  },
  {
    id: 'goto-skills',
    label: '配置技能',
    icon: 'fa-cube',
    keywords: '配置技能 技能 运营 skill',
    view: 'skills',
    run: () => h.goto('skills'),
  },
  {
    id: 'goto-tools',
    label: '配置工具',
    icon: 'fa-plug',
    keywords: '配置工具 工具 connector tool',
    view: 'tools',
    run: () => h.goto('tools'),
  },
  {
    id: 'goto-prompts',
    label: '提示词（未开放）',
    icon: 'fa-file-code',
    keywords: '提示词 prompt 未开放',
    view: 'prompts',
    run: () => h.goto('prompts'),
  },
  {
    id: 'goto-kb',
    label: '管理知识',
    icon: 'fa-book-open',
    keywords: '管理知识 知识 kb rag',
    view: 'kb',
    run: () => h.goto('kb'),
  },
  {
    id: 'goto-memory',
    label: '管理记忆',
    icon: 'fa-brain',
    keywords: '管理记忆 记忆 memory',
    view: 'memory',
    run: () => h.goto('memory'),
  },
  {
    id: 'goto-automation',
    label: '打开自动化设置',
    icon: 'fa-bolt',
    keywords: '自动化设置 自动化 automation',
    view: 'automation',
    run: () => h.goto('automation'),
  },
  {
    id: 'goto-workflow',
    label: '打开工作流设置',
    icon: 'fa-diagram-project',
    keywords: '工作流设置 工作流 langgraph workflow',
    view: 'workflow',
    run: () => h.goto('workflow'),
  },
  { id: 'goto-admin', label: '打开组织权限', icon: 'fa-shield-halved', keywords: 'rbac admin 组织 权限', view: 'admin', run: () => h.goto('admin') },
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
    keywords: 'workspace tenant 租户 组织 事业部',
    view: 'workspace-config',
    run: () => h.goto('workspace-config'),
  },
  {
    id: 'goto-portal-ops',
    label: '打开门户运营',
    icon: 'fa-newspaper',
    keywords: 'portal ops 运营 上架 AI地图',
    view: 'portal-ops',
    run: () => h.goto('portal-ops'),
  },
  {
    id: 'goto-warroom',
    label: '打开协作空间',
    icon: 'fa-users',
    keywords: '协作空间 群聊 warroom 作战室',
    run: () => h.openWarRoom(),
  },
  { id: 'export', label: '导出交付物', icon: 'fa-file-export', run: () => h.exportArtifact() },
  {
    id: 'goto-messages',
    label: '打开我的消息',
    icon: 'fa-envelope',
    keywords: '消息 通知 inbox messages',
    view: 'messages',
    run: () => h.goto('messages'),
  },
  { id: 'push', label: '推送交付物', icon: 'fa-paper-plane', run: () => h.pushToGroup() },
  { id: 'settings', label: '打开偏好设置', icon: 'fa-gear', keywords: '设置 偏好 settings 快捷', run: () => h.openSettings() },
];

const EXECUTE_COMMAND_IDS = new Set([
  'goto-use-skills',
  'goto-warroom',
  'export',
  'push',
]);

export function buildAppCommands(
  h: AppCommandHandlers,
  market?: AppCommandMarketplace,
  options?: { isViewEnabled?: (view: AppView) => boolean; canExecute?: boolean },
): AppCommand[] {
  const allow = options?.isViewEnabled ?? (() => true);
  const canExecute = options?.canExecute ?? true;
  const nav = NAV_COMMANDS(h).filter((c) => {
    if (c.view && !allow(c.view)) return false;
    if (!canExecute && EXECUTE_COMMAND_IDS.has(c.id)) return false;
    return true;
  });

  const agentCommands: AppCommand[] = canExecute
    ? (market?.agents ?? []).slice(0, 12).map((a) => ({
        id: `agent-${a.id}`,
        label: `调用 ${a.name}`,
        icon: a.icon || 'fa-robot',
        keywords: `${a.name} agent`,
        run: () => h.invokeAgentById(a.id),
      }))
    : [];

  const skillCommands: AppCommand[] =
    canExecute && h.invokeSkillById
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
