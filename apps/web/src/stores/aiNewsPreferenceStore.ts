import { create } from 'zustand';
import {
  fetchMyAiBriefSubscription,
  subscribeAiBriefEmail,
  unsubscribeAiBriefEmail,
} from '@/api/aiBriefSubscriptionsApi';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
} from '@/api/platformDocsApi';

export type AiNewsPreference = {
  /** WeLink 推送意向（接口待上线，暂不开放 UI） */
  subscribed: boolean;
  welinkPushEnabled: boolean;
  /** 当前用户是否已在数据库中登记邮件订阅 */
  emailSubscribed: boolean;
  /** 接收 AI 快讯的邮箱 */
  email: string;
  updatedAt: string;
};

function defaultPref(): AiNewsPreference {
  return {
    subscribed: false,
    welinkPushEnabled: false,
    emailSubscribed: false,
    email: '',
    updatedAt: new Date().toISOString(),
  };
}

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

let hydrateGeneration = 0;

interface AiNewsPreferenceState {
  pref: AiNewsPreference;
  loading: boolean;
  saving: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  /** @deprecated WeLink 待上线，请勿在 UI 启用 */
  setSubscribed: (subscribed: boolean) => void;
  setEmailSubscription: (
    email: string,
    subscribed: boolean,
  ) => Promise<{ ok: boolean; message: string }>;
}

export const useAiNewsPreferenceStore = create<AiNewsPreferenceState>((set, get) => ({
  pref: defaultPref(),
  loading: false,
  saving: false,
  error: null,

  hydrate: async () => {
    const generation = ++hydrateGeneration;
    const workspaceId = currentWorkspaceId();
    if (!canUsePlatformDocsApi()) {
      set({ pref: defaultPref(), loading: false, error: '共享服务未连接' });
      return;
    }
    set({ loading: true, error: null });
    try {
      const subscription = await fetchMyAiBriefSubscription(workspaceId);
      if (generation !== hydrateGeneration || currentWorkspaceId() !== workspaceId) return;
      set({
        pref: {
          ...get().pref,
          emailSubscribed: Boolean(subscription),
          email: subscription?.email ?? '',
          updatedAt: subscription?.updatedAt ?? new Date().toISOString(),
        },
        loading: false,
      });
    } catch {
      if (generation !== hydrateGeneration || currentWorkspaceId() !== workspaceId) return;
      set({ pref: defaultPref(), loading: false, error: '订阅状态加载失败' });
    }
  },

  setSubscribed: (subscribed) => {
    set({
      pref: {
        ...get().pref,
        subscribed,
        welinkPushEnabled: subscribed,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  setEmailSubscription: async (email, subscribed) => {
    const trimmed = email.trim();
    if (subscribed && !isValidEmail(trimmed)) {
      return { ok: false, message: '请填写有效邮箱地址' };
    }
    if (!canUsePlatformDocsApi()) {
      return { ok: false, message: '共享服务未连接，订阅信息无法保存到后台' };
    }

    const workspaceId = currentWorkspaceId();
    set({ saving: true, error: null });
    try {
      if (subscribed) {
        const saved = await subscribeAiBriefEmail(workspaceId, trimmed);
        if (currentWorkspaceId() !== workspaceId) {
          return { ok: false, message: '工作区已切换，请重新订阅' };
        }
        set({
          pref: {
            ...get().pref,
            email: saved.email,
            emailSubscribed: true,
            updatedAt: saved.updatedAt,
          },
          saving: false,
        });
        return { ok: true, message: '订阅成功，邮箱已保存到后台' };
      }

      await unsubscribeAiBriefEmail(workspaceId);
      if (currentWorkspaceId() !== workspaceId) {
        return { ok: false, message: '工作区已切换，请重新操作' };
      }
      set({
        pref: {
          ...get().pref,
          email: trimmed,
          emailSubscribed: false,
          updatedAt: new Date().toISOString(),
        },
        saving: false,
      });
      return { ok: true, message: '已取消邮件订阅' };
    } catch {
      if (currentWorkspaceId() === workspaceId) {
        set({ saving: false, error: '订阅信息保存失败' });
      }
      return { ok: false, message: '保存失败，请检查后台服务后重试' };
    } finally {
      if (currentWorkspaceId() === workspaceId) set({ saving: false });
    }
  },
}));
