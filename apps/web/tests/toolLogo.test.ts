import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveToolLogoUrl } from '../src/domain/toolLogo.ts';

test('Trae Work 默认使用 LobeHub 的 TRAE 彩色图标', () => {
  assert.equal(
    resolveToolLogoUrl({
      id: 'tool-excel-trae-work',
      homepageUrl: 'https://www.trae.cn',
      marketShelf: 'external',
      sourceType: 'external',
    }),
    'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/trae-color.svg',
  );
});

test('通义听悟默认复用通义灵码官网图标', () => {
  assert.equal(
    resolveToolLogoUrl({
      id: 'tool-ext-t13eee22e20',
      homepageUrl: 'https://tingwu.aliyun.com/',
      marketShelf: 'external',
      sourceType: 'external',
    }),
    'https://www.google.com/s2/favicons?domain=tongyi.aliyun.com&sz=128',
  );
});

test('后台自定义 Logo 优先于默认别名', () => {
  assert.equal(
    resolveToolLogoUrl({
      id: 'tool-ext-t13eee22e20',
      logoUrl: 'https://example.com/custom.svg',
      homepageUrl: 'https://tingwu.aliyun.com/',
      marketShelf: 'external',
      sourceType: 'external',
    }),
    'https://example.com/custom.svg',
  );
});

test('其他外部工具仍使用自己的官网 favicon', () => {
  assert.equal(
    resolveToolLogoUrl({
      id: 'tool-other',
      homepageUrl: 'https://example.com/product',
      marketShelf: 'external',
      sourceType: 'external',
    }),
    'https://www.google.com/s2/favicons?domain=example.com&sz=128',
  );
});
