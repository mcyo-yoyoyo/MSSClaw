import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { flattenAiBotNews } from '@/domain/aiBotDailyNews';
import {
  AI_BRIEF_CATEGORIES,
  classifyAiBriefItem,
  getAiBriefCategoryLabel,
  type AiBriefCategoryId,
} from '@/domain/aiBriefClassify';
import { useAiBotDailyNewsStore } from '@/stores/aiBotDailyNewsStore';
import { useAiNewsPreferenceStore } from '@/stores/aiNewsPreferenceStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useSessionStore } from '@/stores/sessionStore';
import {
  buildAiBriefEmailHtml,
  downloadAiBriefEmailTemplate,
} from '@/domain/aiBriefEmailTemplate';
import { resolveAiBriefPlatformUrl } from '@/domain/aiBriefEmailCopy';
import { useAiBriefEmailCopyStore } from '@/stores/aiBriefEmailCopyStore';
import { PageCanvas } from '@/components/layout/PageCanvas';
import { PageStageHero } from '@/components/layout/PageStageHero';

export function AiBriefPage() {
  const payload = useAiBotDailyNewsStore((s) => s.payload);
  const loading = useAiBotDailyNewsStore((s) => s.loading);
  const hydrate = useAiBotDailyNewsStore((s) => s.hydrate);
  const consumeAiNewsOverview = useNavigationIntentStore((s) => s.consumeAiNewsOverview);
  const pref = useAiNewsPreferenceStore((s) => s.pref);
  const hydratePref = useAiNewsPreferenceStore((s) => s.hydrate);
  const emailCopy = useAiBriefEmailCopyStore((s) => s.copy);
  const hydrateEmailCopy = useAiBriefEmailCopyStore((s) => s.hydrate);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const loginEmail = useSessionStore((s) => s.user?.email ?? '');

  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<AiBriefCategoryId | 'all'>('all');
  const [searchDraft, setSearchDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // 每次进入快讯页主动同步，避免开发热更新或上游短暂失败后长期停留在兜底内容。
    void hydrate(true);
    hydratePref();
    hydrateEmailCopy();
  }, [hydrate, hydratePref, hydrateEmailCopy]);

  useEffect(() => {
    // 已登记邮箱优先；否则默认填入当前登录账号邮箱
    setEmailDraft(pref.email?.trim() || loginEmail || '');
  }, [pref.email, loginEmail]);

  useEffect(() => {
    const intent = consumeAiNewsOverview();
    if (intent.focusId) setHighlightId(intent.focusId);
  }, [consumeAiNewsOverview]);

  const flat = useMemo(() => flattenAiBotNews(payload), [payload]);

  const classified = useMemo(
    () =>
      flat.map((item) => ({
        item,
        ...classifyAiBriefItem(item),
      })),
    [flat],
  );

  const mssBoard = useMemo(
    () => classified.filter((x) => x.mssFit).slice(0, 6),
    [classified],
  );

  const visibleGroups = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return payload.groups
      .slice(0, 7)
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => {
          if (
            categoryFilter !== 'all' &&
            classifyAiBriefItem(item).category !== categoryFilter
          ) {
            return false;
          }
          if (!query) return true;
          return [item.title, item.summary, item.source, item.reason]
            .filter(Boolean)
            .some((value) => value!.toLocaleLowerCase().includes(query));
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [payload.groups, categoryFilter, searchQuery]);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.querySelector(`[data-brief-id="${highlightId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [highlightId, flat.length]);

  const runtimeOrigin =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '';
  const platformUrl = resolveAiBriefPlatformUrl(emailCopy.platformUrl, runtimeOrigin);

  const downloadTemplate = () => {
    const html = buildAiBriefEmailHtml({
      payload,
      runtimeOrigin,
      copy: emailCopy,
    });
    downloadAiBriefEmailTemplate(html, payload.groups[0]?.dateLabel);
    showToast('已下载 AI 快讯 HTML，可用企业邮箱打开后发送');
  };

  return (
    <div className="center-surface scroll-hidden flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageCanvas className="flex flex-col py-5 pb-10 md:py-6">
        <PageStageHero
          className="mb-4 shrink-0"
          tone="brief"
          title="AI快讯"
          subtitle={`${payload.fromFallback ? '本地兜底 · ' : ''}精选动态 · 按类速读 · 单独标出适合 MSS 业务的条目`}
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
              <p className="ai-brief-subscribe__email-title">邮件推送</p>
              <div className="ai-brief-subscribe__email-row">
                <label className="relative min-w-0 flex-1">
                  <i className="fa-regular fa-envelope pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#86868b]" />
                  <input
                    type="email"
                    value={emailDraft}
                    readOnly
                    disabled
                    placeholder={loginEmail || 'name@huawei.com'}
                    className="w-full cursor-not-allowed rounded-lg border-0 bg-zinc-100 py-2 pl-8 pr-2.5 text-[12px] text-[#a1a1aa] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] outline-none"
                  />
                </label>
                <button
                  type="button"
                  disabled
                  title="邮件自动订阅待开通"
                  className="shrink-0 cursor-not-allowed rounded-lg bg-zinc-200 px-3 py-2 text-[11px] font-semibold text-zinc-400"
                >
                  订阅
                </button>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="shrink-0 rounded-lg bg-[#1d1d1f] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-[#2c2c2e]"
                  title="下载含快讯内容与平台链接的 HTML，便于人工发送；文案与链接可在门户运营配置"
                >
                  <i className="fa-solid fa-download mr-1 text-[10px]" />
                  下载
                </button>
              </div>
              <p className="ai-brief-subscribe__hint">
                浏览器无法直发企业邮件；请点「下载」后用 Outlook / 企业邮箱发送。落地文案与链接在「门户运营 ·
                AI快讯邮件」配置。
                {platformUrl ? ` · 链接 ${platformUrl}` : ''}
              </p>
            </div>
          </div>
        </PageStageHero>

        {mssBoard.length ? (
          <section className="mb-3 rounded-[18px] border border-[#0071e3]/15 bg-[#f4f8fd] px-4 py-3.5">
            <div className="mb-2.5 flex items-baseline justify-between gap-2">
              <h2 className="text-[13px] font-semibold tracking-tight text-[#1d1d1f]">
                适合 MSS 业务
              </h2>
              <p className="text-[11px] text-[#0071e3]/80">营销 · 零售 · 办公提效 · 企业知识</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {mssBoard.map(({ item, category }) => (
                <a
                  key={`mss-${item.id}`}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-white/80 bg-white px-3 py-2.5 transition hover:border-[#0071e3]/25 hover:shadow-sm"
                >
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#0071e3]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#0071e3]">
                    MSS
                    <span className="font-medium text-[#0071e3]/70">
                      · {getAiBriefCategoryLabel(category)}
                    </span>
                  </span>
                  <p className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-snug text-[#1d1d1f]">
                    {item.title}
                  </p>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mb-5 flex flex-col gap-3 border-b border-black/[0.07] pb-2.5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-2">
            {[{ id: 'all' as const, label: '全部' }, ...AI_BRIEF_CATEGORIES].map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryFilter(category.id)}
                className={cn(
                  'relative px-3 py-2 text-[12px] font-medium transition after:absolute after:inset-x-2 after:-bottom-[11px] after:h-0.5 after:rounded-full after:bg-transparent',
                  categoryFilter === category.id
                    ? 'font-semibold text-[#0071e3] after:bg-[#0071e3]'
                    : 'text-zinc-500 hover:text-zinc-900',
                )}
              >
                {category.label}
              </button>
            ))}
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row lg:w-auto">
            <form
              className="flex min-w-0 flex-1 gap-2 lg:flex-none"
              onSubmit={(event) => {
                event.preventDefault();
                setSearchQuery(searchDraft);
              }}
            >
              <label className="relative min-w-0 flex-1 lg:w-64">
                <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400" />
                <input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="搜索标题、摘要…"
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-8 pr-3 text-[12px] text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#0071e3]/50 focus:ring-2 focus:ring-[#0071e3]/10"
                />
              </label>
              <button
                type="submit"
                className="h-10 rounded-xl bg-[#0071e3] px-5 text-[12px] font-semibold text-white transition hover:bg-[#0064c8]"
              >
                搜索
              </button>
            </form>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <main className="min-h-0 flex-1">
            {loading && !flat.length ? (
              <div className="flex h-full items-center justify-center px-4 py-16 text-[13px] text-[#6e6e73]">
                <i className="fa-solid fa-spinner fa-spin mr-2 text-[12px]" />
                正在加载 AI 快讯…
              </div>
            ) : !flat.length ? (
              <div className="flex h-full items-center justify-center px-4 py-16 text-[13px] text-[#86868b]">
                暂无内容
              </div>
            ) : !visibleGroups.length ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/70 px-4 py-16 text-center text-[13px] text-zinc-400">
                没有找到符合当前筛选条件的资讯
              </div>
            ) : (
              <div className="space-y-8">
                {visibleGroups.map((group, gi) => (
                  <section key={group.dateLabel} className="scroll-mt-4">
                    <div className="mb-3 flex items-baseline gap-2 px-1">
                      <h2 className="text-[18px] font-bold tracking-tight text-zinc-900">
                        {group.dateLabel}
                      </h2>
                      <span className="text-[11px] text-zinc-500">
                        {gi === 0 ? '最新一日 · ' : ''}{group.items.length} 条
                      </span>
                    </div>
                    <div className="ml-4 space-y-3 border-l border-zinc-300/80 pl-7">
                      {group.items.map((item, index) => {
                        const meta = classifyAiBriefItem(item);
                        return (
                          <article
                            key={item.id}
                            data-brief-id={item.id}
                            className={cn(
                              'group relative scroll-mt-14 rounded-2xl border border-zinc-200/90 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_6px_18px_rgba(0,0,0,0.035)] transition md:px-5',
                              highlightId === item.id
                                ? 'border-[#0071e3]/30 ring-2 ring-[#0071e3]/8'
                                : 'hover:border-zinc-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]',
                            )}
                          >
                            <span className="absolute -left-[35px] top-5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#0071e3] shadow-[0_0_0_1px_rgba(0,113,227,0.18)]" />
                            <span className="absolute -left-[69px] top-[17px] hidden w-7 text-right font-mono text-[10px] font-semibold tabular-nums text-zinc-500 sm:block">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  {item.source ? (
                                    <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                                      {item.source}
                                    </span>
                                  ) : null}
                                  {gi === 0 && index === 0 && categoryFilter === 'all' ? (
                                    <span className="rounded-md bg-[#0071e3] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                      ✦ 精选
                                    </span>
                                  ) : null}
                                  <span className="rounded-md bg-[#0071e3]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#0071e3]">
                                    {getAiBriefCategoryLabel(meta.category)}
                                  </span>
                                  {meta.mssFit ? (
                                    <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                      适合 MSS
                                    </span>
                                  ) : null}
                                  {typeof item.score === 'number' ? (
                                    <span className="ml-auto text-[11px] font-semibold tabular-nums text-[#0071e3]">
                                      ● AI 评分 {item.score}/100
                                    </span>
                                  ) : null}
                                </div>
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block text-[15px] font-semibold leading-snug tracking-tight text-zinc-900 transition hover:text-[#0071e3] md:text-[16px]"
                                >
                                  {item.title}
                                </a>
                                {item.summary ? (
                                  <p className="mt-2 text-[12px] leading-relaxed text-zinc-600 md:text-[13px]">
                                    {item.summary}
                                  </p>
                                ) : null}
                                {item.reason ? (
                                  <p className="mt-3 border-t border-dashed border-zinc-200 pt-3 text-[11px] leading-relaxed text-[#356f9f]">
                                    <span className="font-semibold">推荐理由：</span>
                                    {item.reason}
                                  </p>
                                ) : null}
                                {item.aihotUrl ? (
                                  <a
                                    href={item.aihotUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-[#0071e3] hover:underline"
                                  >
                                    查看详情
                                    <i className="fa-solid fa-arrow-up-right-from-square text-[8px]" />
                                  </a>
                                ) : null}
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
