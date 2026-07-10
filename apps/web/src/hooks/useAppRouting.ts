import { useEffect, useRef } from 'react';
import type { AppView } from '@/domain/appView';
import { parseAppRoute, writeAppRouteToLocation } from '@/domain/appRoute';
import { useAppViewStore } from '@/stores/appViewStore';
import { useConversationStore } from '@/stores/conversationStore';

/**
 * 同步 AppView 与 URL hash（#/home、#/task?chat=xxx），支持浏览器前进/后退。
 */
export function useAppRouting() {
  const appView = useAppViewStore((s) => s.appView);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const skipHashWrite = useRef(false);

  useEffect(() => {
    const initial = parseAppRoute(window.location.hash);
    skipHashWrite.current = true;
    setAppView(initial.view);

    if (initial.view === 'task' && initial.chat) {
      const { chats, switchChat } = useConversationStore.getState();
      if (chats[initial.chat]) switchChat(initial.chat);
    }

    if (!window.location.hash) {
      writeAppRouteToLocation({ view: initial.view, chat: initial.chat }, true);
    }
  }, [setAppView]);

  useEffect(() => {
    if (skipHashWrite.current) {
      skipHashWrite.current = false;
      return;
    }

    const current = parseAppRoute(window.location.hash);
    const chat = appView === 'task' ? current.chat : undefined;
    writeAppRouteToLocation({ view: appView, chat }, appView === current.view);
  }, [appView]);

  useEffect(() => {
    const onNavigate = () => {
      const route = parseAppRoute(window.location.hash);
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
  }, [setAppView]);
}

export function navigateToAppView(view: AppView): void {
  useAppViewStore.getState().setAppView(view);
}
