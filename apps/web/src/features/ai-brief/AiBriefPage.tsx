import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { flattenAiBotNews } from '@/domain/aiBotDailyNews';
import { useAiBotDailyNewsStore } from '@/stores/aiBotDailyNewsStore';
import { useAiNewsPreferenceStore } from '@/stores/aiNewsPreferenceStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { PageCanvas } from '@/components/layout/PageCanvas';
import { PageStageHero } from '@/components/layout/PageStageHero';

export function AiBriefPage() {
  const payload = useAiBotDailyNewsStore((s) => s.payload);
  const loading = useAiBotDailyNewsStore((s) => s.loading);
  const hydrate = useAiBotDailyNewsStore((s) => s.hydrate);
  const consumeAiNewsOverview = useNavigationIntentStore((s) => s.consumeAiNewsOverview);
  const pref = useAiNewsPreferenceStore((s) => s.pref);
  const hydratePref = useAiNewsPreferenceStore((s) => s.hydrate);
  const setEmailSubscription = useAiNewsPreferenceStore((s) => s.setEmailSubscription);
  const showToast = useMarketplaceStore((s) => s.showToast);

  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState('');

  useEffect(() => {
    void hydrate();
    hydratePref();
  }, [hydrate, hydratePref]);

  useEffect(() => {
    setEmailDraft(pref.email || '');
  }, [pref.email]);

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

  const saveEmailSub = (subscribed: boolean) => {
    const result = setEmailSubscription(emailDraft, subscribed);
    showToast(result.message);
  };

  const platformUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '';

  return (
    <div className="center-surface scroll-hidden flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageCanvas className="flex min-h-0 flex-1 flex-col py-5 md:py-6">
        <PageStageHero
          className="mb-4 shrink-0"
          tone="brief"
          title="AI快讯"
          subtitle="每日 AI 产业动态 · 精选速读 · 可订阅邮件推送（含平台入口）"
        >
          <div className="ai-brief-subscribe">
            <button
              type="button"
              disabled
              title="公司 WeLink 推送接口待打通"
              className="ai-brief-subscribe__welink"
            >
              <i className="fa-solid fa-bell-slash text-[11px]" />
              <span>订阅 WeLink 推送（待上线）</span>
            </button>
            <div className="ai-brief-subscribe__email">
              <p className="ai-brief-subscribe__email-title">订阅邮件推送</p>
              <div className="ai-brief-subscribe__email-row">
                <label className="relative min-w-0 flex-1">
                  <i className="fa-regular fa-envelope pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#86868b]" />
                  <input
                    type="email"
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-lg border-0 bg-zinc-50 py-2 pl-8 pr-2.5 text-[12px] text-[#1d1d1f] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] outline-none transition placeholder:text-[#a1a1aa] focus:bg-white focus:shadow-[inset_0_0_0_1px_rgba(0,113,227,0.35)]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => saveEmailSub(true)}
                  className="shrink-0 rounded-lg bg-[#1d1d1f] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-[#2c2c2e]"
                >
                  {pref.emailSubscribed ? '更新' : '订阅'}
                </button>
                {pref.emailSubscribed ? (
                  <button
                    type="button"
                    onClick={() => saveEmailSub(false)}
                    className="shrink-0 rounded-lg px-2 py-2 text-[11px] font-medium text-[#71717a] transition hover:bg-black/[0.04]"
                  >
                    取消
                  </button>
                ) : null}
              </div>
              {pref.emailSubscribed && pref.email ? (
                <p className="ai-brief-subscribe__hint">
                  已订阅 {pref.email}
                  {platformUrl ? ` · 邮件附带 ${platformUrl}` : ''}
                </p>
              ) : (
                <p className="ai-brief-subscribe__hint">
                  定时发送快讯摘要，并附带本平台入口
                </p>
              )}
            </div>
          </div>
        </PageStageHero>

        <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
          <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-[18px] border-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.05)] md:w-[220px]">
            <div className="flex items-center gap-2 border-b border-black/[0.04] px-3.5 py-2.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#0071e3] text-[10px] text-white">
                <i className="fa-regular fa-calendar" />
              </span>
              <span className="text-[11px] font-semibold tracking-wide text-[#6e6e73]">
                按日浏览
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {payload.groups.length === 0 ? (
                <p className="px-2 py-10 text-center text-[11px] text-[#86868b]">暂无快讯</p>
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
                        ? 'bg-[#1d1d1f] text-white shadow-sm'
                        : 'text-[#1d1d1f] hover:bg-black/[0.04]',
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
                              : 'bg-[#0071e3]/12 text-[#0071e3]',
                          )}
                        >
                          NEW
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        'text-[10px]',
                        activeDate === g.dateLabel ? 'text-white/70' : 'text-[#86868b]',
                      )}
                    >
                      {g.items.length} 条快讯
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>

          <main className="min-h-0 flex-1 overflow-y-auto rounded-[18px] border-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.05)]">
            {loading && !flat.length ? (
              <div className="flex h-full items-center justify-center px-4 py-16 text-[13px] text-[#6e6e73]">
                <i className="fa-solid fa-spinner fa-spin mr-2 text-[12px]" />
                正在加载 AI 快讯…
              </div>
            ) : !flat.length ? (
              <div className="flex h-full items-center justify-center px-4 py-16 text-[13px] text-[#86868b]">
                暂无内容
              </div>
            ) : (
              <div>
                {payload.groups.map((group, gi) => (
                  <section key={group.dateLabel} className="scroll-mt-4">
                    <div
                      className={cn(
                        'sticky top-0 z-10 flex items-center gap-2.5 border-b border-black/[0.04] px-4 py-2.5 backdrop-blur md:px-6',
                        activeDate === group.dateLabel ? 'bg-[#f4f7fb]/95' : 'bg-white/95',
                      )}
                    >
                      <span className="h-4 w-1 rounded-full bg-[#0071e3]" />
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold tracking-tight text-[#1d1d1f]">
                          {group.dateLabel}
                        </p>
                        {gi === 0 ? (
                          <p className="text-[11px] text-[#0071e3]/80">
                            最新一日 · 共 {group.items.length} 条
                          </p>
                        ) : (
                          <p className="text-[11px] text-[#86868b]">{group.items.length} 条</p>
                        )}
                      </div>
                    </div>
                    <div className="divide-y divide-black/[0.04]">
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
                                ? 'bg-[#0071e3]/06'
                                : 'hover:bg-black/[0.02]',
                            )}
                          >
                            <div className="flex gap-3">
                              <span className="mt-1 hidden w-7 shrink-0 text-right font-mono text-[11px] tabular-nums text-[#86868b] sm:block">
                                {String(globalIndex).padStart(2, '0')}
                              </span>
                              <div className="min-w-0 flex-1 border-l-2 border-transparent pl-0 transition group-hover:border-[#0071e3]/35 sm:pl-3">
                                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                  {gi === 0 && index === 0 ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-[#0071e3] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                                      <i className="fa-solid fa-bolt text-[8px]" />
                                      最新
                                    </span>
                                  ) : null}
                                  <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#0071e3]/80">
                                    AI Brief
                                  </span>
                                </div>
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block text-[15px] font-semibold leading-snug tracking-tight text-[#1d1d1f] transition hover:text-[#0071e3] hover:underline hover:underline-offset-2 md:text-[16px]"
                                >
                                  {item.title}
                                </a>
                                {item.summary ? (
                                  <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-[#6e6e73] md:text-[13px]">
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
      </PageCanvas>
    </div>
  );
}
