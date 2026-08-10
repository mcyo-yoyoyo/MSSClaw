import { create } from 'zustand';
import { canExecuteChat, READONLY_EXECUTE_HINT } from '@/domain/permissions';
import { useConversationStore } from '@/stores/conversationStore';

/** 任务区空态/高亮：任务记录 vs 协作空间 */
export type TaskLanding = 'tasks' | 'collab';

interface TaskState {
  artifactPanelCollapsed: boolean;
  /** 从 AI任务 进入时的专注提示条 */
  focusBannerVisible: boolean;
  sessionGroupsCollapsed: Record<string, boolean>;
  sessionSearch: string;
  createDialogOpen: boolean;
  resourceExplorerOpen: boolean;
  /** 侧栏点「任务记录」或「协作空间」后的落地上下文 */
  taskLanding: TaskLanding;
  setTaskLanding: (landing: TaskLanding) => void;
  toggleArtifactPanel: () => void;
  dismissFocusBanner: () => void;
  toggleSessionGroup: (group: string) => void;
  setSessionSearch: (q: string) => void;
  /** 仅打开「新建协作空间」弹窗；Agent 任务请用 openAiAssistantForNewTask */
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  toggleResourceExplorer: () => void;
  closeResourceExplorer: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  artifactPanelCollapsed: false,
  focusBannerVisible: false,
  sessionGroupsCollapsed: {},
  sessionSearch: '',
  createDialogOpen: false,
  resourceExplorerOpen: false,
  taskLanding: 'tasks',

  setTaskLanding: (taskLanding) => set({ taskLanding }),

  toggleArtifactPanel: () => {
    set({ artifactPanelCollapsed: !get().artifactPanelCollapsed });
  },

  dismissFocusBanner: () => set({ focusBannerVisible: false }),

  toggleSessionGroup: (group) => {
    set({
      sessionGroupsCollapsed: {
        ...get().sessionGroupsCollapsed,
        [group]: !get().sessionGroupsCollapsed[group],
      },
    });
  },

  setSessionSearch: (q) => set({ sessionSearch: q }),
  openCreateDialog: () => {
    if (!canExecuteChat()) {
      useConversationStore.setState({ pushToast: READONLY_EXECUTE_HINT });
      return;
    }
    set({ createDialogOpen: true });
  },
  closeCreateDialog: () => set({ createDialogOpen: false }),
  toggleResourceExplorer: () => set((s) => ({ resourceExplorerOpen: !s.resourceExplorerOpen })),
  closeResourceExplorer: () => set({ resourceExplorerOpen: false }),
}));
