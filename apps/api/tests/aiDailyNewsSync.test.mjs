import assert from 'node:assert/strict';
import test from 'node:test';
import { AiDailyNewsController } from '../dist/persistence/ai-daily-news.controller.js';
import {
  aihotProxyUrlFromEnv,
  AI_NEWS_QUERY_DAYS,
  recentNewsCutoffKey,
  recentNewsSinceIso,
} from '../dist/persistence/ai-news-archive.service.js';

function createController(role) {
  let syncCalls = 0;
  let receivedToken = null;
  let receivedWorkspace = null;
  const controller = new AiDailyNewsController(
    {
      syncNow: async () => {
        syncCalls += 1;
        return { ok: true, added: 2, total: 12 };
      },
    },
    {
      me: async (token, workspaceId) => {
        receivedToken = token;
        receivedWorkspace = workspaceId;
        if (!role) return { ok: false, error: '未登录' };
        return { ok: true, user: { id: 'user-test', platformRole: role } };
      },
    },
  );
  return {
    controller,
    state: () => ({ syncCalls, receivedToken, receivedWorkspace }),
  };
}

test('manual AI news sync requires a workspace session', async () => {
  const { controller, state } = createController(null);

  await assert.rejects(
    controller.syncNow(),
    (error) => error?.getStatus?.() === 401 && error?.getResponse?.().message === '未登录',
  );
  assert.equal(state().syncCalls, 0);
  assert.equal(state().receivedWorkspace, 'ws-cn-marketing');
});

test('manual AI news sync rejects non-admin members', async () => {
  const { controller, state } = createController('business_user');

  await assert.rejects(
    controller.syncNow('Bearer member-token'),
    (error) =>
      error?.getStatus?.() === 403 &&
      error?.getResponse?.().message === 'ai_news_sync_admin_required',
  );
  assert.equal(state().syncCalls, 0);
  assert.equal(state().receivedToken, 'member-token');
});

test('manual AI news sync lets a super admin trigger the archive refresh', async () => {
  const { controller, state } = createController('super_admin');

  assert.deepEqual(
    await controller.syncNow(undefined, 'admin-session-token'),
    { ok: true, added: 2, total: 12 },
  );
  assert.equal(state().syncCalls, 1);
  assert.equal(state().receivedToken, 'admin-session-token');
  assert.equal(state().receivedWorkspace, 'ws-cn-marketing');
});

test('AI news query window is the last three Shanghai calendar days', () => {
  assert.equal(AI_NEWS_QUERY_DAYS, 3);
  const now = new Date('2026-10-30T16:00:00.000Z');
  assert.equal(recentNewsCutoffKey(now), '2026-10-29');
  assert.equal(recentNewsSinceIso(now), '2026-10-28T16:00:00.000Z');
  assert.equal(recentNewsCutoffKey(new Date('2026-10-30T15:59:00.000Z')), '2026-10-28');
});

test('AIHOT proxy is opt-in for test and production startup', () => {
  const keys = ['AIHOT_PROXY_ENABLED', 'HTTPS_PROXY', 'https_proxy'];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.HTTPS_PROXY = 'http://proxy.example.test:8080';
    delete process.env.https_proxy;

    delete process.env.AIHOT_PROXY_ENABLED;
    assert.equal(aihotProxyUrlFromEnv(), '');

    process.env.AIHOT_PROXY_ENABLED = '0';
    assert.equal(aihotProxyUrlFromEnv(), '');

    process.env.AIHOT_PROXY_ENABLED = '1';
    assert.equal(aihotProxyUrlFromEnv(), 'http://proxy.example.test:8080');

    process.env.AIHOT_PROXY_ENABLED = 'true';
    assert.equal(aihotProxyUrlFromEnv(), 'http://proxy.example.test:8080');
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
