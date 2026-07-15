import { useAppViewStore } from '@/stores/appViewStore';
import { useTaskStore } from '@/stores/taskStore';

const LS_SIDEBAR = 'mssclaw_sidebar_collapsed';
const LS_ARTIFACT = 'mssclaw_artifact_collapsed';

/**
 * 进入任务中心「对话专注」：
 * - 仅收起 App 侧栏（留出对话宽度）
 * - 交付物默认收起，有结果后再提示展开
 * - 会话列表保持可用，避免用户找不到历史
 * - 展示一次性专注提示条
 */
export function enterTaskChatFocusMode() {
  localStorage.setItem(LS_SIDEBAR, '1');
  useAppViewStore.setState({ sidebarCollapsed: true });

  localStorage.setItem(LS_ARTIFACT, '1');
  useTaskStore.setState({
    artifactPanelCollapsed: true,
    focusBannerVisible: true,
  });
}
