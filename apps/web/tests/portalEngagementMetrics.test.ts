import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildPortalEngagementMetrics } from '../src/domain/portalEngagementMetrics.ts';

const appViewSource = readFileSync(new URL('../src/domain/appView.ts', import.meta.url), 'utf8');
const navPresentationSource = readFileSync(
  new URL('../src/domain/navPresentation.ts', import.meta.url),
  'utf8',
);
const routerSource = readFileSync(
  new URL('../src/features/AppViewRouter.tsx', import.meta.url),
  'utf8',
);
const portalOpsSource = readFileSync(
  new URL('../src/features/ops/PortalContentOpsPage.tsx', import.meta.url),
  'utf8',
);

test('按工具、Skill、Agent 当前 ID 分组汇总互动指标', () => {
  const result = buildPortalEngagementMetrics(
    {
      tools: ['tool-a', 'tool-b'],
      skills: ['skill-a'],
      agents: ['agent-a', 'agent-without-engagement'],
    },
    {
      'tool-a': { likes: 8, dislikes: 2, favorites: 5 },
      'tool-b': { likes: 3, dislikes: 1, favorites: 4 },
      'skill-a': { likes: 6, dislikes: 0, favorites: 2 },
      'agent-a': { likes: 9, dislikes: 3, favorites: 7 },
      'deleted-tool': { likes: 100, dislikes: 100, favorites: 100 },
    },
  );

  assert.deepEqual(result.rows, [
    { kind: 'tool', label: '工具', assetCount: 2, likes: 11, dislikes: 3, favorites: 9 },
    { kind: 'skill', label: 'Skill', assetCount: 1, likes: 6, dislikes: 0, favorites: 2 },
    { kind: 'agent', label: 'Agent', assetCount: 2, likes: 9, dislikes: 3, favorites: 7 },
  ]);
  assert.deepEqual(result.total, {
    assetCount: 5,
    likes: 26,
    dislikes: 6,
    favorites: 18,
  });
});

test('同类型重复 ID 只计一次，缺失与无效计数按零处理', () => {
  const result = buildPortalEngagementMetrics(
    {
      tools: ['tool-a', 'tool-a', ''],
      skills: ['skill-a'],
      agents: [],
    },
    {
      'tool-a': { likes: 4, dislikes: -2, favorites: Number.NaN },
      'skill-a': { likes: 2.9, dislikes: 1, favorites: 3 },
    },
  );

  assert.deepEqual(result.rows[0], {
    kind: 'tool',
    label: '工具',
    assetCount: 1,
    likes: 4,
    dislikes: 0,
    favorites: 0,
  });
  assert.deepEqual(result.rows[1], {
    kind: 'skill',
    label: 'Skill',
    assetCount: 1,
    likes: 2,
    dislikes: 1,
    favorites: 3,
  });
  assert.deepEqual(result.rows[2], {
    kind: 'agent',
    label: 'Agent',
    assetCount: 0,
    likes: 0,
    dislikes: 0,
    favorites: 0,
  });
});

test('数据看板是门户运营后的独立后台入口，访问数据不再重复留在门户运营页', () => {
  assert.match(
    appViewSource,
    /export const ADMIN_MENU_VIEWS = \[[\s\S]*?'portal-ops',\s*'portal-dashboard',/,
  );
  assert.match(appViewSource, /ops: '运营设置'/);
  assert.match(
    appViewSource,
    /SIDEBAR_NAV_SECTIONS = \[\s*'workspace',\s*'platform',\s*'ops',\s*'system',?\s*\]/,
  );
  assert.match(
    navPresentationSource,
    /id: 'portal-ops',[\s\S]*?label: '门户运营',[\s\S]*?section: 'ops'/,
  );
  assert.match(
    navPresentationSource,
    /id: 'portal-dashboard',[\s\S]*?label: '数据看板',[\s\S]*?section: 'ops',[\s\S]*?adminOnly: true/,
  );
  assert.match(routerSource, /case 'portal-dashboard':[\s\S]*?<LazyPortalDataDashboardPage \/>/);
  assert.doesNotMatch(portalOpsSource, /label: '访问数据'/);
  assert.doesNotMatch(portalOpsSource, /<PortalTrafficPanel \/>/);
});
