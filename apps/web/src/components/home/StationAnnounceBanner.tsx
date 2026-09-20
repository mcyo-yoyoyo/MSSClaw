import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  dismissStationAnnouncement,
  ensureStationAnnouncementInbox,
  listUnreadStationAnnouncements,
  openStationAnnouncement,
  openStationAnnouncementList,
  type StationAnnouncement,
} from '@/domain/stationAnnouncements';
import { announcementTagColor } from '@/domain/stationAnnouncementTags';
import { clampTickerIndex, nextTickerIndex, prevTickerIndex } from '@/domain/stationTicker';
import { useInboxStore } from '@/stores/inboxStore';
import { useStationAnnouncementStore } from '@/stores/stationAnnouncementStore';

/** 一条标题的停留时间 */
const ROTATE_MS = 4500;
/** 与 index.css 的 station-ticker 动画时长保持一致 */
const SLIDE_MS = 380;

function AnnounceLine({ announcement }: { announcement: StationAnnouncement }) {
  return (
    <>
      {announcement.badge ? (
        <span
          className="shrink-0 text-[10px] font-semibold"
          style={{ color: announcementTagColor(announcement.badge, announcement.badgeColor) }}
        >
          {announcement.badge}
        </span>
      ) : null}
      <span className="truncate text-[12px] text-zinc-600">{announcement.title}</span>
    </>
  );
}

/**
 * 首页公告条：一次只露一条标题，多条时向上翻页；点标题去「我的消息」看全文，
 * 点 × 擦掉即标为已读，全部读完后整条消失。
 */
export function StationAnnounceBanner({ className }: { className?: string }) {
  const announcements = useStationAnnouncementStore((s) => s.items);
  const announcementsLoaded = useStationAnnouncementStore((s) => s.loaded);
  const inboxMessages = useInboxStore((s) => s.messages);
  const inboxReady = useInboxStore((s) => s.ready);

  const [index, setIndex] = useState(0);
  /** 正在滑出的上一条；back 表示手动往回翻，动画方向相反 */
  const [outgoing, setOutgoing] = useState<{ item: StationAnnouncement; back: boolean } | null>(
    null,
  );
  const [paused, setPaused] = useState(false);
  const [tabHidden, setTabHidden] = useState(
    () => typeof document !== 'undefined' && document.hidden,
  );
  /** 擦掉记在 sessionStorage 里，不是响应式的，靠它触发重算 */
  const [dismissTick, setDismissTick] = useState(0);
  const leaveTimer = useRef<number | null>(null);

  useEffect(() => {
    useStationAnnouncementStore.getState().hydrate();
  }, []);

  // 没有后端的演示构建里，公告要先合成进消息列表，点标题才看得到全文。
  useEffect(() => {
    ensureStationAnnouncementInbox();
  }, [announcements]);

  const items = useMemo(
    // 已读态来自 inbox，上架列表来自公告文档，两边任一变化都要重算。
    () => listUnreadStationAnnouncements(),
    [announcements, inboxMessages, dismissTick],
  );

  useEffect(() => {
    setIndex((current) => clampTickerIndex(current, items.length));
  }, [items.length]);

  useEffect(() => {
    const sync = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  useEffect(
    () => () => {
      if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    },
    [],
  );

  const slide = useCallback((leaving: StationAnnouncement, back: boolean) => {
    setOutgoing({ item: leaving, back });
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setOutgoing(null), SLIDE_MS);
  }, []);

  const advance = useCallback(
    (direction: 1 | -1) => {
      if (items.length < 2) return;
      const from = clampTickerIndex(index, items.length);
      slide(items[from], direction < 0);
      setIndex(
        direction > 0 ? nextTickerIndex(from, items.length) : prevTickerIndex(from, items.length),
      );
    },
    [index, items, slide],
  );

  useEffect(() => {
    if (items.length < 2 || paused || tabHidden) return;
    const timer = window.setTimeout(() => advance(1), ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [advance, items.length, paused, tabHidden]);

  const wipe = useCallback(
    (announcement: StationAnnouncement) => {
      // 先播擦掉动画，再让下一条补位：剩余条数由 items 重算得出。
      slide(announcement, false);
      dismissStationAnnouncement(announcement.id);
      setDismissTick((tick) => tick + 1);
    },
    [slide],
  );

  // 公告列表和已读态都从服务端回来后再渲染，否则会闪一条已经读过、或库里已经没有的公告。
  if (!announcementsLoaded || !inboxReady || !items.length) return null;

  const position = clampTickerIndex(index, items.length);
  const current = items[position];

  return (
    <div
      className={cn('flex items-center gap-2 py-1', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      role="region"
      aria-label="站内公告"
    >
      <span className="shrink-0 text-[11px] font-semibold tracking-tight text-zinc-800">
        站内公告
      </span>

      <div className="station-ticker min-w-0 flex-1">
        {outgoing ? (
          <div
            key={`out-${outgoing.item.id}`}
            className={cn(
              'station-ticker-line',
              outgoing.back ? 'station-ticker-leave-back' : 'station-ticker-leave',
            )}
            aria-hidden
          >
            <AnnounceLine announcement={outgoing.item} />
          </div>
        ) : null}
        <div
          key={current.id}
          className={cn(
            'station-ticker-line',
            outgoing && (outgoing.back ? 'station-ticker-enter-back' : 'station-ticker-enter'),
          )}
        >
          <button
            type="button"
            onClick={() => openStationAnnouncement(current.id)}
            className="flex min-w-0 items-center gap-1.5 text-left transition hover:opacity-80"
            title="查看公告全文"
          >
            <AnnounceLine announcement={current} />
          </button>
        </div>
      </div>

      {items.length > 1 ? (
        // 窄屏优先留给标题：手动翻页和计数藏起来，自动翻页仍在走
        <div className="hidden shrink-0 items-center gap-0.5 sm:flex">
          <button
            type="button"
            onClick={() => advance(-1)}
            aria-label="上一条公告"
            className="rounded p-0.5 text-zinc-400 transition hover:text-zinc-700"
          >
            <i className="fa-solid fa-chevron-up text-[9px]" />
          </button>
          <button
            type="button"
            onClick={() => advance(1)}
            aria-label="下一条公告"
            className="rounded p-0.5 text-zinc-400 transition hover:text-zinc-700"
          >
            <i className="fa-solid fa-chevron-down text-[9px]" />
          </button>
          <span className="ml-0.5 shrink-0 text-[10px] tabular-nums text-zinc-400">
            {position + 1}/{items.length}
          </span>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => wipe(current)}
        aria-label={`擦掉公告：${current.title}`}
        title="擦掉（标记为已读）"
        className="shrink-0 rounded p-0.5 text-zinc-400 transition hover:text-zinc-700"
      >
        <i className="fa-solid fa-xmark text-[10px]" />
      </button>

      <button
        type="button"
        onClick={openStationAnnouncementList}
        className="shrink-0 text-[11px] font-medium text-zinc-400 transition hover:text-zinc-700"
      >
        更多
      </button>
    </div>
  );
}
