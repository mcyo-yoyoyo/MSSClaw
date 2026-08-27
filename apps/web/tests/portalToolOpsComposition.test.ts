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

test('工具运营入口不再提供额外维护模式与上架跳转', () => {
  assert.doesNotMatch(portalPanelSource, /上架管理/);
  assert.doesNotMatch(portalPanelSource, /onOpenShelfOps/);
  assert.doesNotMatch(
    portalPanelSource,
    />\s*(?:维护排序|保存布局|加入精选|移出精选)\s*</,
    '不能渲染额外维护按钮；业务规则注释不属于用户可见入口',
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

test('外部工具全部筛选维护四个独立列表并在拖放后立即保存', () => {
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
    /const commitExternalDrop = async[\s\S]*?if \(!accepted\) return;[\s\S]*?await saveLayoutDraft\(\)/,
  );
  assert.equal(
    [...portalPanelSource.matchAll(/saveLayoutDraft\(\)/g)].length,
    1,
    '一次拖放只能触发一次自动保存',
  );
  assert.match(portalPanelSource, /const handleExternalPointerDrop =/);
  assert.match(
    portalPanelSource,
    /onPointerUpCapture=\{handleExternalPointerUpCapture\}/,
  );
  assert.match(
    portalPanelSource,
    /resolveExternalDropTarget\(\s*selectedType,\s*drag,\s*candidate,?\s*\)/,
    '实时让位与松手提交必须继续复用精选拖出剔除规则',
  );
  assert.match(
    portalPanelSource,
    /const externalDragEnabled = Boolean\(activeLayout\) && !layoutLoading && !layoutSaving/,
    '保存期间必须锁住拖拽，避免第二次修改被 store 静默忽略',
  );
  assert.match(
    portalPanelSource,
    /failedState\.workspaceId !== startedWorkspaceId[\s\S]*?cancelLayoutEdit\(\)[\s\S]*?hydrateLayout\(startedWorkspaceId\)/,
    '自动保存失败后必须按工作区保护清理旧草稿并刷新服务器版本',
  );
});

test('其他分类的精选与更多均从外部全库按海外和国内分列', () => {
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
    /const categoryOverseasMore = overseasCards;[\s\S]*?const categoryDomesticMore = domesticCards;/,
    '分类更多必须展示外部全库（含已精选项），并按地区拆分',
  );
  assert.match(
    portalPanelSource,
    /const overseasAvailableIds = new Set\(overseasCards\.map\(\(card\) => card\.id\)\);[\s\S]*?const domesticAvailableIds = new Set\(domesticCards\.map\(\(card\) => card\.id\)\);/,
    '跨分类工具写入精选时，availableIds 也必须使用全库地域池',
  );
  assert.match(
    portalPanelSource,
    /searchCapabilitiesByIntent\(search, externalCards, externalCards\.length\)/,
    '非全部分类搜索必须覆盖全库候选，否则跨分类工具会再次消失',
  );
  assert.match(portalPanelSource, /dragEnabled=\{externalDragEnabled\}/);
  assert.doesNotMatch(
    portalPanelSource,
    /categories\[[^\]]+\][\s\S]{0,80}MoreOrderIds/,
    '分类布局不能持久化更多排序',
  );
});

test('外部工具仅从手柄启动拖拽，精选卡拖出本精选区会解析为移除', () => {
  assert.match(
    portalPanelSource,
    /data-tool-drag-handle[\s\S]*?onPointerDown=\{\(event\) => \{[\s\S]*?!event\.isPrimary \|\| event\.button !== 0[\s\S]*?onPointerStart\(/,
    '只有手柄能准备外部工具拖拽',
  );
  assert.match(
    portalPanelSource,
    /const prepareExternalPointerDrag =[\s\S]*?dragSurface\.setPointerCapture\(pointerId\)/,
    '由稳定的根拖拽面捕获指针，移出原卡片后仍能收到移动与松手事件',
  );
  assert.match(
    portalPanelSource,
    /const handleExternalPointerMoveCapture =[\s\S]*?startExternalDrag\(pointer\.drag\)[\s\S]*?const handleExternalPointerUpCapture =[\s\S]*?handleExternalPointerDrop\(/,
  );
  assert.match(
    portalPanelSource,
    /const handleExternalPointerDrop = async[\s\S]*?resolveExternalDragPlacementAtPoint\(/,
    '松手必须复用与实时让位相同的屏幕落点解析规则',
  );
  assert.match(
    portalPanelSource,
    /const removalTarget = removalTargetForDrag\(selectedType, drag\);[\s\S]*?candidate !== drag\.source[\s\S]*?return removalTarget/,
    '精选卡落在自身精选列表以外时必须转成对应更多列表，从精选中剔除',
  );
});

test('外部工具拖拽预览持续跟随指针，并在结束或取消时卸载', () => {
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
  const finishEnd = portalPanelSource.indexOf('const commitExternalDrop', finishStart);
  assert.ok(finishStart >= 0 && finishEnd > finishStart, '必须保留统一拖拽结束逻辑');
  const finishSource = portalPanelSource.slice(finishStart, finishEnd);
  assert.match(
    finishSource,
    /externalPointerDragRef\.current = null;[\s\S]*?dragStateRef\.current = null;[\s\S]*?setDragState\(null\);/,
    '统一结束逻辑必须清空指针和拖拽状态，从而卸载预览层',
  );
  assert.match(
    portalPanelSource,
    /const handleExternalPointerDrop = async[\s\S]*?expectedWorkspaceId: string,[\s\S]*?const placement = resolveExternalDragPlacementAtPoint\([\s\S]*?await animateExternalDrop\(placement, ownerDocument\);\s*if \(\s*useExternalToolLayoutStore\.getState\(\)\.workspaceId !== expectedWorkspaceId\s*\) \{\s*finishExternalDrag\(\);\s*return;\s*\}\s*finishExternalDrag\(\);\s*void commitExternalDrop\(\s*drag,\s*placement\.target,\s*placement\.beforeId,\s*expectedWorkspaceId,\s*\);/,
    '落下动画后必须确认工作区未切换，再清理预览并提交同一 placement',
  );
  assert.match(
    portalPanelSource,
    /const commitExternalDrop = async \([\s\S]*?expectedWorkspaceId: string,[\s\S]*?if \(liveLayoutState\.workspaceId !== expectedWorkspaceId\) return;/,
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

test('外部工具拖起后浮起，并在同一列表内实时平滑让位', () => {
  assert.match(
    portalPanelSource,
    /type ExternalDragPlacement = \{[\s\S]*?target: LayoutListId;[\s\S]*?beforeId: string \| null;[\s\S]*?\};/,
    '实时让位状态必须明确记录目标列表和插入位置',
  );
  assert.match(
    portalPanelSource,
    /const \[externalDragPlacement, setExternalDragPlacement\]\s*=\s*useState<ExternalDragPlacement \| null>\(null\);/,
  );
  assert.match(
    portalPanelSource,
    /function dragPreviewLiftTransform[\s\S]*?scale\(1\.0[1-9]\d*\)/,
    '拖起后的跟随卡片必须轻微放大，而不是缩小或保持原尺寸',
  );

  const toolDropGridStart = portalPanelSource.indexOf('function ToolDropGrid');
  const toolDropGridEnd = portalPanelSource.indexOf(
    'function ToolListPanel',
    toolDropGridStart,
  );
  assert.ok(
    toolDropGridStart >= 0 && toolDropGridEnd > toolDropGridStart,
    '必须保留外部工具拖放网格',
  );
  const toolDropGridSource = portalPanelSource.slice(toolDropGridStart, toolDropGridEnd);
  assert.match(
    toolDropGridSource,
    /previewExternalDropItems\([\s\S]*?dragPlacement[\s\S]*?draggedCard[\s\S]*?\)/,
    '网格渲染顺序必须使用当前 placement 生成实时预览，而非等到松手才换位',
  );
  assert.match(toolDropGridSource, /data-tool-drag-lifted/);
  assert.match(
    toolDropGridSource,
    /data-tool-drop-placeholder/,
    '原位置与实时插入位必须有独立标记，才能形成桌面图标式让位反馈',
  );
  assert.match(
    toolDropGridSource,
    /\{shownItems\.length \? \(/,
    '空列表也必须能渲染实时插入占位，不能被原始 items.length 短路',
  );

  const renderedGridCount = [...portalPanelSource.matchAll(/<ToolDropGrid\b/g)].length;
  assert.ok(renderedGridCount > 0, '必须渲染外部工具拖放网格');
  assert.equal(
    [...portalPanelSource.matchAll(/dragPlacement=\{externalDragPlacement\}/g)].length,
    renderedGridCount,
    '全部与分类下的每个精选/更多列表都必须接收实时 placement',
  );
  assert.equal(
    [...portalPanelSource.matchAll(/draggedCard=\{draggedExternalCard\}/g)].length,
    renderedGridCount,
    '跨精选与更多移动时，每个列表都必须能识别当前拖起卡片',
  );

  const placementUpdateStart = portalPanelSource.indexOf(
    'const updateExternalDragPlacement',
  );
  const placementUpdateEnd = portalPanelSource.indexOf(
    'const prepareExternalPointerDrag',
    placementUpdateStart,
  );
  assert.ok(
    placementUpdateStart >= 0 && placementUpdateEnd > placementUpdateStart,
    '必须保留独立的实时落点更新逻辑',
  );
  const placementUpdateSource = portalPanelSource.slice(
    placementUpdateStart,
    placementUpdateEnd,
  );
  assert.match(placementUpdateSource, /resolveExternalDragPlacementAtPoint\(/);
  assert.match(placementUpdateSource, /setExternalDragPlacement\(/);

  const placementResolverStart = portalPanelSource.indexOf(
    'function resolveExternalDragPlacementAtPoint',
  );
  const placementResolverEnd = portalPanelSource.indexOf(
    'function animateExternalGridReflow',
    placementResolverStart,
  );
  const placementResolverSource = portalPanelSource.slice(
    placementResolverStart,
    placementResolverEnd,
  );
  assert.match(
    placementResolverSource,
    /elementFromPoint\(clientX, clientY\)[\s\S]*?resolvePointerBeforeId\(/,
    '实时预览和最终松手必须共用基于真实屏幕坐标的前后半区落点',
  );

  const pointerMoveStart = portalPanelSource.indexOf(
    'const handleExternalPointerMoveCapture',
  );
  const pointerMoveEnd = portalPanelSource.indexOf(
    'const handleExternalPointerUpCapture',
    pointerMoveStart,
  );
  const pointerMoveSource = portalPanelSource.slice(pointerMoveStart, pointerMoveEnd);
  assert.match(
    pointerMoveSource,
    /if \(pointer\.moved\) \{[\s\S]*?updateExternalDragPlacement\([\s\S]*?event\.clientX,[\s\S]*?event\.clientY,[\s\S]*?event\.currentTarget\.ownerDocument/,
    '形成拖拽后，每次 pointermove 都必须刷新实时插入位置',
  );
  assert.doesNotMatch(
    pointerMoveSource,
    /commitExternalDrop|saveLayoutDraft|setAllLayoutList|setCategoryFeatured/,
    '实时让位只能是本地预览，不能在移动过程中反复保存',
  );

  const reflowStart = portalPanelSource.indexOf('function animateExternalGridReflow');
  const reflowEnd = portalPanelSource.indexOf('function ToolDropGrid', reflowStart);
  assert.ok(
    reflowStart >= 0 && reflowEnd > reflowStart,
    '相邻卡片换位必须保留 FLIP 动画实现',
  );
  const reflowSource = portalPanelSource.slice(reflowStart, reflowEnd);
  assert.match(reflowSource, /getBoundingClientRect\(\)/);
  assert.match(
    reflowSource,
    /\.animate\([\s\S]*?transform:[\s\S]*?duration:[\s\S]*?easing:/,
    'CSS Grid 重排必须使用位移动画，不能只依赖 transition class',
  );
  assert.match(
    toolDropGridSource,
    /animateExternalGridReflow\(/,
    '每次预览顺序变化后必须触发网格 FLIP 动画',
  );

  const finishStart = portalPanelSource.indexOf('const finishExternalDrag');
  const finishEnd = portalPanelSource.indexOf('const commitExternalDrop', finishStart);
  const finishSource = portalPanelSource.slice(finishStart, finishEnd);
  assert.match(
    finishSource,
    /setExternalDragPlacement\(null\);/,
    '松手、取消或丢失指针捕获时必须同时清掉实时让位状态',
  );
});

test('运营卡片隐藏互动指标与详情按钮，整卡正文直接查看详情', () => {
  assert.match(portalPanelSource, /interactionMode="preview"/);
  assert.match(portalPanelSource, /showDefaultFooter=\{false\}/);
  assert.match(portalPanelSource, /onOpen=\{\(\) => onOpen\(card\)\}/);
  assert.match(portalPanelSource, /拖入对应精选即加入；精选卡拖出精选区域即移出；松手后自动保存。/);
});
