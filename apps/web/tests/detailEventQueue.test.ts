import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDetailEventQueue, createMarketEngagementEventId } from '../src/domain/detailEventQueue.ts';

const tick = () => new Promise(resolve => setTimeout(resolve, 10));

test('non-secure HTTP event ID fallback stays valid without randomUUID', () => {
  const id = createMarketEngagementEventId({});
  assert.match(id, /^[A-Za-z0-9._:-]{8,128}$/);
  assert.equal(createMarketEngagementEventId({ randomUUID: () => 'uuid-test' }), 'uuid-test');
});

test('wait for the API, then retry the same detail event without duplicate success', async () => {
  let connected = false;
  let successes = 0;
  const sent: string[] = [];
  const queue = createDetailEventQueue({
    ready: () => connected,
    identity: () => null,
    retryDelayMs: 1,
    send: async (event: { eventId: string }) => {
      sent.push(event.eventId);
      if (sent.length === 1) throw Error('temporary network failure');
      return { ok: true };
    },
    success: () => { successes++; },
  });
  try {
    queue.enqueue('event-0001', { eventId: 'event-0001' });
    assert.equal(sent.length, 0);
    connected = true;
    queue.flush();
    queue.flush();
    await tick();
    await tick();
    assert.deepEqual(sent, ['event-0001', 'event-0001']);
    assert.equal(successes, 1);
  } finally { queue.dispose(); }
});

test('queued visits cannot be attributed to a different login session', async () => {
  let connected = false;
  let identity: string | null = null;
  let sends = 0;
  const queue = createDetailEventQueue({
    ready: () => connected, identity: () => identity,
    send: async () => { sends++; return {}; }, success: () => {},
  });
  try {
    queue.enqueue('guest-event', {});
    identity = 'another-account-session'; connected = true;
    queue.flush();
    await tick();
    assert.equal(sends, 0);
  } finally { queue.dispose(); }
});

test('failed requests stop after the retry budget and never fake a success', async () => {
  let sends = 0;
  const queue = createDetailEventQueue({
    ready: () => true, identity: () => null, retryDelayMs: 1,
    send: async () => { sends++; throw Error('offline'); },
    success: () => assert.fail('must not manufacture counts'),
  });
  try {
    queue.enqueue('event-0002', {});
    for (let i = 0; i < 10; i++) await tick();
    queue.flush();
    await tick();
    assert.equal(sends, 3);
  } finally { queue.dispose(); }
});
