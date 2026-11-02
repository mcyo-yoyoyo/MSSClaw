import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { useSessionStore } from '@/stores/sessionStore';

/**
 * 执行面（货架「去打样」/ 技能「去执行」、首页「最近任务」、账号菜单「任务记录」）
 * 跟着「任务记录」菜单走：角色有这个菜单才开放；游客可浏览，执行时过登录墙。
 */
export function allowsTaskExecution(): boolean {
  return useNavPresentationStore.getState().isViewEnabled('task');
}

/** 组件里用：会话或菜单变化时重新渲染 */
export function useAllowsTaskExecution(): boolean {
  useSessionStore((s) => s.menus);
  useSessionStore((s) => s.isGuest);
  useSessionStore((s) => s.user?.platformRole);
  return allowsTaskExecution();
}
