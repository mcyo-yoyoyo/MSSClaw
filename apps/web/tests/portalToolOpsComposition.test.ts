import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const portalPanelSource = readFileSync(
  new URL('../src/features/ops/PortalToolOpsPanel.tsx', import.meta.url),
  'utf8',
);
const officeScenePageSource = readFileSync(
  new URL('../src/features/ops/OfficeSceneOpsPage.tsx', import.meta.url),
  'utf8',
);
const lazyPagesSource = readFileSync(
  new URL('../src/features/lazyPages.ts', import.meta.url),
  'utf8',
);
const toolCenterSource = readFileSync(
  new URL('../src/features/tool/ToolCenterPage.tsx', import.meta.url),
  'utf8',
);
const toolEditorSource = readFileSync(
  new URL('../src/components/center/ToolEditorModal.tsx', import.meta.url),
  'utf8',
);
test('工具运营内部页复用用户侧卡片并启用精简自动保存视图', () => {
  assert.match(
    portalPanelSource,
    /import \{ InternalOfficeSceneGrid \} from '@\/components\/market\/InternalOfficeSceneGrid';/,
  );
  assert.match(
    portalPanelSource,
    /<InternalOfficeSceneGrid[\s\S]*?rankMode="excel_order"[\s\S]*?interactionMode="preview"[\s\S]*?showAssistantChat=\{false\}[\s\S]*?maintenanceView[\s\S]*?reorderEnabled=\{[\s\S]*?canManageInternalOrder[\s\S]*?!internalSaving[\s\S]*?\}[\s\S]*?onSceneDrop=\{dropInternalScene\}/,
    '门户工具运营必须复用用户侧卡片网格，并仅在后台启用精简拖拽维护视图',
  );
  assert.match(portalPanelSource, /reorderVisibleEntry/);
  assert.match(
    portalPanelSource,
    /<InternalOfficeSceneGrid[\s\S]*?\bpointerReorder\b[\s\S]*?onSceneDrop=/,
    '只有门户管理页显式启用内部工具的苹果式指针排序',
  );
  assert.match(
    portalPanelSource,
    /const dropInternalScene = async \(beforeId: string \| null\): Promise<boolean>/,
    '父层必须把保存 Promise 直接交给网格，避免保存完成前跳回旧顺序',
  );
  assert.match(
    portalPanelSource,
    /const canManageInternalOrder = user\?\.platformRole === 'super_admin';/,
    '交互升级不能扩大内部工具排序权限',
  );
  assert.match(
    portalPanelSource,
    /const drag = internalDragRef\.current \?\? internalDrag;/,
    '快速拖放时必须同步读取拖拽起点，不能等待 React 状态重渲染',
  );
  const internalDropStart = portalPanelSource.indexOf('const dropInternalScene =');
  const internalDropEnd = portalPanelSource.indexOf('const selectKind =', internalDropStart);
  assert.ok(internalDropStart >= 0 && internalDropEnd > internalDropStart);
  const internalDropSource = portalPanelSource.slice(internalDropStart, internalDropEnd);
  assert.equal(
    [...internalDropSource.matchAll(/reorderVisibleEntry\(/g)].length,
    1,
    '一次内部卡片 pointerup 只能触发一次数据库排序保存',
  );
  assert.match(
    internalDropSource,
    /drag\.workspaceId !== workspaceId[\s\S]*?liveState\.workspaceId !== drag\.workspaceId/,
    '松手保存前必须保持原有工作区隔离，不能把旧拖拽写入新工作区',
  );
  assert.doesNotMatch(
    portalPanelSource,
    /<OfficeSceneOpsPage\s+embedded\s+readOnly\s*\/>/,
    '内部工具不能继续渲染场景表单式主从编辑界面',
  );
});

test('工具运营只在工具卡片提供直接上下架按钮', () => {
  assert.doesNotMatch(portalPanelSource, /上架管理/);
  assert.doesNotMatch(portalPanelSource, /onOpenShelfOps/);
  assert.doesNotMatch(
    portalPanelSource,
    /data-tool-listing-manager|external-tool-listing-manager|ExternalShelfStatusTabs|openExternalListingManager|externalOpsMode|externalShelfStatus/,
    '不能增加顶部上下架入口或独立管理视图',
  );
  assert.doesNotMatch(
    portalPanelSource,
    />\s*(?:维护排序|保存布局)\s*</,
    '不能恢复额外维护模式或手动保存入口',
  );
  assert.match(portalPanelSource, /['"]加入精选['"]/);
  assert.match(portalPanelSource, /['"]移出精选['"]/);
  assert.match(portalPanelSource, /data-external-list-mode={item\.id}/);
  assert.match(portalPanelSource, /label: '更多'/);
  assert.match(portalPanelSource, /label: '未上架'/);
  assert.match(portalPanelSource, /listUnlistedExternalToolCards/);
  assert.match(portalPanelSource, /data-unlisted-tool-id={card\.id}/);
  assert.ok(
    portalPanelSource.includes(
      "data-tool-listing-action={`list-${saving ? 'saving' : 'direct'}`}",
    ),
    '未上架卡片必须显示直接上架按钮或保存中状态',
  );
  assert.ok(
    portalPanelSource.includes(
      "data-tool-listing-action={`unlist-${unlistingSaving ? 'saving' : 'direct'}`}",
    ),
    '已上架卡片必须显示直接下架按钮或保存中状态',
  );
  assert.doesNotMatch(
    portalPanelSource,
    /useAssetApprovalStore|approvalHistory|pendingToolListingIds|pendingToolUnlistingIds|上架审批中|下架审批中/,
  );

  const listStart = portalPanelSource.indexOf('const listTool =');
  const listEnd = portalPanelSource.indexOf('const unlistTool =', listStart);
  assert.ok(listStart >= 0 && listEnd > listStart);
  const listSource = portalPanelSource.slice(listStart, listEnd);
  assert.match(
    listSource,
    /savingToolListingIdsRef\.current\.has\(card\.id\)/,
  );
  assert.match(
    listSource,
    /try \{[\s\S]*?await marketplace\.saveToolNow\(\{ \.\.\.tool, published: true \}\)[\s\S]*?\} catch \{[\s\S]*?\} finally \{/,
  );
  assert.doesNotMatch(listSource, /openApproval|publish_executable|unpublish_skill/);

  const unlistStart = portalPanelSource.indexOf('const unlistTool =');
  const unlistEnd = portalPanelSource.indexOf('const startExternalDrag =', unlistStart);
  assert.ok(unlistStart >= 0 && unlistEnd > unlistStart);
  const unlistSource = portalPanelSource.slice(unlistStart, unlistEnd);
  assert.match(
    unlistSource,
    /savingToolUnlistingIdsRef\.current\.has\(card\.id\)/,
  );
  assert.match(
    unlistSource,
    /try \{[\s\S]*?await marketplace\.saveToolNow\(\{ \.\.\.tool, published: false \}\)[\s\S]*?\} catch \{[\s\S]*?\} finally \{/,
  );
  assert.doesNotMatch(unlistSource, /openApproval|unpublish_skill/);
  assert.equal(
    [...portalPanelSource.matchAll(/savingListingIds=\{savingToolListingIds\}/g)].length,
    2,
  );
  assert.equal([...portalPanelSource.matchAll(/onList=\{listTool\}/g)].length, 2);
});

test('配置工具统一显示上下架语义且新工具默认未上架', () => {
  assert.doesNotMatch(toolCenterSource, /未发布|已发布|发布状态/);
  assert.doesNotMatch(toolEditorSource, /未发布|已发布|发布状态/);
  assert.match(toolCenterSource, /label: '未上架'/);
  assert.match(toolCenterSource, /label: '已上架'/);
  assert.match(toolCenterSource, /resolveConfiguredToolMarketShelf/);
  assert.match(
    toolEditorSource,
    /function emptyTool[\s\S]*?published: false,[\s\S]*?marketShelf: asExternal \? 'external' : 'none'/,
    '新增外部工具必须保留目标货架，但初始状态必须是未上架',
  );
});

test('独立配置入口保留完整维护模式', () => {
  assert.match(
    officeScenePageSource,
    /export function OfficeSceneOpsPage\(\{[\s\S]*?embedded = false,[\s\S]*?readOnly = false,[\s\S]*?\}/,
    '独立入口省略 props 时必须默认使用完整可编辑模式',
  );
  assert.match(officeScenePageSource, /data-testid="office-scene-ops-workspace"/);
  assert.match(
    lazyPagesSource,
    /m\.OfficeSceneOpsPage/,
    '独立「配置办公场景」入口仍需加载同一个组件',
  );
});

test('嵌入版移除页面级维护入口，独立版保留页头、保存与删除', () => {
  assert.match(
    officeScenePageSource,
    /\{!embedded \? \(\s*<div data-testid="office-scene-ops-page-chrome">/,
    '页头与统计卡只能在独立配置页显示',
  );
  assert.match(
    officeScenePageSource,
    /\{!embedded \? \(\s*<div\s+className="sticky bottom-0[^"]*"\s+data-testid="office-scene-ops-page-footer"[\s\S]*?onClick=\{\(\) => void saveDraft\(\)\}/,
    '独立配置页必须保留数据库保存入口',
  );
  assert.doesNotMatch(
    officeScenePageSource,
    /office-scene-ops-embedded-save/,
    '嵌入版不能再提供显式保存按钮',
  );

  const sceneEditorHeaderSource = officeScenePageSource.slice(
    officeScenePageSource.indexOf('function SceneEditorHeader'),
    officeScenePageSource.indexOf('function ToolBindingEditor'),
  );
  assert.match(
    sceneEditorHeaderSource,
    /\{readOnly \? \(/,
    '场景标题区必须根据只读模式隐藏维护动作',
  );
  assert.match(
    sceneEditorHeaderSource,
    />\s*删除\s*</,
    '独立配置页必须保留删除动作',
  );
  assert.doesNotMatch(sceneEditorHeaderSource, />\s*上移\s*</);
  assert.doesNotMatch(sceneEditorHeaderSource, />\s*下移\s*</);
  assert.doesNotMatch(
    sceneEditorHeaderSource,
    /type="checkbox"/,
    '场景标题区不再展示业务可见开关',
  );
});

test('门户显式只读模式覆盖场景详情与工具绑定', () => {
  assert.match(
    officeScenePageSource,
    /<SceneEditorHeader[\s\S]*?readOnly=\{readOnly\}[\s\S]*?\/>/,
    '场景标题区必须接收显式只读标记',
  );
  assert.equal(
    [...officeScenePageSource.matchAll(/<input(?=[^>]*readOnly=\{readOnly\})[^>]*>/g)]
      .length,
    2,
    '场景名和英文副标都必须服从显式只读模式',
  );
  assert.match(
    officeScenePageSource,
    /<textarea(?=[^>]*readOnly=\{readOnly\})[^>]*>/,
    '场景简介必须服从显式只读模式',
  );
  assert.match(
    officeScenePageSource,
    /<ToolBindingEditor[\s\S]*?readOnly=\{readOnly\}[\s\S]*?\/>/,
    '工具绑定区必须接收显式只读标记',
  );

  const toolBindingEditorSource = officeScenePageSource.slice(
    officeScenePageSource.indexOf('function ToolBindingEditor'),
  );
  assert.match(
    toolBindingEditorSource,
    /\{!readOnly \? \(/,
    '工具绑定区必须根据只读模式隐藏绑定变更动作',
  );
});

test('嵌入版复用已加载快照并自动更新无改动草稿', () => {
  assert.match(
    officeScenePageSource,
    /embedded &&\s*state\.loaded &&\s*state\.workspaceId === currentWorkspaceId\(\)/,
    '门户已加载场景后，嵌入组件不应再次 fresh hydrate 并锁住表单',
  );
  assert.match(
    officeScenePageSource,
    /if \(sameDraftContext && draftContext\.revision === revision\) return;/,
  );
  assert.match(
    officeScenePageSource,
    /if \(sameDraftContext && dirty\) return;/,
    '仅有未保存改动时才保留旧 revision 草稿',
  );
});

test('外部工具全部筛选维护四个独立列表并在操作后立即保存', () => {
  assert.match(portalPanelSource, /useExternalToolLayoutStore/);
  for (const listId of [
    'overseasFeaturedIds',
    'domesticFeaturedIds',
    'overseasMoreOrderIds',
    'domesticMoreOrderIds',
  ]) {
    assert.match(
      portalPanelSource,
      new RegExp(`listId=["{\\x60]${listId}`),
      `全部筛选必须渲染 ${listId}`,
    );
  }
  assert.match(portalPanelSource, /const activeLayout:[\s\S]*?layoutDraft \?\? layoutDocument/);
  assert.match(
    portalPanelSource,
    /const persistExternalLayoutChange = async[\s\S]*?await saveLayoutDraft\(\)/,
    '按钮与排序必须共用同一条自动保存链路',
  );
  assert.match(
    portalPanelSource,
    /const changeFeaturedMembership =[\s\S]*?void persistExternalLayoutChange\(/,
    '加入和移出精选不能只改本地状态，必须进入自动保存链路',
  );
  assert.equal(
    [...portalPanelSource.matchAll(/saveLayoutDraft\(\)/g)].length,
    1,
    '加入、移出或一次拖放都只能经由一个自动保存出口',
  );
  assert.match(portalPanelSource, /const handleExternalPointerDrop =/);
  assert.match(
    portalPanelSource,
    /onPointerUpCapture=\{handleExternalPointerUpCapture\}/,
  );
  assert.match(
    portalPanelSource,
    /const externalDragEnabled = Boolean\(activeLayout\) && !layoutLoading && !layoutSaving/,
    '保存期间必须锁住按钮和排序，避免第二次修改被 store 静默忽略',
  );
  assert.match(
    portalPanelSource,
    /failedState\.workspaceId !== expectedWorkspaceId[\s\S]*?cancelLayoutEdit\(\)[\s\S]*?hydrateLayout\(expectedWorkspaceId\)/,
    '自动保存失败后必须按工作区保护清理旧草稿并刷新服务器版本',
  );
});

test('外部精选标题右侧提供排序入口且工具条不重复显示', () => {
  const externalSearchStart = portalPanelSource.indexOf('placeholder="搜索外部工具…"');
  const externalFiltersStart = portalPanelSource.indexOf('<ExternalMarketFilters', externalSearchStart);
  const externalToolbarSource = portalPanelSource.slice(externalSearchStart, externalFiltersStart);
  assert.ok(externalSearchStart >= 0 && externalFiltersStart > externalSearchStart);
  assert.doesNotMatch(externalToolbarSource, /<ShelfRankSelect/, '工具条不再重复展示排序控件');

  const externalPanelStart = portalPanelSource.indexOf(
    'data-testid="portal-tool-ops-external"',
  );
  const featuredSectionStart = portalPanelSource.indexOf(
    '<section className="mb-7">',
    externalPanelStart,
  );
  const featuredGridStart = portalPanelSource.indexOf(
    '<div className="grid gap-4 lg:grid-cols-2">',
    featuredSectionStart,
  );
  assert.ok(externalPanelStart >= 0 && featuredSectionStart > externalPanelStart);
  assert.ok(featuredGridStart > featuredSectionStart);
  const featuredHeaderSource = portalPanelSource.slice(
    featuredSectionStart,
    featuredGridStart,
  );
  assert.match(featuredHeaderSource, /精选推荐/);
  assert.match(
    featuredHeaderSource,
    /<ShelfRankSelect[\s\S]*?value=\{externalRankMode\}[\s\S]*?onChange=\{handleExternalRankModeChange\}[\s\S]*?direction=\{externalRankDirection\}[\s\S]*?onDirectionChange=\{setExternalRankDirection\}/,
  );
});

test('分类精选从全库解析，更多按当前分类排名过滤并排除精选', () => {
  assert.match(
    portalPanelSource,
    /listId=\{`category:\$\{externalType\}:overseas:featured`\}/,
  );
  assert.match(
    portalPanelSource,
    /listId=\{`category:\$\{externalType\}:domestic:featured`\}/,
  );
  assert.match(
    portalPanelSource,
    /listId=\{`category:\$\{externalType\}:overseas:more`\}/,
  );
  assert.match(
    portalPanelSource,
    /listId=\{`category:\$\{externalType\}:domestic:more`\}/,
  );
  assert.doesNotMatch(
    portalPanelSource,
    /listId=\{`category:\$\{externalType\}:more`\}/,
    '分类下不能再合并为一个更多列表',
  );
  assert.match(
    portalPanelSource,
    /categoryOverseasFeaturedIds[\s\S]*?categoryDomesticFeaturedIds/,
    '分类必须分别读取海外和国内精选列表',
  );
  assert.match(portalPanelSource, /'overseasFeaturedIds'/);
  assert.match(portalPanelSource, /'domesticFeaturedIds'/);

  const externalCardsStart = portalPanelSource.indexOf('const externalCards = useMemo');
  const externalCardsEnd = portalPanelSource.indexOf(
    'const externalStats',
    externalCardsStart,
  );
  assert.ok(
    externalCardsStart >= 0 && externalCardsEnd > externalCardsStart,
    '必须保留外部工具完整目录取数区',
  );
  const externalCardsSource = portalPanelSource.slice(
    externalCardsStart,
    externalCardsEnd,
  );
  assert.match(
    externalCardsSource,
    /listMarketToolCards\(\s*tools,\s*'external',[\s\S]*?\)\.map\(\(card\) => \(\{/,
    '完整外部目录必须继续通过 listMarketToolCards 限制发布状态与账号可见性',
  );
  assert.doesNotMatch(
    externalCardsSource,
    /toolMatchesExternalTypeCatalog/,
    '后台候选目录不能先按当前 taxonomy 筛选',
  );
  assert.match(
    portalPanelSource,
    /const overseasCards = externalCards\.filter\(\(card\) => card\.region === 'overseas'\);[\s\S]*?const domesticCards = externalCards\.filter\(\(card\) => card\.region === 'domestic'\);/,
    '外部全库必须先按地域拆分',
  );
  assert.match(
    portalPanelSource,
    /const categoryOverseasFeatured = selectCardsByIds\(\s*overseasCards,[\s\S]*?const categoryDomesticFeatured = selectCardsByIds\(\s*domesticCards,/,
    '分类精选必须从完整地域池解析，不能被当前 taxonomy 筛选丢弃',
  );
  assert.match(
    portalPanelSource,
    /listExternalCategoryRankedMore\(externalCards, externalType, \[[\s\S]*?\.\.\.categoryOverseasFeaturedIds,[\s\S]*?\.\.\.categoryDomesticFeaturedIds,[\s\S]*?\]\)/,
    '分类更多必须按当前 Excel 分类排名过滤，并排除海外和国内精选',
  );
  assert.match(
    portalPanelSource,
    /externalType === 'all' \|\| !activeLayout[\s\S]*?\? \[\][\s\S]*?: listExternalCategoryRankedMore/,
    '布局未加载成功时不能用空精选配置伪造分类更多',
  );
  assert.match(
    portalPanelSource,
    /const categoryOverseasMore = orderExternalToolsByLayoutIds\([\s\S]*?categoryRankedMore\.filter\(\(card\) => card\.region === 'overseas'\)[\s\S]*?const categoryDomesticMore = orderExternalToolsByLayoutIds\([\s\S]*?categoryRankedMore\.filter\(\(card\) => card\.region === 'domestic'\)/,
    '分类更多必须把排名候选按地区拆分',
  );
  assert.doesNotMatch(
    portalPanelSource,
    /const categoryOverseasMore = overseasCards;|const categoryDomesticMore = domesticCards;/,
    '分类更多不能再直接展示外部全库',
  );
  assert.match(
    portalPanelSource,
    /const overseasAvailableIds = new Set\(overseasCards\.map\(\(card\) => card\.id\)\);[\s\S]*?const domesticAvailableIds = new Set\(domesticCards\.map\(\(card\) => card\.id\)\);/,
    '跨分类工具写入精选时，availableIds 也必须使用全库地域池',
  );
  assert.match(
    portalPanelSource,
    /searchCapabilitiesByIntent\(search, externalCards, externalCards\.length\)/,
    '搜索索引可覆盖全库，但最终只能与已筛选的分类更多取交集',
  );
  assert.match(
    portalPanelSource,
    /items=\{visibleCategoryOverseasMore\}[\s\S]*?items=\{visibleCategoryDomesticMore\}/,
    '分类搜索不能重新引入未排名或已精选工具',
  );
  assert.match(
    portalPanelSource,
    /categories\[externalType\]\?\.overseasMoreOrderIds[\s\S]*?categories\[externalType\]\?\.domesticMoreOrderIds/,
    '分类布局必须分别读取海外和国内更多排序',
  );
  assert.match(
    portalPanelSource,
    /const categoryOverseasMore = orderExternalToolsByLayoutIds\([\s\S]*?categoryOverseasMoreOrderIds[\s\S]*?const categoryDomesticMore = orderExternalToolsByLayoutIds\([\s\S]*?categoryDomesticMoreOrderIds/,
    'Excel 分类候选必须先按地区拆分，再应用运营人工顺序',
  );
  assert.match(
    portalPanelSource,
    /const dropCategory = \([\s\S]*?const moreList = `category:\$\{externalType\}:\$\{drag\.region\}:more`[\s\S]*?drag\.source !== target[\s\S]*?if \(isMore && search\.trim\(\)\) return false;[\s\S]*?writeCategoryList\(key, next\);/,
    '分类更多只允许同列表排序，且搜索状态不能写入局部结果顺序',
  );
});

function toolDropGridInvocation(marker: string): string {
  const markerIndex = portalPanelSource.indexOf(marker);
  assert.ok(markerIndex >= 0, `必须渲染列表 ${marker}`);
  const start = portalPanelSource.lastIndexOf('<ToolDropGrid', markerIndex);
  const end = portalPanelSource.indexOf('/>', markerIndex);
  assert.ok(start >= 0 && end > markerIndex, `${marker} 必须是完整的 ToolDropGrid`);
  return portalPanelSource.slice(start, end + 2);
}

test('按钮负责进出精选，拖拽只在允许的本列表内排序', () => {
  const allFeatured = [
    toolDropGridInvocation('listId="overseasFeaturedIds"'),
    toolDropGridInvocation('listId="domesticFeaturedIds"'),
  ];
  const allMore = [
    toolDropGridInvocation('listId="overseasMoreOrderIds"'),
    toolDropGridInvocation('listId="domesticMoreOrderIds"'),
  ];
  const categoryFeatured = [
    toolDropGridInvocation('listId={`category:${externalType}:overseas:featured`}'),
    toolDropGridInvocation('listId={`category:${externalType}:domestic:featured`}'),
  ];
  const categoryMore = [
    toolDropGridInvocation('listId={`category:${externalType}:overseas:more`}'),
    toolDropGridInvocation('listId={`category:${externalType}:domestic:more`}'),
  ];

  for (const source of [...allFeatured, ...allMore, ...categoryFeatured, ...categoryMore]) {
    assert.match(source, /savingUnlistingIds=\{savingToolUnlistingIds\}/);
    assert.match(source, /onUnlist=\{unlistTool\}/);
  }

  for (const source of [...allFeatured, ...categoryFeatured]) {
    assert.match(source, /\bfeatured(?:\s|=\{true\})/);
    assert.match(source, /sortable=\{externalDragByOrder\}/);
    assert.match(source, /actionEnabled=\{externalDragEnabled\}/);
    assert.match(source, /onRemoveFromFeatured=/);
  }
  for (const source of allMore) {
    assert.match(source, /featured=\{false\}/);
    assert.match(source, /sortable=\{externalDragByOrder && !search\.trim\(\)\}/);
    assert.match(source, /actionEnabled=\{externalDragEnabled\}/);
    assert.match(source, /onAddToFeatured=/);
  }
  for (const source of categoryMore) {
    assert.match(source, /featured=\{false\}/);
    assert.match(source, /sortable=\{externalDragByOrder && !search\.trim\(\)\}/);
    assert.match(source, /actionEnabled=\{externalDragEnabled\}/);
    assert.match(source, /onAddToFeatured=/);
  }

  const toolDropGridStart = portalPanelSource.indexOf('function ToolDropGrid');
  const toolDropGridEnd = portalPanelSource.indexOf(
    'function ToolListPanel',
    toolDropGridStart,
  );
  assert.ok(toolDropGridStart >= 0 && toolDropGridEnd > toolDropGridStart);
  const toolDropGridSource = portalPanelSource.slice(toolDropGridStart, toolDropGridEnd);
  assert.match(toolDropGridSource, /['"]加入精选['"]/);
  assert.match(toolDropGridSource, /['"]移出精选['"]/);
  assert.match(toolDropGridSource, /unlistingSaving \? '下架中' : '下架'/);
  const dragHandleIndex = toolDropGridSource.indexOf('data-tool-drag-handle');
  const unlistButtonIndex = toolDropGridSource.indexOf('data-tool-listing-action');
  const featuredButtonIndex = toolDropGridSource.indexOf('data-tool-featured-action');
  assert.ok(
    dragHandleIndex >= 0 && dragHandleIndex < unlistButtonIndex,
    '排序按钮必须在下架按钮之前',
  );
  assert.ok(
    unlistButtonIndex >= 0 && unlistButtonIndex < featuredButtonIndex,
    '下架按钮必须在精选按钮之前',
  );
  assert.ok(
    featuredButtonIndex >= 0,
    '精选按钮必须与排序、下架同一组 footer actions 渲染',
  );
  assert.match(
    toolDropGridSource,
    /onClick=\{\(event\) => \{[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?onRemoveFromFeatured\(card, listId\);[\s\S]*?onAddToFeatured\(card, listId\);/,
    '精选按钮不能触发卡片详情点击',
  );
  assert.match(
    toolDropGridSource,
    /data-tool-listing-action=[\s\S]*?onPointerDown=\{\(event\) => event\.stopPropagation\(\)\}[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?onUnlist\(card\);/,
    '下架按钮不能触发拖拽或卡片详情点击',
  );
  assert.match(toolDropGridSource, /<div className="flex items-center gap-1">/);
  assert.equal(
    [...toolDropGridSource.matchAll(/px-1\.5 py-1/g)].length,
    3,
    '1044px 下三枚操作按钮必须更紧凑',
  );
  assert.match(
    portalPanelSource,
    /data-tool-drag-handle[\s\S]*?onPointerDown=\{\(event\) => \{[\s\S]*?!event\.isPrimary \|\| event\.button !== 0[\s\S]*?onPointerStart\(/,
    '只有手柄能准备外部工具拖拽',
  );
  assert.match(
    portalPanelSource,
    /const handleExternalPointerDrop =[\s\S]*?const target = candidate === drag\.source \? candidate : null;[\s\S]*?if \(target\) void commitExternalDrop/,
    '松手到其他列表或空白区必须取消，不能替代加入或移出按钮',
  );
});

test('外部工具恢复简单跟手预览，pointerup 才一次性落位', () => {
  const updatePreviewStart = portalPanelSource.indexOf(
    'const updateExternalDragPreviewPosition',
  );
  const updatePreviewEnd = portalPanelSource.indexOf(
    'const prepareExternalPointerDrag',
    updatePreviewStart,
  );
  assert.ok(
    updatePreviewStart >= 0 && updatePreviewEnd > updatePreviewStart,
    '必须保留独立的拖拽预览坐标更新逻辑',
  );
  const updatePreviewSource = portalPanelSource.slice(
    updatePreviewStart,
    updatePreviewEnd,
  );
  assert.match(
    updatePreviewSource,
    /resolveDragPreviewPosition\(\s*clientX,\s*clientY,[\s\S]*?\);[\s\S]*?externalDragPreviewPositionRef\.current = next;[\s\S]*?externalDragPreviewRef\.current\.style\.transform = dragPreviewTransform\(next\);/,
    '指针坐标必须同步写入位置 ref，并直接更新预览层 transform',
  );

  const pointerMoveStart = portalPanelSource.indexOf(
    'const handleExternalPointerMoveCapture',
  );
  const pointerMoveEnd = portalPanelSource.indexOf(
    'const handleExternalPointerUpCapture',
    pointerMoveStart,
  );
  assert.ok(
    pointerMoveStart >= 0 && pointerMoveEnd > pointerMoveStart,
    '必须保留外部工具 pointermove 处理器',
  );
  const pointerMoveSource = portalPanelSource.slice(pointerMoveStart, pointerMoveEnd);
  assert.match(
    pointerMoveSource,
    /if \(moved && !pointer\.moved\)[\s\S]*?startExternalDrag\(pointer\.drag\);[\s\S]*?if \(pointer\.moved\) \{\s*updateExternalDragPreviewPosition\(\s*event\.clientX,\s*event\.clientY,\s*event\.currentTarget\.ownerDocument,\s*\);/,
    '越过阈值后每次 pointermove 都必须使用当前 clientX/clientY 刷新预览',
  );
  assert.doesNotMatch(
    pointerMoveSource,
    /commitExternal(?:Drop|Mutation|LayoutChange)|saveLayoutDraft|setAllLayoutList|setCategoryFeatured|setCategoryList/,
    'pointermove 只更新跟手预览，不能实时换位或保存',
  );

  const previewMarker = 'data-testid="external-tool-drag-preview"';
  const previewMarkerIndex = portalPanelSource.indexOf(previewMarker);
  const previewStart = portalPanelSource.lastIndexOf('createPortal(', previewMarkerIndex);
  const previewEnd = portalPanelSource.indexOf('document.body', previewMarkerIndex);
  assert.ok(
    previewMarkerIndex >= 0 && previewStart >= 0 && previewEnd > previewMarkerIndex,
    '拖拽预览必须通过 portal 渲染到 document.body',
  );
  const previewSource = portalPanelSource.slice(
    previewStart,
    previewEnd + 'document.body'.length,
  );
  assert.match(previewSource, /createPortal\(/);
  assert.match(
    previewSource,
    /className="(?=[^"]*\bpointer-events-none\b)(?=[^"]*\bfixed\b)[^"]*"/,
    'fixed 预览层必须允许指针事件穿透，避免遮挡真实落点',
  );
  assert.match(
    previewSource,
    /<MarketShelfCard[\s\S]*?card=\{draggedExternalCard\}/,
    '拖拽预览必须展示当前正在拖动的卡片',
  );
  assert.match(
    previewSource,
    /transform: dragPreviewTransform\(externalDragPreviewPositionRef\.current\),/,
    '预览首次挂载时必须使用越过阈值那次移动写入的位置',
  );
  assert.match(previewSource, /document\.body/);
  assert.match(
    portalPanelSource,
    /\{dragState && draggedExternalCard && typeof document !== 'undefined'\s*\? createPortal\(/,
    '拖拽状态结束后必须通过条件渲染卸载 portal 预览',
  );

  const finishStart = portalPanelSource.indexOf('const finishExternalDrag');
  const commitMatch = /const commitExternal(?:Drop|Mutation|LayoutChange)/.exec(
    portalPanelSource.slice(finishStart),
  );
  const finishEnd = commitMatch ? finishStart + commitMatch.index : -1;
  assert.ok(finishStart >= 0 && finishEnd > finishStart, '必须保留统一拖拽结束逻辑');
  const finishSource = portalPanelSource.slice(finishStart, finishEnd);
  assert.match(
    finishSource,
    /externalPointerDragRef\.current = null;[\s\S]*?dragStateRef\.current = null;[\s\S]*?setDragState\(null\);/,
    '统一结束逻辑必须清空指针和拖拽状态，从而卸载预览层',
  );
  assert.match(
    portalPanelSource,
    /const handleExternalPointerUpCapture =[\s\S]*?handleExternalPointerDrop\([\s\S]*?elementFromPoint\(event\.clientX, event\.clientY\)/,
    '只有 pointerup 使用最终屏幕落点发起一次排序提交',
  );
  assert.match(
    portalPanelSource,
    /const persistExternalLayoutChange = async \([\s\S]*?expectedWorkspaceId: string,[\s\S]*?liveLayoutState\.workspaceId !== expectedWorkspaceId/,
    '真正写入布局前必须再次校验拖拽开始时的工作区',
  );
  assert.match(
    portalPanelSource,
    /workspaceId: layoutState\.workspaceId,[\s\S]*?const handleExternalPointerUpCapture =[\s\S]*?handleExternalPointerDrop\([\s\S]*?pointer\.workspaceId,/,
    'pointerup 必须传递拖拽开始时捕获的工作区，而不是读取新的工作区',
  );
  assert.match(
    portalPanelSource,
    /const handleExternalPointerUpCapture =[\s\S]*?if \(!moved\) \{\s*finishExternalDrag\(\);\s*return;\s*\}[\s\S]*?handleExternalPointerDrop\([\s\S]*?const handleExternalPointerCancelCapture/,
    '未形成拖拽与已形成拖拽的 pointerup 都必须进入清理路径',
  );
  assert.match(
    portalPanelSource,
    /const handleExternalPointerCancelCapture =[\s\S]*?finishExternalDrag\(\);[\s\S]*?const handleExternalLostPointerCapture =[\s\S]*?finishExternalDrag\(\);/,
    'pointercancel 或丢失指针捕获时都必须走统一清理',
  );
});

test('外部排序不再渲染苹果式实时让位与落下吸附', () => {
  assert.doesNotMatch(portalPanelSource, /type ExternalDragPlacement/);
  assert.doesNotMatch(portalPanelSource, /previewExternalDropItems/);
  assert.doesNotMatch(portalPanelSource, /animateExternalGridReflow/);
  assert.doesNotMatch(portalPanelSource, /animateExternalDrop/);
  assert.doesNotMatch(portalPanelSource, /data-tool-drop-placeholder/);
  assert.doesNotMatch(portalPanelSource, /externalDragPlacement/);
});

test('运营卡片显示互动指标且整卡正文直接查看详情', () => {
  assert.match(portalPanelSource, /interactionMode="preview"/);
  assert.match(portalPanelSource, /showEngagementOnly/);
  assert.match(portalPanelSource, /showDefaultFooter/);
  assert.match(portalPanelSource, /onOpen=\{\(\) => onOpen\(card\)\}/);
  assert.match(
    portalPanelSource,
    /加入或移出精选[\s\S]{0,160}自动保存/,
    '页面说明必须与显式按钮和自动保存语义一致',
  );
});
