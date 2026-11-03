import { buildAppRoute, openAssetDetail, type DetailAssetType } from '@/domain/appRoute';
import { useAppViewStore } from '@/stores/appViewStore';

let scrollPositions: { element: HTMLElement; top: number; left: number }[] = [];
export function rememberKnowledgeScroll() {
  const panel = document.querySelector('[data-max-panel]');
  scrollPositions = panel ? [...panel.querySelectorAll<HTMLElement>('*')]
    .filter(element => element.scrollTop > 0 || element.scrollLeft > 0)
    .map(element => ({ element, top: element.scrollTop, left: element.scrollLeft })) : [];
}
export function restoreKnowledgeScroll() {
  const positions = scrollPositions;
  requestAnimationFrame(() => {
    for (const { element, top, left } of positions) if (element.isConnected) element.scrollTo({ top, left, behavior: 'instant' });
  });
}
export function clearKnowledgeScroll() { scrollPositions = []; }
export function openKnowledgeAsset(type: DetailAssetType, id: string) {
  rememberKnowledgeScroll();
  openAssetDetail(type, id);
}
export function knowledgeNewsHref(id: string, url?: string) {
  return buildAppRoute({ view: 'ai-brief', news: id.replace(/^news:/, ''), newsUrl: url });
}
export function openKnowledgeNews(id: string, url?: string) {
  rememberKnowledgeScroll();
  window.history.pushState({ fromApp: true, maxOrigin: true }, '', knowledgeNewsHref(id, url));
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  useAppViewStore.getState().setAppView('ai-brief');
}
