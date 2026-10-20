import type { AppView } from './appView.ts';
import { APP_VIEWS } from './appView.ts';

/** 可分享的资产详情：工具（内部 / 外部）、Skill、Agent、案例洞察 */
export const DETAIL_ASSET_TYPES = ['tool', 'skill', 'agent', 'case'] as const;
export type DetailAssetType = (typeof DETAIL_ASSET_TYPES)[number];

export function isDetailAssetType(value: unknown): value is DetailAssetType {
  return (DETAIL_ASSET_TYPES as readonly unknown[]).includes(value);
}

/**
 * 资产详情页的视图键沿用 market-tool：导航配置、权限和页面访问统计都按它记，改名会让历史数据断开。
 * 地址是 #/detail?type=&id=；旧链接 #/market-tool?id=（工具）、#/case-insight?id=（案例）解析成同一个视图。
 */
export const DETAIL_VIEW: AppView = 'market-tool';

export interface AppRouteParams {
  view: AppView;
  /** Deep link to a task session: #/task?chat=<chatId> */
  chat?: string;
  /** 资产详情的资产 id */
  id?: string;
  /** 资产详情的资产类型 */
  type?: DetailAssetType;
}

/** Hash 路由：`#/home`、`#/task?chat=xxx`、`#/detail?type=skill&id=xxx` */
export function parseAppRoute(rawHash: string): AppRouteParams {
  const hash = rawHash.replace(/^#/, '').replace(/^\//, '').trim();
  if (!hash) return { view: 'home' };

  const [pathPart, queryPart] = hash.split('?');
  const path = (pathPart || 'home').toLowerCase();
  const qs = queryPart ? new URLSearchParams(queryPart) : null;
  const id = qs?.get('id') || undefined;

  if (path === 'detail' || path === 'market-tool' || path === 'case-insight') {
    const type = path === 'detail' ? qs?.get('type') : path === 'case-insight' ? 'case' : 'tool';
    return { view: DETAIL_VIEW, type: isDetailAssetType(type) ? type : undefined, id };
  }

  const viewCandidate = path as AppView;
  const view = APP_VIEWS.includes(viewCandidate) ? viewCandidate : 'home';
  const chat = qs?.get('chat') ?? undefined;
  return {
    view,
    chat: chat || undefined,
  };
}

export function buildAppRoute(params: AppRouteParams): string {
  const qs = new URLSearchParams();
  if (params.view === DETAIL_VIEW) {
    if (params.type) qs.set('type', params.type);
    if (params.id) qs.set('id', params.id);
    const query = qs.toString();
    return `#/detail${query ? `?${query}` : ''}`;
  }
  if (params.view === 'task' || params.view === 'ai-tasks') {
    if (params.chat) qs.set('chat', params.chat);
  }
  const query = qs.toString();
  return `#/${params.view}${query ? `?${query}` : ''}`;
}

/** 分享出去的完整地址 */
export function assetDetailUrl(type: DetailAssetType, id: string): string {
  return `${window.location.origin}${window.location.pathname}${buildAppRoute({ view: DETAIL_VIEW, type, id })}`;
}

/**
 * 平台内打开资产详情：当前标签页跳到详情页。history.state 记下 fromApp，
 * 详情页据此决定「返回」是回上一页还是回该类列表（直达）。
 */
export function openAssetDetail(type: DetailAssetType, id: string): void {
  const hash = buildAppRoute({ view: DETAIL_VIEW, type, id });
  window.history.pushState({ fromApp: true }, '', `${window.location.pathname}${window.location.search}${hash}`);
  // pushState 不触发事件；补发一次让路由同步和详情页跟上
  window.dispatchEvent(new PopStateEvent('popstate', { state: { fromApp: true } }));
}

export function readAppRouteFromLocation(): AppRouteParams {
  return parseAppRoute(window.location.hash);
}

export function writeAppRouteToLocation(params: AppRouteParams, replace = false): void {
  const next = buildAppRoute(params);
  if (window.location.hash === next) return;
  const url = `${window.location.pathname}${window.location.search}${next}`;
  if (replace) {
    window.history.replaceState(null, '', url);
  } else {
    window.history.pushState(null, '', url);
  }
}

/** @deprecated use readAppRouteFromLocation */
export function readAppViewFromLocation(): AppView {
  return readAppRouteFromLocation().view;
}

/** @deprecated use buildAppRoute / writeAppRouteToLocation */
export function hashFromAppView(view: AppView): string {
  return buildAppRoute({ view });
}

/** @deprecated use writeAppRouteToLocation */
export function writeAppViewToLocation(view: AppView, replace = false): void {
  writeAppRouteToLocation({ view }, replace);
}
