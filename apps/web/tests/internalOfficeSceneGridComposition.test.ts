import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const gridSource = readFileSync(
  new URL('../src/components/market/InternalOfficeSceneGrid.tsx', import.meta.url),
  'utf8',
);

function sourceBetween(start: string, end: string): string {
  const startIndex = gridSource.indexOf(start);
  const endIndex = gridSource.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0, `未找到源码起点：${start}`);
  assert.ok(endIndex > startIndex, `未找到源码终点：${end}`);
  return gridSource.slice(startIndex, endIndex);
}

test('办公场景网格的拖拽能力是后台显式开启的可选行为', () => {
  assert.match(gridSource, /maintenanceView = false/);
  assert.match(gridSource, /reorderEnabled = false/);
  assert.match(
    gridSource,
    /pointerReorder = false/,
    '苹果式指针排序必须由管理页显式开启，不能改变普通用户侧交互',
  );
  assert.match(
    gridSource,
    /const canReorder = Boolean\(reorderEnabled && onSceneDragStart && onSceneDrop\)/,
  );
  assert.match(
    gridSource,
    /const usePointerReorder =\s*pointerReorder && \(canReorder \|\| Boolean\(pointerDraggingSceneId\)\)/,
    '保存 fresh GET 完成前必须继续保留本地占位，不能闪回旧顺序',
  );
  assert.match(gridSource, /const useNativeReorder = canReorder && !pointerReorder/);
  assert.match(gridSource, /const gridDropProps = useNativeReorder[\s\S]*?: \{\};/);
  assert.match(gridSource, /const cardDropProps = useNativeReorder[\s\S]*?: \{\};/);
  assert.match(
    gridSource,
    /draggable=\{useNativeReorder\}/,
    'Pointer 模式必须关闭原生 draggable，避免一次手势触发两套拖拽链路',
  );
});

test('指针排序拖起卡片浮起，并以占位和 FLIP 让相邻卡片实时让位', () => {
  assert.match(gridSource, /data-internal-scene-card-id/);
  assert.match(
    gridSource,
    /data-internal-scene-drop-placeholder/,
    '拖动原位和实时插入位必须通过稳定占位保留网格尺寸',
  );
  assert.match(
    gridSource,
    /data-internal-scene-drag-preview/,
    '必须渲染独立的跟手卡片预览',
  );
  assert.match(
    gridSource,
    /className="(?=[^"]*\bpointer-events-none\b)(?=[^"]*\bfixed\b)[^"]*"/,
    '跟手预览必须 fixed 且事件穿透，避免遮挡实时落点',
  );
  assert.match(
    gridSource,
    /scale\(1\.0[1-9]\d*\)/,
    '拖起后的预览必须轻微放大，形成桌面 App 浮起感',
  );
  assert.match(gridSource, /useLayoutEffect/);
  assert.match(gridSource, /getBoundingClientRect\(\)/);
  assert.match(
    gridSource,
    /\.animate\([\s\S]*?transform:[\s\S]*?duration:[\s\S]*?easing:/,
    'CSS Grid 实时换位必须使用 FLIP 位移动画，不能只依赖 transition class',
  );
});

test('指针移动只更新本地预览，松手才提交一次，取消或丢失捕获只恢复 UI', () => {
  assert.match(
    gridSource,
    /onPointerMove=\{usePointerReorder \? handleInternalPointerMove : undefined\}/,
  );
  assert.match(
    gridSource,
    /onPointerUp=\{usePointerReorder \? handleInternalPointerUp : undefined\}/,
  );
  assert.match(
    gridSource,
    /onPointerCancel=\{usePointerReorder \? handleInternalPointerCancel : undefined\}/,
  );
  assert.match(
    gridSource,
    /onLostPointerCapture=\{[\s\S]*?usePointerReorder \? handleInternalLostPointerCapture : undefined[\s\S]*?\}/,
  );
  const moveSource = sourceBetween(
    'const handleInternalPointerMove =',
    'const handleInternalPointerUp =',
  );
  assert.match(moveSource, /updateInternalDragPreviewPosition\(/);
  assert.match(moveSource, /updateInternalDragPlacement\(/);
  assert.doesNotMatch(
    moveSource,
    /onSceneDrop/,
    'pointermove 只能更新本地跟手位置和占位，不能触发自动保存',
  );

  const dropSource = sourceBetween(
    'const handleInternalPointerDrop =',
    'const handleInternalPointerMove =',
  );
  assert.equal(
    [...dropSource.matchAll(/onSceneDrop\?\.\(/g)].length,
    1,
    '一次 pointerup 提交流程只能调用一次既有保存回调',
  );
  assert.match(
    dropSource,
    /await onSceneDrop\?\.\(placement\.beforeId\)/,
    'pointerup 必须等待实时占位的 beforeId 保存完成，再交还服务器顺序',
  );
  const pointerUpSource = sourceBetween(
    'const handleInternalPointerUp =',
    'const handleInternalPointerCancel =',
  );
  assert.match(pointerUpSource, /handleInternalPointerDrop\(/);

  const cancelHandlersSource = sourceBetween(
    'const handleInternalPointerCancel =',
    'const gridDropProps =',
  );
  assert.equal(
    [...cancelHandlersSource.matchAll(/cancelInternalPointerDrag\(\)/g)].length,
    2,
    'pointercancel 与 lostpointercapture 必须走同一恢复路径',
  );
  assert.doesNotMatch(
    cancelHandlersSource,
    /onSceneDrop/,
    '取消或丢失捕获不能保存顺序',
  );
  const cancelSource = sourceBetween(
    'const cancelInternalPointerDrag =',
    'const startInternalPointerDrag =',
  );
  assert.match(cancelSource, /resetInternalDragVisual\(\)/);
  assert.match(cancelSource, /onSceneDragEnd\?\.\(\)/);
});

test('只有左下角手柄发起拖拽，卡片与网格只接收放置位置', () => {
  assert.match(gridSource, /onSceneDrop\?\.\(scene\.id\)/);
  assert.match(gridSource, /onSceneDrop\?\.\(null\)/);
  assert.match(
    gridSource,
    /aria-label=\{`拖动\$\{scene\.label\}`\}[\s\S]*?onDragStart=[\s\S]*?onSceneDragStart\?\.\(scene\.id\)[\s\S]*?onDragEnd=[\s\S]*?onSceneDragEnd\?\.\(\)/,
  );
  assert.match(gridSource, /<article[\s\S]*?\{\.\.\.cardDropProps\}/);
  assert.doesNotMatch(
    gridSource.slice(
      gridSource.indexOf('const cardDropProps'),
      gridSource.indexOf('return (', gridSource.indexOf('const cardDropProps')),
    ),
    /draggable:/,
    '整张卡片不能成为拖拽源，避免点击详情时误拖动',
  );
});

test('缺少排序回调时仍显示静态办公场景标题和数量', () => {
  assert.match(
    gridSource,
    /\{onRankModeChange \? \([\s\S]*?<ShelfSectionHead[\s\S]*?\) : \([\s\S]*?办公场景[\s\S]*?\{scenes\.length\}/,
  );
});

test('运营预览继续使用只读指标分支', () => {
  assert.match(gridSource, /if \(interactionMode === 'preview'\)/);
  assert.match(gridSource, /if \(interactionMode === 'user'\)[\s\S]*?bumpUse/);
});

test('后台精简视图隐藏指标和详情按钮，仅保留底部手柄', () => {
  assert.match(
    gridSource,
    /\{maintenanceView \? \([\s\S]*?aria-label=\{`拖动\$\{scene\.label\}`\}[\s\S]*?\) : \([\s\S]*?<SceneCardStats[\s\S]*?>\s*详情\s*<\/button>/,
  );
});

test('员工助手默认保留，后台可显式隐藏整块预览', () => {
  assert.match(gridSource, /showAssistantChat = true/);
  assert.match(
    gridSource,
    /\{showAssistantChat \? \([\s\S]*?aria-label="员工助手"[\s\S]*?\) : null\}/,
  );
});
