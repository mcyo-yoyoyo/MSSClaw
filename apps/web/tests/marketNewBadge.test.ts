import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer, type ViteDevServer } from 'vite';
import type { MarketShelfCard } from '../src/domain/marketShelf.ts';

let vite: ViteDevServer;
let isNewAsset: (asset: { createdAt?: string; updatedAt?: string }, now?: number) => boolean;
let Card: ComponentType<{ card: MarketShelfCard; showHot?: boolean; onOpen: () => void }>;

before(async () => {
  vite = await createServer({
    configFile: './vite.react.config.ts',
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  ({ isNewAsset } = await vite.ssrLoadModule('/src/domain/contentBadges.ts'));
  ({ MarketShelfCard: Card } = await vite.ssrLoadModule('/src/components/market/MarketShelfCard.tsx'));
});

after(async () => { await vite?.close(); });

const now = Date.parse('2026-10-26T12:00:00Z');
const recent = '2026-10-25T12:00:00Z';
const old = '2026-09-01T12:00:00Z';

test('创建或更新任一在最近 14 天内即为 NEW，含第 14 天边界', () => {
  assert.equal(isNewAsset({ createdAt: recent, updatedAt: old }, now), true);
  assert.equal(isNewAsset({ createdAt: old, updatedAt: recent }, now), true);
  assert.equal(isNewAsset({ createdAt: '2026-10-12T12:00:00Z' }, now), true);
  assert.equal(isNewAsset({ updatedAt: '2026-10-12T11:59:59.999Z' }, now), false);
  assert.equal(isNewAsset({ createdAt: old, updatedAt: old }, now), false);
});

test('缺失、无效和未来时间不标 NEW，有效的另一字段仍可命中', () => {
  for (const asset of [{}, { createdAt: '' }, { updatedAt: 'invalid' }, { createdAt: '2026-10-27' }]) {
    assert.equal(isNewAsset(asset, now), false);
  }
  assert.equal(isNewAsset({ createdAt: 'invalid', updatedAt: recent }, now), true);
  assert.equal(isNewAsset({ createdAt: recent, updatedAt: '2026-10-27' }, now), true);
  assert.equal(isNewAsset({ updatedAt: '2026-10-26T08:00:00-04:00' }, now), true);
});

function renderCard(patch: Partial<MarketShelfCard>, showHot = false): string {
  const card: MarketShelfCard = {
    id: 'badge-test', kind: 'projects', assetType: 'skill', title: '测试技能',
    description: '测试说明', icon: 'fa-cube', badges: [], featured: false,
    heat: 0, hasHowto: false, primaryAction: 'detail', scopeBadge: 'public',
    ...patch,
  };
  return renderToStaticMarkup(createElement(Card, { card, showHot, onOpen: () => {} }));
}

test('Skill 和 Agent 的 NEW 与 HOT 可同时渲染，权限标签下移', () => {
  for (const assetType of ['skill', 'agent'] as const) {
    const html = renderCard({ assetType, updatedAt: new Date().toISOString() }, true);
    assert.match(html, />NEW<|>\s+NEW\s+</);
    assert.match(html, />HOT<|>\s+HOT\s+</);
    assert.match(html, /aria-label="最近 14 天内创建或更新"/);
    assert.match(html, /class="[^"]*top-7[^"]*"[^>]*>公开</);
  }
});

test('普通区也显示 NEW，旧记录和工具卡不显示，原 HOT 保留', () => {
  const fresh = new Date().toISOString();
  assert.match(renderCard({ createdAt: fresh }), />NEW<|>\s+NEW\s+</);
  assert.doesNotMatch(renderCard({ createdAt: fresh }), />HOT<|>\s+HOT\s+</);
  for (const patch of [{}, { updatedAt: old }, { kind: 'external' as const, assetType: 'tool' as const, createdAt: fresh }]) {
    const html = renderCard(patch, true);
    assert.doesNotMatch(html, />NEW<|>\s+NEW\s+</);
    assert.match(html, />HOT<|>\s+HOT\s+</);
  }
});
