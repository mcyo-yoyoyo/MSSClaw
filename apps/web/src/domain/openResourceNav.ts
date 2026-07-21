import type { AppView } from '@/domain/appView';
import { useAppViewStore } from '@/stores/appViewStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';

/** 从业务场景打开资源页，并记住返回任务上下文 */
export function openResourceWithReturn(view: AppView = 'ai-map') {
  const chatId = useConversationStore.getState().currentChatId;
  useNavigationIntentStore.getState().setReturnTarget({
    view: 'task',
    chatId: chatId || undefined,
  });
  useAppViewStore.getState().setAppView(view);
}

export function returnFromResource() {
  const target = useNavigationIntentStore.getState().consumeReturnTarget();
  if (!target) {
    useAppViewStore.getState().setAppView('home');
    return;
  }
  if (target.chatId) {
    useConversationStore.getState().switchChat(target.chatId);
  }
  useAppViewStore.getState().setAppView(target.view);
}
