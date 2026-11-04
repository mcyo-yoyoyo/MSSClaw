import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
/** 须先于 sessionStore：自定义部门/区域字典灌入后再 normalize 归属 */
import '@/stores/orgTaxonomyStore';
import { App } from './App';
import { OAuthCallbackView } from '@/features/auth/OAuthCallbackView';
import { isOAuthCallbackPath } from '@/domain/authMode';
import { captureDirectEntry, invalidateDirectEntry } from '@/domain/directEntry';
import './index.css';

// crypto.randomUUID only exists in secure contexts (HTTPS or localhost).
// Polyfill for non-secure access via IP address.
if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
  Object.defineProperty(crypto, 'randomUUID', {
    value: (): `${string}-${string}-${string}-${string}-${string}` =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }) as `${string}-${string}-${string}-${string}-${string}`,
    writable: true,
    configurable: true,
  });
}

// 直达判定只看页面加载那一刻，必须在任何路由跳转之前记下
captureDirectEntry({
  hash: window.location.hash,
  navigationType: (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type,
  fromApp: (window.history.state as { fromApp?: boolean } | null)?.fromApp,
  referrer: document.referrer,
});
window.addEventListener('popstate', invalidateDirectEntry);
window.addEventListener('hashchange', invalidateDirectEntry);

/**
 * IDaaS 回跳落在 /oauth/callback，这里直接渲染回调页而不挂载主壳：
 * 回调只需要换令牌，不该顺带把工作区目录、集市数据全拉一遍。
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isOAuthCallbackPath() ? (
      <OAuthCallbackView />
    ) : (
      <App />
    )}
  </StrictMode>,
);
