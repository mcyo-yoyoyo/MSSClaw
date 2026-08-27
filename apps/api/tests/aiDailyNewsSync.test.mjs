import assert from 'node:assert/strict';
import test from 'node:test';
import { AiDailyNewsController } from '../dist/persistence/ai-daily-news.controller.js';

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
    controller.syncNow('ws-test'),
    (error) => error?.getStatus?.() === 401 && error?.getResponse?.().message === '未登录',
  );
  assert.equal(state().syncCalls, 0);
  assert.equal(state().receivedWorkspace, 'ws-test');
});

test('manual AI news sync rejects non-admin members', async () => {
  const { controller, state } = createController('business_user');

  await assert.rejects(
    controller.syncNow('ws-test', 'Bearer member-token'),
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
    await controller.syncNow('ws-test', undefined, 'admin-session-token'),
    { ok: true, added: 2, total: 12 },
  );
  assert.equal(state().syncCalls, 1);
  assert.equal(state().receivedToken, 'admin-session-token');
  assert.equal(state().receivedWorkspace, 'ws-test');
});
