import { create } from 'zustand';
import { fetchAuthConfig } from '@/api/authOAuthApi';
import { authModeOverride, type AuthMode } from '@/domain/authMode';
import { isApiEnabled } from '@/api/client';

interface AuthModeState {
  mode: AuthMode;
  providerLabel: string;
  /** 服务端 OAuth 配置是否完整；false 时登录页要显式提示运维 */
  ready: boolean;
  /** 是否已从服务端问到过；未问到前登录区先不渲染，避免闪一下密码表单再跳走 */
  resolved: boolean;
  resolve: () => Promise<void>;
}

let inflight: Promise<void> | null = null;

export const useAuthModeStore = create<AuthModeState>((set) => ({
  mode: 'password',
  providerLabel: '账号密码',
  ready: true,
  resolved: false,

  resolve: async () => {
    const override = authModeOverride();
    if (override) {
      // 构建期显式指定：本地想用生产构建调密码登录时用，正常部署不配
      set({ mode: override, providerLabel: override === 'oauth' ? '企业统一身份认证' : '账号密码', ready: true, resolved: true });
      return;
    }
    // 静态托管 / 强制本地演示：没有后端就没有 OAuth
    if (!isApiEnabled()) {
      set({ mode: 'password', resolved: true });
      return;
    }
    if (inflight) return inflight;
    inflight = (async () => {
      const config = await fetchAuthConfig();
      set(
        config
          ? { mode: config.mode, providerLabel: config.providerLabel, ready: config.ready, resolved: true }
          : // 问不到就按密码登录渲染：至少不会把用户卡在白屏
            { mode: 'password', resolved: true },
      );
      inflight = null;
    })();
    return inflight;
  },
}));

/** 非组件上下文里同步读当前模式 */
export function currentAuthMode(): AuthMode {
  return useAuthModeStore.getState().mode;
}
