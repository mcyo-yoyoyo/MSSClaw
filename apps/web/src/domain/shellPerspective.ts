import { isAdminMenuId } from '@/domain/appView';
import type { PlatformRole } from '@/domain/rbac';

/** 侧栏双壳：由登录角色决定，不再提供手动切换 */
export type ShellPerspective = 'business' | 'ops';

export const SHELL_PERSPECTIVE_LABELS: Record<ShellPerspective, string> = {
  business: '业务工作台',
  ops: '平台运营台',
};

/** 业务侧栏偶发资源（不常驻一级，走顶栏/情境入口） */
export const BUSINESS_RESOURCE_VIEWS = ['ai-map'] as const;

/**
 * 有服务端菜单时：角色有任一管理后台菜单就进运营壳。
 * 没有（游客、离线演示登录）时按内置角色：业务/只读 → 业务菜单；超管/能力运营 → 运营菜单
 */
export function defaultShellPerspective(role: PlatformRole | undefined, menus?: readonly string[] | null): ShellPerspective {
  if (menus) return menus.some(isAdminMenuId) ? 'ops' : 'business';
  if (!role) return 'business';
  if (role === 'business_user' || role === 'viewer') return 'business';
  return 'ops';
}

export function loadShellPerspective(role: PlatformRole | undefined, menus?: readonly string[] | null): ShellPerspective {
  return defaultShellPerspective(role, menus);
}

/** 运营台专属视图：业务角色深链时用于跳回首页 */
export function isOpsOnlyView(view: string): boolean {
  return (
    view === 'agents' ||
    view === 'skills' ||
    view === 'tools' ||
    view === 'office-scenes' ||
    view === 'memory' ||
    view === 'kb' ||
    view === 'prompts' ||
    view === 'automation' ||
    view === 'workflow' ||
    view === 'portal-ops' ||
    view === 'portal-dashboard' ||
    view === 'model-ops' ||
    view === 'executions' ||
    view === 'approvals' ||
    view === 'admin' ||
    view === 'org-members' ||
    view === 'org-roles' ||
    view === 'org-depts' ||
    view === 'org-audit' ||
    view === 'workspace-config' ||
    view === 'agent-studio'
  );
}
