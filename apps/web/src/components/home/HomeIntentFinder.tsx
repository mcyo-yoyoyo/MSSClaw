import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  intentSearchHintExamples,
  searchCapabilitiesByIntent,
  shelfKindLabel,
  type IntentMatch,
} from '@/domain/capabilityIntentSearch';
import type { MarketShelfCard } from '@/domain/marketShelf';
import { ToolLogo } from '@/components/brand/ToolLogo';

/**
 * 首页 Hero 右侧：能力搜索面板（与左侧学/用/造并排）
 */
export function HomeIntentFinder({
  catalog,
  onOpen,
  className,
}: {
  catalog: MarketShelfCard[];
  onOpen: (card: MarketShelfCard) => void;
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [active, setActive] = useState(false);

  const matches = useMemo(() => {
    if (!submitted.trim()) return [] as IntentMatch[];
    return searchCapabilitiesByIntent(submitted, catalog, 6);
  }, [submitted, catalog]);

  const run = (q?: string) => {
    const next = (q ?? query).trim();
    setQuery(next);
    setSubmitted(next);
    setActive(Boolean(next));
  };

  const examples = intentSearchHintExamples().slice(0, 4);

  return (
    <div
      className={cn(
        'home-intent-panel flex w-full flex-col gap-2.5 rounded-[16px] border border-black/[0.04] bg-white/90 p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[13px] font-semibold tracking-tight text-[#1d1d1f]">
          一句话找到能力
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-[#86868b]">
          描述诉求，帮你找工具 / Skill / Agent，再从货架学、用、造
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <label className="relative min-w-0 flex-1">
          <i className="fa-solid fa-wand-magic-sparkles pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[#86868b]" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) {
                setActive(false);
                setSubmitted('');
              }
            }}
            placeholder="例如：我要做一份竞品分析…"
            className="w-full rounded-xl border-0 bg-[#f5f5f7] py-2.5 pl-9 pr-3 text-[13px] text-[#1d1d1f] outline-none transition placeholder:text-[#86868b] focus:bg-white focus:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08),0_0_0_3px_rgba(0,0,0,0.04)]"
          />
        </label>
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-[#1d1d1f] px-3.5 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#2c2c2e]"
        >
          AI搜能力
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => run(ex)}
            className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] text-[#6e6e73] transition hover:bg-black/[0.07] hover:text-[#1d1d1f]"
          >
            {ex}
          </button>
        ))}
      </div>

      {active ? (
        <div className="border-t border-black/[0.04] pt-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-[#86868b]">
              {matches.length ? `找到 ${matches.length} 项` : '暂无匹配，可换个说法'}
            </p>
            <button
              type="button"
              onClick={() => {
                setActive(false);
                setSubmitted('');
                setQuery('');
              }}
              className="text-[11px] font-medium text-[#86868b] hover:text-[#1d1d1f]"
            >
              收起
            </button>
          </div>
          {matches.length > 0 ? (
            <ul className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {matches.map((m) => (
                <li key={`${m.card.kind}:${m.card.id}`} className="w-[148px] shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpen(m.card)}
                    className="flex h-full w-full flex-col gap-1 rounded-xl border border-zinc-200/80 bg-[#fafafa] px-2 py-2 text-left transition hover:border-zinc-300 hover:bg-white"
                  >
                    <span className="flex items-center gap-1.5">
                      <ToolLogo
                        name={m.card.title}
                        logoUrl={m.card.logoUrl}
                        icon={m.card.icon}
                        size={24}
                        className="shrink-0"
                      />
                      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#1d1d1f]">
                        {m.card.title}
                      </span>
                    </span>
                    <span className="text-[10px] text-[#86868b]">
                      {shelfKindLabel(m.card.kind)}
                    </span>
                    <span className="line-clamp-2 text-[10px] leading-snug text-[#6e6e73]">
                      {m.reason}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
