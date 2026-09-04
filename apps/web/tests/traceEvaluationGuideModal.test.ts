import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../src/features/market/MarketSkillDetailModal.tsx', import.meta.url),
  'utf8',
);

test('TRACE 了解详情在当前页打开内容弹窗而不是跳转链接', () => {
  const detailStart = source.indexOf('了解详情');
  assert.ok(detailStart >= 0);
  const buttonSource = source.slice(source.lastIndexOf('<button', detailStart), detailStart + 30);
  assert.match(buttonSource, /onClick=\{\(\) => setGuideOpen\(true\)\}/);
  assert.doesNotMatch(buttonSource, /href=/);
  assert.match(source, /<CenterModal[\s\S]*?open=\{guideOpen\}[\s\S]*?elevate/);
  assert.match(source, /TRACE_GUIDE_SECTIONS\.map/);
});
