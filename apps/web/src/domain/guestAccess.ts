import type { AppView } from '@/domain/appView';

/**
 * 游客不可进入的个人域页面：内容完全依赖登录身份，直达会得到空壳。
 * 「做任务 / AI 任务」刻意不在此列——游客可以浏览，真正发起执行时才过登录墙。
 */
const GUEST_BLOCKED_VIEWS = new Set<AppView>(['me', 'messages']);

/**
 * 游客可浏览的任务页：页面本身不依赖登录身份，真正创建会话/发起执行时再过登录墙。
 * 这里刻意独立于 viewer 的展示配置，避免游客被“只读角色默认隐藏任务记录”提前挡回首页。
 */
const GUEST_LOGIN_GATED_VIEWS = new Set<AppView>(['task', 'ai-tasks']);

export function isGuestBlockedView(view: AppView): boolean {
  return GUEST_BLOCKED_VIEWS.has(view);
}

export function isGuestLoginGatedView(view: AppView): boolean {
  return GUEST_LOGIN_GATED_VIEWS.has(view);
}
