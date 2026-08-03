import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ToolLogo } from '@/components/brand/ToolLogo';
import {
  MARKET_SHELF_META,
  listMarketProjectCards,
  listMarketToolCards,
  type MarketShelfKind,
} from '@/domain/marketShelf';
import { emptyOrgPerspectiveSelection } from '@/domain/orgAxisTags';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import {
  MARKET_FEATURED_MAX,
  useMarketFeaturedStore,
} from '@/stores/marketFeaturedStore';
import { useSessionStore } from '@/stores/sessionStore';
import { FEATURED_SCENARIOS } from '@/domain/portalMap';
import { DISCOVER_SCENARIO_IDS } from '@/domain/scenarioCapabilities';

const KINDS: MarketShelfKind[] = ['external', 'internal', 'projects'];

/**
 * 门户运营 · 货架推荐位（精选条置顶）
 * 仅配置露出顺序，不改 ACL / 不上架假数据。
 */
export function PortalMarketFeaturedPanel() {
  const tools = useMarketplaceStore((s) => s.tools);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const user = useSessionStore((s) => s.user);
  const pins = useMarketFeaturedStore((s) => s.pins);
  const hydrate = useMarketFeaturedStore((s) => s.hydrate);
  const togglePin = useMarketFeaturedStore((s) => s.togglePin);
  const [kind, setKind] = useState<MarketShelfKind>('external');
  const [q, setQ] = useState('');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const viewer = useMemo(
    () => ({
      userId: user?.id ?? '',
      userName: user?.name ?? '',
      role: user?.platformRole,
      affiliation: {
        deptIds: user?.deptIds ?? [],
        regionId: user?.regionId ?? null,
      },
    }),
    [user],
  );

  const candidates = useMemo(() => {
    const empty = emptyOrgPerspectiveSelection();
    if (kind === 'projects') {
      return listMarketProjectCards(empty, 'all').map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        icon: c.icon,
        logoUrl: c.logoUrl,
      }));
    }
    return listMarketToolCards(tools, kind, viewer, empty, 'all').map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      icon: c.icon,
      logoUrl: c.logoUrl,
    }));
  }, [kind, tools, viewer]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return candidates;
    return candidates.filter(
      (c) =>
        c.title.toLowerCase().includes(needle) ||
        c.description.toLowerCase().includes(needle),
    );
  }, [candidates, q]);

  const pinnedIds = pins[kind] ?? [];
  const pinnedSet = new Set(pinnedIds);

  const projectCount = FEATURED_SCENARIOS.filter((d) =>
    (DISCOVER_SCENARIO_IDS as readonly string[]).includes(d.id),
  ).length;

  return (
    <div className="space-y-4">
      <p className="text-[12px] leading-relaxed text-zinc-500">
        配置各货架「精选」条置顶项（每货架最多 {MARKET_FEATURED_MAX} 个）。未配置时仍按热度 /
        默认精选规则露出；配置后置顶项优先，并保留「精选」角标。
      </p>

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setKind(k);
              setQ('');
            }}
            className={cn(
              'rounded-lg px-3 py-1.5 text-[12px] font-medium transition',
              kind === k
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50',
            )}
          >
            {MARKET_SHELF_META[k].label}
            <span className="ml-1.5 opacity-70">
              {pins[k]?.length ?? 0}/{MARKET_FEATURED_MAX}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            kind === 'projects'
              ? `搜索项目（共 ${projectCount}）…`
              : '搜索工具…'
          }
          className="min-w-[220px] flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-zinc-400"
        />
        {pinnedIds.length ? (
          <p className="text-[11px] text-zinc-400">
            当前置顶顺序：{pinnedIds.length} 项（勾选顺序即露出顺序）
          </p>
        ) : null}
      </div>

      {pinnedIds.length > 0 ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800/80">
            已置顶
          </p>
          <ol className="flex flex-wrap gap-1.5">
            {pinnedIds.map((id, i) => {
              const hit = candidates.find((c) => c.id === id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => {
                      togglePin(kind, id);
                      showToast('已取消置顶');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-amber-50"
                    title="点击取消置顶"
                  >
                    <span className="text-amber-700">{i + 1}</span>
                    {hit?.title ?? id}
                    <i className="fa-solid fa-xmark text-[9px] text-zinc-400" />
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      <ul className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
        {filtered.map((c) => {
          const on = pinnedSet.has(c.id);
          const full = !on && pinnedIds.length >= MARKET_FEATURED_MAX;
          return (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
              <ToolLogo
                name={c.title}
                logoUrl={c.logoUrl}
                icon={c.icon}
                size={32}
                className="rounded-lg"
              />
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
                  togglePin(kind, c.id);
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
        {!filtered.length ? (
          <li className="px-3 py-10 text-center text-[12px] text-zinc-400">无匹配项</li>
        ) : null}
      </ul>
    </div>
  );
}
