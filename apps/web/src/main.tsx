import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
/** 须先于 sessionStore：自定义部门/区域字典灌入后再 normalize 归属 */
import '@/stores/orgTaxonomyStore';
import { App } from './App';
import { OAuthCallbackView } from '@/features/auth/OAuthCallbackView';
import { isOAuthCallbackPath } from '@/domain/authMode';
import './index.css';

/**
 * IDaaS 回跳落在 /oauth/callback，这里直接渲染回调页而不挂载主壳：
 * 回调只需要换令牌，不该顺带把工作区目录、集市数据全拉一遍。
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>{isOAuthCallbackPath() ? <OAuthCallbackView /> : <App />}</StrictMode>,
);
