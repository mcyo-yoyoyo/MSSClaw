import assert from 'node:assert/strict';
import test from 'node:test';
import { dedupeAiBriefEmailRecipients } from '../dist/persistence/ai-brief-email-recipients.js';

const row = (userId, email, subscribedAt, updatedAt) => ({
  userId,
  userName: userId,
  email,
  subscribedAt: new Date(subscribedAt),
  updatedAt: new Date(updatedAt),
});

test('dedupes normalized recipients without removing per-user subscription intent', () => {
  const subscriptions = [
    row('older', ' News@Huawei.com ', '2026-08-19T08:00:00Z', '2026-08-19T09:00:00Z'),
    row('newer', 'news@huawei.com', '2026-08-20T08:00:00Z', '2026-08-20T09:00:00Z'),
    row('oldest', 'NEWS@HUAWEI.COM', '2026-08-18T08:00:00Z', '2026-08-18T09:00:00Z'),
  ];

  const recipients = dedupeAiBriefEmailRecipients(subscriptions);

  assert.deepEqual(
    recipients.map(({ userId, email }) => ({ userId, email })),
    [{ userId: 'newer', email: 'news@huawei.com' }],
  );
  assert.equal(subscriptions.length, 3);
  assert.equal(subscriptions[0]?.email, ' News@Huawei.com ');
});

test('uses subscribed time and user id as deterministic tie breakers', () => {
  const recipients = dedupeAiBriefEmailRecipients([
    row('z-user', 'brief@huawei.com', '2026-08-19T08:00:00Z', '2026-08-20T09:00:00Z'),
    row('b-user', 'BRIEF@HUAWEI.COM', '2026-08-20T08:00:00Z', '2026-08-20T09:00:00Z'),
    row('a-user', 'brief@huawei.com', '2026-08-20T08:00:00Z', '2026-08-20T09:00:00Z'),
  ]);

  assert.equal(recipients.length, 1);
  assert.equal(recipients[0]?.userId, 'a-user');
});
