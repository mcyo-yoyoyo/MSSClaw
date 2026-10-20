import { useEffect, useRef } from 'react';
import type { AppView } from '@/domain/appView';
import { buildAppRoute, DETAIL_VIEW, parseAppRoute, writeAppRouteToLocation } from '@/domain/appRoute';
import { useAppViewStore } from '@/stores/appViewStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useSessionStore } from '@/stores/sessionStore';

/**
 * 同步 AppView 与 URL hash（#/home、#/task?chat=xxx、#/detail?type=skill&id=xxx），支持浏览器前进/后退。
 * 等会话恢复后再应用路由，避免运营角色在 hydrate 前被业务壳拦下。
 */
export function useAppRouting() {
  const appView = useAppViewStore((s) => s.appView);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const sessionBootstrapped = useSessionStore((s) => s.bootstrapped);
  // 游客与登录用户共用同一套路由；只等会话恢复完成
  const shellReady = useSessionStore((s) => s.shellReady);
  const skipHashWrite = useRef(false);
  const appliedInitial = useRef(false);

  useEffect(() => {
    if (!sessionBootstrapped || !shellReady) {
      appliedInitial.current = false;
      return;
    }
    if (appliedInitial.current) return;
    appliedInitial.current = true;

    const initial = parseAppRoute(window.location.hash);
    // 会话通常晚于首帧恢复；若 URL 与当前 view 已一致，setAppView 不会触发
    // 后续 effect，此时保留 skip=true 会吞掉用户的第一次真实导航。
    skipHashWrite.current = initial.view !== useAppViewStore.getState().appView;
    setAppView(initial.view);

    if (initial.view === 'task' && initial.chat) {
      const { chats, switchChat } = useConversationStore.getState();
      if (chats[initial.chat]) switchChat(initial.chat);
    }
    // 旧详情链接（#/market-tool?id=、#/case-insight?id=）就地换成 #/detail?type=&id=
    if (!window.location.hash || (initial.view === DETAIL_VIEW && buildAppRoute(initial) !== window.location.hash)) {
      writeAppRouteToLocation(initial, true);
    }
  }, [setAppView, sessionBootstrapped, shellReady]);

  useEffect(() => {
    if (!sessionBootstrapped || !shellReady || !appliedInitial.current) return;
    if (skipHashWrite.current) {
      skipHashWrite.current = false;
      return;
    }

    const current = parseAppRoute(window.location.hash);
    const chat = appView === 'task' ? current.chat : undefined;
    const detail = appView === DETAIL_VIEW ? { type: current.type, id: current.id } : {};
    writeAppRouteToLocation({ view: appView, chat, ...detail }, appView === current.view);
  }, [appView, sessionBootstrapped, shellReady]);

  useEffect(() => {
    if (!shellReady) return;

    const onNavigate = () => {
      const route = parseAppRoute(window.location.hash);
      // 在已打开的平台里粘贴旧详情链接：同样换成新地址（平台内跳详情生成的都是新地址，不会走到这里）
      if (route.view === DETAIL_VIEW && buildAppRoute(route) !== window.location.hash) {
        writeAppRouteToLocation(route, true);
      }
      if (route.view !== useAppViewStore.getState().appView) {
        skipHashWrite.current = true;
        setAppView(route.view);
      }
      if (route.view === 'task' && route.chat) {
        const { chats, switchChat } = useConversationStore.getState();
        if (chats[route.chat]) switchChat(route.chat);
      }
    };
    window.addEventListener('hashchange', onNavigate);
    window.addEventListener('popstate', onNavigate);
    return () => {
      window.removeEventListener('hashchange', onNavigate);
      window.removeEventListener('popstate', onNavigate);
    };
  }, [setAppView, shellReady]);
}

export function navigateToAppView(view: AppView): void {
  useAppViewStore.getState().setAppView(view);
}
