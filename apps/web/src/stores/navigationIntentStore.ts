import { create } from 'zustand';
import type { AppView } from '@/domain/appView';

type PortalOpsType = 'case' | 'news' | 'training';

export interface NavReturnTarget {
  view: AppView;
  chatId?: string;
}

interface NavigationIntentState {
  pendingToolId: string | null;
  pendingKbDocId: string | null;
  pendingCaseId: string | null;
  pendingPortalType: PortalOpsType | null;
  pendingScenarioId: string | null;
  returnTarget: NavReturnTarget | null;
  focusTool: (id: string) => void;
  focusKbDoc: (id: string) => void;
  focusCase: (id: string) => void;
  focusPortalType: (type: PortalOpsType) => void;
  focusScenario: (id: string) => void;
  setReturnTarget: (target: NavReturnTarget | null) => void;
  peekToolId: () => string | null;
  peekKbDocId: () => string | null;
  peekCaseId: () => string | null;
  peekPortalType: () => PortalOpsType | null;
  peekScenarioId: () => string | null;
  peekReturnTarget: () => NavReturnTarget | null;
  consumeToolId: () => string | null;
  consumeKbDocId: () => string | null;
  consumeCaseId: () => string | null;
  consumePortalType: () => PortalOpsType | null;
  consumeScenarioId: () => string | null;
  consumeReturnTarget: () => NavReturnTarget | null;
  clearAll: () => void;
  clearTool: () => void;
  clearKb: () => void;
  clearCase: () => void;
  clearScenario: () => void;
  clearReturnTarget: () => void;
}

export const useNavigationIntentStore = create<NavigationIntentState>((set, get) => ({
  pendingToolId: null,
  pendingKbDocId: null,
  pendingCaseId: null,
  pendingPortalType: null,
  pendingScenarioId: null,
  returnTarget: null,

  focusTool: (id) => set({ pendingToolId: id }),
  focusKbDoc: (id) => set({ pendingKbDocId: id }),
  focusCase: (id) => set({ pendingCaseId: id }),
  focusPortalType: (type) => set({ pendingPortalType: type }),
  focusScenario: (id) => set({ pendingScenarioId: id }),
  setReturnTarget: (target) => set({ returnTarget: target }),

  peekToolId: () => get().pendingToolId,
  peekKbDocId: () => get().pendingKbDocId,
  peekCaseId: () => get().pendingCaseId,
  peekPortalType: () => get().pendingPortalType,
  peekScenarioId: () => get().pendingScenarioId,
  peekReturnTarget: () => get().returnTarget,

  consumeToolId: () => {
    const id = get().pendingToolId;
    if (id) set({ pendingToolId: null });
    return id;
  },
  consumeKbDocId: () => {
    const id = get().pendingKbDocId;
    if (id) set({ pendingKbDocId: null });
    return id;
  },
  consumeCaseId: () => {
    const id = get().pendingCaseId;
    if (id) set({ pendingCaseId: null });
    return id;
  },
  consumePortalType: () => {
    const t = get().pendingPortalType;
    if (t) set({ pendingPortalType: null });
    return t;
  },
  consumeScenarioId: () => {
    const id = get().pendingScenarioId;
    if (id) set({ pendingScenarioId: null });
    return id;
  },
  consumeReturnTarget: () => {
    const t = get().returnTarget;
    if (t) set({ returnTarget: null });
    return t;
  },

  clearAll: () =>
    set({
      pendingToolId: null,
      pendingKbDocId: null,
      pendingCaseId: null,
      pendingPortalType: null,
      pendingScenarioId: null,
      returnTarget: null,
    }),
  clearTool: () => set({ pendingToolId: null }),
  clearKb: () => set({ pendingKbDocId: null }),
  clearCase: () => set({ pendingCaseId: null }),
  clearScenario: () => set({ pendingScenarioId: null }),
  clearReturnTarget: () => set({ returnTarget: null }),
}));
