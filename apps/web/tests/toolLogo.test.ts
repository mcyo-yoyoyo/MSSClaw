import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolvePersistedToolLogoUrl,
  resolveToolLogoUrl,
} from '../src/domain/toolLogo.ts';

const TRAE_COLOR_LOGO =
  'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/trae-color.svg';

test('Trae Work 默认使用 LobeHub 的 TRAE 彩色图标', () => {
  assert.equal(
    resolveToolLogoUrl({
      id: 'tool-excel-trae-work',
      homepageUrl: 'https://www.trae.cn',
      marketShelf: 'external',
      sourceType: 'external',
    }),
    TRAE_COLOR_LOGO,
  );
});

test('Trae Work 的稳定 ID 别名可物化到数据库字段', () => {
  assert.equal(
    resolvePersistedToolLogoUrl({
      id: 'tool-excel-trae-work',
      homepageUrl: 'https://www.trae.cn',
      marketShelf: 'external',
      sourceType: 'external',
    }),
    TRAE_COLOR_LOGO,
  );
});

test('TRAE 官网变更时仍物化同一品牌 Logo，避免头像随域名变化', () => {
  for (const homepageUrl of ['https://www.trae.ai/', 'https://example.com/new-deep-link']) {
    const tool = {
      id: 'tool-saas-trae',
      homepageUrl,
      marketShelf: 'external' as const,
      sourceType: 'external',
    };
    assert.equal(resolveToolLogoUrl(tool), TRAE_COLOR_LOGO);
    assert.equal(resolvePersistedToolLogoUrl(tool), TRAE_COLOR_LOGO);
  }
});

test('持久化 Logo 时显式配置优先于稳定 ID 别名', () => {
  assert.equal(
    resolvePersistedToolLogoUrl({
      id: 'tool-excel-trae-work',
      logoUrl: ' https://example.com/custom-trae.svg ',
      homepageUrl: 'https://www.trae.cn',
      marketShelf: 'external',
      sourceType: 'external',
    }),
    'https://example.com/custom-trae.svg',
  );
});

test('普通官网 favicon 仅用于展示，不物化为持久化 Logo', () => {
  const tool = {
    id: 'tool-other',
    homepageUrl: 'https://example.com/product',
    marketShelf: 'external' as const,
    sourceType: 'external',
  };

  assert.equal(
    resolveToolLogoUrl(tool),
    'https://www.google.com/s2/favicons?domain=example.com&sz=128',
  );
  assert.equal(resolvePersistedToolLogoUrl(tool), undefined);
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
