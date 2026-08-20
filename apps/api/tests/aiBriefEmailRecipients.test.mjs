import assert from 'node:assert/strict';
import test from 'node:test';
import { dedupeAiBriefEmailRecipients } from '../dist/persistence/ai-brief-email-recipients.js';

const row = (workspaceId, userId, email, subscribedAt, updatedAt) => ({
  workspaceId,
  userId,
  userName: userId,
  email,
  subscribedAt: new Date(subscribedAt),
  updatedAt: new Date(updatedAt),
});

test('dedupes normalized recipients without removing per-user subscription intent', () => {
  const subscriptions = [
    row('ws-a', 'older', ' News@Huawei.com ', '2026-08-19T08:00:00Z', '2026-08-19T09:00:00Z'),
    row('ws-a', 'newer', 'news@huawei.com', '2026-08-20T08:00:00Z', '2026-08-20T09:00:00Z'),
    row('ws-b', 'other-workspace', 'NEWS@HUAWEI.COM', '2026-08-18T08:00:00Z', '2026-08-18T09:00:00Z'),
  ];

  const recipients = dedupeAiBriefEmailRecipients(subscriptions);

  assert.deepEqual(
    recipients.map(({ workspaceId, userId, email }) => ({ workspaceId, userId, email })),
    [
      { workspaceId: 'ws-a', userId: 'newer', email: 'news@huawei.com' },
      { workspaceId: 'ws-b', userId: 'other-workspace', email: 'news@huawei.com' },
    ],
  );
  assert.equal(subscriptions.length, 3);
  assert.equal(subscriptions[0]?.email, ' News@Huawei.com ');
});

test('uses subscribed time and user id as deterministic tie breakers', () => {
  const recipients = dedupeAiBriefEmailRecipients([
    row('ws-a', 'z-user', 'brief@huawei.com', '2026-08-19T08:00:00Z', '2026-08-20T09:00:00Z'),
    row('ws-a', 'b-user', 'BRIEF@HUAWEI.COM', '2026-08-20T08:00:00Z', '2026-08-20T09:00:00Z'),
    row('ws-a', 'a-user', 'brief@huawei.com', '2026-08-20T08:00:00Z', '2026-08-20T09:00:00Z'),
  ]);

  assert.equal(recipients.length, 1);
  assert.equal(recipients[0]?.userId, 'a-user');
});
