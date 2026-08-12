import { useEffect, useRef } from 'react';
import type { AppView } from '@/domain/appView';
import { isWarRoom } from '@/domain/chat';
import { parseAppRoute, writeAppRouteToLocation } from '@/domain/appRoute';
import { getNavMetaLabel } from '@/domain/navPresentation';
import { roleNavDisabledToast } from '@/domain/permissions';
import { useConversationStore } from '@/stores/conversationStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';

const CHAT_ROUTE_VIEWS: AppView[] = ['ai-tasks', 'task'];

/**
 * Sync #/ai-tasks?chat=<id> / #/task?chat=<id> deep links with conversationStore.
 * - On load / hash back-forward: apply chat from URL
 * - While on ai-tasks / task: write current chatId into URL (replaceState)
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
      if (CHAT_ROUTE_VIEWS.includes(route.view) && route.chat) {
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
    if (!CHAT_ROUTE_VIEWS.includes(appView) || !currentChatId) return;
    if (!chats[currentChatId]) return;
    writeAppRouteToLocation({ view: appView, chat: currentChatId }, true);
    appliedFromUrl.current = currentChatId;
  }, [appView, currentChatId, chats]);
}

function resolveExecutionView(chatId?: string): AppView {
  const chat = chatId ? useConversationStore.getState().chats[chatId] : undefined;
  if (chat && isWarRoom(chat)) return 'task';
  const nav = useNavPresentationStore.getState();
  // 完整产品走 AI任务；MVP/标准回退任务记录
  if (nav.isViewEnabled('ai-tasks')) return 'ai-tasks';
  return 'task';
}

/** Navigate to AI 任务（或协作空间任务页）with a shareable deep link */
export function navigateToTaskChat(chatId: string): void {
  const view = resolveExecutionView(chatId);
  const nav = useNavPresentationStore.getState();
  if (!nav.isViewEnabled(view)) {
    const fallback = nav.getFallbackView();
    useConversationStore.setState({
      pushToast: roleNavDisabledToast(getNavMetaLabel(view), getNavMetaLabel(fallback)),
    });
    return;
  }
  writeAppRouteToLocation({ view, chat: chatId });
  useAppViewStore.getState().setAppView(view);
  const { chats, switchChat } = useConversationStore.getState();
  if (chats[chatId]) switchChat(chatId);
}
