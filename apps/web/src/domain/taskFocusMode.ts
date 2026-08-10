import { useAppViewStore } from '@/stores/appViewStore';
import { useTaskStore } from '@/stores/taskStore';

/**
 * 进入任务中心「对话专注」：
 * - 仅收起 App 侧栏（留出对话宽度；展开侧栏即可在「任务记录 / 协作空间」切换历史）
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
