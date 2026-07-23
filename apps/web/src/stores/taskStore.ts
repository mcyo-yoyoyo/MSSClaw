import { create } from 'zustand';
import { canExecuteChat, READONLY_EXECUTE_HINT } from '@/domain/permissions';
import { useConversationStore } from '@/stores/conversationStore';

const LS_ARTIFACT = 'mssclaw_artifact_collapsed';
const LS_SESSION_GROUPS = 'mssclaw_session_groups';

function loadSessionGroups(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(LS_SESSION_GROUPS) || '{}');
  } catch {
    return {};
  }
}

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
  artifactPanelCollapsed: localStorage.getItem(LS_ARTIFACT) === '1',
  focusBannerVisible: false,
  sessionGroupsCollapsed: loadSessionGroups(),
  sessionSearch: '',
  createDialogOpen: false,
  resourceExplorerOpen: false,
  taskLanding: 'tasks',

  setTaskLanding: (taskLanding) => set({ taskLanding }),

  toggleArtifactPanel: () => {
    const next = !get().artifactPanelCollapsed;
    localStorage.setItem(LS_ARTIFACT, next ? '1' : '0');
    set({ artifactPanelCollapsed: next });
  },

  dismissFocusBanner: () => set({ focusBannerVisible: false }),

  toggleSessionGroup: (group) => {
    const next = { ...get().sessionGroupsCollapsed, [group]: !get().sessionGroupsCollapsed[group] };
    localStorage.setItem(LS_SESSION_GROUPS, JSON.stringify(next));
    set({ sessionGroupsCollapsed: next });
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
