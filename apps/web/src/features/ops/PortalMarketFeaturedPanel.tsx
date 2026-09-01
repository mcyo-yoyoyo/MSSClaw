import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  MARKET_SHELF_META,
  listMarketProjectCards,
  type MarketShelfKind,
} from '@/domain/marketShelf';
import {
  ensureMarketShelfTags,
  resolveToolMarketShelf,
  type MarketShelfSlot,
} from '@/domain/aiToolCategories';
import { emptyOrgPerspectiveSelection } from '@/domain/orgAxisTags';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import {
  MARKET_FEATURED_MAX,
  useMarketFeaturedStore,
} from '@/stores/marketFeaturedStore';
import { FEATURED_SCENARIOS } from '@/domain/portalMap';
import { DISCOVER_SCENARIO_IDS } from '@/domain/scenarioCapabilities';
import type { PrototypeToolSeed } from '@/domain/prototype/types';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { resolveToolLogoUrl } from '@/domain/toolLogo';
import { AssetAccentMark } from '@/components/brand/AssetAccentMark';

type PinCandidate = {
  id: string;
  title: string;
  description: string;
  productName?: string;
  logoUrl?: string;
  icon?: string;
};

const KINDS: MarketShelfKind[] = ['external', 'internal', 'projects'];

/**
 * 门户运营 · 货架运营
 * - 外精选：仅维护上架选品（marketShelf / 标题）；精选与排序统一在工具运营维护
 * - 公司推荐：前台为办公场景网格，本页仅说明场景工具与配置工具维护口径
 * - MSS 集市：仅场景卡置顶（案例材料在「场景内容」）
 */
export function PortalMarketFeaturedPanel() {
  const tools = useMarketplaceStore((s) => s.tools);
  const upsertTool = useMarketplaceStore((s) => s.upsertTool);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const pins = useMarketFeaturedStore((s) => s.pins);
  const togglePin = useMarketFeaturedStore((s) => s.togglePin);
  const [kind, setKind] = useState<MarketShelfKind>('external');
  const [q, setQ] = useState('');

  useEffect(() => {
    setQ('');
  }, [kind]);

  const projectCandidates = useMemo((): PinCandidate[] => {
    return listMarketProjectCards(emptyOrgPerspectiveSelection(), 'all').map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
    }));
  }, []);

  const publishedTools = useMemo(
    () => tools.filter((t) => t.published === true),
    [tools],
  );

  const assignList = useMemo(() => {
    if (kind === 'projects') return [] as PrototypeToolSeed[];
    const needle = q.trim().toLowerCase();
    return publishedTools
      .filter((t) => {
        const shelf = resolveToolMarketShelf(t);
        const onThis = shelf === kind;
        const sourceOk =
          kind === 'external'
            ? t.sourceType === 'external' || shelf === 'external' || onThis
            : t.sourceType !== 'external' || shelf === 'internal' || onThis;
        if (!sourceOk && !onThis) return false;
        if (!needle) return true;
        const title = (t.marketTitle || t.name).toLowerCase();
        return (
          title.includes(needle) ||
          t.name.toLowerCase().includes(needle) ||
          (t.desc ?? '').toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => {
        const aOn = resolveToolMarketShelf(a) === kind ? 0 : 1;
        const bOn = resolveToolMarketShelf(b) === kind ? 0 : 1;
        if (aOn !== bOn) return aOn - bOn;
        return a.name.localeCompare(b.name, 'zh');
      });
  }, [kind, publishedTools, q]);

  const pinCandidates = useMemo((): PinCandidate[] => {
    const needle = q.trim().toLowerCase();
    if (!needle) return projectCandidates;
    return projectCandidates.filter(
      (c) =>
        c.title.toLowerCase().includes(needle) ||
        c.description.toLowerCase().includes(needle),
    );
  }, [projectCandidates, q]);

  const pinnedIds = pins.projects ?? [];
  const pinnedSet = new Set(pinnedIds);

  const projectCount = FEATURED_SCENARIOS.filter((d) =>
    (DISCOVER_SCENARIO_IDS as readonly string[]).includes(d.id),
  ).length;

  const patchToolShelf = (
    tool: PrototypeToolSeed,
    patch: Partial<
      Pick<
        PrototypeToolSeed,
        'marketShelf' | 'marketTitle' | 'tags' | 'sourceType'
      >
    >,
  ) => {
    const marketShelf = (patch.marketShelf ??
      resolveToolMarketShelf(tool)) as MarketShelfSlot;
    const next: PrototypeToolSeed = {
      ...tool,
      ...patch,
      marketShelf,
      tags: ensureMarketShelfTags(patch.tags ?? tool.tags ?? [], marketShelf),
      sourceType:
        patch.sourceType ??
        (marketShelf === 'external'
          ? 'external'
          : marketShelf === 'internal'
            ? 'internal'
            : tool.sourceType),
    };
    upsertTool(next, false);
  };

  return (
    <div className="space-y-4">
      <p className="text-[12px] leading-relaxed text-zinc-500">
        <strong className="font-semibold text-zinc-700">外部工具精选</strong>
        ：此处维护上架选品和场景标题；精选与顺序请到「工具运营 / 外部工具」直接拖拽卡片。
        <strong className="ml-1 font-semibold text-zinc-700">内部办公推荐</strong>
        ：下方可配办公场景字典；链接/Logo 在「配置工具」，How to 在「工具 How to」。
        <strong className="ml-1 font-semibold text-zinc-700">MSS 集市</strong>
        ：仅场景卡置顶。
      </p>

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-[12px] font-medium transition',
              kind === k
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50',
            )}
          >
            {MARKET_SHELF_META[k].label}
            {k !== 'projects' ? (
              <span className="ml-1.5 opacity-70">
                {
                  publishedTools.filter((t) => resolveToolMarketShelf(t) === k)
                    .length
                }
              </span>
            ) : (
              <span className="ml-1.5 opacity-70">
                {pins[k]?.length ?? 0}/{MARKET_FEATURED_MAX}
              </span>
            )}
          </button>
        ))}
      </div>

      {kind === 'external' ? (
        <p className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-[11px] text-blue-800">
          当前仅维护上架状态与卡片标题，不再写入旧的外部精选置顶数据。
        </p>
      ) : null}

      {kind === 'projects' ? (
        <p className="text-[11px] text-zinc-500">
          MSS 集市场景卡置顶（共 {projectCount} 个场景）。案例材料请到「场景内容」维护。
        </p>
      ) : null}

      {kind !== 'internal' ? (
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            kind === 'projects'
              ? `搜索场景…`
              : '搜索已上架工具…'
          }
          className="min-w-[220px] flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-zinc-400"
        />
      </div>
      ) : null}

      {kind === 'external' ? (
        <ul className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
          {assignList.map((t) => {
            const shelf = resolveToolMarketShelf(t);
            const onShelf = shelf === kind;
            return (
              <li key={t.id} className="space-y-2 px-3 py-3">
                <div className="flex items-start gap-2">
                  <ToolLogo
                    name={t.name}
                    logoUrl={resolveToolLogoUrl(t)}
                    icon={t.icon}
                    size={28}
                    className="mt-0.5 rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[13px] font-semibold text-zinc-900">
                        {t.name}
                      </p>
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[9px] font-semibold',
                          onShelf
                            ? 'bg-emerald-50 text-emerald-700'
                            : shelf === 'none'
                              ? 'bg-zinc-100 text-zinc-500'
                              : 'bg-amber-50 text-amber-800',
                        )}
                      >
                        {onShelf
                          ? '已上本架'
                          : shelf === 'none'
                            ? '未上架'
                            : `在${MARKET_SHELF_META[shelf as 'external' | 'internal'].label}`}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-400">{t.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onShelf) {
                        patchToolShelf(t, { marketShelf: 'none' });
                        showToast(`已从「${MARKET_SHELF_META[kind].label}」下架`);
                      } else {
                        patchToolShelf(t, {
                          marketShelf: 'external',
                          sourceType: 'external',
                        });
                        showToast(`已上架到「${MARKET_SHELF_META[kind].label}」`);
                      }
                    }}
                    className={cn(
                      'shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition',
                      onShelf
                        ? 'border border-red-200 text-red-600 hover:bg-red-50'
                        : 'bg-zinc-900 text-white hover:bg-zinc-800',
                    )}
                  >
                    {onShelf ? '下架' : '上架到本架'}
                  </button>
                </div>

                {onShelf ? (
                  <div className="ml-4 space-y-2 rounded-xl border border-zinc-100 bg-zinc-50/80 p-2.5">
                    <label className="block text-[11px] text-zinc-600">
                      应用场景标题（外精选卡主标题）
                      <input
                        value={t.marketTitle ?? ''}
                        placeholder="例：竞品舆情监控 · 市场洞察"
                        onChange={(e) =>
                          patchToolShelf(t, { marketTitle: e.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-zinc-400"
                      />
                    </label>
                  </div>
                ) : null}
              </li>
            );
          })}
          {!assignList.length ? (
            <li className="px-3 py-10 text-center text-[12px] text-zinc-400">
              无匹配的已上架工具。请先在「配置工具」完成工具上架。
            </li>
          ) : null}
        </ul>
      ) : null}

      {kind === 'projects' ? (
        <>
          {pinnedIds.length > 0 ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800/80">
                已置顶
              </p>
              <ol className="flex flex-wrap gap-1.5">
                {pinnedIds.map((id, i) => {
                  const hit = pinCandidates.find((c) => c.id === id);
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => {
                          togglePin('projects', id);
                          showToast('已取消置顶');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-amber-50"
                        title="点击取消置顶"
                      >
                        <span className="text-amber-700">{i + 1}</span>
                        {hit?.title || id}
                        <i className="fa-solid fa-xmark text-[9px] text-zinc-400" />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}

          <ul className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
            {pinCandidates.map((c) => {
              const on = pinnedSet.has(c.id);
              const full = !on && pinnedIds.length >= MARKET_FEATURED_MAX;
              return (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                  <AssetAccentMark id={c.id} className="mt-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-zinc-900">{c.title}</p>
                    <p className="truncate text-[11px] text-zinc-400">{c.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={full}
                    onClick={() => {
                      if (full) {
                        showToast(`每货架最多置顶 ${MARKET_FEATURED_MAX} 个`);
                        return;
                      }
                      togglePin('projects', c.id);
                      showToast(on ? '已取消置顶' : '已加入精选置顶');
                    }}
                    className={cn(
                      'shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition',
                      on
                        ? 'bg-amber-100 text-amber-900'
                        : full
                          ? 'cursor-not-allowed bg-zinc-100 text-zinc-400'
                          : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50',
                    )}
                  >
                    {on ? '已置顶' : '置顶'}
                  </button>
                </li>
              );
            })}
            {!pinCandidates.length ? (
              <li className="px-3 py-10 text-center text-[12px] text-zinc-400">
                无匹配场景
              </li>
            ) : null}
          </ul>
        </>
      ) : null}
    </div>
  );
}
