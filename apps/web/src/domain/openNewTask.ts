import { canExecuteChat, READONLY_EXECUTE_HINT } from '@/domain/permissions';
import { useAppViewStore } from '@/stores/appViewStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useHomeStore } from '@/stores/homeStore';
import { useTaskStore } from '@/stores/taskStore';

/**
 * 新建 Agent 任务的唯一入口：打开首页「AI任务」，
 * 由 HomeCommandBox 提交后创建任务会话（与广场/技能调用同一套交互）。
 */
export function openAiAssistantForNewTask() {
  if (!canExecuteChat()) {
    useConversationStore.setState({ pushToast: READONLY_EXECUTE_HINT });
    useHomeStore.getState().setHomeMode('portal');
    useAppViewStore.getState().setAppView('home');
    return;
  }
  useTaskStore.getState().closeCreateDialog();
  useHomeStore.getState().setHomeMode('assistant');
  useHomeStore.getState().requestComposerFocus();
  useAppViewStore.getState().setAppView('home');
}
