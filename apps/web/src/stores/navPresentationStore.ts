import { create } from 'zustand';
import type { AppView } from '@/domain/appView';
import { isGuestLoginGatedView } from '@/domain/guestAccess';
import {
  buildRoleNavPreset,
  NAV_FALLBACK_ORDER,
  NAV_PRESENTATION_META,
  type NavSlotId,
  type RoleNavMatrix,
} from '@/domain/navPresentation';
import { canRoleAccessView } from '@/domain/navRbac';
import type { PlatformRole } from '@/domain/rbac';
import { useSessionStore } from '@/stores/sessionStore';

/** 菜单别名：并入别的页面的旧视图跟着目标菜单走 */
const MENU_ALIASES: Partial<Record<NavSlotId, string>> = {
  'agent-studio': 'agents',
  cases: 'ai-map',
};

/** 组织权限旧入口：有成员 / 角色 / 部门任一项即可 */
const ADMIN_ALIAS_MENUS = ['org-members', 'org-roles', 'org-depts', 'org-audit'];

function serverMenuAllows(menus: readonly string[], slot: NavSlotId): boolean {
  if (slot === 'admin') return ADMIN_ALIAS_MENUS.some((id) => menus.includes(id));
  return menus.includes(MENU_ALIASES[slot] ?? slot);
}

/** 没有服务端菜单时（游客、离线演示登录）用的内置矩阵 */
const FALLBACK_MATRIX: RoleNavMatrix = buildRoleNavPreset('customer');

function currentRole(): PlatformRole {
  return useSessionStore.getState().user?.platformRole ?? 'viewer';
}

interface NavPresentationState {
  /** 登录用户按服务端菜单；没有服务端菜单时按内置角色矩阵 */
  isSlotEnabled: (slot: NavSlotId, role?: PlatformRole) => boolean;
  isViewEnabled: (view: AppView) => boolean;
  /** 页面里的新增 / 修改 / 删除按钮是否可用 */
  isViewEditable: (view: AppView) => boolean;
  getFallbackView: (requested?: AppView) => AppView;
}

export const useNavPresentationStore = create<NavPresentationState>((_set, get) => ({
  isSlotEnabled: (slot, roleArg) => {
    const { menus } = useSessionStore.getState();
    if (menus && !roleArg) return serverMenuAllows(menus, slot);

    const role = roleArg ?? currentRole();
    const meta = NAV_PRESENTATION_META.find((m) => m.id === slot);
    if (meta?.adminOnly) return role === 'super_admin';
    if (FALLBACK_MATRIX[role]?.[slot] !== true) return false;
    if (slot !== 'warroom' && !canRoleAccessView(slot, role)) return false;
    return true;
  },

  isViewEnabled: (view) => {
    // 游客的 task / ai-tasks 是“可浏览、执行时登录”，不能沿用 viewer
    // 在展示矩阵中的隐藏配置，否则路由会在登录墙之前先回退到首页。
    if (useSessionStore.getState().isGuest && isGuestLoginGatedView(view)) return true;
    return get().isSlotEnabled(view);
  },

  isViewEditable: (view) => {
    const { menus, editableMenus } = useSessionStore.getState();
    if (!menus) return get().isViewEnabled(view);
    return serverMenuAllows(editableMenus, view);
  },

  getFallbackView: (requested) => {
    const { isViewEnabled } = get();
    if (requested && isViewEnabled(requested)) return requested;
    for (const view of NAV_FALLBACK_ORDER) {
      if (isViewEnabled(view)) return view;
    }
    return 'home';
  },
}));
