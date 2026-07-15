import { create } from 'zustand';

type PortalOpsType = 'news' | 'training';

interface NavigationIntentState {
  pendingToolId: string | null;
  pendingKbDocId: string | null;
  pendingCaseId: string | null;
  pendingPortalType: PortalOpsType | null;
  focusTool: (id: string) => void;
  focusKbDoc: (id: string) => void;
  focusCase: (id: string) => void;
  focusPortalType: (type: PortalOpsType) => void;
  peekToolId: () => string | null;
  peekKbDocId: () => string | null;
  peekCaseId: () => string | null;
  peekPortalType: () => PortalOpsType | null;
  consumeToolId: () => string | null;
  consumeKbDocId: () => string | null;
  consumeCaseId: () => string | null;
  consumePortalType: () => PortalOpsType | null;
  clearAll: () => void;
  clearTool: () => void;
  clearKb: () => void;
  clearCase: () => void;
}

export const useNavigationIntentStore = create<NavigationIntentState>((set, get) => ({
  pendingToolId: null,
  pendingKbDocId: null,
  pendingCaseId: null,
  pendingPortalType: null,

  focusTool: (id) => set({ pendingToolId: id }),
  focusKbDoc: (id) => set({ pendingKbDocId: id }),
  focusCase: (id) => set({ pendingCaseId: id }),
  focusPortalType: (type) => set({ pendingPortalType: type }),

  peekToolId: () => get().pendingToolId,
  peekKbDocId: () => get().pendingKbDocId,
  peekCaseId: () => get().pendingCaseId,
  peekPortalType: () => get().pendingPortalType,

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

  clearAll: () =>
    set({
      pendingToolId: null,
      pendingKbDocId: null,
      pendingCaseId: null,
      pendingPortalType: null,
    }),
  clearTool: () => set({ pendingToolId: null }),
  clearKb: () => set({ pendingKbDocId: null }),
  clearCase: () => set({ pendingCaseId: null }),
}));
