import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { CenterPageHeader } from '@/components/center/CenterShell';
import { flattenAiBotNews } from '@/domain/aiBotDailyNews';
import { useAiBotDailyNewsStore } from '@/stores/aiBotDailyNewsStore';
import { useAiNewsPreferenceStore } from '@/stores/aiNewsPreferenceStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';

export function AiBriefPage() {
  const payload = useAiBotDailyNewsStore((s) => s.payload);
  const loading = useAiBotDailyNewsStore((s) => s.loading);
  const hydrate = useAiBotDailyNewsStore((s) => s.hydrate);
  const consumeAiNewsOverview = useNavigationIntentStore((s) => s.consumeAiNewsOverview);
  const pref = useAiNewsPreferenceStore((s) => s.pref);
  const hydratePref = useAiNewsPreferenceStore((s) => s.hydrate);
  const setSubscribed = useAiNewsPreferenceStore((s) => s.setSubscribed);
  const showToast = useMarketplaceStore((s) => s.showToast);

  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
    hydratePref();
  }, [hydrate, hydratePref]);

  useEffect(() => {
    const intent = consumeAiNewsOverview();
    if (intent.focusId) setHighlightId(intent.focusId);
  }, [consumeAiNewsOverview]);

  const flat = useMemo(() => flattenAiBotNews(payload), [payload]);

  useEffect(() => {
    if (!payload.groups.length) return;
    if (activeDate && payload.groups.some((g) => g.dateLabel === activeDate)) return;
    setActiveDate(payload.groups[0].dateLabel);
  }, [payload, activeDate]);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.querySelector(`[data-brief-id="${highlightId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [highlightId, flat.length]);

  const toggleSubscribe = () => {
    const next = !pref.subscribed;
    setSubscribed(next);
    showToast(
      next
        ? '已订阅 AI 快讯，将通过 WeLink 推送（即将开通）'
        : '已取消订阅，不再推送至 WeLink',
    );
  };

  return (
    <div className="center-surface center-page scroll-hidden flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-4 md:px-6">
        <CenterPageHeader
          title="AI快讯"
          subtitle="每日 AI 产业动态 · 精选速读"
          tip={<>按日浏览产业动态；订阅后可通过 WeLink 接收推送。</>}
          actions={
            <button
              type="button"
              onClick={toggleSubscribe}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-semibold transition',
                pref.subscribed
                  ? 'border border-sky-300/80 bg-sky-50 text-sky-800 hover:bg-sky-100'
                  : 'bg-sky-700 text-white shadow-sm shadow-sky-700/20 hover:bg-sky-800',
              )}
            >
              <i
                className={cn(
                  'fa-solid text-[11px]',
                  pref.subscribed ? 'fa-bell' : 'fa-bell-slash',
                )}
              />
              {pref.subscribed ? '已订阅 · WeLink 推送' : '订阅 · 推送至 WeLink'}
            </button>
          }
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
          <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white md:w-[208px]">
            <div className="flex items-center gap-2 border-b border-zinc-100 px-3.5 py-2.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-sky-600 text-[10px] text-white">
                <i className="fa-regular fa-calendar" />
              </span>
              <span className="text-[11px] font-semibold tracking-wide text-zinc-600">
                按日浏览
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {payload.groups.length === 0 ? (
                <p className="px-2 py-10 text-center text-[11px] text-zinc-400">暂无快讯</p>
              ) : (
                payload.groups.map((g, gi) => (
                  <button
                    key={g.dateLabel}
                    type="button"
                    onClick={() => {
                      setActiveDate(g.dateLabel);
                      setHighlightId(g.items[0]?.id ?? null);
                    }}
                    className={cn(
                      'flex w-full flex-col gap-0.5 rounded-xl px-2.5 py-2 text-left transition',
                      activeDate === g.dateLabel
                        ? 'bg-sky-700 text-white shadow-sm shadow-sky-700/25'
                        : 'text-zinc-700 hover:bg-sky-50',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold tabular-nums">{g.dateLabel}</span>
                      {gi === 0 ? (
                        <span
                          className={cn(
                            'rounded px-1 py-px text-[9px] font-bold tracking-wide',
                            activeDate === g.dateLabel
                              ? 'bg-white/20 text-white'
                              : 'bg-sky-100 text-sky-700',
                          )}
                        >
                          NEW
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        'text-[10px]',
                        activeDate === g.dateLabel ? 'text-sky-100/80' : 'text-zinc-400',
                      )}
                    >
                      {g.items.length} 条快讯
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>

          <main className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-zinc-200/80 bg-white">
            {loading && !flat.length ? (
              <div className="flex h-full items-center justify-center px-4 py-16 text-[13px] text-sky-700/60">
                <i className="fa-solid fa-spinner fa-spin mr-2 text-[12px]" />
                正在加载 AI 快讯…
              </div>
            ) : !flat.length ? (
              <div className="flex h-full items-center justify-center px-4 py-16 text-[13px] text-zinc-400">
                暂无内容
              </div>
            ) : (
              <div>
                {payload.groups.map((group, gi) => (
                  <section key={group.dateLabel} className="scroll-mt-4">
                    <div
                      className={cn(
                        'sticky top-0 z-10 flex items-center gap-2.5 border-b border-zinc-100 px-4 py-2.5 backdrop-blur md:px-6',
                        activeDate === group.dateLabel ? 'bg-sky-50/95' : 'bg-white/95',
                      )}
                    >
                      <span className="h-4 w-1 rounded-full bg-sky-500" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold tracking-tight text-zinc-800">
                          {group.dateLabel}
                        </p>
                        {gi === 0 ? (
                          <p className="text-[11px] text-sky-700/55">
                            最新一日 · 共 {group.items.length} 条
                          </p>
                        ) : (
                          <p className="text-[11px] text-zinc-400">{group.items.length} 条</p>
                        )}
                      </div>
                    </div>
                    <div className="divide-y divide-zinc-100">
                      {group.items.map((item, index) => {
                        const globalIndex =
                          payload.groups
                            .slice(0, gi)
                            .reduce((n, g) => n + g.items.length, 0) +
                          index +
                          1;
                        return (
                          <article
                            key={item.id}
                            data-brief-id={item.id}
                            className={cn(
                              'group scroll-mt-14 px-4 py-4 transition md:px-6',
                              highlightId === item.id
                                ? 'bg-sky-50/70'
                                : 'hover:bg-sky-50/35',
                            )}
                          >
                            <div className="flex gap-3">
                              <span className="mt-1 hidden w-7 shrink-0 text-right font-mono text-[11px] tabular-nums text-sky-300 sm:block">
                                {String(globalIndex).padStart(2, '0')}
                              </span>
                              <div className="min-w-0 flex-1 border-l-2 border-transparent pl-0 transition group-hover:border-sky-200 sm:pl-3">
                                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                  {gi === 0 && index === 0 ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                                      <i className="fa-solid fa-bolt text-[8px]" />
                                      最新
                                    </span>
                                  ) : null}
                                  <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-sky-400/90">
                                    AI Brief
                                  </span>
                                </div>
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block text-[15px] font-semibold leading-snug tracking-tight text-sky-700 transition hover:text-sky-900 hover:underline hover:underline-offset-2 md:text-[16px]"
                                >
                                  {item.title}
                                  <i className="fa-solid fa-arrow-up-right-from-square ml-1.5 text-[10px] text-sky-400 opacity-0 transition group-hover:opacity-100" />
                                </a>
                                {item.summary ? (
                                  <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">
                                    {item.summary}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
