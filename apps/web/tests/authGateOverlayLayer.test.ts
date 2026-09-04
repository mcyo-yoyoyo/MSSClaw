import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../src/features/auth/AuthGateOverlay.tsx', import.meta.url),
  'utf8',
);

test('登录墙层级高于详情弹窗', () => {
  assert.match(source, /className="fixed inset-0 z-\[140\]/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
});

test('登录墙保持简洁，不显示动作提示语', () => {
  assert.doesNotMatch(source, /hint=\{hint\}/);
});
