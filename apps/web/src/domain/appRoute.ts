import type { AppView } from '@/domain/appView';
import { APP_VIEWS } from '@/domain/appView';

export interface AppRouteParams {
  view: AppView;
  /** Deep link to a task session: #/task?chat=<chatId> */
  chat?: string;
}

/** Hash 路由：`#/home`、`#/task?chat=xxx` */
export function parseAppRoute(rawHash: string): AppRouteParams {
  const hash = rawHash.replace(/^#/, '').replace(/^\//, '').trim();
  if (!hash) return { view: 'home' };

  const [pathPart, queryPart] = hash.split('?');
  const viewCandidate = (pathPart || 'home').toLowerCase() as AppView;
  const view = APP_VIEWS.includes(viewCandidate) ? viewCandidate : 'home';

  const chat = queryPart ? new URLSearchParams(queryPart).get('chat') ?? undefined : undefined;
  return { view, chat: chat || undefined };
}

export function buildAppRoute(params: AppRouteParams): string {
  const qs = new URLSearchParams();
  if (params.view === 'task' && params.chat) {
    qs.set('chat', params.chat);
  }
  const query = qs.toString();
  return `#/${params.view}${query ? `?${query}` : ''}`;
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
