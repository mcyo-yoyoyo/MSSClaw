import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import * as React from 'react';
import { createServer, type ViteDevServer } from 'vite';

type SessionState = {
  user: unknown;
  mode: 'guest' | 'user';
  isAuthenticated: boolean;
  isGuest: boolean;
  shellReady: boolean;
  visitorId: string;
  suppressGuestGate: boolean;
  enterGuest: (options?: { suppressGate?: boolean }) => void;
  clearGuestGateSuppression: () => void;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
};

type AuthGateState = {
  open: boolean;
  hint: string;
  action: string | null;
  close: () => void;
  resolveAfterLogin: () => void;
};

type Store<T> = { getState: () => T; setState: (patch: Partial<T>) => void };

type WorkspaceState = {
  workspaceId: string;
  catalogReady: boolean;
  apiConnected: boolean;
  apiStatus: 'unknown' | 'connected' | 'unreachable' | 'local-demo';
};

type AppViewState = {
  appView: string;
  setAppView: (view: string) => void;
};

type MarketFavoriteState = {
  items: Array<{ id: string; kind: string }>;
  toggle: (item: {
    id: string;
    kind: 'external';
    title: string;
  }) => boolean;
};

type ConversationState = {
  chats: Record<string, { skillId?: string }>;
  currentChatId: string;
  persistWorkspaceId: string | null;
  pushToast: string | null;
  createAgentTaskSession: (input: {
    title: string;
    skillId: string;
    taskSource: 'skill';
    switchTo: boolean;
  }) => string;
};

type TrafficEffect = () => void | (() => void);

let vite: ViteDevServer;
let sessionStore: Store<SessionState>;
let authGateStore: Store<AuthGateState>;
let workspaceStore: Store<WorkspaceState>;
let appViewStore: Store<AppViewState>;
let marketFavoriteStore: Store<MarketFavoriteState>;
let conversationStore: Store<ConversationState>;
let requireLogin: (action: string, replay?: () => void) => boolean;
let usePortalTrafficTracking: () => void;
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;

const jsonFetch = (async () =>
  new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })) as
  typeof fetch;

function setAuthenticatedUser() {
  sessionStore.setState({
    user: {
      id: 'u-dickson',
      name: 'Dickson',
      email: 'dickson@huawei.com',
      platformRole: 'business_user',
      avatar: 'bg-amber-500',
      deptIds: ['gtm'],
      regionId: 'apac',
    },
    mode: 'user',
    isAuthenticated: true,
    isGuest: false,
    shellReady: true,
    suppressGuestGate: false,
  });
}

/** 与 App.handleInvokeSkill 相同的门禁契约：放行时立即执行，拦截时交给登录后重放。 */
function invokeSkillThroughChatGate(skillId: string): void {
  const replay = () => {
    conversationStore.getState().createAgentTaskSession({
      title: `Skill ${skillId}`,
      skillId,
      taskSource: 'skill',
      switchTo: false,
    });
  };
  if (!requireLogin('chat', replay)) return;
  replay();
}

/**
 * 只替代 React 的 hook dispatcher，不模拟业务模块。这样可以在没有 DOM 测试库的
 * Node 测试中真实执行 tracking hook 产出的 effect，并核对最终网络请求。
 */
function renderTrafficHook(): TrafficEffect {
  const internals = (
    React as unknown as {
      __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: {
        H: unknown;
      };
    }
  ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const previousDispatcher = internals.H;
  const effects: TrafficEffect[] = [];
  internals.H = {
    useCallback: <T>(callback: T) => callback,
    useSyncExternalStore: (
      _subscribe: unknown,
      getSnapshot: () => unknown,
    ) => getSnapshot(),
    useDebugValue: () => undefined,
    useEffect: (effect: TrafficEffect) => {
      effects.push(effect);
    },
  };
  try {
    usePortalTrafficTracking();
  } finally {
    internals.H = previousDispatcher;
  }
  assert.equal(effects.length, 1, 'tracking hook 应注册且只注册一个 effect');
  return effects[0]!;
}

async function waitForCallCount(calls: unknown[], expected: number): Promise<void> {
  const deadline = Date.now() + 500;
  while (calls.length < expected && Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
  }
  assert.equal(calls.length, expected);
}

before(async () => {
  vite = await createServer({
    configFile: './vite.react.config.ts',
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  globalThis.fetch = jsonFetch;
  globalThis.window = globalThis as unknown as Window & typeof globalThis;
  sessionStore = (
    (await vite.ssrLoadModule('/src/stores/sessionStore.ts')) as {
      useSessionStore: Store<SessionState>;
    }
  ).useSessionStore;
  const gateModule = (await vite.ssrLoadModule('/src/stores/authGateStore.ts')) as {
    useAuthGateStore: Store<AuthGateState>;
    requireLogin: typeof requireLogin;
  };
  authGateStore = gateModule.useAuthGateStore;
  requireLogin = gateModule.requireLogin;
  workspaceStore = (
    (await vite.ssrLoadModule('/src/stores/workspaceStore.ts')) as {
      useWorkspaceStore: Store<WorkspaceState>;
    }
  ).useWorkspaceStore;
  appViewStore = (
    (await vite.ssrLoadModule('/src/stores/appViewStore.ts')) as {
      useAppViewStore: Store<AppViewState>;
    }
  ).useAppViewStore;
  marketFavoriteStore = (
    (await vite.ssrLoadModule('/src/stores/marketFavoriteStore.ts')) as {
      useMarketFavoriteStore: Store<MarketFavoriteState>;
    }
  ).useMarketFavoriteStore;
  conversationStore = (
    (await vite.ssrLoadModule('/src/stores/conversationStore.ts')) as {
      useConversationStore: Store<ConversationState>;
    }
  ).useConversationStore;
  usePortalTrafficTracking = (
    (await vite.ssrLoadModule('/src/hooks/usePortalTrafficTracking.ts')) as {
      usePortalTrafficTracking: () => void;
    }
  ).usePortalTrafficTracking;
});

after(async () => {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window;
  else globalThis.window = originalWindow;
  await vite.close();
});

beforeEach(() => {
  globalThis.fetch = jsonFetch;
  authGateStore.getState().close();
  sessionStore.getState().enterGuest();
  workspaceStore.setState({
    workspaceId: 'ws-guest-session-test',
    catalogReady: true,
    apiConnected: false,
    apiStatus: 'local-demo',
  });
  appViewStore.setState({ appView: 'home' });
  marketFavoriteStore.setState({ items: [] });
  conversationStore.setState({
    chats: {},
    currentChatId: '',
    persistWorkspaceId: null,
    pushToast: null,
  });
});

test('游客态：可渲染主壳但不算已登录', () => {
  const state = sessionStore.getState();

  assert.equal(state.mode, 'guest');
  assert.equal(state.isGuest, true);
  assert.equal(state.isAuthenticated, false);
  assert.equal(state.shellReady, true, '游客必须能进主页，而不是被登录页拦下');
  assert.equal(state.user, null, '游客不应伪造出一个用户身份');
  assert.match(state.visitorId, /^[0-9a-f-]{36}$/i);
});

test('游客可进入 task / ai-tasks，登录态 viewer 仍遵守只读角色的展示配置', () => {
  appViewStore.getState().setAppView('task');
  assert.equal(appViewStore.getState().appView, 'task');

  appViewStore.getState().setAppView('ai-tasks');
  assert.equal(appViewStore.getState().appView, 'ai-tasks');

  sessionStore.setState({
    user: {
      id: 'u-viewer',
      name: 'Viewer',
      email: 'viewer@huawei.com',
      platformRole: 'viewer',
      avatar: 'bg-slate-500',
    },
    mode: 'user',
    isAuthenticated: true,
    isGuest: false,
    shellReady: true,
  });
  appViewStore.getState().setAppView('task');
  assert.equal(appViewStore.getState().appView, 'home');
});

test('游客收藏直接早退，不改本地列表且不会异步 PUT 共享文档', async () => {
  workspaceStore.setState({ apiConnected: true, apiStatus: 'connected' });
  const requests: Array<{ method: string; url: string }> = [];
  globalThis.fetch = (async (input, init) => {
    requests.push({ method: init?.method ?? 'GET', url: String(input) });
    return new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  const favorited = marketFavoriteStore.getState().toggle({
    id: 'tool-guest-must-not-persist',
    kind: 'external',
    title: '游客不可收藏',
  });

  assert.equal(favorited, false);
  assert.deepEqual(marketFavoriteStore.getState().items, []);
  // scheduleSavePlatformDoc 默认 500ms 防抖；越过窗口后再断言，避免只测到“尚未 PUT”。
  await new Promise<void>((resolve) => setTimeout(resolve, 650));
  assert.equal(
    requests.filter((request) => request.method === 'PUT').length,
    0,
    '游客 toggle 不得写入 anonymous 桶或互动计数文档',
  );
});

test('游客触发受限动作：拦下并挂起，登录成功后重放一次', () => {
  sessionStore.getState().enterGuest();
  let replayed = 0;

  const allowed = requireLogin('favorite', () => {
    replayed += 1;
  });

  assert.equal(allowed, false);
  assert.equal(authGateStore.getState().open, true);
  assert.equal(authGateStore.getState().action, 'favorite');
  assert.equal(authGateStore.getState().hint, '登录后即可收藏到「我的」');
  assert.equal(replayed, 0, '登录完成前不得执行原动作');

  setAuthenticatedUser();
  authGateStore.getState().resolveAfterLogin();

  assert.equal(replayed, 1);
  assert.equal(authGateStore.getState().open, false);
  assert.equal(authGateStore.getState().action, null);

  // 二次 resolve 不应再重放（挂起动作已清空）
  authGateStore.getState().resolveAfterLogin();
  assert.equal(replayed, 1);
});

test('游客调用 Skill 会话路径：登录前不建会话，登录完成后只重放一次', () => {
  invokeSkillThroughChatGate('skill-guest-replay');

  assert.deepEqual(conversationStore.getState().chats, {});
  assert.equal(authGateStore.getState().open, true);
  assert.equal(authGateStore.getState().action, 'chat');
  assert.equal(authGateStore.getState().hint, '登录后即可发起任务');

  setAuthenticatedUser();
  authGateStore.getState().resolveAfterLogin();

  const created = Object.values(conversationStore.getState().chats);
  assert.equal(created.length, 1, '登录成功只应创建一个任务会话');
  assert.equal(created[0]?.skillId, 'skill-guest-replay');

  authGateStore.getState().resolveAfterLogin();
  assert.equal(
    Object.keys(conversationStore.getState().chats).length,
    1,
    '挂起闭包被消费后不得再次建会话',
  );
});

test('已登录调用 Skill 会话路径直接执行一次，不产生待重放动作', () => {
  setAuthenticatedUser();

  invokeSkillThroughChatGate('skill-authenticated-direct');

  const created = Object.values(conversationStore.getState().chats);
  assert.equal(created.length, 1);
  assert.equal(created[0]?.skillId, 'skill-authenticated-direct');
  assert.equal(authGateStore.getState().open, false);

  authGateStore.getState().resolveAfterLogin();
  assert.equal(Object.keys(conversationStore.getState().chats).length, 1);
});

test('关闭登录墙会丢弃挂起动作，不会在下次登录时被误触发', () => {
  sessionStore.getState().enterGuest();
  let replayed = 0;

  requireLogin('download', () => {
    replayed += 1;
  });
  authGateStore.getState().close();
  authGateStore.getState().resolveAfterLogin();

  assert.equal(replayed, 0);
});

test('已登录用户直接放行，不弹登录墙', () => {
  setAuthenticatedUser();
  let ran = 0;

  const allowed = requireLogin('submit-skill', () => {
    ran += 1;
  });

  assert.equal(allowed, true);
  assert.equal(authGateStore.getState().open, false);
  assert.equal(ran, 0, 'requireLogin 返回 true 时由调用方自己执行，不重复触发');
});

test('登出回落游客态，并抑制一次登录墙', () => {
  setAuthenticatedUser();

  sessionStore.getState().logout();

  const state = sessionStore.getState();
  assert.equal(state.isGuest, true);
  assert.equal(state.isAuthenticated, false);
  assert.equal(state.shellReady, true, '登出后仍留在门户，而不是跳回登录页');
  assert.equal(
    state.suppressGuestGate,
    true,
    '主动登出的人不该在个人页被立刻要求重新登录',
  );

  sessionStore.getState().clearGuestGateSuppression();
  assert.equal(sessionStore.getState().suppressGuestGate, false);
});

test('主动选择游客浏览不会抑制登录墙', () => {
  assert.equal(sessionStore.getState().suppressGuestGate, false);
});

test('游客与登录后的 PV 请求沿用同一 visitorId', async () => {
  const visitorId = sessionStore.getState().visitorId;
  const pageViews: Array<{
    eventId: string;
    routeKey: string;
    visitorId: string;
  }> = [];
  globalThis.fetch = (async (input, init) => {
    if (
      String(input).includes('/portal-analytics/views') &&
      init?.method === 'POST'
    ) {
      pageViews.push(JSON.parse(String(init.body)) as (typeof pageViews)[number]);
    }
    return new Response('{}', {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
  workspaceStore.setState({ apiConnected: true, apiStatus: 'connected' });

  const guestCleanup = renderTrafficHook()();
  await waitForCallCount(pageViews, 1);
  guestCleanup?.();

  workspaceStore.setState({ apiConnected: false, apiStatus: 'local-demo' });
  const loginResult = await sessionStore.getState().login(
    'dickson@huawei.com',
    'mssclaw',
  );
  assert.equal(loginResult.ok, true);
  assert.equal(
    sessionStore.getState().visitorId,
    visitorId,
    '游客登录后不得轮换浏览器访客 ID',
  );

  workspaceStore.setState({ apiConnected: true, apiStatus: 'connected' });
  const userCleanup = renderTrafficHook()();
  await waitForCallCount(pageViews, 2);
  userCleanup?.();

  assert.deepEqual(
    pageViews.map((view) => ({ routeKey: view.routeKey, visitorId: view.visitorId })),
    [
      { routeKey: 'home', visitorId: `guest:${visitorId}` },
      { routeKey: 'home', visitorId: `guest:${visitorId}` },
    ],
    '登录前后 PV 均应携带稳定 visitorId，供服务端关联旅程',
  );
  assert.notEqual(pageViews[0]?.eventId, pageViews[1]?.eventId);
});
