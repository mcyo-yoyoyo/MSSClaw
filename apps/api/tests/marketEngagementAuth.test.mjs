import assert from 'node:assert/strict';
import test from 'node:test';
import { PersistenceController } from '../dist/persistence/persistence.controller.js';

/** 只记录调用参数的持久化桩，用于断言控制器解析出的身份 */
function fakePersistence() {
  const calls = { get: [], mutate: [] };
  return {
    calls,
    getMarketEngagement: async (workspaceId, userId) => {
      calls.get.push({ workspaceId, userId });
      return { byId: {}, userVotes: {}, favorites: {} };
    },
    mutateMarketEngagement: async (workspaceId, contentId, input) => {
      calls.mutate.push({ workspaceId, contentId, ...input });
      return { engagement: { id: contentId }, userVote: null, favorited: false };
    },
  };
}

function controllerWith(session, persistence = fakePersistence()) {
  const docs = { me: async () => session };
  return {
    controller: new PersistenceController(persistence, {}, docs),
    persistence,
  };
}

const LOGGED_IN = { ok: true, user: { id: 'user-42', platformRole: 'business_user' } };
const NO_SESSION = { ok: false, error: '未登录' };

test('guest reads market engagement aggregates with an empty user id', async () => {
  const { controller, persistence } = controllerWith(NO_SESSION);

  await controller.getMarketEngagement('ws-test');

  assert.deepEqual(persistence.calls.get, [{ workspaceId: 'ws-test', userId: '' }]);
});

test('logged-in read resolves the user id from the session, not from the caller', async () => {
  const { controller, persistence } = controllerWith(LOGGED_IN);

  await controller.getMarketEngagement('ws-test', 'Bearer token-ok');

  assert.deepEqual(persistence.calls.get, [{ workspaceId: 'ws-test', userId: 'user-42' }]);
});

test('guests may still count view and use', async () => {
  const { controller, persistence } = controllerWith(NO_SESSION);

  await controller.mutateMarketEngagement('ws-test', 'tool-1', { action: 'view' });
  await controller.mutateMarketEngagement('ws-test', 'tool-1', { action: 'use' });

  assert.deepEqual(
    persistence.calls.mutate.map((call) => [call.action, call.userId]),
    [
      ['view', ''],
      ['use', ''],
    ],
  );
});

test('guests are rejected on like, dislike, favorite and download', async () => {
  for (const action of ['like', 'dislike', 'favorite', 'download']) {
    const { controller, persistence } = controllerWith(NO_SESSION);
    await assert.rejects(
      controller.mutateMarketEngagement('ws-test', 'tool-1', { action }),
      (error) => {
        assert.equal(error?.getStatus?.(), 401);
        assert.equal(error?.getResponse?.().message, 'market_engagement_login_required');
        return true;
      },
    );
    assert.equal(persistence.calls.mutate.length, 0);
  }
});

test('a forged userId in the body cannot override the session identity', async () => {
  const { controller, persistence } = controllerWith(LOGGED_IN);

  await controller.mutateMarketEngagement(
    'ws-test',
    'tool-1',
    { action: 'like', userId: 'someone-else' },
    'Bearer token-ok',
  );

  assert.equal(persistence.calls.mutate[0].userId, 'user-42');
});

test('unknown actions are rejected before any session lookup', async () => {
  const { controller, persistence } = controllerWith(LOGGED_IN);

  await assert.rejects(
    controller.mutateMarketEngagement('ws-test', 'tool-1', { action: 'delete' }),
    (error) => error?.getStatus?.() === 400,
  );
  assert.equal(persistence.calls.mutate.length, 0);
});
