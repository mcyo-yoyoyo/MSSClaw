import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../src/features/market/MarketShelfPage.tsx', import.meta.url),
  'utf8',
);
const layoutStoreSource = readFileSync(
  new URL('../src/stores/externalToolLayoutStore.ts', import.meta.url),
  'utf8',
);

test('用户侧外部工具全部筛选保持原有货架逻辑', () => {
  assert.match(source, /splitExternalFeaturedItemsByRegion/);
  assert.match(source, /featuredPins\.external/);
  assert.doesNotMatch(
    source,
    /externalToolLayout\?\.all/,
    '本次窄改不能让“全部”筛选消费管理后台四列表布局',
  );
});

test('用户侧非全部筛选读取对应分类的海外和国内精选', () => {
  assert.match(
    source,
    /const isExternalCategory = kind === 'external' && externalType !== 'all'/,
  );
  assert.match(
    source,
    /const categoryLayout = externalToolLayout\?\.categories\[externalType\]/,
  );
  assert.match(source, /categoryLayout\?\.overseasFeaturedIds/);
  assert.match(source, /categoryLayout\?\.domesticFeaturedIds/);
  assert.match(source, /'overseas'\)/);
  assert.match(source, /'domestic'\)/);
  assert.match(source, /const externalFeaturedColumns = \[/);
  assert.match(source, /title: '海外精选'/);
  assert.match(source, /title: '国内精选'/);
});

test('用户侧分类精选可跨 taxonomy 选入，并继续服从页面搜索收藏与隐藏过滤', () => {
  assert.match(
    source,
    /const raw =[\s\S]*?: listMarketToolCards\(tools, kind, viewer, listOrg, listBusiness, eng, howtoToolIds\);/,
    '精选候选必须先经过 listMarketToolCards 的发布状态与账号可见性过滤',
  );
  assert.match(
    source,
    /const categoryFeaturedIds =[\s\S]*?externalToolLayout\?\.categories\[externalType\][\s\S]*?working = working\.filter\(\s*\(c\) =>\s*categoryFeaturedIds\?\.has\(c\.id\) \|\|\s*toolMatchesExternalTypeCatalog\(/,
    '运营精选 ID 必须显式绕过 taxonomy 成员过滤',
  );
  assert.match(
    source,
    /const filteredCards = useMemo\([\s\S]*?searchCapabilitiesByIntent\(q, scopedCards, scopedCards\.length[\s\S]*?favoritesOnly[\s\S]*?hiddenKeys/,
    '跨 taxonomy 精选仍必须继续经过统一搜索、收藏和隐藏过滤',
  );
  assert.match(
    source,
    /const visibleById = new Map\(filteredCards\.map\(\(card\) => \[card\.id, card\]\)\)/,
    '分类精选应从统一过滤后的结果按 ID 解析',
  );
});

test('用户侧所有非全部筛选都显示分类更多，并以人工排序覆盖 Excel 初始排名', () => {
  assert.match(
    source,
    /const showExternalCategoryMore =\s*isExternalCategory && Boolean\(externalToolLayout\)/,
  );
  assert.match(
    source,
    /const categoryLayout = externalToolLayout\?\.categories\[externalType\]/,
  );
  assert.match(
    source,
    /listExternalCategoryRankedMore\(filteredCards, externalType/,
  );
  assert.match(source, /orderExternalToolsByLayoutIds/);
  assert.match(source, /categoryLayout\?\.overseasMoreOrderIds \?\? \[\]/);
  assert.match(source, /categoryLayout\?\.domesticMoreOrderIds \?\? \[\]/);
  assert.match(source, /rankedMore\.filter\(\(card\) => card\.region === 'overseas'\)/);
  assert.match(source, /rankedMore\.filter\(\(card\) => card\.region === 'domestic'\)/);
  assert.match(
    source,
    /kind !== 'internal' && \(!isExternalCategory \|\| showExternalCategoryMore\) \? \(/,
  );
  assert.match(source, /人工排序优先 · 新工具按清单分类排名追加/);
  assert.match(source, /showExternalCategoryMore \? '当前分类暂无更多工具。' : emptyHint/);
});

test('用户侧非全部筛选继续渲染海外和国内双精选', () => {
  assert.match(source, /const isExternalCategory = kind === 'external' && externalType !== 'all'/);
  assert.match(source, /\(!isExternalCategory \|\| showExternalCategoryMore\)/);
  assert.match(source, /<div className="grid gap-4 lg:grid-cols-2">/);
  assert.match(
    source,
    /kind === 'external'[\s\S]*?isExternalCategory[\s\S]*?activeFeatured\.filter\(\(c\) => c\.region === 'domestic'\)/,
  );
});

test('用户侧加载布局时不会覆盖管理后台未保存草稿', () => {
  assert.match(
    source,
    /if \(layoutState\.loading \|\| layoutState\.saving \|\| layoutState\.dirty\) return;/,
  );
});

test('分类布局未取得时明确展示加载或失败状态，不伪装成零精选', () => {
  assert.match(source, /useExternalToolLayoutStore\(\(s\) => s\.loading\)/);
  assert.match(source, /useExternalToolLayoutStore\(\(s\) => s\.error\)/);
  assert.match(source, /isExternalCategory && !externalToolLayout \? \(/);
  assert.match(source, /data-testid="external-category-layout-status"/);
  assert.match(source, /精选配置加载失败/);
  assert.match(source, /正在加载分类精选配置/);
});

test('切换账号会清空上一账号的布局草稿', () => {
  assert.match(layoutStoreSource, /useSessionStore\.subscribe/);
  assert.match(layoutStoreSource, /stagedDraftsByWorkspace\.clear\(\)/);
  assert.match(
    layoutStoreSource,
    /workspaceId: currentWorkspaceId\(\),\s*document: null,\s*draft: null,\s*dirty: false/,
  );
});
