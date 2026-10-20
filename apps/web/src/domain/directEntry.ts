import { DETAIL_VIEW, parseAppRoute } from './appRoute.ts';

export type DetailAction = 'detail' | 'detail_direct';

/** 页面加载那一刻的入口信息 */
export interface PageEntry {
  hash: string;
  /** performance.getEntriesByType('navigation')[0].type */
  navigationType?: string;
  /** history.state.fromApp：平台内 openAssetDetail 进入 */
  fromApp?: boolean;
  referrer?: string;
}

/**
 * 「直达」：页面新打开（navigate）就落在详情页，返回该资产的 `type:id`，否则 null。
 * 刷新、前进后退、平台内跳转都不算；OAuth 登录回跳是回调页 location.replace 过来的，
 * 类型也是 navigate，按来源页排除。
 */
export function directEntryKey(entry: PageEntry): string | null {
  if (entry.navigationType !== 'navigate' || entry.fromApp) return null;
  if (/\/oauth\/callback(?:[?#]|$)/.test(entry.referrer ?? '')) return null;
  const route = parseAppRoute(entry.hash);
  return route.view === DETAIL_VIEW && route.type && route.id ? `${route.type}:${route.id}` : null;
}

let pendingKey: string | null = null;

/** 启动时记下直达目标；之后任何路由跳转（popstate / hashchange）都作废 */
export function captureDirectEntry(entry: PageEntry): void {
  pendingKey = directEntryKey(entry);
}

export function invalidateDirectEntry(): void {
  pendingKey = null;
}

/** 详情页打开时取本次要记的动作：直达只出一次，同一页面里再打开详情都记 detail */
export function takeDetailAction(type: string, id: string): DetailAction {
  const direct = pendingKey !== null && pendingKey === `${type}:${id}`;
  pendingKey = null;
  return direct ? 'detail_direct' : 'detail';
}
