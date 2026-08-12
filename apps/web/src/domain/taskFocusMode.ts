import { useAppViewStore } from '@/stores/appViewStore';
import { useTaskStore } from '@/stores/taskStore';

/**
 * 进入 AI 任务「对话专注」：
 * - 收起 App 侧栏（隐藏领域/区域菜单，留出对话宽度）
 * - 交付物默认收起，有结果后再提示展开
 * - 展示一次性专注提示条
 */
export function enterTaskChatFocusMode() {
  useAppViewStore.setState({ sidebarCollapsed: true });
  useTaskStore.setState({
    artifactPanelCollapsed: true,
    focusBannerVisible: true,
  });
}
