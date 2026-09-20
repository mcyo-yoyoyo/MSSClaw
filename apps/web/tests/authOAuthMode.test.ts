import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createServer, type ViteDevServer } from 'vite';

type Store<T> = { getState: () => T; setState: (patch: Partial<T>) => void };

type SessionState = {
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
};

type AuthModeState = { mode: 'password' | 'oauth'; resolved: boolean };

type WorkspaceState = {
  workspaceId: string;
  apiConnected: boolean;
  apiStatus: 'unknown' | 'connected' | 'unreachable' | 'local-demo';
};

type AuthModeModule = {
  isOAuthCallbackPath: (pathname?: string) => boolean;
  readCallbackParams: (search?: string) => {
    code: string;
    state: string;
    error: string;
    errorDescription: string;
  };
  rememberReturnTo: (hash: string) => void;
  takeReturnTo: () => string;
};

let vite: ViteDevServer;
let sessionStore: Store<SessionState>;
let authModeStore: Store<AuthModeState>;
let workspaceStore: Store<WorkspaceState>;
let authMode: AuthModeModule;

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;

/** 只在测试里提供最小 sessionStorage，domain 层对它全部做了 try/catch */
function installSessionStorage() {
  const map = new Map<string, string>();
  (globalThis as Record<string, unknown>).sessionStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  };
}

before(async () => {
  vite = await createServer({
    configFile: './vite.react.config.ts',
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  globalThis.window = globalThis as unknown as Window & typeof globalThis;
  installSessionStorage();
  globalThis.fetch = (async () =>
    new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

  sessionStore = (
    (await vite.ssrLoadModule('/src/stores/sessionStore.ts')) as {
      useSessionStore: Store<SessionState>;
    }
  ).useSessionStore;
  authModeStore = (
    (await vite.ssrLoadModule('/src/stores/authModeStore.ts')) as {
      useAuthModeStore: Store<AuthModeState>;
    }
  ).useAuthModeStore;
  workspaceStore = (
    (await vite.ssrLoadModule('/src/stores/workspaceStore.ts')) as {
      useWorkspaceStore: Store<WorkspaceState>;
    }
  ).useWorkspaceStore;
  authMode = (await vite.ssrLoadModule('/src/domain/authMode.ts')) as AuthModeModule;
});

after(async () => {
  await vite?.close();
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
});

beforeEach(() => {
  authModeStore.setState({ mode: 'password', resolved: true });
  workspaceStore.setState({ workspaceId: 'ws-mss-ai', apiConnected: true, apiStatus: 'connected' });
});

test('回调路径识别：只认 /oauth/callback，兼容子路径部署与结尾斜杠', () => {
  assert.equal(authMode.isOAuthCallbackPath('/oauth/callback'), true);
  assert.equal(authMode.isOAuthCallbackPath('/oauth/callback/'), true);
  assert.equal(authMode.isOAuthCallbackPath('/MSSClaw/oauth/callback'), true);
  assert.equal(authMode.isOAuthCallbackPath('/'), false);
  assert.equal(authMode.isOAuthCallbackPath('/home'), false);
  assert.equal(authMode.isOAuthCallbackPath('/oauth/callback-fake'), false);
});

test('回调参数从 query 读取（hash 不会发给服务端，也不保证被保留）', () => {
  const ok = authMode.readCallbackParams('?code=ABC&state=S1');
  assert.equal(ok.code, 'ABC');
  assert.equal(ok.state, 'S1');

  const failed = authMode.readCallbackParams('?error=access_denied&error_description=nope');
  assert.equal(failed.error, 'access_denied');
  assert.equal(failed.errorDescription, 'nope');
});

test('登录前的路由被记住并且只取一次；非站内 hash 一律丢弃', () => {
  authMode.rememberReturnTo('#/market-internal');
  assert.equal(authMode.takeReturnTo(), '#/market-internal');
  assert.equal(authMode.takeReturnTo(), '', '取过一次就该清掉，避免下次登录被送到旧页面');

  authMode.rememberReturnTo('https://evil.example.com');
  assert.equal(authMode.takeReturnTo(), '', '非 #/ 开头的值不得成为跳转目标');
});

test('oauth 模式下密码登录被前端直接拒绝', async () => {
  authModeStore.setState({ mode: 'oauth' });
  const result = await sessionStore.getState().login('mcyo@huawei.com', 'mssclaw');
  assert.equal(result.ok, false);
  assert.match((result as { error: string }).error, /统一身份/);
  assert.equal(sessionStore.getState().isAuthenticated, false);
});

test('【安全红线】oauth 模式下 API 不可达时，绝不能回落本地演示账号登录', async () => {
  authModeStore.setState({ mode: 'oauth' });
  // 制造"后端打不通"的场景：密码模式下这里会走本地账号表兜底
  workspaceStore.setState({ apiConnected: false, apiStatus: 'unreachable' });

  const result = await sessionStore.getState().login('mcyo@huawei.com', 'mssclaw');

  assert.equal(result.ok, false, '把 API 打挂不能成为绕过 SSO 的登录路径');
  assert.equal(sessionStore.getState().isAuthenticated, false);
});

test('password 模式下，离线兜底登录仍然可用（不影响开发环境）', async () => {
  authModeStore.setState({ mode: 'password' });
  workspaceStore.setState({ apiConnected: false, apiStatus: 'unreachable' });

  const result = await sessionStore.getState().login('mcyo@huawei.com', 'mssclaw');

  assert.equal(result.ok, true, '开发环境必须保持原有账号密码登录体验');
  assert.equal(sessionStore.getState().isAuthenticated, true);
});
