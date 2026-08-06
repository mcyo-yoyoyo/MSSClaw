import { create } from 'zustand';
import type { AppView } from '@/domain/appView';
import type { BusinessScenarioId } from '@/domain/businessScenarios';

type PortalOpsType = 'case' | 'playbook' | 'news' | 'training';

export interface NavReturnTarget {
  view: AppView;
  chatId?: string;
}

export type MarketToolDetailTab = 'overview' | 'howto' | 'resources';

/** 我的消息筛选意图（与页面 Filter 对齐） */
export type MessageFilterIntent =
  | 'all'
  | 'unread'
  | 'deliverable'
  | 'system'
  | 'user'
  | 'ai_news';

interface NavigationIntentState {
  pendingToolId: string | null;
  /** 打开工具详情时默认落在哪个 Tab */
  pendingToolDetailTab: MarketToolDetailTab | null;
  pendingKbDocId: string | null;
  pendingCaseId: string | null;
  /** 门户运营：打开后直达编辑某条内容 */
  pendingPortalEditId: string | null;
  pendingPortalType: PortalOpsType | null;
  pendingScenarioId: string | null;
  pendingMessageId: string | null;
  /** 打开「我的消息」时默认筛选 Tab */
  pendingMessageFilter: MessageFilterIntent | null;
  /** 打开「我的消息」并进入 AI 新闻累计总览 */
  pendingAiNewsOverview: boolean;
  pendingAiNewsFocusId: string | null;
  /** 用 · 做任务 / 学 · 找案例：预选业务场景筛选 */
  pendingBusinessScenario: BusinessScenarioId | 'all' | null;
  returnTarget: NavReturnTarget | null;
  focusTool: (id: string, opts?: { tab?: MarketToolDetailTab }) => void;
  focusKbDoc: (id: string) => void;
  focusCase: (id: string) => void;
  focusPortalEdit: (id: string) => void;
  focusPortalType: (type: PortalOpsType) => void;
  focusScenario: (id: string) => void;
  focusMessage: (id: string) => void;
  focusMessageFilter: (filter: MessageFilterIntent) => void;
  focusAiNewsOverview: (focusId?: string) => void;
  focusBusinessScenario: (id: BusinessScenarioId | 'all') => void;
  setReturnTarget: (target: NavReturnTarget | null) => void;
  peekToolId: () => string | null;
  peekToolDetailTab: () => MarketToolDetailTab | null;
  peekKbDocId: () => string | null;
  peekCaseId: () => string | null;
  peekPortalEditId: () => string | null;
  peekPortalType: () => PortalOpsType | null;
  peekScenarioId: () => string | null;
  peekMessageId: () => string | null;
  peekMessageFilter: () => MessageFilterIntent | null;
  peekAiNewsOverview: () => boolean;
  peekAiNewsFocusId: () => string | null;
  peekBusinessScenario: () => BusinessScenarioId | 'all' | null;
  peekReturnTarget: () => NavReturnTarget | null;
  consumeToolId: () => string | null;
  consumeToolDetailTab: () => MarketToolDetailTab | null;
  consumeKbDocId: () => string | null;
  consumeCaseId: () => string | null;
  consumePortalEditId: () => string | null;
  consumePortalType: () => PortalOpsType | null;
  consumeScenarioId: () => string | null;
  consumeMessageId: () => string | null;
  consumeMessageFilter: () => MessageFilterIntent | null;
  consumeAiNewsOverview: () => { open: boolean; focusId: string | null };
  consumeBusinessScenario: () => BusinessScenarioId | 'all' | null;
  consumeReturnTarget: () => NavReturnTarget | null;
  clearAll: () => void;
  clearTool: () => void;
  clearKb: () => void;
  clearCase: () => void;
  clearPortalEdit: () => void;
  clearScenario: () => void;
  clearMessage: () => void;
  clearBusinessScenario: () => void;
  clearReturnTarget: () => void;
}

export const useNavigationIntentStore = create<NavigationIntentState>((set, get) => ({
  pendingToolId: null,
  pendingToolDetailTab: null,
  pendingKbDocId: null,
  pendingCaseId: null,
  pendingPortalEditId: null,
  pendingPortalType: null,
  pendingScenarioId: null,
  pendingMessageId: null,
  pendingMessageFilter: null,
  pendingAiNewsOverview: false,
  pendingAiNewsFocusId: null,
  pendingBusinessScenario: null,
  returnTarget: null,

  focusTool: (id, opts) =>
    set({
      pendingToolId: id,
      pendingToolDetailTab: opts?.tab ?? null,
    }),
  focusKbDoc: (id) => set({ pendingKbDocId: id }),
  focusCase: (id) => set({ pendingCaseId: id }),
  focusPortalEdit: (id) => set({ pendingPortalEditId: id }),
  focusPortalType: (type) => set({ pendingPortalType: type }),
  focusScenario: (id) => set({ pendingScenarioId: id }),
  focusMessage: (id) => set({ pendingMessageId: id }),
  focusMessageFilter: (filter) => set({ pendingMessageFilter: filter }),
  focusAiNewsOverview: (focusId) =>
    set({
      pendingAiNewsOverview: true,
      pendingAiNewsFocusId: focusId ?? null,
    }),
  focusBusinessScenario: (id) => set({ pendingBusinessScenario: id }),
  setReturnTarget: (target) => set({ returnTarget: target }),

  peekToolId: () => get().pendingToolId,
  peekToolDetailTab: () => get().pendingToolDetailTab,
  peekKbDocId: () => get().pendingKbDocId,
  peekCaseId: () => get().pendingCaseId,
  peekPortalEditId: () => get().pendingPortalEditId,
  peekPortalType: () => get().pendingPortalType,
  peekScenarioId: () => get().pendingScenarioId,
  peekMessageId: () => get().pendingMessageId,
  peekMessageFilter: () => get().pendingMessageFilter,
  peekAiNewsOverview: () => get().pendingAiNewsOverview,
  peekAiNewsFocusId: () => get().pendingAiNewsFocusId,
  peekBusinessScenario: () => get().pendingBusinessScenario,
  peekReturnTarget: () => get().returnTarget,

  consumeToolId: () => {
    const id = get().pendingToolId;
    if (id) set({ pendingToolId: null });
    return id;
  },
  consumeToolDetailTab: () => {
    const tab = get().pendingToolDetailTab;
    if (tab) set({ pendingToolDetailTab: null });
    return tab;
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
  consumePortalEditId: () => {
    const id = get().pendingPortalEditId;
    if (id) set({ pendingPortalEditId: null });
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
  consumeMessageId: () => {
    const id = get().pendingMessageId;
    if (id) set({ pendingMessageId: null });
    return id;
  },
  consumeMessageFilter: () => {
    const f = get().pendingMessageFilter;
    if (f) set({ pendingMessageFilter: null });
    return f;
  },
  consumeAiNewsOverview: () => {
    const open = get().pendingAiNewsOverview;
    const focusId = get().pendingAiNewsFocusId;
    if (open || focusId) {
      set({ pendingAiNewsOverview: false, pendingAiNewsFocusId: null });
    }
    return { open, focusId };
  },
  consumeBusinessScenario: () => {
    const id = get().pendingBusinessScenario;
    if (id) set({ pendingBusinessScenario: null });
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
      pendingToolDetailTab: null,
      pendingKbDocId: null,
      pendingCaseId: null,
      pendingPortalEditId: null,
      pendingPortalType: null,
      pendingScenarioId: null,
      pendingMessageId: null,
      pendingMessageFilter: null,
      pendingAiNewsOverview: false,
      pendingAiNewsFocusId: null,
      pendingBusinessScenario: null,
      returnTarget: null,
    }),
  clearTool: () => set({ pendingToolId: null, pendingToolDetailTab: null }),
  clearKb: () => set({ pendingKbDocId: null }),
  clearCase: () => set({ pendingCaseId: null }),
  clearPortalEdit: () => set({ pendingPortalEditId: null }),
  clearScenario: () => set({ pendingScenarioId: null }),
  clearMessage: () =>
    set({
      pendingMessageId: null,
      pendingMessageFilter: null,
      pendingAiNewsOverview: false,
      pendingAiNewsFocusId: null,
    }),
  clearBusinessScenario: () => set({ pendingBusinessScenario: null }),
  clearReturnTarget: () => set({ returnTarget: null }),
}));
