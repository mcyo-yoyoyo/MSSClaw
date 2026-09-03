import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { publicAssetUrl } from '@/domain/publicAssetUrl';
import { formatToolInvokes } from '@/domain/aiToolCategories';
import {
  resolveOfficeScenesWithCatalog,
  resolveOfficeToolWithCatalog,
  type InternalOfficeScene,
  type InternalOfficeSceneTool,
} from '@/domain/internalOfficeScenes';
import { filterInternalOfficeScenesBySearch } from '@/domain/internalOfficeSceneSearch';
import {
  SHELF_RANK_TABS,
  sortByRankMode,
  type RankMode,
} from '@/domain/contentEngagement';

/** 办公场景排序：默认按运营在「配置办公场景」里排的顺序 */
const OFFICE_SCENE_RANK_TABS = [
  { id: 'excel_order' as RankMode, label: '运营排序', icon: 'fa-solid fa-arrow-down-1-9' },
  ...SHELF_RANK_TABS.filter((tab) => tab.id !== 'excel_order'),
];
import type { PrototypeToolSeed } from '@/domain/prototype/types';
import { ShelfSectionHead } from '@/components/market/ShelfRankSelect';
import { requireLogin } from '@/stores/authGateStore';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { useInternalOfficeSceneCatalogStore } from '@/stores/internalOfficeSceneCatalogStore';
import { useMarketFavoriteStore } from '@/stores/marketFavoriteStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

type PickerMode = 'detail' | 'howto' | 'experience';

const ASSISTANT_TOOL_ID = 'tool-hw-assistant';

type InternalSceneDragPlacement = {
  beforeId: string | null;
};

type InternalDragPreviewMetrics = {
  width: number;
  height: number;
  grabOffsetX: number;
  grabOffsetY: number;
};

type InternalDragPreviewPosition = {
  x: number;
  y: number;
  rotation: number;
};

type InternalPointerDrag = {
  pointerId: number;
  sceneId: string;
  startX: number;
  startY: number;
  lastClientX: number;
  reducedMotion: boolean;
  moved: boolean;
};

const INTERNAL_DRAG_PREVIEW_WIDTH = 360;
const INTERNAL_DRAG_PREVIEW_HEIGHT = 180;
const INTERNAL_DRAG_PREVIEW_EDGE = 8;
const INTERNAL_DRAG_REFLOW_DURATION = 175;

const DEFAULT_INTERNAL_DRAG_PREVIEW_METRICS: InternalDragPreviewMetrics = {
  width: INTERNAL_DRAG_PREVIEW_WIDTH,
  height: INTERNAL_DRAG_PREVIEW_HEIGHT,
  grabOffsetX: 24,
  grabOffsetY: INTERNAL_DRAG_PREVIEW_HEIGHT - 18,
};

function clampInternalDrag(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function resolveInternalDragPreviewPosition(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
  metrics: InternalDragPreviewMetrics,
  rotation = 0,
): InternalDragPreviewPosition {
  return {
    x: clampInternalDrag(
      clientX - metrics.grabOffsetX,
      INTERNAL_DRAG_PREVIEW_EDGE,
      viewportWidth - metrics.width - INTERNAL_DRAG_PREVIEW_EDGE,
    ),
    y: clampInternalDrag(
      clientY - metrics.grabOffsetY,
      INTERNAL_DRAG_PREVIEW_EDGE,
      viewportHeight - metrics.height - INTERNAL_DRAG_PREVIEW_EDGE,
    ),
    rotation,
  };
}

function internalDragPreviewTransform(position: InternalDragPreviewPosition): string {
  return `translate3d(${position.x}px, ${position.y}px, 0)`;
}

function internalDragPreviewLiftTransform(
  rotation: number,
  reducedMotion = false,
): string {
  return reducedMotion ? 'rotate(0deg) scale(1)' : `rotate(${rotation}deg) scale(1.025)`;
}

function previewInternalSceneOrder(
  scenes: readonly InternalOfficeScene[],
  activeId: string | null,
  placement: InternalSceneDragPlacement | null,
): InternalOfficeScene[] {
  if (!activeId || !placement) return [...scenes];
  const active = scenes.find((scene) => scene.id === activeId);
  if (!active) return [...scenes];
  const remaining = scenes.filter((scene) => scene.id !== activeId);
  const beforeIndex = placement.beforeId
    ? remaining.findIndex((scene) => scene.id === placement.beforeId)
    : remaining.length;
  remaining.splice(beforeIndex < 0 ? remaining.length : beforeIndex, 0, active);
  return remaining;
}

function internalSceneElements(gridElement: HTMLElement): HTMLElement[] {
  return Array.from(
    gridElement.querySelectorAll<HTMLElement>('[data-internal-scene-card-id]'),
  ).filter((element) => element.closest('[data-internal-scene-grid]') === gridElement);
}

function resolveInternalPointerBeforeId(
  gridElement: HTMLElement,
  cardElement: HTMLElement,
  activeId: string,
  clientX: number,
  clientY: number,
  previous: InternalSceneDragPlacement | null,
): string | null {
  const hoveredId = cardElement.dataset.internalSceneCardId ?? null;
  if (!hoveredId) return null;
  if (hoveredId === activeId && previous) return previous.beforeId;

  const candidates = internalSceneElements(gridElement).filter(
    (element) => element.dataset.internalSceneCardId !== activeId,
  );
  const hoveredIndex = candidates.indexOf(cardElement);
  if (hoveredIndex < 0) return hoveredId;
  const rect = cardElement.getBoundingClientRect();
  const neighbor = candidates[hoveredIndex + 1] ?? candidates[hoveredIndex - 1];
  const neighborRect = neighbor?.getBoundingClientRect();
  const sameRow = Boolean(
    neighborRect &&
      Math.abs(neighborRect.top - rect.top) < Math.min(neighborRect.height, rect.height) * 0.4,
  );
  const insertAfter = sameRow
    ? clientX >= rect.left + rect.width / 2
    : clientY >= rect.top + rect.height / 2;
  return insertAfter
    ? candidates[hoveredIndex + 1]?.dataset.internalSceneCardId ?? null
    : hoveredId;
}

function resolveInternalScenePlacementAtPoint(
  ownerDocument: Document,
  clientX: number,
  clientY: number,
  activeId: string,
  previous: InternalSceneDragPlacement | null,
): InternalSceneDragPlacement | null {
  const eventTarget = ownerDocument.elementFromPoint(clientX, clientY);
  const gridElement =
    eventTarget?.closest<HTMLElement>('[data-internal-scene-grid="true"]') ?? null;
  if (!gridElement) return null;
  const cardElement =
    eventTarget?.closest<HTMLElement>('[data-internal-scene-card-id]') ?? null;

  if (!cardElement || cardElement.closest('[data-internal-scene-grid]') !== gridElement) {
    const lastCard = internalSceneElements(gridElement)
      .filter((element) => element.dataset.internalSceneCardId !== activeId)
      .at(-1);
    const lastRect = lastCard?.getBoundingClientRect();
    const pointerIsAfterLastCard = Boolean(
      lastRect &&
        (clientY > lastRect.bottom ||
          (clientY >= lastRect.top && clientY <= lastRect.bottom && clientX > lastRect.right)),
    );
    if (previous && !pointerIsAfterLastCard) return previous;
    return { beforeId: null };
  }

  return {
    beforeId: resolveInternalPointerBeforeId(
      gridElement,
      cardElement,
      activeId,
      clientX,
      clientY,
      previous,
    ),
  };
}

function animateInternalSceneGridReflow(
  nodes: ReadonlyMap<string, HTMLElement>,
  previousRects: ReadonlyMap<string, DOMRect>,
  animations: Map<string, Animation>,
): Map<string, DOMRect> {
  const firstNode = nodes.values().next().value as HTMLElement | undefined;
  const reducedMotion = Boolean(
    firstNode?.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const currentRects = new Map<string, DOMRect>();

  nodes.forEach((node, id) => {
    const running = animations.get(id);
    const visualRect = running ? node.getBoundingClientRect() : null;
    running?.cancel();
    animations.delete(id);

    const currentRect = node.getBoundingClientRect();
    currentRects.set(id, currentRect);
    if (reducedMotion) return;
    const previousRect = visualRect ?? previousRects.get(id);
    if (!previousRect) return;
    const deltaX = previousRect.left - currentRect.left;
    const deltaY = previousRect.top - currentRect.top;
    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;

    const animation = node.animate(
      [
        { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
        { transform: 'translate3d(0, 0, 0)' },
      ],
      {
        duration: INTERNAL_DRAG_REFLOW_DURATION,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    );
    animations.set(id, animation);
    animation.onfinish = () => {
      if (animations.get(id) === animation) animations.delete(id);
    };
  });

  return currentRects;
}

function sceneEngagementId(sceneId: string) {
  return `office-scene-${sceneId}`;
}

export function InternalOfficeSceneGrid({
  search,
  catalogTools,
  rankMode = 'excel_order',
  onRankModeChange,
  onOpenDetail,
  onHowTo,
  onExperience,
  onEmptyAction,
  interactionMode = 'user',
  showAssistantChat = true,
  maintenanceView = false,
  reorderEnabled = false,
  pointerReorder = false,
  draggingSceneId = null,
  onSceneDragStart,
  onSceneDragEnd,
  onSceneDrop,
}: {
  search: string;
  /** 配置工具主数据：覆盖场景默认链接 / Logo */
  catalogTools: PrototypeToolSeed[];
  rankMode?: RankMode;
  onRankModeChange?: (next: RankMode) => void;
  onOpenDetail: (tool: InternalOfficeSceneTool) => void;
  onHowTo: (tool: InternalOfficeSceneTool) => void;
  onExperience: (tool: InternalOfficeSceneTool) => void;
  /** 场景无可用工具时点击反馈（toast） */
  onEmptyAction?: (scene: InternalOfficeScene, mode: PickerMode) => void;
  /** 运营预览保留用户侧视觉，但不写入场景互动、收藏或赞踩数据。 */
  interactionMode?: 'user' | 'preview';
  /** 后台可隐藏员工助手预览；用户侧默认保持展示。 */
  showAssistantChat?: boolean;
  /** 后台精简维护视图：隐藏互动指标与详情按钮，仅保留拖拽手柄。 */
  maintenanceView?: boolean;
  /** 运营侧开启拖拽手柄；用户侧不传时保持原有 DOM 与交互。 */
  reorderEnabled?: boolean;
  /** 后台显式启用苹果桌面式 Pointer 拖拽；默认保留兼容的原生 DnD。 */
  pointerReorder?: boolean;
  /** 当前被拖动的场景由外层维护，便于持久化状态与网格视觉同步。 */
  draggingSceneId?: string | null;
  onSceneDragStart?: (sceneId: string) => boolean | void;
  onSceneDragEnd?: () => void;
  /** beforeId 为目标卡片；null 表示放到当前列表末尾。 */
  onSceneDrop?: (beforeId: string | null) => boolean | void | Promise<boolean | void>;
}) {
  const [picker, setPicker] = useState<{
    scene: InternalOfficeScene;
    mode: PickerMode;
  } | null>(null);
  const sceneEntries = useInternalOfficeSceneCatalogStore((s) => s.entries);
  const bumpExposure = useContentEngagementStore((s) => s.bumpExposure);
  const bumpView = useContentEngagementStore((s) => s.bumpView);
  const bumpUse = useContentEngagementStore((s) => s.bumpUse);
  const getEngagement = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);
  const internalSceneGridRef = useRef<HTMLDivElement | null>(null);
  const internalPointerDragRef = useRef<InternalPointerDrag | null>(null);
  const internalDragPlacementRef = useRef<InternalSceneDragPlacement | null>(null);
  const internalDragPreviewRef = useRef<HTMLDivElement | null>(null);
  const internalDragPreviewLiftRef = useRef<HTMLDivElement | null>(null);
  const internalDragPreviewMetricsRef = useRef<InternalDragPreviewMetrics>(
    DEFAULT_INTERNAL_DRAG_PREVIEW_METRICS,
  );
  const internalDragPreviewPositionRef = useRef<InternalDragPreviewPosition>({
    x: 0,
    y: 0,
    rotation: 0,
  });
  const internalCardNodesRef = useRef(new Map<string, HTMLElement>());
  const exposedSceneIdsRef = useRef(new Set<string>());
  const internalPreviousRectsRef = useRef(new Map<string, DOMRect>());
  const internalReflowAnimationsRef = useRef(new Map<string, Animation>());
  const internalDragGenerationRef = useRef(0);
  const [pointerDraggingSceneId, setPointerDraggingSceneId] = useState<string | null>(null);
  const [pointerDragPlacement, setPointerDragPlacement] =
    useState<InternalSceneDragPlacement | null>(null);
  const [showPointerDragPreview, setShowPointerDragPreview] = useState(false);

  const allScenes = useMemo(
    () =>
      // sourceOrder = 场景字典中的次序，供「运营排序」使用；
      // 不带这个字段时 sortByRankMode 会回落到互动量，后台的上移/下移看不出效果
      resolveOfficeScenesWithCatalog(catalogTools, sceneEntries).map((scene, index) => ({
        ...scene,
        sourceOrder: index,
      })),
    [catalogTools, sceneEntries],
  );

  const assistantToolAvailable = useMemo(
    () => catalogTools.some((tool) => tool.id === ASSISTANT_TOOL_ID && tool.published === true),
    [catalogTools],
  );

  const assistantTool = useMemo(() => {
    const fromScene = allScenes
      .flatMap((s) => s.tools)
      .find((t) => t.id === ASSISTANT_TOOL_ID);
    if (fromScene) return fromScene;
    const seed = catalogTools.find((t) => t.id === ASSISTANT_TOOL_ID) ?? null;
    return resolveOfficeToolWithCatalog(
      {
        id: ASSISTANT_TOOL_ID,
        name: '员工助手',
        blurb: '综合知识问答',
        homepageUrl: '#',
        logoUrl: '',
      },
      seed,
    );
  }, [allScenes, catalogTools]);

  const scenes = useMemo(() => {
    const filtered = filterInternalOfficeScenesBySearch(allScenes, search, catalogTools);
    return sortByRankMode(filtered, rankMode, (id) => getEngagement(sceneEngagementId(id)));
  }, [allScenes, search, catalogTools, rankMode, getEngagement, engagementById]);

  const runWithTool = (scene: InternalOfficeScene, mode: PickerMode) => {
    if (!scene.tools.length) {
      onEmptyAction?.(scene, mode);
      return;
    }
    if (scene.tools.length === 1) {
      const tool = scene.tools[0]!;
      if (interactionMode === 'user') {
        if (mode === 'experience') bumpUse(sceneEngagementId(scene.id), 'office-scene');
        else bumpView(sceneEngagementId(scene.id), 'office-scene');
      }
      if (mode === 'experience') onExperience(tool);
      else if (mode === 'howto') onHowTo(tool);
      else onOpenDetail(tool);
      return;
    }
    setPicker({ scene, mode });
  };

  const pickTool = (tool: InternalOfficeSceneTool) => {
    if (!picker) return;
    const { mode } = picker;
    setPicker(null);
    if (interactionMode === 'user') {
      if (mode === 'experience') bumpUse(sceneEngagementId(picker.scene.id), 'office-scene');
      else bumpView(sceneEngagementId(picker.scene.id), 'office-scene');
    }
    if (mode === 'experience') onExperience(tool);
    else if (mode === 'howto') onHowTo(tool);
    else onOpenDetail(tool);
  };

  const emptyCopy = search.trim()
    ? '当前搜索下暂无场景'
    : '暂无可用办公场景，请联系运营配置工具绑定';
  const canReorder = Boolean(reorderEnabled && onSceneDragStart && onSceneDrop);
  // 保存采用 fresh GET 确认；开始保存后手柄会锁定，但当前占位必须保留到正式顺序接管。
  const usePointerReorder =
    pointerReorder && (canReorder || Boolean(pointerDraggingSceneId));
  const useNativeReorder = canReorder && !pointerReorder;
  const showReorderHandle = Boolean(
    maintenanceView && onSceneDragStart && onSceneDrop,
  );
  const activeDraggingSceneId = usePointerReorder
    ? pointerDraggingSceneId ?? draggingSceneId
    : draggingSceneId;
  const shownScenes = useMemo(
    () =>
      usePointerReorder
        ? previewInternalSceneOrder(scenes, pointerDraggingSceneId, pointerDragPlacement)
        : scenes,
    [pointerDragPlacement, pointerDraggingSceneId, scenes, usePointerReorder],
  );
  const draggedScene = pointerDraggingSceneId
    ? scenes.find((scene) => scene.id === pointerDraggingSceneId) ?? null
    : null;
  const internalLayoutSignature = shownScenes.map((scene) => scene.id).join('|');

  useEffect(() => {
    if (interactionMode !== 'user' || typeof IntersectionObserver === 'undefined') return;
    const grid = internalSceneGridRef.current;
    if (!grid) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const sceneId = (entry.target as HTMLElement).dataset.internalSceneCardId;
          if (!sceneId || exposedSceneIdsRef.current.has(sceneId)) continue;
          exposedSceneIdsRef.current.add(sceneId);
          observer.unobserve(entry.target);
          bumpExposure(sceneEngagementId(sceneId), 'office-scene');
        }
      },
      { threshold: 0.1 },
    );
    grid
      .querySelectorAll<HTMLElement>('[data-internal-scene-card-id]')
      .forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [bumpExposure, interactionMode, internalLayoutSignature]);

  useLayoutEffect(() => {
    internalPreviousRectsRef.current = animateInternalSceneGridReflow(
      internalCardNodesRef.current,
      internalPreviousRectsRef.current,
      internalReflowAnimationsRef.current,
    );
  }, [internalLayoutSignature, Boolean(pointerDraggingSceneId)]);

  useEffect(
    () => () => {
      internalDragGenerationRef.current += 1;
      const pointer = internalPointerDragRef.current;
      internalPointerDragRef.current = null;
      const grid = internalSceneGridRef.current;
      if (pointer && grid?.hasPointerCapture(pointer.pointerId)) {
        grid.releasePointerCapture(pointer.pointerId);
      }
      internalReflowAnimationsRef.current.forEach((animation) => animation.cancel());
      internalReflowAnimationsRef.current.clear();
    },
    [],
  );

  const updateInternalDragPreviewPosition = (
    clientX: number,
    clientY: number,
    ownerDocument: Document,
  ) => {
    const pointer = internalPointerDragRef.current;
    const previous = internalDragPreviewPositionRef.current;
    const rotation = pointer?.reducedMotion
      ? 0
      : clampInternalDrag(
          previous.rotation * 0.45 +
            ((clientX - (pointer?.lastClientX ?? clientX)) * 0.16) * 0.55,
          -0.8,
          0.8,
        );
    if (pointer) pointer.lastClientX = clientX;
    const view = ownerDocument.defaultView;
    const metrics = internalDragPreviewMetricsRef.current;
    const next = resolveInternalDragPreviewPosition(
      clientX,
      clientY,
      view?.innerWidth ?? clientX + metrics.width,
      view?.innerHeight ?? clientY + metrics.height,
      metrics,
      rotation,
    );
    internalDragPreviewPositionRef.current = next;
    if (internalDragPreviewRef.current) {
      internalDragPreviewRef.current.style.transform = internalDragPreviewTransform(next);
    }
    if (internalDragPreviewLiftRef.current) {
      internalDragPreviewLiftRef.current.style.transform = internalDragPreviewLiftTransform(
        next.rotation,
        pointer?.reducedMotion,
      );
    }
  };

  const updateInternalDragPlacement = (
    sceneId: string,
    clientX: number,
    clientY: number,
    ownerDocument: Document,
  ) => {
    const next = resolveInternalScenePlacementAtPoint(
      ownerDocument,
      clientX,
      clientY,
      sceneId,
      internalDragPlacementRef.current,
    );
    if (next?.beforeId === internalDragPlacementRef.current?.beforeId) return;
    internalDragPlacementRef.current = next;
    setPointerDragPlacement(next);
  };

  const resetInternalDragVisual = () => {
    internalDragPlacementRef.current = null;
    internalDragPreviewRef.current = null;
    internalDragPreviewLiftRef.current = null;
    internalDragPreviewPositionRef.current = { x: 0, y: 0, rotation: 0 };
    internalDragPreviewMetricsRef.current = DEFAULT_INTERNAL_DRAG_PREVIEW_METRICS;
    setShowPointerDragPreview(false);
    setPointerDragPlacement(null);
    setPointerDraggingSceneId(null);
  };

  const releaseInternalPointerCapture = (pointer: InternalPointerDrag) => {
    const grid = internalSceneGridRef.current;
    if (grid?.hasPointerCapture(pointer.pointerId)) {
      grid.releasePointerCapture(pointer.pointerId);
    }
  };

  const cancelInternalPointerDrag = (notifyParent = true) => {
    const pointer = internalPointerDragRef.current;
    internalPointerDragRef.current = null;
    internalDragGenerationRef.current += 1;
    if (pointer) releaseInternalPointerCapture(pointer);
    const hadStarted = Boolean(pointer?.moved || pointerDraggingSceneId);
    resetInternalDragVisual();
    if (notifyParent && hadStarted) onSceneDragEnd?.();
  };

  const startInternalPointerDrag = (pointer: InternalPointerDrag): boolean => {
    if (pointer.moved) return true;
    if (onSceneDragStart?.(pointer.sceneId) === false) return false;
    pointer.moved = true;
    const sourceIndex = scenes.findIndex((scene) => scene.id === pointer.sceneId);
    const initialPlacement = {
      beforeId: sourceIndex >= 0 ? scenes[sourceIndex + 1]?.id ?? null : null,
    };
    internalDragPlacementRef.current = initialPlacement;
    setPointerDraggingSceneId(pointer.sceneId);
    setPointerDragPlacement(initialPlacement);
    setShowPointerDragPreview(true);
    return true;
  };

  const prepareInternalPointerDrag = (
    sceneId: string,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (!usePointerReorder || !event.isPrimary || event.button !== 0) return;
    if (internalPointerDragRef.current || pointerDraggingSceneId) return;
    const grid = internalSceneGridRef.current;
    if (!grid) return;
    event.preventDefault();
    event.stopPropagation();
    const card = event.currentTarget.closest<HTMLElement>('[data-internal-scene-card-id]');
    const rect = card?.getBoundingClientRect();
    const sourceWidth = rect?.width || INTERNAL_DRAG_PREVIEW_WIDTH;
    const width = clampInternalDrag(sourceWidth, 220, 420);
    const ratio = width / sourceWidth;
    const metrics = rect
      ? {
          width,
          height: rect.height * ratio,
          grabOffsetX: (event.clientX - rect.left) * ratio,
          grabOffsetY: (event.clientY - rect.top) * ratio,
        }
      : DEFAULT_INTERNAL_DRAG_PREVIEW_METRICS;
    const reducedMotion = Boolean(
      event.pointerType !== 'mouse' ||
        grid.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    internalDragGenerationRef.current += 1;
    internalDragPreviewMetricsRef.current = metrics;
    internalPointerDragRef.current = {
      pointerId: event.pointerId,
      sceneId,
      startX: event.clientX,
      startY: event.clientY,
      lastClientX: event.clientX,
      reducedMotion,
      moved: false,
    };
    internalDragPreviewPositionRef.current = resolveInternalDragPreviewPosition(
      event.clientX,
      event.clientY,
      grid.ownerDocument.defaultView?.innerWidth ?? event.clientX + metrics.width,
      grid.ownerDocument.defaultView?.innerHeight ?? event.clientY + metrics.height,
      metrics,
    );
    grid.setPointerCapture(event.pointerId);
  };

  const animateInternalSceneDrop = async (
    ownerDocument: Document,
    pointer: InternalPointerDrag,
  ) => {
    const preview = internalDragPreviewRef.current;
    if (!preview || pointer.reducedMotion || typeof preview.animate !== 'function') return;
    const target = ownerDocument.querySelector<HTMLElement>(
      '[data-internal-scene-drop-placeholder="true"]',
    );
    const targetRect = target?.getBoundingClientRect();
    const current = internalDragPreviewPositionRef.current;
    const metrics = internalDragPreviewMetricsRef.current;
    const view = ownerDocument.defaultView;
    const targetVisible = Boolean(
      targetRect &&
        targetRect.bottom >= 0 &&
        targetRect.top <= (view?.innerHeight ?? Number.POSITIVE_INFINITY),
    );
    const targetScale = targetRect
      ? clampInternalDrag(targetRect.width / metrics.width, 0.82, 1.08)
      : 0.985;
    const destination =
      targetVisible && targetRect
        ? `translate3d(${targetRect.left}px, ${targetRect.top}px, 0) scale(${targetScale})`
        : `${internalDragPreviewTransform(current)} scale(0.985)`;
    const animation = preview.animate(
      [
        { transform: internalDragPreviewTransform(current), opacity: 1 },
        { transform: destination, opacity: targetVisible ? 0.62 : 0 },
      ],
      {
        duration: targetVisible ? 195 : 130,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      },
    );
    await animation.finished.catch(() => undefined);
  };

  const handleInternalPointerDrop = async (
    pointer: InternalPointerDrag,
    ownerDocument: Document,
    clientX: number,
    clientY: number,
    generation: number,
  ) => {
    const placement = resolveInternalScenePlacementAtPoint(
      ownerDocument,
      clientX,
      clientY,
      pointer.sceneId,
      internalDragPlacementRef.current,
    );
    if (!placement) {
      resetInternalDragVisual();
      onSceneDragEnd?.();
      return;
    }
    internalDragPlacementRef.current = placement;
    setPointerDragPlacement(placement);
    await new Promise<void>((resolve) => {
      const requestFrame = ownerDocument.defaultView?.requestAnimationFrame;
      if (requestFrame) requestFrame(() => resolve());
      else resolve();
    });
    if (generation !== internalDragGenerationRef.current) return;
    await animateInternalSceneDrop(ownerDocument, pointer);
    if (generation !== internalDragGenerationRef.current) return;

    setShowPointerDragPreview(false);
    internalDragPreviewRef.current = null;
    internalDragPreviewLiftRef.current = null;
    try {
      await onSceneDrop?.(placement.beforeId);
    } finally {
      if (generation === internalDragGenerationRef.current) resetInternalDragVisual();
    }
  };

  const handleInternalPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointer = internalPointerDragRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    const threshold = event.pointerType === 'mouse' ? 4 : 8;
    if (
      !pointer.moved &&
      Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) >= threshold
    ) {
      if (!startInternalPointerDrag(pointer)) {
        cancelInternalPointerDrag(false);
        return;
      }
    }
    if (!pointer.moved) return;
    updateInternalDragPreviewPosition(event.clientX, event.clientY, event.currentTarget.ownerDocument);
    updateInternalDragPlacement(
      pointer.sceneId,
      event.clientX,
      event.clientY,
      event.currentTarget.ownerDocument,
    );
    event.preventDefault();
    event.stopPropagation();
  };

  const handleInternalPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointer = internalPointerDragRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    const threshold = event.pointerType === 'mouse' ? 4 : 8;
    const moved =
      pointer.moved ||
      Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) >= threshold;
    if (moved && !pointer.moved && !startInternalPointerDrag(pointer)) {
      internalPointerDragRef.current = null;
      releaseInternalPointerCapture(pointer);
      resetInternalDragVisual();
      return;
    }
    internalPointerDragRef.current = null;
    releaseInternalPointerCapture(pointer);
    if (!moved) {
      resetInternalDragVisual();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const generation = internalDragGenerationRef.current;
    void handleInternalPointerDrop(
      pointer,
      event.currentTarget.ownerDocument,
      event.clientX,
      event.clientY,
      generation,
    );
  };

  const handleInternalPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (internalPointerDragRef.current?.pointerId !== event.pointerId) return;
    cancelInternalPointerDrag();
  };

  const handleInternalLostPointerCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (internalPointerDragRef.current?.pointerId !== event.pointerId) return;
    cancelInternalPointerDrag();
  };

  const gridDropProps = useNativeReorder
    ? {
        onDragOver: (event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        },
        onDrop: (event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          onSceneDrop?.(null);
        },
      }
    : {};

  return (
    <>
      <section className="flex flex-col gap-5 pb-4">
        {showAssistantChat && assistantToolAvailable ? (
          <button
            type="button"
            className="internal-assistant-chat shrink-0"
            onClick={() => onExperience(assistantTool)}
            aria-label="员工助手"
          >
            <div className="internal-assistant-chat__head">
              {assistantTool.logoUrl ? (
                <img
                  src={publicAssetUrl(assistantTool.logoUrl)}
                  alt=""
                  className="internal-assistant-chat__logo"
                  loading="lazy"
                />
              ) : (
                <span className="internal-assistant-chat__logo inline-flex items-center justify-center">
                  <i className="fa-solid fa-robot text-[12px] text-[#a1a1aa]" />
                </span>
              )}
              <div className="internal-assistant-chat__copy">
                <p className="internal-assistant-chat__name">
                  {assistantTool.name || '员工助手'}
                </p>
              </div>
              <span className="internal-assistant-chat__badge">待上线</span>
            </div>
            <div className="internal-assistant-chat__composer" aria-hidden>
              <span className="min-w-0 flex-1 truncate">给员工助手发送消息…</span>
              <span className="internal-assistant-chat__send">
                <i className="fa-solid fa-arrow-up text-[10px]" />
              </span>
            </div>
          </button>
        ) : null}

        <div className="flex flex-col gap-3">
        {onRankModeChange ? (
          <ShelfSectionHead
            title="办公场景"
            count={scenes.length}
            rankMode={rankMode}
            onRankChange={onRankModeChange}
            rankOptions={OFFICE_SCENE_RANK_TABS}
            className="mb-0"
          />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 text-[15px] font-semibold tracking-tight text-[#1d1d1f]">
              办公场景
              <span className="ml-1.5 font-normal text-[#86868b]">{scenes.length}</span>
            </h2>
            {canReorder && !maintenanceView ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#86868b]">
                <i className="fa-solid fa-grip-vertical text-[10px]" />
                拖拽卡片排序
              </span>
            ) : null}
          </div>
        )}

        {scenes.length ? (
          <div
            ref={internalSceneGridRef}
            data-internal-scene-grid="true"
            className={cn(
              'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3',
              canReorder &&
                activeDraggingSceneId &&
                'rounded-2xl outline outline-1 outline-dashed outline-sky-200/80',
            )}
            onPointerMove={usePointerReorder ? handleInternalPointerMove : undefined}
            onPointerUp={usePointerReorder ? handleInternalPointerUp : undefined}
            onPointerCancel={usePointerReorder ? handleInternalPointerCancel : undefined}
            onLostPointerCapture={
              usePointerReorder ? handleInternalLostPointerCapture : undefined
            }
            {...gridDropProps}
          >
            {shownScenes.map((scene) => {
              const hasTools = scene.tools.length > 0;
              const dragging = canReorder && activeDraggingSceneId === scene.id;
              const pointerLiftedOrigin =
                usePointerReorder && pointerDraggingSceneId === scene.id;
              const pointerDropPlaceholder =
                pointerLiftedOrigin && Boolean(pointerDragPlacement);
              const toolMarks = hasTools ? (
                scene.tools.slice(0, 3).map((tool) => (
                  <img
                    key={`${scene.id}-${tool.id}`}
                    src={publicAssetUrl(tool.logoUrl)}
                    alt={`${tool.name} Logo`}
                    className="h-7 w-7 rounded-full bg-zinc-50 object-cover ring-2 ring-white"
                    loading="lazy"
                  />
                ))
              ) : (
                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-400">
                  待配置
                </span>
              );
              const cardDropProps = useNativeReorder
                ? {
                    onDragOver: (event: DragEvent<HTMLElement>) => {
                      event.preventDefault();
                      event.stopPropagation();
                      event.dataTransfer.dropEffect = 'move';
                    },
                    onDrop: (event: DragEvent<HTMLElement>) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onSceneDrop?.(scene.id);
                    },
                  }
                : {};
              return (
                <div
                  key={scene.id}
                  ref={(node) => {
                    if (node) internalCardNodesRef.current.set(scene.id, node);
                    else internalCardNodesRef.current.delete(scene.id);
                  }}
                  data-internal-scene-card-id={scene.id}
                  data-internal-scene-drag-lifted={pointerLiftedOrigin ? 'true' : undefined}
                  data-internal-scene-drop-placeholder={
                    pointerDropPlaceholder ? 'true' : undefined
                  }
                  className={cn(
                    'relative min-w-0 rounded-2xl transition-opacity duration-150 will-change-transform motion-reduce:transition-none',
                    pointerLiftedOrigin && !pointerDropPlaceholder && 'opacity-20',
                    pointerDropPlaceholder && 'opacity-0',
                  )}
                >
                  <article
                    className={cn(
                      'flex h-full min-h-[180px] flex-col rounded-2xl border border-zinc-200/90 bg-white px-4 py-4 transition',
                      hasTools
                        ? 'hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_10px_24px_-16px_rgba(24,24,27,0.35)]'
                        : 'opacity-80',
                      canReorder && activeDraggingSceneId && !dragging &&
                        'hover:ring-2 hover:ring-sky-200',
                      useNativeReorder && dragging && 'opacity-40 ring-2 ring-sky-300',
                    )}
                    {...cardDropProps}
                  >
                  <button
                    type="button"
                    onClick={() => runWithTool(scene, 'detail')}
                    className="flex min-h-0 flex-1 flex-col text-left"
                  >
                    <div className="flex shrink-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-[20px] font-semibold leading-snug tracking-tight text-zinc-900">
                          {scene.label}
                        </h3>
                      </div>
                      <div className="flex shrink-0 -space-x-1.5">{toolMarks}</div>
                    </div>
                    <p className="mt-2.5 flex-1 whitespace-normal text-[13px] leading-relaxed text-zinc-500">
                      {scene.description}
                    </p>
                    {!hasTools ? (
                      <p className="mt-1 shrink-0 text-[10px] text-amber-700/80">
                        暂无已上架工具，请运营绑定后体验
                      </p>
                    ) : null}
                  </button>
                  {maintenanceView ? (
                    <div className="mt-3 flex shrink-0 items-center border-t border-zinc-100 pt-2.5">
                      {showReorderHandle ? (
                        <button
                          type="button"
                          draggable={useNativeReorder}
                          disabled={!canReorder}
                          aria-label={`拖动${scene.label}`}
                          title={canReorder ? `拖动“${scene.label}”调整顺序` : '正在保存顺序'}
                          onPointerDown={(event) => prepareInternalPointerDrag(scene.id, event)}
                          onDragStart={(event) => {
                            if (!useNativeReorder) {
                              event.preventDefault();
                              return;
                            }
                            event.stopPropagation();
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', scene.id);
                            const card = event.currentTarget.closest('article');
                            if (card) event.dataTransfer.setDragImage(card, 24, 24);
                            onSceneDragStart?.(scene.id);
                          }}
                          onDragEnd={(event) => {
                            if (!useNativeReorder) return;
                            event.stopPropagation();
                            onSceneDragEnd?.();
                          }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          className={cn(
                            'inline-flex touch-none select-none items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition',
                            canReorder
                              ? 'cursor-grab border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 active:cursor-grabbing'
                              : 'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300',
                          )}
                        >
                          <i className="fa-solid fa-grip-vertical" />
                          拖动
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-3 flex shrink-0 items-center gap-2 border-t border-zinc-100 pt-2.5">
                      <SceneCardStats scene={scene} interactionMode={interactionMode} />
                      <button
                        type="button"
                        disabled={!hasTools}
                        onClick={() => runWithTool(scene, 'detail')}
                        className={cn(
                          'ml-auto shrink-0 rounded-lg bg-zinc-100 px-3 py-1.5 text-[11px] font-medium text-zinc-500 transition',
                          hasTools
                            ? 'hover:bg-zinc-200/80 hover:text-zinc-600'
                            : 'cursor-not-allowed text-zinc-300',
                        )}
                      >
                        详情
                      </button>
                    </div>
                  )}
                  </article>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-[13px] text-zinc-400">
            {emptyCopy}
          </div>
        )}
        </div>
      </section>

      {showPointerDragPreview && draggedScene && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={internalDragPreviewRef}
              aria-hidden
              data-testid="internal-scene-drag-preview"
              data-internal-scene-drag-preview="true"
              className="pointer-events-none fixed left-0 top-0 z-[120] max-w-[calc(100vw-1rem)] origin-top-left select-none will-change-transform"
              style={{
                width: internalDragPreviewMetricsRef.current.width,
                transform: internalDragPreviewTransform(
                  internalDragPreviewPositionRef.current,
                ),
              }}
            >
              <div
                ref={internalDragPreviewLiftRef}
                className="origin-top-left transition-transform duration-150 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
                style={{
                  transform: internalDragPreviewLiftTransform(
                    internalDragPreviewPositionRef.current.rotation,
                    internalPointerDragRef.current?.reducedMotion,
                  ),
                }}
              >
                <article
                  className="flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white px-4 py-4 shadow-[0_18px_42px_rgba(0,0,0,0.18),0_3px_10px_rgba(0,0,0,0.10)] ring-1 ring-black/5"
                  style={{ minHeight: internalDragPreviewMetricsRef.current.height }}
                >
                  <div className="flex min-h-0 flex-1 flex-col text-left">
                    <div className="flex shrink-0 items-start justify-between gap-2">
                      <h3 className="min-w-0 text-[20px] font-semibold leading-snug tracking-tight text-zinc-900">
                        {draggedScene.label}
                      </h3>
                      <div className="flex shrink-0 -space-x-1.5">
                        {draggedScene.tools.length ? (
                          draggedScene.tools.slice(0, 3).map((tool) => (
                            <img
                              key={`preview-${draggedScene.id}-${tool.id}`}
                              src={publicAssetUrl(tool.logoUrl)}
                              alt=""
                              className="h-7 w-7 rounded-full bg-zinc-50 object-cover ring-2 ring-white"
                            />
                          ))
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-400">
                            待配置
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-2.5 flex-1 overflow-hidden text-[13px] leading-relaxed text-zinc-500">
                      {draggedScene.description}
                    </p>
                  </div>
                  <div className="mt-3 flex shrink-0 items-center border-t border-zinc-100 pt-2.5">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-600">
                      <i className="fa-solid fa-grip-vertical" />
                      拖动
                    </span>
                  </div>
                </article>
              </div>
            </div>,
            document.body,
          )
        : null}

      {picker ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 p-4 sm:items-center">
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-semibold text-zinc-900">{picker.scene.label}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
                  这项工作可由多个内部产品完成，请选择要查看的工具。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPicker(null)}
                className="rounded-lg px-2 py-1 text-[12px] text-zinc-500 hover:bg-zinc-50"
              >
                关闭
              </button>
            </div>
            <ul className="mt-4 space-y-2">
              {picker.scene.tools.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => pickTool(t)}
                    className="flex w-full items-center gap-3 rounded-xl border border-zinc-200/90 px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    <img
                      src={publicAssetUrl(t.logoUrl)}
                      alt={`${t.name} Logo`}
                      className="h-8 w-8 rounded-lg object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-zinc-900">{t.name}</p>
                      <p className="truncate text-[11px] text-zinc-500">{t.blurb}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-[11px] font-medium text-zinc-500">
                      详情
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SceneCardStats({
  scene,
  interactionMode,
}: {
  scene: InternalOfficeScene;
  interactionMode: 'user' | 'preview';
}) {
  const engagementId = sceneEngagementId(scene.id);
  const primary = scene.tools[0];
  const engagement = useContentEngagementStore((s) => s.byId[engagementId]);
  const favoriteCount = useContentEngagementStore((s) =>
    primary ? (s.byId[primary.id]?.favorites ?? 0) : 0,
  );
  const userVote = useContentEngagementStore((s) => s.userVotes[engagementId] ?? null);
  const toggleLike = useContentEngagementStore((s) => s.toggleLike);
  const toggleDislike = useContentEngagementStore((s) => s.toggleDislike);
  const favorited = useMarketFavoriteStore((s) =>
    primary ? s.isFavorite(primary.id, 'internal', 'tool') : false,
  );
  const toggleFavorite = useMarketFavoriteStore((s) => s.toggle);
  const showToast = useMarketplaceStore((s) => s.showToast);

  const onToggleFavorite = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!primary) return;
    const item = {
      id: primary.id,
      kind: 'internal',
      assetType: 'tool',
      title: primary.name,
      icon: 'fa-cube',
      logoUrl: primary.logoUrl,
    } as const;
    const run = () => {
      const on = toggleFavorite(item);
      showToast(on ? `已收藏：${item.title}` : `已取消收藏：${item.title}`);
    };
    if (requireLogin('favorite', run)) run();
  };

  if (interactionMode === 'preview') {
    return (
      <div className="mr-auto inline-flex flex-wrap items-center gap-0.5 text-[10px] tabular-nums">
        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[#86868b]" title="查看">
          <i className="fa-regular fa-eye text-[9px] text-zinc-400" />
          {formatToolInvokes(engagement?.views ?? 0)}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-0.5 rounded px-1 py-0.5',
            !primary && 'opacity-40',
            favorited ? 'text-amber-600' : 'text-[#86868b]',
          )}
          title="收藏"
        >
          <i className={cn('text-[9px]', favorited ? 'fa-solid fa-star' : 'fa-regular fa-star')} />
          {formatToolInvokes(favoriteCount)}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-0.5 rounded px-1 py-0.5',
            userVote === 'like' ? 'text-sky-600' : 'text-[#86868b]',
          )}
          title="点赞"
        >
          <i className="fa-solid fa-thumbs-up text-[9px]" />
          {formatToolInvokes(engagement?.likes ?? 0)}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-0.5 rounded px-1 py-0.5',
            userVote === 'dislike' ? 'text-zinc-800' : 'text-[#86868b]',
          )}
          title="点踩"
        >
          <i className="fa-solid fa-thumbs-down text-[9px]" />
          {formatToolInvokes(engagement?.dislikes ?? 0)}
        </span>
      </div>
    );
  }

  return (
    <div className="mr-auto inline-flex flex-wrap items-center gap-0.5 text-[10px] tabular-nums">
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[#86868b]" title="查看">
        <i className="fa-regular fa-eye text-[9px] text-zinc-400" />
        {formatToolInvokes(engagement?.views ?? 0)}
      </span>
      <button
        type="button"
        onClick={onToggleFavorite}
        disabled={!primary}
        title={favorited ? '取消收藏' : '收藏'}
        aria-pressed={favorited}
        className={cn(
          'inline-flex items-center gap-0.5 rounded px-1 py-0.5 transition',
          !primary && 'cursor-not-allowed opacity-40',
          favorited ? 'text-amber-600' : 'text-[#86868b] hover:text-zinc-700',
        )}
      >
        <i className={cn('text-[9px]', favorited ? 'fa-solid fa-star' : 'fa-regular fa-star')} />
        {formatToolInvokes(favoriteCount)}
      </button>
      <button
        type="button"
        onClick={(ev) => {
          ev.stopPropagation();
          const run = () => toggleLike(engagementId, 'office-scene');
          if (requireLogin('like', run)) run();
        }}
        title="点赞"
        aria-pressed={userVote === 'like'}
        className={cn(
          'inline-flex items-center gap-0.5 rounded px-1 py-0.5 transition',
          userVote === 'like' ? 'text-sky-600' : 'text-[#86868b] hover:text-zinc-700',
        )}
      >
        <i className="fa-solid fa-thumbs-up text-[9px]" />
        {formatToolInvokes(engagement?.likes ?? 0)}
      </button>
      <button
        type="button"
        onClick={(ev) => {
          ev.stopPropagation();
          const run = () => toggleDislike(engagementId, 'office-scene');
          if (requireLogin('dislike', run)) run();
        }}
        title="点踩"
        aria-pressed={userVote === 'dislike'}
        className={cn(
          'inline-flex items-center gap-0.5 rounded px-1 py-0.5 transition',
          userVote === 'dislike' ? 'text-zinc-800' : 'text-[#86868b] hover:text-zinc-700',
        )}
      >
        <i className="fa-solid fa-thumbs-down text-[9px]" />
        {formatToolInvokes(engagement?.dislikes ?? 0)}
      </button>
    </div>
  );
}
