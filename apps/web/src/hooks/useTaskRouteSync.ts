import { useEffect, useRef } from 'react';
import type { AppView } from '@/domain/appView';
import { parseAppRoute, writeAppRouteToLocation } from '@/domain/appRoute';
import { useConversationStore } from '@/stores/conversationStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAppViewStore } from '@/stores/appViewStore';

/**
 * Sync #/task?chat=<id> deep links with conversationStore.
 * - On load / hash back-forward: apply chat from URL
 * - While on task view: write current chatId into URL (replaceState)
 */
export function useTaskRouteSync(appView: AppView) {
  const catalogReady = useWorkspaceStore((s) => s.catalogReady);
  const currentChatId = useConversationStore((s) => s.currentChatId);
  const chats = useConversationStore((s) => s.chats);
  const appliedFromUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!catalogReady) return;

    const applyRoute = () => {
      const route = parseAppRoute(window.location.hash);
      // 仅同步会话，视图切换交给 useAppRouting，避免 hash 尚未更新时把其它页面抢回任务
      if (route.view === 'task' && route.chat) {
        const { chats: latest } = useConversationStore.getState();
        if (latest[route.chat] && appliedFromUrl.current !== route.chat) {
          useConversationStore.getState().switchChat(route.chat);
          appliedFromUrl.current = route.chat;
        }
      }
    };

    applyRoute();
    window.addEventListener('hashchange', applyRoute);
    window.addEventListener('popstate', applyRoute);
    return () => {
      window.removeEventListener('hashchange', applyRoute);
      window.removeEventListener('popstate', applyRoute);
    };
  }, [catalogReady]);

  useEffect(() => {
    if (appView !== 'task' || !currentChatId) return;
    if (!chats[currentChatId]) return;
    writeAppRouteToLocation({ view: 'task', chat: currentChatId }, true);
    appliedFromUrl.current = currentChatId;
  }, [appView, currentChatId, chats]);
}

/** Navigate to task view with a shareable deep link */
export function navigateToTaskChat(chatId: string): void {
  writeAppRouteToLocation({ view: 'task', chat: chatId });
  useAppViewStore.getState().setAppView('task');
  const { chats, switchChat } = useConversationStore.getState();
  if (chats[chatId]) switchChat(chatId);
}
