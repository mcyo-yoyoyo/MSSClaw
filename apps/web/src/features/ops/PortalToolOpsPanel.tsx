import {
  useEffect,
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
import { ShelfRankSelect } from '@/components/market/ShelfRankSelect';
import { MarketShelfCard } from '@/components/market/MarketShelfCard';
import { searchCapabilitiesByIntent } from '@/domain/capabilityIntentSearch';
import { listExternalCategoryRankedMore } from '@/domain/externalFeaturedOrder';
import {
  listVisibleExternalToolTypes,
  toolMatchesExternalTypeCatalog,
} from '@/domain/externalTaxonomyCatalog';
import {
  insertExternalToolIdBefore,
  mergeExternalToolLayoutVisibleAndParkedIds,
  orderExternalToolsByLayoutIds,
  type ExternalToolLayoutAllListKey,
  type ExternalToolCategoryListKey,
  type ExternalToolLayoutDocument,
} from '@/domain/externalToolLayout';
import type { ExternalToolTypeId } from '@/domain/externalToolTaxonomy';
import {
  listMarketToolCards,
  listUnlistedExternalToolCards,
  type MarketShelfCard as MarketShelfCardModel,
} from '@/domain/marketShelf';
import { emptyOrgPerspectiveSelection } from '@/domain/orgAxisTags';
import { MarketToolDetailModal } from '@/features/market/MarketToolDetailModal';
import { cn } from '@/lib/utils';
import {
  defaultRankDirection,
  SHELF_RANK_TABS,
  sortByRankMode,
  type ContentEngagement,
  type RankDirection,
  type RankMode,
} from '@/domain/contentEngagement';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { useExternalTaxonomyCatalogStore } from '@/stores/externalTaxonomyCatalogStore';
import { useExternalToolLayoutStore } from '@/stores/externalToolLayoutStore';
import { useInternalOfficeSceneCatalogStore } from '@/stores/internalOfficeSceneCatalogStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePlazaToolGuideStore } from '@/stores/plazaToolGuideStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

type ToolOpsKind = 'internal' | 'external';
type ExternalListMode = 'listed' | 'unlisted';
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

type InternalSceneDragState = {
  sceneId: string;
  revision: number;
  visibleIds: string[];
  workspaceId: string;
};

type DragPreviewPosition = {
  x: number;
  y: number;
};

const EXTERNAL_DRAG_PREVIEW_WIDTH = 288;
const EXTERNAL_DRAG_PREVIEW_HEIGHT = 136;
const EXTERNAL_DRAG_PREVIEW_GAP = 14;
const EXTERNAL_DRAG_PREVIEW_EDGE = 8;

function resolveDragPreviewPosition(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
): DragPreviewPosition {
  const placeRight =
    clientX + EXTERNAL_DRAG_PREVIEW_GAP + EXTERNAL_DRAG_PREVIEW_WIDTH <=
    viewportWidth - EXTERNAL_DRAG_PREVIEW_EDGE;
  const placeBelow =
    clientY + EXTERNAL_DRAG_PREVIEW_GAP + EXTERNAL_DRAG_PREVIEW_HEIGHT <=
    viewportHeight - EXTERNAL_DRAG_PREVIEW_EDGE;
  const x = placeRight
    ? clientX + EXTERNAL_DRAG_PREVIEW_GAP
    : clientX - EXTERNAL_DRAG_PREVIEW_WIDTH - EXTERNAL_DRAG_PREVIEW_GAP;
  const y = placeBelow
    ? clientY + EXTERNAL_DRAG_PREVIEW_GAP
    : clientY - EXTERNAL_DRAG_PREVIEW_HEIGHT - EXTERNAL_DRAG_PREVIEW_GAP;

  return {
    x: Math.max(EXTERNAL_DRAG_PREVIEW_EDGE, x),
    y: Math.max(EXTERNAL_DRAG_PREVIEW_EDGE, y),
  };
}

function dragPreviewTransform(position: DragPreviewPosition): string {
  return `translate3d(${position.x}px, ${position.y}px, 0) rotate(1deg) scale(0.98)`;
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

function sortExternalByEngagement(
  cards: readonly MarketShelfCardModel[],
  rankMode: RankMode,
  getEngagement: (id: string) => ContentEngagement,
  direction: RankDirection,
): MarketShelfCardModel[] {
  if (rankMode === 'excel_order') {
    return direction === 'desc' ? [...cards].reverse() : [...cards];
  }
  return sortByRankMode([...cards], rankMode, getEngagement, direction);
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

function ToolDropGrid({
  items,
  listId,
  sortable,
  featured,
  actionEnabled,
  dragState,
  onPointerStart,
  onAddToFeatured,
  onRemoveFromFeatured,
  savingUnlistingIds,
  onUnlist,
  emptyText,
  showHot = false,
  dense = false,
  onOpen,
}: {
  items: MarketShelfCardModel[];
  listId: LayoutListId;
  sortable: boolean;
  featured: boolean;
  actionEnabled: boolean;
  dragState: DragState | null;
  onPointerStart: (
    drag: DragState,
    pointerId: number,
    startX: number,
    startY: number,
  ) => void;
  onAddToFeatured: (card: MarketShelfCardModel, listId: LayoutListId) => void;
  onRemoveFromFeatured: (card: MarketShelfCardModel, listId: LayoutListId) => void;
  savingUnlistingIds: ReadonlySet<string>;
  onUnlist: (card: MarketShelfCardModel) => void | Promise<void>;
  emptyText: string;
  showHot?: boolean;
  dense?: boolean;
  onOpen: (card: MarketShelfCardModel) => void;
}) {
  const showDropTarget = sortable && dragState?.source === listId;
  const gridClass = dense
    ? 'grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3'
    : 'grid grid-cols-1 gap-2 sm:grid-cols-2';

  return (
    <div
      className={cn(
        'min-h-24 rounded-2xl transition',
        showDropTarget && 'bg-sky-50/30 outline outline-1 outline-dashed outline-sky-200/80',
      )}
      data-layout-list={listId}
    >
      {items.length ? (
        <div className={gridClass}>
          {items.map((card) => {
            const region = card.region === 'domestic' ? 'domestic' : 'overseas';
            const dragging = dragState?.cardId === card.id && dragState.source === listId;
            const unlistingSaving = savingUnlistingIds.has(card.id);
            return (
              <div
                key={card.id}
                data-layout-card-id={card.id}
                className={cn(
                  'relative min-w-0 rounded-2xl transition',
                  dragging && 'opacity-35',
                )}
              >
                <MarketShelfCard
                  card={card}
                  variant="compact"
                  showHot={showHot}
                  enableCompare={false}
                  interactionMode="preview"
                  onOpen={() => onOpen(card)}
                  showDefaultFooter
                  showEngagementOnly
                  footerActions={
                    <div className="space-y-1.5 border-t border-zinc-100 pt-2">
                      <div className="flex items-center gap-1">
                        {sortable ? (
                          <span
                            data-tool-drag-handle
                            role="button"
                            tabIndex={0}
                            aria-label={`拖动${card.title}调整顺序`}
                            title="按住拖动调整当前列表顺序"
                            className="inline-flex touch-none select-none items-center gap-1 rounded-lg border border-zinc-200 bg-white px-1.5 py-1 text-[10px] font-semibold text-zinc-600 cursor-grab active:cursor-grabbing"
                            onPointerDown={(event) => {
                              if (!event.isPrimary || event.button !== 0) return;
                              event.preventDefault();
                              event.stopPropagation();
                              onPointerStart(
                                { cardId: card.id, source: listId, region },
                                event.pointerId,
                                event.clientX,
                                event.clientY,
                              );
                            }}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                          >
                            <i className="fa-solid fa-grip-vertical" />
                            排序
                          </span>
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          disabled={unlistingSaving}
                          data-tool-listing-action={`unlist-${unlistingSaving ? 'saving' : 'direct'}`}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void onUnlist(card);
                          }}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-lg border px-1.5 py-1 text-[10px] font-semibold transition',
                            unlistingSaving
                              ? 'cursor-not-allowed border-amber-100 bg-amber-50 text-amber-400'
                              : 'border-amber-200 bg-white text-amber-700 hover:bg-amber-50',
                          )}
                        >
                          <i
                            className={cn(
                              'fa-solid',
                              unlistingSaving ? 'fa-spinner fa-spin' : 'fa-arrow-down',
                            )}
                          />
                          {unlistingSaving ? '下架中' : '下架'}
                        </button>
                        <button
                          type="button"
                          disabled={!actionEnabled}
                          data-tool-featured-action={featured ? 'remove' : 'add'}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (featured) onRemoveFromFeatured(card, listId);
                            else onAddToFeatured(card, listId);
                          }}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-lg border px-1.5 py-1 text-[10px] font-semibold transition',
                            actionEnabled
                              ? featured
                                ? 'border-red-200 bg-white text-red-600 hover:bg-red-50'
                                : 'border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800'
                              : 'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300',
                          )}
                        >
                          <i className={featured ? 'fa-solid fa-minus' : 'fa-solid fa-plus'} />
                          {featured ? '移出精选' : '加入精选'}
                        </button>
                      </div>
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

function ExternalListingTabs({
  mode,
  listedCount,
  unlistedCount,
  onChange,
}: {
  mode: ExternalListMode;
  listedCount: number;
  unlistedCount: number;
  onChange: (mode: ExternalListMode) => void;
}) {
  return (
    <div
      className="mb-3 inline-flex items-center gap-1 rounded-xl bg-zinc-100 p-1"
      role="tablist"
      aria-label="外部工具上下架状态"
    >
      {(
        [
          { id: 'listed' as const, label: '更多', count: listedCount },
          { id: 'unlisted' as const, label: '未上架', count: unlistedCount },
        ] as const
      ).map((item) => {
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            data-external-list-mode={item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition',
              active
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-500 hover:bg-white hover:text-zinc-800',
            )}
          >
            {item.label}
            <span
              className={cn(
                'font-normal tabular-nums',
                active ? 'text-white/70' : 'text-zinc-400',
              )}
            >
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function UnlistedToolGrid({
  items,
  savingListingIds,
  onList,
  onOpen,
  emptyText,
}: {
  items: MarketShelfCardModel[];
  savingListingIds: ReadonlySet<string>;
  onList: (card: MarketShelfCardModel) => void | Promise<void>;
  onOpen: (card: MarketShelfCardModel) => void;
  emptyText: string;
}) {
  return items.length ? (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((card) => {
        const saving = savingListingIds.has(card.id);
        return (
          <div key={card.id} data-unlisted-tool-id={card.id} className="min-w-0">
            <MarketShelfCard
              card={card}
              variant="compact"
              enableCompare={false}
              interactionMode="preview"
              onOpen={() => onOpen(card)}
              showDefaultFooter
              showEngagementOnly
              footerActions={
                <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700">
                    <i className={cn('fa-solid', saving ? 'fa-spinner fa-spin' : 'fa-circle')} />
                    {saving ? '上架中' : '未上架'}
                  </span>
                  <button
                    type="button"
                    disabled={saving}
                    data-tool-listing-action={`list-${saving ? 'saving' : 'direct'}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void onList(card);
                    }}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-semibold transition',
                      saving
                        ? 'cursor-not-allowed border-amber-100 bg-amber-50 text-amber-400'
                        : 'border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800',
                    )}
                  >
                    <i className={cn('fa-solid', saving ? 'fa-spinner fa-spin' : 'fa-arrow-up')} />
                    {saving ? '上架中' : '上架'}
                  </button>
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
  const setCategoryList = useExternalToolLayoutStore((state) => state.setCategoryList);
  const clearLayoutError = useExternalToolLayoutStore((state) => state.clearError);

  const internalLoaded = useInternalOfficeSceneCatalogStore((state) => state.loaded);
  const internalSceneCount = useInternalOfficeSceneCatalogStore(
    (state) => state.entries.filter((entry) => entry.visible !== false).length,
  );
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
  const [externalListMode, setExternalListMode] = useState<ExternalListMode>('listed');
  const [externalRankMode, setExternalRankMode] = useState<RankMode>('excel_order');
  const [externalRankDirection, setExternalRankDirection] = useState<RankDirection>('asc');
  const [previewToolId, setPreviewToolId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const externalDragSurfaceRef = useRef<HTMLDivElement | null>(null);
  const externalDragPreviewRef = useRef<HTMLDivElement | null>(null);
  const externalDragPreviewPositionRef = useRef<DragPreviewPosition>({
    x: 0,
    y: 0,
  });
  const externalPointerDragRef = useRef<{
    pointerId: number;
    drag: DragState;
    startX: number;
    startY: number;
    workspaceId: string;
    moved: boolean;
  } | null>(null);
  const [internalDrag, setInternalDrag] = useState<InternalSceneDragState | null>(null);
  const internalDragRef = useRef<InternalSceneDragState | null>(null);
  const [savingToolUnlistingIds, setSavingToolUnlistingIds] = useState<Set<string>>(
    () => new Set(),
  );
  const savingToolUnlistingIdsRef = useRef<Set<string>>(new Set());
  const [savingToolListingIds, setSavingToolListingIds] = useState<Set<string>>(
    () => new Set(),
  );
  const savingToolListingIdsRef = useRef<Set<string>>(new Set());

  const handleExternalRankModeChange = (next: RankMode) => {
    setExternalRankMode(next);
    setExternalRankDirection(defaultRankDirection(next));
  };

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
    externalDragPreviewRef.current = null;
    externalDragPreviewPositionRef.current = { x: 0, y: 0 };
    externalPointerDragRef.current = null;
    setInternalDrag(null);
    internalDragRef.current = null;
    setExternalListMode('listed');
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

  const unlistedExternalCards = useMemo(
    () =>
      sortBySourceOrder(
        listUnlistedExternalToolCards(
          tools,
          viewer,
          getEngagement,
          howtoToolIds,
        ).map((card) => ({
          ...card,
          sourceOrder: card.externalSortOrder,
        })),
      ),
    [tools, viewer, getEngagement, engagementById, howtoToolIds],
  );

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
  const externalDragByOrder =
    externalDragEnabled &&
    externalRankMode === 'excel_order' &&
    externalRankDirection === 'asc';

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
  const categoryOverseasMoreOrderIds =
    externalType === 'all'
      ? []
      : activeLayout?.categories[externalType]?.overseasMoreOrderIds ?? [];
  const categoryDomesticMoreOrderIds =
    externalType === 'all'
      ? []
      : activeLayout?.categories[externalType]?.domesticMoreOrderIds ?? [];
  const categoryOverseasFeatured = selectCardsByIds(
    overseasCards,
    categoryOverseasFeaturedIds,
  );
  const categoryDomesticFeatured = selectCardsByIds(
    domesticCards,
    categoryDomesticFeaturedIds,
  );
  const categoryRankedMore =
    externalType === 'all' || !activeLayout
      ? []
      : listExternalCategoryRankedMore(externalCards, externalType, [
          ...categoryOverseasFeaturedIds,
          ...categoryDomesticFeaturedIds,
        ]);
  const categoryOverseasMore = orderExternalToolsByLayoutIds(
    categoryRankedMore.filter((card) => card.region === 'overseas'),
    categoryOverseasMoreOrderIds,
  );
  const categoryDomesticMore = orderExternalToolsByLayoutIds(
    categoryRankedMore.filter((card) => card.region === 'domestic'),
    categoryDomesticMoreOrderIds,
  );

  const sortByExternalRank = (cards: MarketShelfCardModel[]) =>
    sortExternalByEngagement(cards, externalRankMode, getEngagement, externalRankDirection);

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

  const visibleAllOverseasFeatured = sortByExternalRank(visibleMore(allOverseasFeatured));
  const visibleAllDomesticFeatured = sortByExternalRank(visibleMore(allDomesticFeatured));
  const visibleCategoryOverseasFeatured = sortByExternalRank(
    visibleMore(categoryOverseasFeatured),
  );
  const visibleCategoryDomesticFeatured = sortByExternalRank(
    visibleMore(categoryDomesticFeatured),
  );
  const visibleAllOverseasMore = sortByExternalRank(visibleMore(allOverseasMore));
  const visibleAllDomesticMore = sortByExternalRank(visibleMore(allDomesticMore));
  const visibleCategoryOverseasMore = sortByExternalRank(
    visibleMore(categoryOverseasMore),
  );
  const visibleCategoryDomesticMore = sortByExternalRank(
    visibleMore(categoryDomesticMore),
  );

  const typeMatchedUnlistedCards = useMemo(
    () =>
      externalType === 'all'
        ? unlistedExternalCards
        : unlistedExternalCards.filter((card) =>
            toolMatchesExternalTypeCatalog(
              card.toolTypeIds?.length ? card.toolTypeIds : card.toolTypeId,
              externalType,
              externalTaxonomy,
            ),
          ),
    [externalTaxonomy, externalType, unlistedExternalCards],
  );
  const unlistedSearchIds = useMemo(() => {
    if (!search.trim()) return null;
    return new Set(
      searchCapabilitiesByIntent(
        search,
        typeMatchedUnlistedCards,
        typeMatchedUnlistedCards.length,
      ).map((match) => match.card.id),
    );
  }, [search, typeMatchedUnlistedCards]);
  const visibleUnlistedCards = sortByExternalRank(
    unlistedSearchIds
      ? typeMatchedUnlistedCards.filter((card) => unlistedSearchIds.has(card.id))
      : typeMatchedUnlistedCards,
  );
  const unlistedOverseasCards = visibleUnlistedCards.filter(
    (card) => card.region === 'overseas',
  );
  const unlistedDomesticCards = visibleUnlistedCards.filter(
    (card) => card.region === 'domestic',
  );
  const unlistedOverseasCount = typeMatchedUnlistedCards.filter(
    (card) => card.region === 'overseas',
  ).length;
  const unlistedDomesticCount = typeMatchedUnlistedCards.filter(
    (card) => card.region === 'domestic',
  ).length;

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

  const writeCategoryList = (
    key: ExternalToolCategoryListKey,
    visibleIds: string[],
  ) => {
    if (externalType === 'all') return;
    const availableIds = key.startsWith('overseas')
      ? overseasAvailableIds
      : domesticAvailableIds;
    const configuredIds = activeLayout?.categories[externalType]?.[key] ?? [];
    setCategoryList(
      externalType,
      mergeExternalToolLayoutVisibleAndParkedIds(
        visibleIds,
        configuredIds,
        availableIds,
      ),
      key,
    );
  };

  const dropAll = (
    drag: DragState,
    target: ExternalToolLayoutAllListKey,
    beforeId: string | null,
  ): boolean => {
    if (!isAllListKey(drag.source) || target !== drag.source) return false;
    if (listRegion(target) !== drag.region) return false;
    if (search.trim() && !isFeaturedList(target)) return false;

    writeAllList(
      target,
      insertExternalToolIdBefore(visibleAllLists[target], drag.cardId, beforeId),
    );
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
    if (drag.source !== target || (target !== featuredList && target !== moreList)) return false;
    const isMore = target === moreList;
    if (isMore && search.trim()) return false;
    const key: ExternalToolCategoryListKey =
      drag.region === 'overseas'
        ? isMore
          ? 'overseasMoreOrderIds'
          : 'overseasFeaturedIds'
        : isMore
          ? 'domesticMoreOrderIds'
          : 'domesticFeaturedIds';
    const cards =
      drag.region === 'overseas'
        ? isMore
          ? categoryOverseasMore
          : categoryOverseasFeatured
        : isMore
          ? categoryDomesticMore
          : categoryDomesticFeatured;
    const next = insertExternalToolIdBefore(
      cards.map((card) => card.id),
      drag.cardId,
      beforeId,
    );
    writeCategoryList(key, next);
    return true;
  };

  const persistExternalLayoutChange = async (
    mutate: () => boolean,
    successMessage: string,
    expectedWorkspaceId: string,
  ): Promise<boolean> => {
    const liveLayoutState = useExternalToolLayoutStore.getState();
    if (
      liveLayoutState.loading ||
      liveLayoutState.saving ||
      !liveLayoutState.document ||
      liveLayoutState.workspaceId !== expectedWorkspaceId
    ) {
      return false;
    }
    if (!mutate()) return false;

    const saved = await saveLayoutDraft();
    if (saved) {
      if (useExternalToolLayoutStore.getState().workspaceId === expectedWorkspaceId) {
        showToast(successMessage);
      }
      return true;
    }

    const failedState = useExternalToolLayoutStore.getState();
    if (failedState.workspaceId !== expectedWorkspaceId) return false;
    const message = failedState.error ?? '外部工具布局保存失败';
    cancelLayoutEdit();
    await hydrateLayout(expectedWorkspaceId);
    showToast(`${message} 已恢复服务器中的布局。`);
    return false;
  };

  const changeAllFeaturedMembership = (
    card: MarketShelfCardModel,
    listId: LayoutListId,
    add: boolean,
  ): boolean => {
    const featuredKey: ExternalToolLayoutAllListKey =
      card.region === 'domestic' ? 'domesticFeaturedIds' : 'overseasFeaturedIds';
    const moreKey: ExternalToolLayoutAllListKey =
      card.region === 'domestic' ? 'domesticMoreOrderIds' : 'overseasMoreOrderIds';
    const expectedSource = add ? moreKey : featuredKey;
    if (listId !== expectedSource) return false;

    const featuredIds = visibleAllLists[featuredKey];
    const moreIds = visibleAllLists[moreKey];
    if (add) {
      if (!moreIds.includes(card.id) || featuredIds.includes(card.id)) return false;
      writeAllList(moreKey, moreIds.filter((id) => id !== card.id));
      writeAllList(featuredKey, [...featuredIds, card.id]);
      return true;
    }
    if (!featuredIds.includes(card.id)) return false;
    writeAllList(featuredKey, featuredIds.filter((id) => id !== card.id));
    writeAllList(moreKey, [...moreIds.filter((id) => id !== card.id), card.id]);
    return true;
  };

  const changeCategoryFeaturedMembership = (
    card: MarketShelfCardModel,
    listId: LayoutListId,
    add: boolean,
  ): boolean => {
    if (externalType === 'all') return false;
    const region: ExternalRegion = card.region === 'domestic' ? 'domestic' : 'overseas';
    const expectedSource = `category:${externalType}:${region}:${add ? 'more' : 'featured'}`;
    if (listId !== expectedSource) return false;

    const featuredKey: ExternalToolCategoryListKey =
      region === 'overseas' ? 'overseasFeaturedIds' : 'domesticFeaturedIds';
    const moreKey: ExternalToolCategoryListKey =
      region === 'overseas' ? 'overseasMoreOrderIds' : 'domesticMoreOrderIds';
    const featuredCards =
      region === 'overseas' ? categoryOverseasFeatured : categoryDomesticFeatured;
    const moreCards = region === 'overseas' ? categoryOverseasMore : categoryDomesticMore;
    const featuredIds = featuredCards.map((item) => item.id);
    const moreIds = moreCards.map((item) => item.id);
    if (add) {
      if (!moreIds.includes(card.id) || featuredIds.includes(card.id)) return false;
      writeCategoryList(moreKey, moreIds.filter((id) => id !== card.id));
      writeCategoryList(featuredKey, [...featuredIds, card.id]);
      return true;
    }
    if (!featuredIds.includes(card.id)) return false;
    writeCategoryList(featuredKey, featuredIds.filter((id) => id !== card.id));
    writeCategoryList(moreKey, [...moreIds.filter((id) => id !== card.id), card.id]);
    return true;
  };

  const changeFeaturedMembership = (
    card: MarketShelfCardModel,
    listId: LayoutListId,
    add: boolean,
  ) => {
    const expectedWorkspaceId = useExternalToolLayoutStore.getState().workspaceId;
    if (!expectedWorkspaceId) return;
    void persistExternalLayoutChange(
      () =>
        externalType === 'all'
          ? changeAllFeaturedMembership(card, listId, add)
          : changeCategoryFeaturedMembership(card, listId, add),
      `${card.title} 已${add ? '加入' : '移出'}精选`,
      expectedWorkspaceId,
    );
  };
  const addToFeatured = (card: MarketShelfCardModel, listId: LayoutListId) =>
    changeFeaturedMembership(card, listId, true);
  const removeFromFeatured = (card: MarketShelfCardModel, listId: LayoutListId) =>
    changeFeaturedMembership(card, listId, false);

  const listTool = async (card: MarketShelfCardModel) => {
    if (savingToolListingIdsRef.current.has(card.id)) return;

    const marketplace = useMarketplaceStore.getState();
    const tool = marketplace.tools.find((item) => item.id === card.id);
    if (!tool) {
      showToast(`未找到工具「${card.title}」，请刷新后重试`);
      return;
    }
    if (tool.published) {
      showToast(`「${card.title}」已经上架`);
      return;
    }

    savingToolListingIdsRef.current = new Set(savingToolListingIdsRef.current).add(card.id);
    setSavingToolListingIds(savingToolListingIdsRef.current);
    try {
      const result = await marketplace.saveToolNow({ ...tool, published: true });
      showToast(
        result.synced
          ? `「${card.title}」已上架并保存`
          : `「${card.title}」上架保存失败，请稍后重试`,
      );
    } catch {
      showToast(`「${card.title}」上架保存失败，请稍后重试`);
    } finally {
      const next = new Set(savingToolListingIdsRef.current);
      next.delete(card.id);
      savingToolListingIdsRef.current = next;
      setSavingToolListingIds(next);
    }
  };

  const unlistTool = async (card: MarketShelfCardModel) => {
    if (savingToolUnlistingIdsRef.current.has(card.id)) return;

    const marketplace = useMarketplaceStore.getState();
    const tool = marketplace.tools.find((item) => item.id === card.id);
    if (!tool) {
      showToast(`未找到工具「${card.title}」，请刷新后重试`);
      return;
    }
    if (!tool.published) {
      showToast(`「${card.title}」已经下架`);
      return;
    }

    savingToolUnlistingIdsRef.current = new Set(savingToolUnlistingIdsRef.current).add(card.id);
    setSavingToolUnlistingIds(savingToolUnlistingIdsRef.current);
    try {
      const result = await marketplace.saveToolNow({ ...tool, published: false });
      showToast(
        result.synced
          ? `「${card.title}」已下架并保存`
          : `「${card.title}」下架保存失败，请稍后重试`,
      );
    } catch {
      showToast(`「${card.title}」下架保存失败，请稍后重试`);
    } finally {
      const next = new Set(savingToolUnlistingIdsRef.current);
      next.delete(card.id);
      savingToolUnlistingIdsRef.current = next;
      setSavingToolUnlistingIds(next);
    }
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
    const next = resolveDragPreviewPosition(
      clientX,
      clientY,
      view?.innerWidth ?? clientX + EXTERNAL_DRAG_PREVIEW_WIDTH,
      view?.innerHeight ?? clientY + EXTERNAL_DRAG_PREVIEW_HEIGHT,
    );
    externalDragPreviewPositionRef.current = next;
    if (externalDragPreviewRef.current) {
      externalDragPreviewRef.current.style.transform = dragPreviewTransform(next);
    }
  };

  const prepareExternalPointerDrag = (
    drag: DragState,
    pointerId: number,
    startX: number,
    startY: number,
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
    externalPointerDragRef.current = {
      pointerId,
      drag,
      startX,
      startY,
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
    externalDragPreviewRef.current = null;
    externalDragPreviewPositionRef.current = { x: 0, y: 0 };
    setDragState(null);
  };

  const commitExternalDrop = async (
    drag: DragState,
    target: LayoutListId,
    beforeId: string | null,
    expectedWorkspaceId: string,
  ) => {
    await persistExternalLayoutChange(
      () =>
        externalType === 'all' && isAllListKey(target)
          ? dropAll(drag, target, beforeId)
          : externalType !== 'all'
            ? dropCategory(drag, target, beforeId)
            : false,
      '外部工具顺序已自动保存',
      expectedWorkspaceId,
    );
  };

  const handleExternalPointerDrop = (
    drag: DragState,
    eventTarget: Element | null,
    expectedWorkspaceId: string,
  ) => {
    if (!externalDragEnabled) {
      finishExternalDrag();
      return;
    }
    const listElement = eventTarget?.closest<HTMLElement>('[data-layout-list]') ?? null;
    const cardElement =
      eventTarget?.closest<HTMLElement>('[data-layout-card-id]') ?? null;
    const candidate =
      (listElement?.dataset.layoutList as LayoutListId | undefined) ?? null;
    const target = candidate === drag.source ? candidate : null;
    const beforeId =
      target && listElement && cardElement && listElement.contains(cardElement)
        ? cardElement.dataset.layoutCardId ?? null
        : null;
    finishExternalDrag();
    if (target) void commitExternalDrop(drag, target, beforeId, expectedWorkspaceId);
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
    if (!moved) {
      finishExternalDrag();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    handleExternalPointerDrop(
      pointer.drag,
      event.currentTarget.ownerDocument.elementFromPoint(event.clientX, event.clientY),
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
    setExternalListMode('listed');
    setPreviewToolId(null);
    finishExternalDrag();
    setInternalDrag(null);
    internalDragRef.current = null;
  };

  const unlistedRegionPanels = (
    <div className="grid gap-4 lg:grid-cols-2" data-testid="unlisted-external-tools">
      <ToolListPanel
        title="海外工具"
        subtitle="UNLISTED"
        count={unlistedOverseasCount}
        tone="overseas"
      >
        <UnlistedToolGrid
          items={unlistedOverseasCards}
          savingListingIds={savingToolListingIds}
          onList={listTool}
          onOpen={(card) => setPreviewToolId(card.id)}
          emptyText={search.trim() ? '没有匹配的未上架海外工具' : '暂无未上架海外工具'}
        />
      </ToolListPanel>
      <ToolListPanel
        title="国内工具"
        subtitle="UNLISTED"
        count={unlistedDomesticCount}
        tone="domestic"
      >
        <UnlistedToolGrid
          items={unlistedDomesticCards}
          savingListingIds={savingToolListingIds}
          onList={listTool}
          onOpen={(card) => setPreviewToolId(card.id)}
          emptyText={search.trim() ? '没有匹配的未上架国内工具' : '暂无未上架国内工具'}
        />
      </ToolListPanel>
    </div>
  );

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
          <div
            className="inline-flex w-fit rounded-xl bg-zinc-100 p-1"
            role="tablist"
            aria-label="工具运营分类"
          >
            {(
              [
                { id: 'external' as const, label: '外部工具', count: externalCards.length },
                {
                  id: 'internal' as const,
                  label: '办公场景',
                  count: internalSceneCount,
                },
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
                type="search"
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
            已上架工具可加入或移出精选并自动保存，也可拖动手柄调整排序；卡片可直接上下架并保存，无需审批。
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
                `「${scene.label}」暂无已上架工具，请到「配置办公场景」完成绑定`,
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
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-[17px] font-semibold text-[#1d1d1f]">精选推荐</h2>
                  <span className="text-[12px] text-[#86868b]">
                    {visibleAllOverseasFeatured.length + visibleAllDomesticFeatured.length}
                  </span>
                </div>
                <ShelfRankSelect
                  value={externalRankMode}
                  onChange={handleExternalRankModeChange}
                  options={SHELF_RANK_TABS}
                  direction={externalRankDirection}
                  onDirectionChange={setExternalRankDirection}
                  className="shrink-0"
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <ToolListPanel title="海外精选" subtitle="GLOBAL" count={visibleAllOverseasFeatured.length} tone="overseas">
                  <ToolDropGrid
                    items={visibleAllOverseasFeatured}
                    listId="overseasFeaturedIds"
                    sortable={externalDragByOrder}
                    featured
                    actionEnabled={externalDragEnabled}
                    dragState={dragState}
                    onPointerStart={prepareExternalPointerDrag}
                    onAddToFeatured={addToFeatured}
                    onRemoveFromFeatured={removeFromFeatured}
                    savingUnlistingIds={savingToolUnlistingIds}
                    onUnlist={unlistTool}
                    emptyText={search.trim() ? '没有匹配的海外精选' : '暂无海外精选'}
                    showHot
                    onOpen={(card) => setPreviewToolId(card.id)}
                  />
                </ToolListPanel>
                <ToolListPanel title="国内精选" subtitle="CHINA" count={visibleAllDomesticFeatured.length} tone="domestic">
                  <ToolDropGrid
                    items={visibleAllDomesticFeatured}
                    listId="domesticFeaturedIds"
                    sortable={externalDragByOrder}
                    featured
                    actionEnabled={externalDragEnabled}
                    dragState={dragState}
                    onPointerStart={prepareExternalPointerDrag}
                    onAddToFeatured={addToFeatured}
                    onRemoveFromFeatured={removeFromFeatured}
                    savingUnlistingIds={savingToolUnlistingIds}
                    onUnlist={unlistTool}
                    emptyText={search.trim() ? '没有匹配的国内精选' : '暂无国内精选'}
                    showHot
                    onOpen={(card) => setPreviewToolId(card.id)}
                  />
                </ToolListPanel>
              </div>
            </section>

            <section>
              <ExternalListingTabs
                mode={externalListMode}
                listedCount={allOverseasMore.length + allDomesticMore.length}
                unlistedCount={typeMatchedUnlistedCards.length}
                onChange={setExternalListMode}
              />
              {externalListMode === 'listed' ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <ToolListPanel title="海外工具" subtitle="MORE" count={allOverseasMore.length} tone="overseas">
                    <ToolDropGrid
                      items={visibleAllOverseasMore}
                      listId="overseasMoreOrderIds"
                      sortable={externalDragByOrder && !search.trim()}
                      featured={false}
                      actionEnabled={externalDragEnabled}
                      dragState={dragState}
                      onPointerStart={prepareExternalPointerDrag}
                      onAddToFeatured={addToFeatured}
                      onRemoveFromFeatured={removeFromFeatured}
                      savingUnlistingIds={savingToolUnlistingIds}
                      onUnlist={unlistTool}
                      emptyText={search.trim() ? '没有匹配的海外工具' : '暂无更多海外工具'}
                      dense
                      onOpen={(card) => setPreviewToolId(card.id)}
                    />
                  </ToolListPanel>
                  <ToolListPanel title="国内工具" subtitle="MORE" count={allDomesticMore.length} tone="domestic">
                    <ToolDropGrid
                      items={visibleAllDomesticMore}
                      listId="domesticMoreOrderIds"
                      sortable={externalDragByOrder && !search.trim()}
                      featured={false}
                      actionEnabled={externalDragEnabled}
                      dragState={dragState}
                      onPointerStart={prepareExternalPointerDrag}
                      onAddToFeatured={addToFeatured}
                      onRemoveFromFeatured={removeFromFeatured}
                      savingUnlistingIds={savingToolUnlistingIds}
                      onUnlist={unlistTool}
                      emptyText={search.trim() ? '没有匹配的国内工具' : '暂无更多国内工具'}
                      dense
                      onOpen={(card) => setPreviewToolId(card.id)}
                    />
                  </ToolListPanel>
                </div>
              ) : (
                unlistedRegionPanels
              )}
            </section>
          </>
        ) : (
          <>
            <section className="mb-7">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-[17px] font-semibold text-[#1d1d1f]">精选推荐</h2>
                  <span className="text-[12px] text-[#86868b]">
                    {visibleCategoryOverseasFeatured.length + visibleCategoryDomesticFeatured.length}
                  </span>
                </div>
                <ShelfRankSelect
                  value={externalRankMode}
                  onChange={handleExternalRankModeChange}
                  options={SHELF_RANK_TABS}
                  direction={externalRankDirection}
                  onDirectionChange={setExternalRankDirection}
                  className="shrink-0"
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <ToolListPanel title="海外精选" subtitle="GLOBAL" count={visibleCategoryOverseasFeatured.length} tone="overseas">
                  <ToolDropGrid
                    items={visibleCategoryOverseasFeatured}
                    listId={`category:${externalType}:overseas:featured`}
                    sortable={externalDragByOrder}
                    featured
                    actionEnabled={externalDragEnabled}
                    dragState={dragState}
                    onPointerStart={prepareExternalPointerDrag}
                    onAddToFeatured={addToFeatured}
                    onRemoveFromFeatured={removeFromFeatured}
                    savingUnlistingIds={savingToolUnlistingIds}
                    onUnlist={unlistTool}
                    emptyText={search.trim() ? '没有匹配的海外精选' : '暂无海外精选'}
                    showHot
                    onOpen={(card) => setPreviewToolId(card.id)}
                  />
                </ToolListPanel>
                <ToolListPanel title="国内精选" subtitle="CHINA" count={visibleCategoryDomesticFeatured.length} tone="domestic">
                  <ToolDropGrid
                    items={visibleCategoryDomesticFeatured}
                    listId={`category:${externalType}:domestic:featured`}
                    sortable={externalDragByOrder}
                    featured
                    actionEnabled={externalDragEnabled}
                    dragState={dragState}
                    onPointerStart={prepareExternalPointerDrag}
                    onAddToFeatured={addToFeatured}
                    onRemoveFromFeatured={removeFromFeatured}
                    savingUnlistingIds={savingToolUnlistingIds}
                    onUnlist={unlistTool}
                    emptyText={search.trim() ? '没有匹配的国内精选' : '暂无国内精选'}
                    showHot
                    onOpen={(card) => setPreviewToolId(card.id)}
                  />
                </ToolListPanel>
              </div>
            </section>

            <section>
              <ExternalListingTabs
                mode={externalListMode}
                listedCount={categoryOverseasMore.length + categoryDomesticMore.length}
                unlistedCount={typeMatchedUnlistedCards.length}
                onChange={setExternalListMode}
              />
              {externalListMode === 'listed' ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <ToolListPanel
                    title="海外工具"
                    subtitle="MORE"
                    count={categoryOverseasMore.length}
                    tone="overseas"
                  >
                    <ToolDropGrid
                      items={visibleCategoryOverseasMore}
                      listId={`category:${externalType}:overseas:more`}
                      sortable={externalDragByOrder && !search.trim()}
                      featured={false}
                      actionEnabled={externalDragEnabled}
                      dragState={dragState}
                      onPointerStart={prepareExternalPointerDrag}
                      onAddToFeatured={addToFeatured}
                      onRemoveFromFeatured={removeFromFeatured}
                      savingUnlistingIds={savingToolUnlistingIds}
                      onUnlist={unlistTool}
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
                      items={visibleCategoryDomesticMore}
                      listId={`category:${externalType}:domestic:more`}
                      sortable={externalDragByOrder && !search.trim()}
                      featured={false}
                      actionEnabled={externalDragEnabled}
                      dragState={dragState}
                      onPointerStart={prepareExternalPointerDrag}
                      onAddToFeatured={addToFeatured}
                      onRemoveFromFeatured={removeFromFeatured}
                      savingUnlistingIds={savingToolUnlistingIds}
                      onUnlist={unlistTool}
                      emptyText={
                        search.trim() ? '没有匹配的国内工具' : '暂无更多国内工具'
                      }
                      dense
                      onOpen={(card) => setPreviewToolId(card.id)}
                    />
                  </ToolListPanel>
                </div>
              ) : (
                unlistedRegionPanels
              )}
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
              className="pointer-events-none fixed left-0 top-0 z-[120] w-72 max-w-[calc(100vw-1rem)] origin-top-left select-none will-change-transform"
              style={{
                transform: dragPreviewTransform(externalDragPreviewPositionRef.current),
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
                className="border-sky-200/90 bg-white/95 shadow-[0_20px_44px_-14px_rgba(14,116,144,0.42)] ring-2 ring-sky-100/90 backdrop-blur-sm"
              />
              <span className="absolute -bottom-2 left-3 inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg">
                <i className="fa-solid fa-grip-vertical" />
                正在排序
              </span>
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
