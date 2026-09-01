import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { trustProxySetting } from '../dist/common/trust-proxy.js';

async function withIpServer(run) {
  const app = express();
  app.set('trust proxy', trustProxySetting());
  app.get('/', (request, response) => response.json({ ip: request.ip }));
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

test('loopback reverse proxy exposes the real right-most client IP', async () => {
  await withIpServer(async (url) => {
    const response = await fetch(url, {
      headers: { 'X-Forwarded-For': '203.0.113.66, 198.51.100.10' },
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ip, '198.51.100.10');
  });
});

test('TRUST_PROXY may explicitly name another trusted proxy range', () => {
  assert.equal(trustProxySetting('  linklocal  '), 'linklocal');
  assert.equal(trustProxySetting('   '), 'loopback');
});
