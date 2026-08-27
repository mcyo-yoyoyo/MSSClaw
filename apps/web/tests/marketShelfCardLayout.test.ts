import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const cardSource = readFileSync(
  new URL('../src/components/market/MarketShelfCard.tsx', import.meta.url),
  'utf8',
);

test('市场卡片主体使用等高纵向布局，为标签底部对齐提供空间', () => {
  assert.match(
    cardSource,
    /group relative flex h-full flex-col/,
    '卡片根节点必须保持 h-full + flex-col，保证同一网格中的卡片等高',
  );
  assert.match(
    cardSource,
    /className="flex min-h-0 flex-1 flex-col text-left"/,
    '描述与标签所在的可点击主体必须占满剩余高度并使用纵向布局',
  );
});

test('标签行固定在底部分隔线上方，不随描述长度移动', () => {
  const descriptionIndex = cardSource.indexOf('{outcomeLine}');
  const tagsIndex = cardSource.indexOf('{!compact && showTags ? (', descriptionIndex);
  const autoSpacingIndex = cardSource.indexOf(
    "homeDense ? 'mt-auto pt-2.5' : 'mt-auto pt-3.5'",
    tagsIndex,
  );
  const contentButtonEndIndex = cardSource.indexOf('</button>', tagsIndex);
  const footerSeparatorIndex = cardSource.indexOf(
    "'flex flex-wrap items-center gap-2 border-t border-black/[0.04]'",
    contentButtonEndIndex,
  );

  assert.notEqual(descriptionIndex, -1, '应能定位描述内容');
  assert.ok(tagsIndex > descriptionIndex, '标签行应位于描述之后');
  assert.ok(
    autoSpacingIndex > tagsIndex,
    '标签行必须使用 mt-auto 吸收描述区域剩余空间，并用 padding 保留固定间距',
  );
  assert.ok(contentButtonEndIndex > autoSpacingIndex, '标签行应保留在卡片可点击主体内');
  assert.ok(
    footerSeparatorIndex > contentButtonEndIndex,
    '指标与操作区的分隔线必须紧随标签所在主体之后',
  );
});

test('后台可以隐藏默认指标与详情区，同时保留自定义拖拽操作', () => {
  assert.match(cardSource, /showDefaultFooter = true/);
  assert.match(
    cardSource,
    /\{showDefaultFooter \? \([\s\S]*?title="查看"[\s\S]*?\{primaryLabel\}[\s\S]*?\) : null\}/,
  );
  assert.match(
    cardSource,
    /\{footerActions \? \([\s\S]*?\{footerActions\}[\s\S]*?\) : null\}/,
    '隐藏默认 footer 时，后台传入的左下角拖拽手柄仍必须渲染',
  );
});
