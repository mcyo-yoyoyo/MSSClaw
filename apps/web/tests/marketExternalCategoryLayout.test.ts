import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../src/features/market/MarketShelfPage.tsx', import.meta.url),
  'utf8',
);
const homeSource = readFileSync(
  new URL('../src/features/home/HomePage.tsx', import.meta.url),
  'utf8',
);
const layoutStoreSource = readFileSync(
  new URL('../src/stores/externalToolLayoutStore.ts', import.meta.url),
  'utf8',
);

test('首页外部精选与市场页共用全局布局，布局未加载时不伪造工具', () => {
  assert.match(homeSource, /useExternalToolLayoutStore/);
  assert.match(homeSource, /const externalLayout = externalToolLayout\?\.all/);
  assert.match(homeSource, /externalLayout\.overseasFeaturedIds/);
  assert.match(homeSource, /externalLayout\.domesticFeaturedIds/);
  assert.match(homeSource, /: \[\]/);
  assert.doesNotMatch(homeSource, /HOME_CHANNEL_PINS\.external/);
  assert.doesNotMatch(homeSource, /EXTERNAL_TOOLS_CATALOG/);
  assert.doesNotMatch(homeSource, /featuredPins\.external/);
});

test('三类用户货架默认按后台顺序，并在 Hub 卡片上保留目录序号', () => {
  assert.match(source, /useState<RankMode>\('excel_order'\)/);
  assert.match(source, /setRankMode\('excel_order'\)/);
  assert.match(source, /setAgentRankMode\('excel_order'\)/);
  assert.match(source, /const mapped = mssSkills\.map\(\(s, sourceOrder\)/);
  assert.match(source, /const mapped = mssAgents\.map\(\(agent, sourceOrder\)/);
  assert.match(source, /showExcelOrder=\{sectionShowExcelOrder\}/);
  assert.match(source, /showExcelOrder=\{kind === 'external' \|\| sectionShowExcelOrder\}/);
});

test('用户侧外部工具全部筛选读取工具运营的全局布局', () => {
  assert.match(source, /externalAllLayoutSplit/);
  assert.match(source, /externalToolLayout\?\.all/);
  assert.match(source, /allLayout\.overseasFeaturedIds/);
  assert.match(source, /allLayout\.domesticFeaturedIds/);
  assert.match(source, /allLayout\.overseasMoreOrderIds/);
  assert.match(source, /allLayout\.domesticMoreOrderIds/);
  assert.doesNotMatch(
    source,
    /featuredPins\.external|splitExternalFeaturedItemsByRegion|orderExternalFeaturedItems/,
    '外部工具精选不能再回退到旧 market-featured 文档',
  );
});

test('用户侧全局外部工具切换互动排序时不被人工布局顺序覆盖', () => {
  assert.match(
    source,
    /if \(rankMode !== 'excel_order'\) \{[\s\S]*?featured: filteredCards\.filter\(\(card\) => featuredIds\.has\(card\.id\)\),[\s\S]*?rest: filteredCards\.filter\(\(card\) => !featuredIds\.has\(card\.id\)\)/,
  );
  assert.match(
    source,
    /\}, \[kind, externalType, externalToolLayout, filteredCards, rankMode, rankDirection\]\);/,
  );
  assert.match(source, /direction=\{rankDirection\}/);
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
