import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createServer, type ViteDevServer } from 'vite';

type NewsPayload = {
  sourceUrl: string;
  fetchedAt: string;
  groups: Array<{
    dateLabel: string;
    items: Array<{ id: string; dateLabel: string; title: string; summary: string; url: string }>;
  }>;
  fromFallback?: boolean;
};

type NewsStoreState = {
  payload: NewsPayload;
  syncing: boolean;
  error: string | null;
  syncFromSource: () => Promise<{
    ok: boolean;
    message: string;
    itemCount: number;
    latestDate: string | null;
  }>;
};

type NewsStore = {
  getState: () => NewsStoreState;
  setState: (state: Partial<NewsStoreState>) => void;
};

type WorkspaceStore = {
  setState: (state: Record<string, unknown>) => void;
};

const panelSource = readFileSync(
  new URL('../src/features/ops/PortalAiNewsPanel.tsx', import.meta.url),
  'utf8',
);

let vite: ViteDevServer;
let newsStore: NewsStore;
let workspaceStore: WorkspaceStore;
const originalFetch = globalThis.fetch;

function payload(title: string): NewsPayload {
  return {
    sourceUrl: 'https://aihot.virxact.com',
    fetchedAt: '2026-08-27T04:00:00.000Z',
    groups: [
      {
        dateLabel: '8月27日周四',
        items: [
          {
            id: `news-${title}`,
            dateLabel: '8月27日周四',
            title,
            summary: '摘要',
            url: 'https://example.com/news',
          },
        ],
      },
    ],
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

before(async () => {
  vite = await createServer({
    configFile: './vite.react.config.ts',
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  newsStore = (
    (await vite.ssrLoadModule('/src/stores/aiBotDailyNewsStore.ts')) as {
      useAiBotDailyNewsStore: NewsStore;
    }
  ).useAiBotDailyNewsStore;
  workspaceStore = (
    (await vite.ssrLoadModule('/src/stores/workspaceStore.ts')) as {
      useWorkspaceStore: WorkspaceStore;
    }
  ).useWorkspaceStore;
});

beforeEach(() => {
  workspaceStore.setState({
    workspaceId: 'ws-ai-news-sync',
    apiConnected: true,
    apiStatus: 'connected',
  });
  newsStore.setState({
    payload: payload('旧内容'),
    syncing: false,
    error: null,
  });
});

after(async () => {
  globalThis.fetch = originalFetch;
  await vite.close();
});

test('运营拉取先 POST 同步归档，再 GET 最新 AI 快讯并更新 store', async () => {
  const calls: Array<{ url: string; method: string }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ url, method });
    if (method === 'POST') {
      return jsonResponse({ ok: true, added: 3, total: 18 });
    }
    return jsonResponse(payload('新内容'));
  }) as typeof fetch;

  const result = await newsStore.getState().syncFromSource();

  assert.deepEqual(calls.map((call) => call.method), ['POST', 'GET']);
  assert.match(
    calls[0]?.url ?? '',
    /\/api\/v1\/ai-daily-news\/sync\?workspaceId=ws-ai-news-sync$/,
  );
  assert.match(calls[1]?.url ?? '', /\/api\/v1\/ai-daily-news$/);
  assert.equal(result.ok, true);
  assert.match(result.message, /新增 3 条，当前共 18 条/);
  assert.equal(newsStore.getState().payload.groups[0]?.items[0]?.title, '新内容');
  assert.equal(newsStore.getState().syncing, false);
  assert.equal(newsStore.getState().error, null);
});

test('上游返回 ok false 时保留当前内容且不继续 GET', async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (input, init) => {
    calls.push(init?.method ?? 'GET');
    return jsonResponse({
      ok: false,
      added: 0,
      total: 7,
      error: 'upstream 503',
    });
  }) as typeof fetch;

  const result = await newsStore.getState().syncFromSource();

  assert.deepEqual(calls, ['POST']);
  assert.equal(result.ok, false);
  assert.match(result.message, /upstream 503/);
  assert.equal(newsStore.getState().payload.groups[0]?.items[0]?.title, '旧内容');
  assert.equal(newsStore.getState().syncing, false);
});

test('POST 网络或 HTTP 失败时保留旧内容和旧摘要', async () => {
  globalThis.fetch = (async () =>
    jsonResponse({ message: '同步服务暂不可用' }, 503)) as typeof fetch;

  const result = await newsStore.getState().syncFromSource();

  assert.equal(result.ok, false);
  assert.match(result.message, /同步服务暂不可用/);
  assert.match(result.message, /已保留当前内容/);
  assert.equal(result.itemCount, 1);
  assert.equal(result.latestDate, '8月27日周四');
  assert.equal(newsStore.getState().payload.groups[0]?.items[0]?.title, '旧内容');
  assert.equal(newsStore.getState().syncing, false);
});

test('POST 成功但 GET 失败时不以 fallback 覆盖现有快讯', async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (_input, init) => {
    calls.push(init?.method ?? 'GET');
    if (init?.method === 'POST') {
      return jsonResponse({ ok: true, added: 1, total: 9 });
    }
    return jsonResponse({ message: 'read unavailable' }, 503);
  }) as typeof fetch;

  const result = await newsStore.getState().syncFromSource();

  assert.deepEqual(calls, ['POST', 'GET', 'GET']);
  assert.equal(result.ok, false);
  assert.match(result.message, /页面未能读取最新内容/);
  assert.equal(newsStore.getState().payload.groups[0]?.items[0]?.title, '旧内容');
});

test('并发触发复用同一次同步，不重复请求上游', async () => {
  let resolvePost!: (response: Response) => void;
  const pendingPost = new Promise<Response>((resolve) => {
    resolvePost = resolve;
  });
  let postCalls = 0;
  globalThis.fetch = (async (_input, init) => {
    if (init?.method === 'POST') {
      postCalls += 1;
      return pendingPost;
    }
    return jsonResponse(payload('并发刷新后的内容'));
  }) as typeof fetch;

  const first = newsStore.getState().syncFromSource();
  const second = newsStore.getState().syncFromSource();
  assert.equal(first, second);
  assert.equal(postCalls, 1);

  resolvePost(jsonResponse({ ok: true, added: 1, total: 2 }));
  assert.equal((await first).ok, true);
  assert.equal((await second).ok, true);
  assert.equal(postCalls, 1);
});

test('AI 新闻运营面板提供带加载态的拉取按钮和结果提示', () => {
  assert.match(panelSource, /useAiBotDailyNewsStore/);
  assert.match(panelSource, /onClick=\{\(\) => void pullLatestNews\(\)\}/);
  assert.match(panelSource, /disabled=\{syncing\}/);
  assert.match(panelSource, /\{syncing \? '正在拉取…' : '拉取新闻'\}/);
  assert.match(panelSource, /role=\{syncFeedback\.ok \? 'status' : 'alert'\}/);
  assert.match(panelSource, /不会覆盖下方站内稿/);
});
