import { create } from 'zustand';
import { getCurrentUserId } from '@/domain/currentUser';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const LS_PREFIX = 'mssclaw_ai_news_pref_';

export type AiNewsPreference = {
  /** 同意后续同步 WeLink（二期真实推送）；站内新闻仍全员可读 */
  subscribed: boolean;
  /** 预留：WeLink 推送开关 */
  welinkPushEnabled: boolean;
  updatedAt: string;
};

function storageKey(userId: string, workspaceId: string) {
  return `${LS_PREFIX}${workspaceId}_${userId || 'anon'}`;
}

function defaultPref(): AiNewsPreference {
  return {
    subscribed: false,
    welinkPushEnabled: false,
    updatedAt: new Date().toISOString(),
  };
}

function readPref(userId: string, workspaceId: string): AiNewsPreference {
  try {
    const raw = localStorage.getItem(storageKey(userId, workspaceId));
    if (!raw) return defaultPref();
    const parsed = JSON.parse(raw) as Partial<AiNewsPreference>;
    return {
      subscribed: Boolean(parsed.subscribed),
      welinkPushEnabled: Boolean(parsed.welinkPushEnabled),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return defaultPref();
  }
}

function writePref(userId: string, workspaceId: string, pref: AiNewsPreference) {
  localStorage.setItem(storageKey(userId, workspaceId), JSON.stringify(pref));
}

interface AiNewsPreferenceState {
  pref: AiNewsPreference;
  hydrate: () => void;
  setSubscribed: (subscribed: boolean) => void;
}

export const useAiNewsPreferenceStore = create<AiNewsPreferenceState>((set, get) => ({
  pref: defaultPref(),

  hydrate: () => {
    const userId = getCurrentUserId() || 'anon';
    const workspaceId = useWorkspaceStore.getState().workspaceId;
    set({ pref: readPref(userId, workspaceId) });
  },

  setSubscribed: (subscribed) => {
    const userId = getCurrentUserId() || 'anon';
    const workspaceId = useWorkspaceStore.getState().workspaceId;
    const next: AiNewsPreference = {
      ...get().pref,
      subscribed,
      // 一期订阅即表示愿意开通 WeLink；真实推送仍待二期
      welinkPushEnabled: subscribed,
      updatedAt: new Date().toISOString(),
    };
    writePref(userId, workspaceId, next);
    set({ pref: next });
  },
}));
