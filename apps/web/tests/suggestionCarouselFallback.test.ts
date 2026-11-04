import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as React from 'react';
import { createServer } from 'vite';

test('收到空建议后重新挂载，仍显示当前模式兜底', async () => {
  const originalWindow = globalThis.window, originalFetch = globalThis.fetch;
  globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) } as any;
  let requests = 0;
  globalThis.fetch = async () => { requests++; return new Response(JSON.stringify({ items: [], pending: false, stale: false }), { headers: { 'Content-Type': 'application/json' } }); };
  const vite = await createServer({ configFile: './vite.react.config.ts', server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  const internals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const previous = internals.H;
  const cleanups: Array<() => void> = [];
  try {
    const { SuggestionCarousel } = await vite.ssrLoadModule('/src/features/ai-knowledge/SuggestionCarousel.tsx');
    function mount(mode: string, fallback: string) {
      const effects: Array<() => void | (() => void)> = [];
      internals.H = {
        useState: (initial: any) => [typeof initial === 'function' ? initial() : initial, () => {}],
        useEffect: (effect: () => void | (() => void)) => effects.push(effect),
      };
      const tree = SuggestionCarousel({ mode, visible: true, paused: false, fallbackItems: [fallback], onSelect() {} });
      for (const effect of effects) { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }
      return tree?.props.children.props.children[0].props.children;
    }
    assert.equal(mount('solution', '方案兜底'), '方案兜底');
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(requests, 1, '必须真正收到空响应');
    assert.equal(mount('insight', '洞察兜底'), '洞察兜底');
    assert.equal(mount('solution', '方案兜底'), '方案兜底');
  } finally {
    cleanups.forEach(cleanup => cleanup()); internals.H = previous;
    await vite.close(); globalThis.window = originalWindow; globalThis.fetch = originalFetch;
  }
});
