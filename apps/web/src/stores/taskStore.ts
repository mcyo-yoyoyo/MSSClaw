import { create } from 'zustand';

const LS_TASKLIST = 'mssclaw_tasklist_collapsed';
const LS_ARTIFACT = 'mssclaw_artifact_collapsed';
const LS_SESSION_GROUPS = 'mssclaw_session_groups';

function loadSessionGroups(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(LS_SESSION_GROUPS) || '{}');
  } catch {
    return {};
  }
}

interface TaskState {
  taskListCollapsed: boolean;
  artifactPanelCollapsed: boolean;
  /** 从智能助理进入时的专注提示条 */
  focusBannerVisible: boolean;
  sessionGroupsCollapsed: Record<string, boolean>;
  sessionSearch: string;
  createDialogOpen: boolean;
  createDialogPreset: 'agent' | 'warroom';
  resourceExplorerOpen: boolean;
  toggleTaskList: () => void;
  toggleArtifactPanel: () => void;
  dismissFocusBanner: () => void;
  toggleSessionGroup: (group: string) => void;
  setSessionSearch: (q: string) => void;
  openCreateDialog: (preset?: 'agent' | 'warroom') => void;
  closeCreateDialog: () => void;
  toggleResourceExplorer: () => void;
  closeResourceExplorer: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  taskListCollapsed: localStorage.getItem(LS_TASKLIST) === '1',
  artifactPanelCollapsed: localStorage.getItem(LS_ARTIFACT) === '1',
  focusBannerVisible: false,
  sessionGroupsCollapsed: loadSessionGroups(),
  sessionSearch: '',
  createDialogOpen: false,
  createDialogPreset: 'agent',
  resourceExplorerOpen: false,

  toggleTaskList: () => {
    const next = !get().taskListCollapsed;
    localStorage.setItem(LS_TASKLIST, next ? '1' : '0');
    set({ taskListCollapsed: next });
  },

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
  openCreateDialog: (preset = 'agent') => set({ createDialogOpen: true, createDialogPreset: preset }),
  closeCreateDialog: () => set({ createDialogOpen: false, createDialogPreset: 'agent' }),
  toggleResourceExplorer: () => set((s) => ({ resourceExplorerOpen: !s.resourceExplorerOpen })),
  closeResourceExplorer: () => set({ resourceExplorerOpen: false }),
}));
