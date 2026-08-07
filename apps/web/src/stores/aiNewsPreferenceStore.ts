import { create } from 'zustand';
import { getCurrentUserId } from '@/domain/currentUser';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const LS_PREFIX = 'mssclaw_ai_news_pref_v2_';

export type AiNewsPreference = {
  /**
   * WeLink 推送意向（接口未打通前仅本地记录，UI 置灰不可用）
   * @deprecated 短期请用 welinkPushEnabled；保留兼容旧字段
   */
  subscribed: boolean;
  /** 预留：WeLink 推送开关（待上线） */
  welinkPushEnabled: boolean;
  /** 邮件推送订阅 */
  emailSubscribed: boolean;
  /** 接收 AI 快讯的邮箱 */
  email: string;
  updatedAt: string;
};

function storageKey(userId: string, workspaceId: string) {
  return `${LS_PREFIX}${workspaceId}_${userId || 'anon'}`;
}

function legacyKey(userId: string, workspaceId: string) {
  return `mssclaw_ai_news_pref_${workspaceId}_${userId || 'anon'}`;
}

function defaultPref(): AiNewsPreference {
  return {
    subscribed: false,
    welinkPushEnabled: false,
    emailSubscribed: false,
    email: '',
    updatedAt: new Date().toISOString(),
  };
}

function readPref(userId: string, workspaceId: string): AiNewsPreference {
  try {
    const raw =
      localStorage.getItem(storageKey(userId, workspaceId)) ||
      localStorage.getItem(legacyKey(userId, workspaceId));
    if (!raw) return defaultPref();
    const parsed = JSON.parse(raw) as Partial<AiNewsPreference>;
    return {
      subscribed: Boolean(parsed.subscribed),
      welinkPushEnabled: Boolean(parsed.welinkPushEnabled ?? parsed.subscribed),
      emailSubscribed: Boolean(parsed.emailSubscribed),
      email: typeof parsed.email === 'string' ? parsed.email.trim() : '',
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return defaultPref();
  }
}

function writePref(userId: string, workspaceId: string, pref: AiNewsPreference) {
  localStorage.setItem(storageKey(userId, workspaceId), JSON.stringify(pref));
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

interface AiNewsPreferenceState {
  pref: AiNewsPreference;
  hydrate: () => void;
  /** @deprecated WeLink 待上线，请勿在 UI 启用 */
  setSubscribed: (subscribed: boolean) => void;
  setEmailSubscription: (email: string, subscribed: boolean) => { ok: boolean; message: string };
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
      welinkPushEnabled: subscribed,
      updatedAt: new Date().toISOString(),
    };
    writePref(userId, workspaceId, next);
    set({ pref: next });
  },

  setEmailSubscription: (email, subscribed) => {
    const trimmed = email.trim();
    if (subscribed && !isValidEmail(trimmed)) {
      return { ok: false, message: '请填写有效邮箱地址' };
    }
    const userId = getCurrentUserId() || 'anon';
    const workspaceId = useWorkspaceStore.getState().workspaceId;
    const next: AiNewsPreference = {
      ...get().pref,
      email: trimmed,
      emailSubscribed: subscribed,
      updatedAt: new Date().toISOString(),
    };
    writePref(userId, workspaceId, next);
    set({ pref: next });
    return {
      ok: true,
      message: subscribed
        ? '已保存邮箱并开启邮件推送（定时发送即将开通）'
        : trimmed
          ? '已保存邮箱，邮件推送已关闭'
          : '已关闭邮件推送',
    };
  },
}));

export { isValidEmail };
