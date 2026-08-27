import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { CenterSearchInput } from '@/components/center/CenterShell';
import { ExternalMarketFilters } from '@/components/market/ExternalMarketFilters';
import { InternalOfficeSceneGrid } from '@/components/market/InternalOfficeSceneGrid';
import { MarketShelfCard } from '@/components/market/MarketShelfCard';
import { searchCapabilitiesByIntent } from '@/domain/capabilityIntentSearch';
import { listVisibleExternalToolTypes } from '@/domain/externalTaxonomyCatalog';
import {
  insertExternalToolIdBefore,
  mergeExternalToolLayoutVisibleAndParkedIds,
  orderExternalToolsByLayoutIds,
  type ExternalToolLayoutAllListKey,
  type ExternalToolCategoryFeaturedListKey,
  type ExternalToolLayoutDocument,
} from '@/domain/externalToolLayout';
import type { ExternalToolTypeId } from '@/domain/externalToolTaxonomy';
import {
  listMarketToolCards,
  type MarketShelfCard as MarketShelfCardModel,
} from '@/domain/marketShelf';
import { emptyOrgPerspectiveSelection } from '@/domain/orgAxisTags';
import { MarketToolDetailModal } from '@/features/market/MarketToolDetailModal';
import { cn } from '@/lib/utils';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { useExternalTaxonomyCatalogStore } from '@/stores/externalTaxonomyCatalogStore';
import { useExternalToolLayoutStore } from '@/stores/externalToolLayoutStore';
import { useInternalOfficeSceneCatalogStore } from '@/stores/internalOfficeSceneCatalogStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePlazaToolGuideStore } from '@/stores/plazaToolGuideStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

type ToolOpsKind = 'internal' | 'external';
type ExternalRegion = 'overseas' | 'domestic';
type LayoutListId =
  | ExternalToolLayoutAllListKey
  | `category:${string}:${ExternalRegion}:featured`
  | `category:${string}:${ExternalRegion}:more`;

type DragState = {
  cardId: string;
  source: LayoutListId;
  region: ExternalRegion;
};

type ExternalDragPlacement = {
  target: LayoutListId;
  beforeId: string | null;
};

type InternalSceneDragState = {
  sceneId: string;
  revision: number;
  visibleIds: string[];
  workspaceId: string;
};

type DragPreviewPosition = {
  x: number;
  y: number;
  rotation: number;
};

type DragPreviewMetrics = {
  width: number;
  height: number;
  grabOffsetX: number;
  grabOffsetY: number;
};

const EXTERNAL_DRAG_PREVIEW_WIDTH = 288;
const EXTERNAL_DRAG_PREVIEW_HEIGHT = 136;
const EXTERNAL_DRAG_PREVIEW_EDGE = 8;
const EXTERNAL_DRAG_REFLOW_DURATION = 175;

const DEFAULT_DRAG_PREVIEW_METRICS: DragPreviewMetrics = {
  width: EXTERNAL_DRAG_PREVIEW_WIDTH,
  height: EXTERNAL_DRAG_PREVIEW_HEIGHT,
  grabOffsetX: 24,
  grabOffsetY: EXTERNAL_DRAG_PREVIEW_HEIGHT - 18,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function resolveDragPreviewPosition(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
  metrics: DragPreviewMetrics = DEFAULT_DRAG_PREVIEW_METRICS,
  rotation = 0,
): DragPreviewPosition {
  return {
    x: clamp(
      clientX - metrics.grabOffsetX,
      EXTERNAL_DRAG_PREVIEW_EDGE,
      viewportWidth - metrics.width - EXTERNAL_DRAG_PREVIEW_EDGE,
    ),
    y: clamp(
      clientY - metrics.grabOffsetY,
      EXTERNAL_DRAG_PREVIEW_EDGE,
      viewportHeight - metrics.height - EXTERNAL_DRAG_PREVIEW_EDGE,
    ),
    rotation,
  };
}

function dragPreviewTransform(position: DragPreviewPosition): string {
  return `translate3d(${position.x}px, ${position.y}px, 0)`;
}

function dragPreviewLiftTransform(rotation: number, reducedMotion = false): string {
  return reducedMotion
    ? 'rotate(0deg) scale(1)'
    : `rotate(${rotation}deg) scale(1.025)`;
}

const ALL_LIST_KEYS = new Set<ExternalToolLayoutAllListKey>([
  'overseasFeaturedIds',
  'domesticFeaturedIds',
  'overseasMoreOrderIds',
  'domesticMoreOrderIds',
]);

function isAllListKey(value: LayoutListId): value is ExternalToolLayoutAllListKey {
  return ALL_LIST_KEYS.has(value as ExternalToolLayoutAllListKey);
}

function listRegion(key: ExternalToolLayoutAllListKey): ExternalRegion {
  return key.startsWith('overseas') ? 'overseas' : 'domestic';
}

function isFeaturedList(key: ExternalToolLayoutAllListKey): boolean {
  return key.endsWith('FeaturedIds');
}

function removalTargetForDrag(
  selectedType: ExternalToolTypeId | 'all',
  drag: DragState,
): LayoutListId | null {
  if (selectedType === 'all') {
    if (!isAllListKey(drag.source) || !isFeaturedList(drag.source)) return null;
    return drag.region === 'overseas'
      ? 'overseasMoreOrderIds'
      : 'domesticMoreOrderIds';
  }
  if (drag.source !== `category:${selectedType}:${drag.region}:featured`) return null;
  return `category:${selectedType}:${drag.region}:more`;
}

function resolveExternalDropTarget(
  selectedType: ExternalToolTypeId | 'all',
  drag: DragState,
  candidate: LayoutListId | null,
): LayoutListId | null {
  const removalTarget = removalTargetForDrag(selectedType, drag);
  if (removalTarget && candidate !== drag.source) return removalTarget;
  return candidate;
}

function finiteOrder(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : Number.POSITIVE_INFINITY;
}

function sortBySourceOrder(cards: readonly MarketShelfCardModel[]): MarketShelfCardModel[] {
  return cards
    .map((card, index) => ({ card, index }))
    .sort((a, b) => {
      const byOrder = finiteOrder(a.card.sourceOrder) - finiteOrder(b.card.sourceOrder);
      return byOrder || a.index - b.index;
    })
    .map(({ card }) => card);
}

function selectCardsByIds(
  cards: readonly MarketShelfCardModel[],
  configuredIds: readonly string[],
): MarketShelfCardModel[] {
  const byId = new Map(cards.map((card) => [card.id, card]));
  return configuredIds.flatMap((id) => {
    const card = byId.get(id);
    return card ? [card] : [];
  });
}

function isCategoryMoreList(listId: LayoutListId): boolean {
  return listId.startsWith('category:') && listId.endsWith(':more');
}

function insertExternalToolCardBefore(
  items: readonly MarketShelfCardModel[],
  card: MarketShelfCardModel,
  beforeId: string | null,
): MarketShelfCardModel[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  byId.set(card.id, card);
  return insertExternalToolIdBefore(
    items.map((item) => item.id),
    card.id,
    beforeId,
  ).flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}

function previewExternalDropItems(
  items: readonly MarketShelfCardModel[],
  listId: LayoutListId,
  drag: DragState | null,
  placement: ExternalDragPlacement | null,
  draggedCard: MarketShelfCardModel | null,
): MarketShelfCardModel[] {
  if (!drag || !placement || !draggedCard) return [...items];

  if (isAllListKey(listId)) {
    if (listId === placement.target) {
      return insertExternalToolCardBefore(items, draggedCard, placement.beforeId);
    }
    if (listId === drag.source && placement.target !== drag.source) {
      return items.filter((item) => item.id !== drag.cardId);
    }
    return [...items];
  }

  // 分类页的“更多”是完整候选池，不会因加入精选而移除工具。
  if (isCategoryMoreList(listId)) return [...items];
  if (listId === placement.target) {
    return insertExternalToolCardBefore(items, draggedCard, placement.beforeId);
  }
  if (listId === drag.source && placement.target !== drag.source) {
    return items.filter((item) => item.id !== drag.cardId);
  }
  return [...items];
}

function cardElementsInLayoutList(listElement: HTMLElement): HTMLElement[] {
  return Array.from(
    listElement.querySelectorAll<HTMLElement>('[data-layout-card-id]'),
  ).filter((element) => element.closest('[data-layout-list]') === listElement);
}

function resolvePointerBeforeId(
  listElement: HTMLElement,
  cardElement: HTMLElement,
  activeId: string,
  clientX: number,
  clientY: number,
  previous: ExternalDragPlacement | null,
): string | null {
  const listId = listElement.dataset.layoutList as LayoutListId | undefined;
  const hoveredId = cardElement.dataset.layoutCardId ?? null;
  if (!hoveredId) return null;
  if (hoveredId === activeId && previous && previous.target === listId) {
    return previous.beforeId;
  }

  const allCards = cardElementsInLayoutList(listElement);
  if (hoveredId === activeId) {
    const activeIndex = allCards.indexOf(cardElement);
    return (
      allCards
        .slice(activeIndex + 1)
        .find((element) => element.dataset.layoutCardId !== activeId)?.dataset
        .layoutCardId ?? null
    );
  }

  const candidates = allCards.filter(
    (element) => element.dataset.layoutCardId !== activeId,
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
    ? candidates[hoveredIndex + 1]?.dataset.layoutCardId ?? null
    : hoveredId;
}

function isExternalPlacementAllowed(
  selectedType: ExternalToolTypeId | 'all',
  searchActive: boolean,
  drag: DragState,
  target: LayoutListId,
): boolean {
  if (selectedType === 'all') {
    if (!isAllListKey(drag.source) || !isAllListKey(target)) return false;
    if (listRegion(drag.source) !== listRegion(target)) return false;
    if (searchActive && drag.source === target && !isFeaturedList(target)) return false;
    return true;
  }

  const featured = `category:${selectedType}:${drag.region}:featured`;
  const more = `category:${selectedType}:${drag.region}:more`;
  return target === featured || (target === more && drag.source === featured);
}

function resolveExternalDragPlacementAtPoint(
  ownerDocument: Document,
  clientX: number,
  clientY: number,
  selectedType: ExternalToolTypeId | 'all',
  searchActive: boolean,
  drag: DragState,
  previous: ExternalDragPlacement | null,
): ExternalDragPlacement | null {
  const eventTarget = ownerDocument.elementFromPoint(clientX, clientY);
  const listElement = eventTarget?.closest<HTMLElement>('[data-layout-list]') ?? null;
  const cardElement =
    eventTarget?.closest<HTMLElement>('[data-layout-card-id]') ?? null;
  const candidate =
    (listElement?.dataset.layoutList as LayoutListId | undefined) ?? null;
  const target = resolveExternalDropTarget(selectedType, drag, candidate);
  if (!target || !isExternalPlacementAllowed(selectedType, searchActive, drag, target)) {
    return null;
  }

  if (target === candidate && listElement && !cardElement) {
    const lastCard = cardElementsInLayoutList(listElement)
      .filter((element) => element.dataset.layoutCardId !== drag.cardId)
      .at(-1);
    const lastRect = lastCard?.getBoundingClientRect();
    const pointerIsAfterLastCard = Boolean(
      lastRect &&
        (clientY > lastRect.bottom ||
          (clientY >= lastRect.top &&
            clientY <= lastRect.bottom &&
            clientX > lastRect.right)),
    );
    if (previous?.target === target && !pointerIsAfterLastCard) return previous;
  }

  const beforeId =
    target === candidate &&
    listElement &&
    cardElement &&
    listElement.contains(cardElement)
      ? resolvePointerBeforeId(
          listElement,
          cardElement,
          drag.cardId,
          clientX,
          clientY,
          previous,
        )
      : null;
  return { target, beforeId };
}

function animateExternalGridReflow(
  nodes: ReadonlyMap<string, HTMLElement>,
  previousRects: ReadonlyMap<string, DOMRect>,
  animations: Map<string, Animation>,
): Map<string, DOMRect> {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
        duration: EXTERNAL_DRAG_REFLOW_DURATION,
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

function ToolDropGrid({
  items,
  listId,
  dragEnabled,
  dragState,
  dragPlacement,
  draggedCard,
  onPointerStart,
  emptyText,
  showHot = false,
  dense = false,
  onOpen,
}: {
  items: MarketShelfCardModel[];
  listId: LayoutListId;
  dragEnabled: boolean;
  dragState: DragState | null;
  dragPlacement: ExternalDragPlacement | null;
  draggedCard: MarketShelfCardModel | null;
  onPointerStart: (
    drag: DragState,
    pointerId: number,
    startX: number,
    startY: number,
    metrics: DragPreviewMetrics,
  ) => void;
  emptyText: string;
  showHot?: boolean;
  dense?: boolean;
  onOpen: (card: MarketShelfCardModel) => void;
}) {
  const shownItems = previewExternalDropItems(
    items,
    listId,
    dragState,
    dragPlacement,
    draggedCard,
  );
  const cardNodesRef = useRef(new Map<string, HTMLElement>());
  const previousRectsRef = useRef(new Map<string, DOMRect>());
  const reflowAnimationsRef = useRef(new Map<string, Animation>());
  const layoutSignature = shownItems.map((card) => card.id).join('|');
  const showDropTarget = dragEnabled && dragPlacement?.target === listId;
  const gridClass = dense
    ? 'grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3'
    : 'grid grid-cols-1 gap-2 sm:grid-cols-2';

  useLayoutEffect(() => {
    previousRectsRef.current = animateExternalGridReflow(
      cardNodesRef.current,
      previousRectsRef.current,
      reflowAnimationsRef.current,
    );
  }, [layoutSignature, Boolean(dragState)]);

  useEffect(
    () => () => {
      reflowAnimationsRef.current.forEach((animation) => animation.cancel());
      reflowAnimationsRef.current.clear();
    },
    [],
  );

  return (
    <div
      className={cn(
        'min-h-24 rounded-2xl transition-[background-color,outline-color] duration-150 motion-reduce:transition-none',
        showDropTarget && 'bg-sky-50/30 outline outline-1 outline-dashed outline-sky-200/80',
      )}
      data-layout-list={listId}
      data-layout-active-drop-target={showDropTarget ? 'true' : undefined}
    >
      {shownItems.length ? (
        <div className={gridClass}>
          {shownItems.map((card) => {
            const region = card.region === 'domestic' ? 'domestic' : 'overseas';
            const draggable = dragEnabled;
            const isLiftedOrigin =
              dragState?.cardId === card.id && dragState.source === listId;
            const isDropPlaceholder =
              dragState?.cardId === card.id &&
              dragPlacement?.target === listId &&
              !isCategoryMoreList(listId);
            return (
              <div
                key={card.id}
                ref={(node) => {
                  if (node) cardNodesRef.current.set(card.id, node);
                  else cardNodesRef.current.delete(card.id);
                }}
                data-layout-card-id={card.id}
                data-tool-drag-lifted={isLiftedOrigin ? 'true' : undefined}
                data-tool-drop-placeholder={isDropPlaceholder ? 'true' : undefined}
                className={cn(
                  'relative min-w-0 rounded-2xl transition-opacity duration-150 will-change-transform motion-reduce:transition-none',
                  isLiftedOrigin && !isDropPlaceholder && 'opacity-20',
                  isDropPlaceholder && 'opacity-0',
                )}
              >
                <MarketShelfCard
                  card={card}
                  variant="compact"
                  showHot={showHot}
                  enableCompare={false}
                  interactionMode="preview"
                  onOpen={() => onOpen(card)}
                  showDefaultFooter={false}
                  footerActions={
                    <div className="flex items-center border-t border-zinc-100 pt-2">
                      <span
                        data-tool-drag-handle
                        role="button"
                        tabIndex={draggable ? 0 : -1}
                        aria-disabled={!draggable}
                        aria-label={draggable ? `拖动${card.title}` : `${card.title}不可拖动`}
                        title={draggable ? '按住拖动卡片' : '正在加载或保存，暂不可拖动'}
                        className={cn(
                          'inline-flex touch-none select-none items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold',
                          draggable
                            ? 'cursor-grab border-zinc-200 bg-white text-zinc-600 active:cursor-grabbing'
                            : 'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300',
                        )}
                        onPointerDown={(event) => {
                          if (!draggable) {
                            event.preventDefault();
                            return;
                          }
                          if (!event.isPrimary || event.button !== 0) return;
                          event.preventDefault();
                          event.stopPropagation();
                          const cardElement = event.currentTarget.closest<HTMLElement>(
                            '[data-layout-card-id]',
                          );
                          const rect = cardElement?.getBoundingClientRect();
                          const sourceWidth = rect?.width || EXTERNAL_DRAG_PREVIEW_WIDTH;
                          const width = clamp(sourceWidth, 180, 320);
                          const ratio = width / sourceWidth;
                          onPointerStart(
                            { cardId: card.id, source: listId, region },
                            event.pointerId,
                            event.clientX,
                            event.clientY,
                            rect
                              ? {
                                  width,
                                  height: rect.height * ratio,
                                  grabOffsetX: (event.clientX - rect.left) * ratio,
                                  grabOffsetY: (event.clientY - rect.top) * ratio,
                                }
                              : DEFAULT_DRAG_PREVIEW_METRICS,
                          );
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                      >
                        <i className="fa-solid fa-grip-vertical" />
                        拖动
                      </span>
                    </div>
                  }
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-black/10 bg-white/45 px-3 py-8 text-center text-[12px] text-[#86868b]">
          {emptyText}
        </div>
      )}
    </div>
  );
}

function ToolListPanel({
  title,
  subtitle,
  count,
  children,
  tone,
}: {
  title: string;
  subtitle?: string;
  count: number;
  children: ReactNode;
  tone?: ExternalRegion;
}) {
  return (
    <div
      className={cn(
        'min-w-0',
        tone === 'overseas' && 'market-rail-stage--overseas',
        tone === 'domestic' && 'market-rail-stage--domestic',
      )}
    >
      <div className="mb-3 flex items-baseline gap-2 px-0.5">
        <h3 className="text-[18px] font-semibold tracking-tight text-[#1d1d1f]">{title}</h3>
        {subtitle ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#86868b]">
            {subtitle}
          </span>
        ) : null}
        <span className="text-[12px] text-[#86868b]">{count}</span>
      </div>
      {children}
    </div>
  );
}

export function PortalToolOpsPanel() {
  const tools = useMarketplaceStore((state) => state.tools);
  const showToast = useMarketplaceStore((state) => state.showToast);
  const user = useSessionStore((state) => state.user);
  const getEngagement = useContentEngagementStore((state) => state.get);
  const engagementById = useContentEngagementStore((state) => state.byId);
  const guideRecords = usePlazaToolGuideStore((state) => state.records);
  const externalTaxonomy = useExternalTaxonomyCatalogStore((state) => state.catalog);
  const workspaceId = useWorkspaceStore((state) => state.workspaceId);
  const apiConnected = useWorkspaceStore((state) => state.apiConnected);

  const layoutDocument = useExternalToolLayoutStore((state) => state.document);
  const layoutDraft = useExternalToolLayoutStore((state) => state.draft);
  const layoutLoading = useExternalToolLayoutStore((state) => state.loading);
  const layoutSaving = useExternalToolLayoutStore((state) => state.saving);
  const layoutError = useExternalToolLayoutStore((state) => state.error);
  const hydrateLayout = useExternalToolLayoutStore((state) => state.hydrate);
  const cancelLayoutEdit = useExternalToolLayoutStore((state) => state.cancelEdit);
  const saveLayoutDraft = useExternalToolLayoutStore((state) => state.saveDraft);
  const setAllLayoutList = useExternalToolLayoutStore((state) => state.setAllList);
  const setCategoryFeatured = useExternalToolLayoutStore(
    (state) => state.setCategoryFeatured,
  );
  const clearLayoutError = useExternalToolLayoutStore((state) => state.clearError);

  const internalLoaded = useInternalOfficeSceneCatalogStore((state) => state.loaded);
  const internalLoading = useInternalOfficeSceneCatalogStore((state) => state.loading);
  const internalSaving = useInternalOfficeSceneCatalogStore((state) => state.saving);
  const internalToast = useInternalOfficeSceneCatalogStore((state) => state.toast);
  const internalToastTone = useInternalOfficeSceneCatalogStore(
    (state) => state.toastTone,
  );
  const hydrateInternalScenes = useInternalOfficeSceneCatalogStore(
    (state) => state.hydrate,
  );
  const reorderVisibleEntry = useInternalOfficeSceneCatalogStore(
    (state) => state.reorderVisibleEntry,
  );
  const dismissInternalToast = useInternalOfficeSceneCatalogStore(
    (state) => state.dismissToast,
  );

  const [kind, setKind] = useState<ToolOpsKind>('internal');
  const [search, setSearch] = useState('');
  const [externalType, setExternalType] = useState<ExternalToolTypeId | 'all'>('all');
  const [previewToolId, setPreviewToolId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [externalDragPlacement, setExternalDragPlacement] =
    useState<ExternalDragPlacement | null>(null);
  const externalDragPlacementRef = useRef<ExternalDragPlacement | null>(null);
  const externalDragSurfaceRef = useRef<HTMLDivElement | null>(null);
  const externalDragPreviewRef = useRef<HTMLDivElement | null>(null);
  const externalDragPreviewLiftRef = useRef<HTMLDivElement | null>(null);
  const externalDragPreviewPositionRef = useRef<DragPreviewPosition>({
    x: 0,
    y: 0,
    rotation: 0,
  });
  const externalDragPreviewMetricsRef = useRef<DragPreviewMetrics>(
    DEFAULT_DRAG_PREVIEW_METRICS,
  );
  const externalPointerDragRef = useRef<{
    pointerId: number;
    drag: DragState;
    startX: number;
    startY: number;
    lastClientX: number;
    reducedMotion: boolean;
    workspaceId: string;
    moved: boolean;
  } | null>(null);
  const [internalDrag, setInternalDrag] = useState<InternalSceneDragState | null>(null);
  const internalDragRef = useRef<InternalSceneDragState | null>(null);

  useEffect(() => {
    const visibleTypes = listVisibleExternalToolTypes(externalTaxonomy);
    if (externalType !== 'all' && !visibleTypes.some((item) => item.id === externalType)) {
      setExternalType('all');
    }
  }, [externalTaxonomy, externalType]);

  useEffect(() => {
    if (!apiConnected || !workspaceId) return;
    void hydrateLayout(workspaceId);
    void hydrateInternalScenes(workspaceId);
  }, [apiConnected, workspaceId, hydrateInternalScenes, hydrateLayout]);

  useEffect(() => {
    setDragState(null);
    dragStateRef.current = null;
    setExternalDragPlacement(null);
    externalDragPlacementRef.current = null;
    externalDragPreviewRef.current = null;
    externalDragPreviewLiftRef.current = null;
    externalDragPreviewPositionRef.current = { x: 0, y: 0, rotation: 0 };
    externalDragPreviewMetricsRef.current = DEFAULT_DRAG_PREVIEW_METRICS;
    externalPointerDragRef.current = null;
    setInternalDrag(null);
    internalDragRef.current = null;
  }, [workspaceId]);

  const viewer = useMemo(
    () => ({
      userId: user?.id,
      userName: user?.name,
      affiliation: {
        deptIds: user?.deptIds ?? [],
        regionId: user?.regionId ?? null,
      },
      role: user?.platformRole,
    }),
    [user],
  );

  const canManageInternalOrder = user?.platformRole === 'super_admin';

  const howtoToolIds = useMemo(
    () => new Set(guideRecords.map((record) => record.toolId)),
    [guideRecords],
  );

  const publishedInternalCards = useMemo(
    () =>
      listMarketToolCards(
        tools,
        'internal',
        viewer,
        emptyOrgPerspectiveSelection(),
        'all',
        getEngagement,
        howtoToolIds,
      ),
    [tools, viewer, getEngagement, engagementById, howtoToolIds],
  );

  const externalCards = useMemo(() => {
    return sortBySourceOrder(
      listMarketToolCards(
        tools,
        'external',
        viewer,
        emptyOrgPerspectiveSelection(),
        'all',
        getEngagement,
        howtoToolIds,
      ).map((card) => ({
        ...card,
        sourceOrder: card.externalSortOrder,
      })),
    );
  }, [tools, viewer, getEngagement, engagementById, howtoToolIds]);

  const externalStats = useMemo(
    () => ({
      total: externalCards.length,
      overseas: externalCards.filter((card) => card.region === 'overseas').length,
      domestic: externalCards.filter((card) => card.region === 'domestic').length,
    }),
    [externalCards],
  );
  const draggedExternalCard = dragState
    ? externalCards.find((card) => card.id === dragState.cardId) ?? null
    : null;

  const activeLayout: ExternalToolLayoutDocument | null = layoutDraft ?? layoutDocument;
  const externalDragEnabled = Boolean(activeLayout) && !layoutLoading && !layoutSaving;

  const overseasCards = externalCards.filter((card) => card.region === 'overseas');
  const domesticCards = externalCards.filter((card) => card.region === 'domestic');
  const overseasAvailableIds = new Set(overseasCards.map((card) => card.id));
  const domesticAvailableIds = new Set(domesticCards.map((card) => card.id));

  const allOverseasFeatured = selectCardsByIds(
    overseasCards,
    activeLayout?.all.overseasFeaturedIds ?? [],
  );
  const allDomesticFeatured = selectCardsByIds(
    domesticCards,
    activeLayout?.all.domesticFeaturedIds ?? [],
  );
  const allOverseasFeaturedSet = new Set(allOverseasFeatured.map((card) => card.id));
  const allDomesticFeaturedSet = new Set(allDomesticFeatured.map((card) => card.id));
  const allOverseasMore = orderExternalToolsByLayoutIds(
    overseasCards.filter((card) => !allOverseasFeaturedSet.has(card.id)),
    activeLayout?.all.overseasMoreOrderIds ?? [],
  );
  const allDomesticMore = orderExternalToolsByLayoutIds(
    domesticCards.filter((card) => !allDomesticFeaturedSet.has(card.id)),
    activeLayout?.all.domesticMoreOrderIds ?? [],
  );

  const categoryOverseasFeaturedIds =
    externalType === 'all'
      ? []
      : activeLayout?.categories[externalType]?.overseasFeaturedIds ?? [];
  const categoryDomesticFeaturedIds =
    externalType === 'all'
      ? []
      : activeLayout?.categories[externalType]?.domesticFeaturedIds ?? [];
  const categoryOverseasFeatured = selectCardsByIds(
    overseasCards,
    categoryOverseasFeaturedIds,
  );
  const categoryDomesticFeatured = selectCardsByIds(
    domesticCards,
    categoryDomesticFeaturedIds,
  );
  // 分类页下方始终是完整候选池；精选仅是上方引用，不会把工具从候选池移走。
  const categoryOverseasMore = overseasCards;
  const categoryDomesticMore = domesticCards;

  const searchIds = useMemo(() => {
    if (!search.trim()) return null;
    return new Set(
      searchCapabilitiesByIntent(search, externalCards, externalCards.length).map(
        (match) => match.card.id,
      ),
    );
  }, [search, externalCards]);
  const visibleMore = (cards: MarketShelfCardModel[]) =>
    searchIds ? cards.filter((card) => searchIds.has(card.id)) : cards;

  const visibleAllLists: Record<ExternalToolLayoutAllListKey, string[]> = {
    overseasFeaturedIds: allOverseasFeatured.map((card) => card.id),
    domesticFeaturedIds: allDomesticFeatured.map((card) => card.id),
    overseasMoreOrderIds: allOverseasMore.map((card) => card.id),
    domesticMoreOrderIds: allDomesticMore.map((card) => card.id),
  };

  const configuredAllLists = activeLayout?.all ?? {
    overseasFeaturedIds: [],
    domesticFeaturedIds: [],
    overseasMoreOrderIds: [],
    domesticMoreOrderIds: [],
  };

  const writeAllList = (key: ExternalToolLayoutAllListKey, visibleIds: string[]) => {
    const availableIds = listRegion(key) === 'overseas' ? overseasAvailableIds : domesticAvailableIds;
    setAllLayoutList(
      key,
      mergeExternalToolLayoutVisibleAndParkedIds(
        visibleIds,
        configuredAllLists[key],
        availableIds,
      ),
    );
  };

  const dropAll = (
    drag: DragState,
    target: ExternalToolLayoutAllListKey,
    beforeId: string | null,
  ): boolean => {
    if (!isAllListKey(drag.source) || listRegion(target) !== drag.region) return false;
    if (search.trim() && drag.source === target && !isFeaturedList(target)) return false;

    const sourceIds = visibleAllLists[drag.source];
    const targetIds = visibleAllLists[target];
    if (drag.source === target) {
      writeAllList(target, insertExternalToolIdBefore(targetIds, drag.cardId, beforeId));
      return true;
    }
    writeAllList(
      drag.source,
      sourceIds.filter((id) => id !== drag.cardId),
    );
    writeAllList(target, insertExternalToolIdBefore(targetIds, drag.cardId, beforeId));
    return true;
  };

  const dropCategory = (
    drag: DragState,
    target: LayoutListId,
    beforeId: string | null,
  ): boolean => {
    if (externalType === 'all') return false;
    const featuredList = `category:${externalType}:${drag.region}:featured` as const;
    const moreList = `category:${externalType}:${drag.region}:more` as const;
    const featuredKey: ExternalToolCategoryFeaturedListKey =
      drag.region === 'overseas' ? 'overseasFeaturedIds' : 'domesticFeaturedIds';
    const featuredCards =
      drag.region === 'overseas'
        ? categoryOverseasFeatured
        : categoryDomesticFeatured;
    const configuredIds =
      drag.region === 'overseas'
        ? categoryOverseasFeaturedIds
        : categoryDomesticFeaturedIds;
    const availableIds =
      drag.region === 'overseas' ? overseasAvailableIds : domesticAvailableIds;
    if (target === featuredList) {
      const next = insertExternalToolIdBefore(
        featuredCards.map((card) => card.id),
        drag.cardId,
        beforeId,
      );
      setCategoryFeatured(
        externalType,
        mergeExternalToolLayoutVisibleAndParkedIds(
          next,
          configuredIds,
          availableIds,
        ),
        featuredKey,
      );
      return true;
    }
    if (target === moreList && drag.source === featuredList) {
      setCategoryFeatured(
        externalType,
        mergeExternalToolLayoutVisibleAndParkedIds(
          featuredCards
            .map((card) => card.id)
            .filter((id) => id !== drag.cardId),
          configuredIds,
          availableIds,
        ),
        featuredKey,
      );
      return true;
    }
    return false;
  };

  const startExternalDrag = (nextDrag: DragState) => {
    dragStateRef.current = nextDrag;
    setDragState(nextDrag);
  };

  const updateExternalDragPreviewPosition = (
    clientX: number,
    clientY: number,
    ownerDocument: Document,
  ) => {
    const view = ownerDocument.defaultView;
    const pointer = externalPointerDragRef.current;
    const previous = externalDragPreviewPositionRef.current;
    const rotation = pointer?.reducedMotion
      ? 0
      : clamp(
          previous.rotation * 0.45 +
            ((clientX - (pointer?.lastClientX ?? clientX)) * 0.16) * 0.55,
          -0.8,
          0.8,
        );
    if (pointer) pointer.lastClientX = clientX;
    const next = resolveDragPreviewPosition(
      clientX,
      clientY,
      view?.innerWidth ?? clientX + EXTERNAL_DRAG_PREVIEW_WIDTH,
      view?.innerHeight ?? clientY + EXTERNAL_DRAG_PREVIEW_HEIGHT,
      externalDragPreviewMetricsRef.current,
      rotation,
    );
    externalDragPreviewPositionRef.current = next;
    if (externalDragPreviewRef.current) {
      externalDragPreviewRef.current.style.transform = dragPreviewTransform(next);
    }
    if (externalDragPreviewLiftRef.current) {
      externalDragPreviewLiftRef.current.style.transform = dragPreviewLiftTransform(
        next.rotation,
        pointer?.reducedMotion,
      );
    }
  };

  const updateExternalDragPlacement = (
    drag: DragState,
    clientX: number,
    clientY: number,
    ownerDocument: Document,
  ) => {
    const next = resolveExternalDragPlacementAtPoint(
      ownerDocument,
      clientX,
      clientY,
      externalType,
      Boolean(search.trim()),
      drag,
      externalDragPlacementRef.current,
    );
    const previous = externalDragPlacementRef.current;
    if (previous?.target === next?.target && previous?.beforeId === next?.beforeId) {
      return;
    }
    externalDragPlacementRef.current = next;
    setExternalDragPlacement(next);
  };

  const prepareExternalPointerDrag = (
    drag: DragState,
    pointerId: number,
    startX: number,
    startY: number,
    metrics: DragPreviewMetrics,
  ) => {
    const layoutState = useExternalToolLayoutStore.getState();
    if (
      !externalDragEnabled ||
      layoutState.loading ||
      layoutState.saving ||
      !layoutState.workspaceId ||
      dragStateRef.current
    ) {
      return;
    }
    const dragSurface = externalDragSurfaceRef.current;
    if (!dragSurface) return;
    dragSurface.setPointerCapture(pointerId);
    const reducedMotion = Boolean(
      dragSurface.ownerDocument.defaultView?.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches,
    );
    externalDragPreviewMetricsRef.current = metrics;
    externalPointerDragRef.current = {
      pointerId,
      drag,
      startX,
      startY,
      lastClientX: startX,
      reducedMotion,
      workspaceId: layoutState.workspaceId,
      moved: false,
    };
  };

  const finishExternalDrag = () => {
    const pointer = externalPointerDragRef.current;
    const dragSurface = externalDragSurfaceRef.current;
    externalPointerDragRef.current = null;
    if (pointer && dragSurface?.hasPointerCapture(pointer.pointerId)) {
      dragSurface.releasePointerCapture(pointer.pointerId);
    }
    dragStateRef.current = null;
    externalDragPlacementRef.current = null;
    externalDragPreviewRef.current = null;
    externalDragPreviewLiftRef.current = null;
    externalDragPreviewPositionRef.current = { x: 0, y: 0, rotation: 0 };
    externalDragPreviewMetricsRef.current = DEFAULT_DRAG_PREVIEW_METRICS;
    setDragState(null);
    setExternalDragPlacement(null);
  };

  const animateExternalDrop = async (
    placement: ExternalDragPlacement,
    ownerDocument: Document,
  ) => {
    const preview = externalDragPreviewRef.current;
    if (!preview) return;
    const view = ownerDocument.defaultView;
    if (view?.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const target = Array.from(
      ownerDocument.querySelectorAll<HTMLElement>(
        '[data-tool-drop-placeholder="true"]',
      ),
    ).find(
      (element) =>
        element.dataset.layoutCardId === dragStateRef.current?.cardId &&
        element.closest<HTMLElement>('[data-layout-list]')?.dataset.layoutList ===
          placement.target,
    );
    const targetRect = target?.getBoundingClientRect();
    const current = externalDragPreviewPositionRef.current;
    const metrics = externalDragPreviewMetricsRef.current;
    const targetVisible = Boolean(
      targetRect &&
        targetRect.bottom >= 0 &&
        targetRect.top <= (view?.innerHeight ?? Number.POSITIVE_INFINITY),
    );
    const targetScale = targetRect
      ? clamp(targetRect.width / metrics.width, 0.82, 1.08)
      : 0.985;
    const destination = targetVisible && targetRect
      ? `translate3d(${targetRect.left}px, ${targetRect.top}px, 0) scale(${targetScale})`
      : `${dragPreviewTransform(current)} scale(0.985)`;
    const animation = preview.animate(
      [
        { transform: dragPreviewTransform(current), opacity: 1 },
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

  const commitExternalDrop = async (
    drag: DragState,
    target: LayoutListId,
    beforeId: string | null,
    expectedWorkspaceId: string,
  ) => {
    const liveLayoutState = useExternalToolLayoutStore.getState();
    if (liveLayoutState.loading || liveLayoutState.saving) return;
    if (!externalDragEnabled) return;
    if (liveLayoutState.workspaceId !== expectedWorkspaceId) return;
    const startedWorkspaceId = expectedWorkspaceId;

    const accepted =
      externalType === 'all' && isAllListKey(target)
        ? dropAll(drag, target, beforeId)
        : externalType !== 'all'
          ? dropCategory(drag, target, beforeId)
          : false;
    if (!accepted) return;

    const saved = await saveLayoutDraft();
    if (saved) {
      showToast('外部工具布局已自动保存');
      return;
    }

    const failedState = useExternalToolLayoutStore.getState();
    if (failedState.workspaceId !== startedWorkspaceId) return;
    const message = failedState.error ?? '外部工具布局保存失败';
    cancelLayoutEdit();
    await hydrateLayout(startedWorkspaceId);
    showToast(`${message} 已恢复服务器中的布局。`);
  };

  const handleExternalPointerDrop = async (
    drag: DragState,
    ownerDocument: Document,
    clientX: number,
    clientY: number,
    expectedWorkspaceId: string,
  ) => {
    if (!externalDragEnabled) {
      finishExternalDrag();
      return;
    }
    const placement = resolveExternalDragPlacementAtPoint(
      ownerDocument,
      clientX,
      clientY,
      externalType,
      Boolean(search.trim()),
      drag,
      externalDragPlacementRef.current,
    );
    if (!placement) {
      finishExternalDrag();
      return;
    }
    await animateExternalDrop(placement, ownerDocument);
    if (
      useExternalToolLayoutStore.getState().workspaceId !== expectedWorkspaceId
    ) {
      finishExternalDrag();
      return;
    }
    finishExternalDrag();
    void commitExternalDrop(
      drag,
      placement.target,
      placement.beforeId,
      expectedWorkspaceId,
    );
  };

  const handleExternalPointerMoveCapture = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const pointer = externalPointerDragRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    const moved =
      Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) >= 4;
    if (moved && !pointer.moved) {
      pointer.moved = true;
      startExternalDrag(pointer.drag);
    }
    if (pointer.moved) {
      updateExternalDragPreviewPosition(
        event.clientX,
        event.clientY,
        event.currentTarget.ownerDocument,
      );
      updateExternalDragPlacement(
        pointer.drag,
        event.clientX,
        event.clientY,
        event.currentTarget.ownerDocument,
      );
      event.preventDefault();
    }
  };

  const handleExternalPointerUpCapture = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const pointer = externalPointerDragRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    const moved =
      pointer.moved ||
      Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) >= 4;
    externalPointerDragRef.current = null;
    if (!moved) {
      finishExternalDrag();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    void handleExternalPointerDrop(
      pointer.drag,
      event.currentTarget.ownerDocument,
      event.clientX,
      event.clientY,
      pointer.workspaceId,
    );
  };

  const handleExternalPointerCancelCapture = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (externalPointerDragRef.current?.pointerId !== event.pointerId) return;
    finishExternalDrag();
  };

  const handleExternalLostPointerCapture = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (externalPointerDragRef.current?.pointerId !== event.pointerId) return;
    finishExternalDrag();
  };

  const dropInternalScene = async (beforeId: string | null): Promise<boolean> => {
    const drag = internalDragRef.current ?? internalDrag;
    if (!drag) return false;
    const liveState = useInternalOfficeSceneCatalogStore.getState();
    if (
      !canManageInternalOrder ||
      drag.workspaceId !== workspaceId ||
      liveState.workspaceId !== drag.workspaceId ||
      liveState.loading ||
      liveState.saving
    ) {
      if (internalDragRef.current === drag) {
        internalDragRef.current = null;
        setInternalDrag(null);
      }
      return false;
    }
    const saved = await reorderVisibleEntry(
      drag.sceneId,
      beforeId,
      drag.visibleIds,
      drag.revision,
    );
    if (internalDragRef.current === drag) {
      internalDragRef.current = null;
      setInternalDrag(null);
    }
    if (saved && useWorkspaceStore.getState().workspaceId === drag.workspaceId) {
      showToast('已保存内部办公场景顺序');
      dismissInternalToast();
    }
    return saved;
  };

  const selectKind = (next: ToolOpsKind) => {
    setKind(next);
    setSearch('');
    setExternalType('all');
    setPreviewToolId(null);
    finishExternalDrag();
    setInternalDrag(null);
    internalDragRef.current = null;
  };

  return (
    <div
      ref={externalDragSurfaceRef}
      className="space-y-5"
      data-testid="portal-tool-ops-panel"
      onPointerMoveCapture={handleExternalPointerMoveCapture}
      onPointerUpCapture={handleExternalPointerUpCapture}
      onPointerCancelCapture={handleExternalPointerCancelCapture}
      onLostPointerCapture={handleExternalLostPointerCapture}
    >
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-[0_8px_24px_-20px_rgba(24,24,27,0.3)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex w-fit rounded-xl bg-zinc-100 p-1" role="tablist" aria-label="工具运营分类">
            {(
              [
                {
                  id: 'internal' as const,
                  label: '内部工具',
                  count: publishedInternalCards.length,
                },
                { id: 'external' as const, label: '外部工具', count: externalCards.length },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={kind === tab.id}
                onClick={() => selectKind(tab.id)}
                className={cn(
                  'rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition',
                  kind === tab.id
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800',
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'ml-1.5 font-normal',
                    kind === tab.id ? 'text-zinc-300' : 'text-zinc-400',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {kind === 'internal' ? (
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <CenterSearchInput
                value={search}
                onChange={setSearch}
                placeholder="搜索内部办公场景…"
                className="min-w-[13rem] flex-1 lg:max-w-[18rem]"
              />
              {internalSaving ? (
                <span className="text-[11px] font-medium text-zinc-500">正在自动保存…</span>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <CenterSearchInput
                value={search}
                onChange={setSearch}
                placeholder="搜索外部工具…"
                className="min-w-[13rem] flex-1 lg:max-w-[18rem]"
              />
              {layoutSaving ? (
                <span className="text-[11px] font-medium text-zinc-500">正在自动保存…</span>
              ) : null}
            </div>
          )}
        </div>
        {kind === 'internal' ? (
          <p className="mt-2.5 flex items-center gap-1.5 text-[10px] leading-relaxed text-zinc-400">
            <i className="fa-regular fa-hand" />
            {canManageInternalOrder
              ? '拖动卡片左下角手柄，松手后自动保存；点击卡片查看详情。'
              : '当前账号只能点击卡片查看详情；仅超级管理员可调整顺序。'}
          </p>
        ) : (
          <p className="mt-2.5 flex items-center gap-1.5 text-[10px] leading-relaxed text-zinc-400">
            <i className="fa-regular fa-hand" />
            拖入对应精选即加入；精选卡拖出精选区域即移出；松手后自动保存。
          </p>
        )}
      </div>

      {kind === 'internal' && internalToastTone === 'error' && internalToast ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          <span>{internalToast}</span>
          <button
            type="button"
            onClick={dismissInternalToast}
            className="shrink-0 font-semibold"
          >
            关闭
          </button>
        </div>
      ) : null}

      {kind === 'external' && layoutError ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          <span>{layoutError}</span>
          <button type="button" onClick={clearLayoutError} className="shrink-0 font-semibold">
            关闭
          </button>
        </div>
      ) : null}

      <div
        className={cn(kind !== 'internal' && 'hidden')}
        aria-hidden={kind !== 'internal'}
        data-testid="portal-tool-ops-internal"
      >
        {internalLoading && !internalLoaded ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-14 text-center text-[13px] text-zinc-400">
            正在加载内部办公场景…
          </div>
        ) : (
          <InternalOfficeSceneGrid
            search={search}
            catalogTools={tools}
            rankMode="excel_order"
            interactionMode="preview"
            showAssistantChat={false}
            maintenanceView
            pointerReorder
            reorderEnabled={
              canManageInternalOrder && internalLoaded && !internalLoading && !internalSaving
            }
            draggingSceneId={internalDrag?.sceneId ?? null}
            onSceneDragStart={(sceneId) => {
              const liveState = useInternalOfficeSceneCatalogStore.getState();
              if (
                !canManageInternalOrder ||
                !liveState.loaded ||
                liveState.loading ||
                liveState.saving ||
                !liveState.workspaceId ||
                liveState.workspaceId !== useWorkspaceStore.getState().workspaceId
              ) {
                return false;
              }
              const nextDrag = {
                sceneId,
                revision: liveState.revision,
                visibleIds: liveState.entries
                  .filter((entry) => entry.visible)
                  .map((entry) => entry.id),
                workspaceId: liveState.workspaceId,
              };
              internalDragRef.current = nextDrag;
              setInternalDrag(nextDrag);
              return true;
            }}
            onSceneDragEnd={() => {
              internalDragRef.current = null;
              setInternalDrag(null);
            }}
            onSceneDrop={dropInternalScene}
            onOpenDetail={(tool) => setPreviewToolId(tool.id)}
            onHowTo={(tool) => setPreviewToolId(tool.id)}
            onExperience={(tool) => setPreviewToolId(tool.id)}
            onEmptyAction={(scene) =>
              showToast(
                `「${scene.label}」暂无已发布工具，请到「配置办公场景」完成绑定`,
              )
            }
          />
        )}
      </div>

      <div
        className={cn(kind !== 'external' && 'hidden')}
        aria-hidden={kind !== 'external'}
        data-testid="portal-tool-ops-external"
      >
        <ExternalMarketFilters
          type={externalType}
          stats={externalStats}
          onTypeChange={(next) => {
            setExternalType(next);
            setSearch('');
            finishExternalDrag();
          }}
        />

        {!activeLayout && layoutLoading ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-14 text-center text-[13px] text-zinc-400">
            正在加载外部工具运营布局…
          </div>
        ) : externalType === 'all' ? (
          <>
            <section className="mb-7">
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">精选推荐</h2>
                <span className="text-[12px] text-[#86868b]">
                  {allOverseasFeatured.length + allDomesticFeatured.length}
                </span>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <ToolListPanel title="海外精选" subtitle="GLOBAL" count={allOverseasFeatured.length} tone="overseas">
                  <ToolDropGrid
                    items={allOverseasFeatured}
                    listId="overseasFeaturedIds"
                    dragEnabled={externalDragEnabled}
                    dragState={dragState}
                    dragPlacement={externalDragPlacement}
                    draggedCard={draggedExternalCard}
                    onPointerStart={prepareExternalPointerDrag}
                    emptyText="从下方海外工具拖入"
                    showHot
                    onOpen={(card) => setPreviewToolId(card.id)}
                  />
                </ToolListPanel>
                <ToolListPanel title="国内精选" subtitle="CHINA" count={allDomesticFeatured.length} tone="domestic">
                  <ToolDropGrid
                    items={allDomesticFeatured}
                    listId="domesticFeaturedIds"
                    dragEnabled={externalDragEnabled}
                    dragState={dragState}
                    dragPlacement={externalDragPlacement}
                    draggedCard={draggedExternalCard}
                    onPointerStart={prepareExternalPointerDrag}
                    emptyText="从下方国内工具拖入"
                    showHot
                    onOpen={(card) => setPreviewToolId(card.id)}
                  />
                </ToolListPanel>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">更多</h2>
                <span className="text-[12px] text-[#86868b]">
                  {allOverseasMore.length + allDomesticMore.length}
                </span>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <ToolListPanel title="海外工具" subtitle="MORE" count={allOverseasMore.length} tone="overseas">
                  <ToolDropGrid
                    items={visibleMore(allOverseasMore)}
                    listId="overseasMoreOrderIds"
                    dragEnabled={externalDragEnabled}
                    dragState={dragState}
                    dragPlacement={externalDragPlacement}
                    draggedCard={draggedExternalCard}
                    onPointerStart={prepareExternalPointerDrag}
                    emptyText={search.trim() ? '没有匹配的海外工具' : '暂无更多海外工具'}
                    dense
                    onOpen={(card) => setPreviewToolId(card.id)}
                  />
                </ToolListPanel>
                <ToolListPanel title="国内工具" subtitle="MORE" count={allDomesticMore.length} tone="domestic">
                  <ToolDropGrid
                    items={visibleMore(allDomesticMore)}
                    listId="domesticMoreOrderIds"
                    dragEnabled={externalDragEnabled}
                    dragState={dragState}
                    dragPlacement={externalDragPlacement}
                    draggedCard={draggedExternalCard}
                    onPointerStart={prepareExternalPointerDrag}
                    emptyText={search.trim() ? '没有匹配的国内工具' : '暂无更多国内工具'}
                    dense
                    onOpen={(card) => setPreviewToolId(card.id)}
                  />
                </ToolListPanel>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="mb-7">
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">精选推荐</h2>
                <span className="text-[12px] text-[#86868b]">
                  {categoryOverseasFeatured.length + categoryDomesticFeatured.length}
                </span>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <ToolListPanel title="海外精选" subtitle="GLOBAL" count={categoryOverseasFeatured.length} tone="overseas">
                  <ToolDropGrid
                    items={categoryOverseasFeatured}
                    listId={`category:${externalType}:overseas:featured`}
                    dragEnabled={externalDragEnabled}
                    dragState={dragState}
                    dragPlacement={externalDragPlacement}
                    draggedCard={draggedExternalCard}
                    onPointerStart={prepareExternalPointerDrag}
                    emptyText="从下方更多拖入海外工具"
                    showHot
                    onOpen={(card) => setPreviewToolId(card.id)}
                  />
                </ToolListPanel>
                <ToolListPanel title="国内精选" subtitle="CHINA" count={categoryDomesticFeatured.length} tone="domestic">
                  <ToolDropGrid
                    items={categoryDomesticFeatured}
                    listId={`category:${externalType}:domestic:featured`}
                    dragEnabled={externalDragEnabled}
                    dragState={dragState}
                    dragPlacement={externalDragPlacement}
                    draggedCard={draggedExternalCard}
                    onPointerStart={prepareExternalPointerDrag}
                    emptyText="从下方更多拖入国内工具"
                    showHot
                    onOpen={(card) => setPreviewToolId(card.id)}
                  />
                </ToolListPanel>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">更多</h2>
                <span className="text-[12px] text-[#86868b]">
                  {categoryOverseasMore.length + categoryDomesticMore.length}
                </span>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <ToolListPanel
                  title="海外工具"
                  subtitle="MORE"
                  count={categoryOverseasMore.length}
                  tone="overseas"
                >
                  <ToolDropGrid
                    items={visibleMore(categoryOverseasMore)}
                    listId={`category:${externalType}:overseas:more`}
                    dragEnabled={externalDragEnabled}
                    dragState={dragState}
                    dragPlacement={externalDragPlacement}
                    draggedCard={draggedExternalCard}
                    onPointerStart={prepareExternalPointerDrag}
                    emptyText={
                      search.trim() ? '没有匹配的海外工具' : '暂无更多海外工具'
                    }
                    dense
                    onOpen={(card) => setPreviewToolId(card.id)}
                  />
                </ToolListPanel>
                <ToolListPanel
                  title="国内工具"
                  subtitle="MORE"
                  count={categoryDomesticMore.length}
                  tone="domestic"
                >
                  <ToolDropGrid
                    items={visibleMore(categoryDomesticMore)}
                    listId={`category:${externalType}:domestic:more`}
                    dragEnabled={externalDragEnabled}
                    dragState={dragState}
                    dragPlacement={externalDragPlacement}
                    draggedCard={draggedExternalCard}
                    onPointerStart={prepareExternalPointerDrag}
                    emptyText={
                      search.trim() ? '没有匹配的国内工具' : '暂无更多国内工具'
                    }
                    dense
                    onOpen={(card) => setPreviewToolId(card.id)}
                  />
                </ToolListPanel>
              </div>
            </section>
          </>
        )}
      </div>

      {dragState && draggedExternalCard && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={externalDragPreviewRef}
              aria-hidden
              data-testid="external-tool-drag-preview"
              data-tool-drag-lifted="true"
              className="pointer-events-none fixed left-0 top-0 z-[120] max-w-[calc(100vw-1rem)] origin-top-left select-none will-change-transform"
              style={{
                width: externalDragPreviewMetricsRef.current.width,
                transform: dragPreviewTransform(externalDragPreviewPositionRef.current),
              }}
            >
              <div
                ref={externalDragPreviewLiftRef}
                className="origin-top-left transition-transform duration-150 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
                style={{
                  transform: dragPreviewLiftTransform(
                    externalDragPreviewPositionRef.current.rotation,
                    externalPointerDragRef.current?.reducedMotion,
                  ),
                }}
              >
                <MarketShelfCard
                  card={draggedExternalCard}
                  variant="compact"
                  enableCompare={false}
                  showTags={false}
                  interactionMode="preview"
                  onOpen={() => undefined}
                  showDefaultFooter={false}
                  className="border-black/5 bg-white shadow-[0_18px_42px_rgba(0,0,0,0.18),0_3px_10px_rgba(0,0,0,0.10)] ring-1 ring-black/5"
                />
              </div>
            </div>,
            document.body,
          )
        : null}

      {previewToolId ? (
        <MarketToolDetailModal
          toolId={previewToolId}
          interactionMode="preview"
          onClose={() => setPreviewToolId(null)}
        />
      ) : null}
    </div>
  );
}
