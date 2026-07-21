import type { AppView } from '@/domain/appView';
import {
  getRbacMatrix,
  type PermissionLevel,
  type PlatformRole,
  type ResourceModule,
} from '@/domain/rbac';

const LEVEL_RANK: Record<PermissionLevel, number> = {
  none: 0,
  read: 1,
  execute: 2,
  write: 3,
  admin: 4,
};

function hasAtLeast(level: PermissionLevel, min: PermissionLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[min];
}

/** 侧栏视图 → 权限模块与最低级别（home/task/案例对业务始终按 chat 放行） */
const VIEW_RBAC: Partial<Record<AppView, { module: ResourceModule; min: PermissionLevel }>> = {
  home: { module: 'chat', min: 'read' },
  task: { module: 'chat', min: 'read' },
  messages: { module: 'chat', min: 'read' },
  'ai-map': { module: 'chat', min: 'read' },
  cases: { module: 'chat', min: 'read' },
  agents: { module: 'agent', min: 'read' },
  'agent-studio': { module: 'agent', min: 'read' },
  skills: { module: 'skill', min: 'read' },
  tools: { module: 'tool', min: 'read' },
  memory: { module: 'memory', min: 'read' },
  kb: { module: 'knowledge', min: 'read' },
  prompts: { module: 'prompt', min: 'read' },
  automation: { module: 'workflow', min: 'read' },
  workflow: { module: 'workflow', min: 'read' },
  admin: { module: 'settings', min: 'admin' },
  presentation: { module: 'settings', min: 'admin' },
  'workspace-config': { module: 'settings', min: 'admin' },
  'portal-ops': { module: 'settings', min: 'admin' },
};

export function canRoleAccessView(
  view: AppView,
  role: PlatformRole | undefined,
  workspaceId: string,
): boolean {
  if (!role) return view === 'home' || view === 'task';
  const rule = VIEW_RBAC[view];
  if (!rule) return true;
  const matrix = getRbacMatrix(workspaceId);
  const level = matrix[role]?.[rule.module] ?? 'none';
  return hasAtLeast(level, rule.min);
}
