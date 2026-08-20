import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  buildAiBriefEmailHtml,
  downloadAiBriefEmailTemplate,
} from '@/domain/aiBriefEmailTemplate';
import { useAiBriefEmailCopyStore } from '@/stores/aiBriefEmailCopyStore';
import { PageCanvas } from '@/components/layout/PageCanvas';
import { PageStageHero } from '@/components/layout/PageStageHero';

type CalendarMonth = { year: number; month: number };

const CALENDAR_WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'] as const;

function parseCalendarDateKey(value?: string) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function shanghaiTodayKey() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : '';
}

function calendarMonthFromKey(value?: string): CalendarMonth {
  const parsed = parseCalendarDateKey(value) ?? parseCalendarDateKey(shanghaiTodayKey());
  if (parsed) return { year: parsed.year, month: parsed.month - 1 };
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function calendarDateKey(year: number, month: number, day: number) {
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function calendarDays(year: number, month: number) {
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(Date.UTC(year, month, index - firstWeekday + 1));
    const cellYear = date.getUTCFullYear();
    const cellMonth = date.getUTCMonth();
    const day = date.getUTCDate();
    return {
      key: calendarDateKey(cellYear, cellMonth, day),
      year: cellYear,
      month: cellMonth,
      day,
      inCurrentMonth: cellMonth === month,
    };
  });
}

function formatCalendarRangeLabel(startDate: string, endDate: string) {
  const start = parseCalendarDateKey(startDate);
  const end = parseCalendarDateKey(endDate);
  if (!start) return '选择时间段';
  const startLabel = `${start.year}/${String(start.month).padStart(2, '0')}/${String(start.day).padStart(2, '0')}`;
  if (!end) return `${startLabel} – 请选择`;
  const endLabel =
    start.year === end.year
      ? `${String(end.month).padStart(2, '0')}/${String(end.day).padStart(2, '0')}`
      : `${end.year}/${String(end.month).padStart(2, '0')}/${String(end.day).padStart(2, '0')}`;
  return `${startLabel} – ${endLabel}`;
}

function DateCalendarFilter({
  startDate,
  endDate,
  initialMonthKey,
  onChange,
}: {
  startDate: string;
  endDate: string;
  initialMonthKey?: string;
  onChange: (startDate: string, endDate: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selectingEnd, setSelectingEnd] = useState(Boolean(startDate && !endDate));
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>(() =>
    calendarMonthFromKey(startDate || initialMonthKey),
  );
  const days = useMemo(
    () => calendarDays(visibleMonth.year, visibleMonth.month),
    [visibleMonth.year, visibleMonth.month],
  );
  const todayKey = shanghaiTodayKey();
  const selectedLabel = formatCalendarRangeLabel(startDate, endDate);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const moveMonth = (offset: number) => {
    setVisibleMonth((current) => {
      const next = new Date(Date.UTC(current.year, current.month + offset, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  };

  const clearRange = () => {
    onChange('', '');
    setSelectingEnd(false);
  };

  return (
    <div ref={rootRef} className="relative shrink-0 sm:w-64">
      <button
        type="button"
        onClick={() => {
          if (!open) {
            setVisibleMonth(calendarMonthFromKey(startDate || initialMonthKey));
            setSelectingEnd(Boolean(startDate && !endDate));
          }
          setOpen((current) => !current);
        }}
        aria-label="按时间段筛选"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="ai-brief-date-calendar"
        title="打开时间段筛选"
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-xl border bg-white px-3 text-[12px] font-medium outline-none transition hover:border-zinc-300 focus:ring-2 focus:ring-[#0071e3]/10',
          open ? 'border-[#0071e3]/50' : 'border-zinc-200',
          startDate ? 'pr-16 text-zinc-700' : 'text-zinc-500',
        )}
      >
        <i className="fa-regular fa-calendar text-[12px] text-zinc-400" />
        <span className="min-w-0 flex-1 truncate text-left tabular-nums">{selectedLabel}</span>
        <i
          className={cn(
            'fa-solid fa-chevron-down text-[9px] text-zinc-400 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {startDate ? (
        <button
          type="button"
          onClick={clearRange}
          aria-label="清除时间段筛选"
          title="清除时间段筛选"
          className="absolute right-8 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20"
        >
          <i className="fa-solid fa-xmark text-[10px]" />
        </button>
      ) : null}

      {open ? (
        <div
          id="ai-brief-date-calendar"
          role="dialog"
          aria-label="选择筛选时间段"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-[292px] rounded-2xl border border-zinc-200 bg-white p-3 shadow-[0_16px_40px_rgba(0,0,0,0.14)]"
        >
          <div className="mb-1 flex items-center justify-between">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              aria-label="上个月"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              <i className="fa-solid fa-chevron-left text-[10px]" />
            </button>
            <p className="text-[13px] font-semibold tabular-nums text-zinc-900">
              {visibleMonth.year}年{visibleMonth.month + 1}月
            </p>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              aria-label="下个月"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              <i className="fa-solid fa-chevron-right text-[10px]" />
            </button>
          </div>

          <p className="mb-1.5 text-center text-[10px] font-medium text-[#0071e3]">
            {selectingEnd ? '请选择结束日期' : '请选择开始日期'}
          </p>

          <div className="grid grid-cols-7 text-center">
            {CALENDAR_WEEKDAYS.map((weekday) => (
              <span key={weekday} className="py-1 text-[10px] font-medium text-zinc-400">
                {weekday}
              </span>
            ))}
            {days.map((day) => {
              const rangeEdge = day.key === startDate || day.key === endDate;
              const inRange = Boolean(
                startDate && endDate && day.key > startDate && day.key < endDate,
              );
              const today = day.key === todayKey;
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => {
                    if (!selectingEnd || !startDate) {
                      onChange(day.key, '');
                      setSelectingEnd(true);
                      setVisibleMonth({ year: day.year, month: day.month });
                      return;
                    }
                    const nextStart = day.key < startDate ? day.key : startDate;
                    const nextEnd = day.key < startDate ? startDate : day.key;
                    onChange(nextStart, nextEnd);
                    setSelectingEnd(false);
                    setOpen(false);
                  }}
                  aria-label={`${day.year}年${day.month + 1}月${day.day}日`}
                  aria-pressed={rangeEdge}
                  className={cn(
                    'mx-auto my-0.5 flex h-8 w-8 items-center justify-center rounded-lg text-[11px] tabular-nums transition',
                    day.inCurrentMonth ? 'text-zinc-700 hover:bg-zinc-100' : 'text-zinc-300 hover:bg-zinc-50',
                    today && !rangeEdge && !inRange &&
                      'font-semibold text-[#0071e3] ring-1 ring-[#0071e3]/20',
                    inRange && 'bg-[#0071e3]/10 font-medium text-[#0071e3]',
                    rangeEdge && 'bg-[#0071e3] font-semibold text-white hover:bg-[#0064c8]',
                  )}
                >
                  {day.day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2">
            <button
              type="button"
              onClick={() => {
                clearRange();
                setOpen(false);
              }}
              className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              清除筛选
            </button>
            <button
              type="button"
              onClick={() => setVisibleMonth(calendarMonthFromKey(todayKey))}
              className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[#0071e3] transition hover:bg-[#0071e3]/5"
            >
              回到今天
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AiBriefPage() {
  const payload = useAiBotDailyNewsStore((s) => s.payload);
  const loading = useAiBotDailyNewsStore((s) => s.loading);
  const hydrate = useAiBotDailyNewsStore((s) => s.hydrate);
  const consumeAiNewsOverview = useNavigationIntentStore((s) => s.consumeAiNewsOverview);
  const pref = useAiNewsPreferenceStore((s) => s.pref);
  const hydratePref = useAiNewsPreferenceStore((s) => s.hydrate);
  const subscriptionSaving = useAiNewsPreferenceStore((s) => s.saving);
  const setEmailSubscription = useAiNewsPreferenceStore((s) => s.setEmailSubscription);
  const emailCopy = useAiBriefEmailCopyStore((s) => s.copy);
  const hydrateEmailCopy = useAiBriefEmailCopyStore((s) => s.hydrate);
  const showToast = useMarketplaceStore((s) => s.showToast);

  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<AiBriefCategoryId | 'all'>('all');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [searchDraft, setSearchDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // 每次进入快讯页主动同步，避免开发热更新或上游短暂失败后长期停留在兜底内容。
    void hydrate(true);
    void hydratePref();
    hydrateEmailCopy();
  }, [hydrate, hydratePref, hydrateEmailCopy]);

  useEffect(() => {
    // 仅回显后台已保存的订阅邮箱，未订阅时保持为空。
    setEmailDraft(pref.emailSubscribed ? pref.email.trim() : '');
  }, [pref.email, pref.emailSubscribed]);

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
      .filter((group) => {
        if (!dateRange.startDate) return true;
        if (!group.dateKey) return false;
        const endDate = dateRange.endDate || dateRange.startDate;
        return group.dateKey >= dateRange.startDate && group.dateKey <= endDate;
      })
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
  }, [payload.groups, categoryFilter, dateRange.endDate, dateRange.startDate, searchQuery]);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.querySelector(`[data-brief-id="${highlightId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [highlightId, flat.length]);

  const runtimeOrigin =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '';

  const downloadTemplate = () => {
    const html = buildAiBriefEmailHtml({
      payload,
      runtimeOrigin,
      copy: emailCopy,
    });
    downloadAiBriefEmailTemplate(html, payload.groups[0]?.dateLabel);
    showToast('已下载 AI 快讯 HTML，可用企业邮箱打开后发送');
  };

  const normalizedEmailDraft = emailDraft.trim().toLowerCase();
  const isCurrentSubscription =
    pref.emailSubscribed && pref.email.trim().toLowerCase() === normalizedEmailDraft;

  const toggleEmailSubscription = async () => {
    const result = await setEmailSubscription(emailDraft, !isCurrentSubscription);
    showToast(result.message);
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
                    onChange={(e) => setEmailDraft(e.target.value)}
                    disabled={subscriptionSaving}
                    placeholder="name@huawei.com"
                    maxLength={254}
                    className="w-full rounded-lg border-0 bg-white py-2 pl-8 pr-2.5 text-[12px] text-[#1d1d1f] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] outline-none transition focus:shadow-[inset_0_0_0_2px_#0071e3] disabled:cursor-wait disabled:bg-zinc-100 disabled:text-zinc-400"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void toggleEmailSubscription()}
                  disabled={subscriptionSaving}
                  title={isCurrentSubscription ? '取消当前邮件订阅' : '保存邮件订阅到后台'}
                  className="shrink-0 rounded-lg bg-[#0071e3] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-[#0077ed] disabled:cursor-wait disabled:bg-zinc-300"
                >
                  {subscriptionSaving ? (
                    <i className="fa-solid fa-spinner fa-spin" aria-label="保存中" />
                  ) : isCurrentSubscription ? (
                    '取消订阅'
                  ) : pref.emailSubscribed ? (
                    '更新订阅'
                  ) : (
                    '订阅'
                  )}
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
                  'relative px-3 py-2 text-[13px] font-medium transition after:absolute after:inset-x-2 after:-bottom-[11px] after:h-0.5 after:rounded-full after:bg-transparent',
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
            <DateCalendarFilter
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              initialMonthKey={payload.groups[0]?.dateKey}
              onChange={(startDate, endDate) => setDateRange({ startDate, endDate })}
            />
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
                {visibleGroups.map((group) => (
                  <section key={group.dateLabel} className="scroll-mt-4">
                    <div className="mb-3 flex items-baseline gap-2 px-1">
                      <h2 className="text-[18px] font-bold tracking-tight text-zinc-900">
                        {group.dateLabel}
                      </h2>
                      <span className="text-[11px] text-zinc-500">
                        {group.dateKey === payload.groups[0]?.dateKey ? '最新一日 · ' : ''}
                        {group.items.length} 条
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
                                  {group.dateKey === payload.groups[0]?.dateKey &&
                                  index === 0 &&
                                  categoryFilter === 'all' ? (
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
