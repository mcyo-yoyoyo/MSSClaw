import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { openAiNewsList } from '@/domain/aiNews';
import {
  ensureStationAnnouncementInbox,
  openStationAnnouncement,
  openStationAnnouncementList,
} from '@/domain/stationAnnouncements';
import { useAiBotDailyNewsStore } from '@/stores/aiBotDailyNewsStore';
import { useStationAnnouncementStore } from '@/stores/stationAnnouncementStore';

const BADGE_CLASS: Record<string, string> = {
  AI上线: 'text-[#C8102E]',
  AI培训: 'text-[#E85D04]',
  AI快讯: 'text-sky-700',
};

type MarqueeItem = {
  id: string;
  title: string;
  badge: string;
  kind: 'announce' | 'ai_brief';
};

/** 首页广播条：仅 AI快讯 / AI培训 / AI上线 */
export function StationAnnounceBanner({ className }: { className?: string }) {
  const [paused, setPaused] = useState(false);
  const announceRaw = useStationAnnouncementStore((s) => s.items);
  const briefPayload = useAiBotDailyNewsStore((s) => s.payload);
  const hydrateBrief = useAiBotDailyNewsStore((s) => s.hydrate);

  const items = useMemo((): MarqueeItem[] => {
    const latest = briefPayload.groups[0]?.items[0];
    const news: MarqueeItem[] = latest
      ? [
          {
            id: latest.id,
            title: latest.summary?.trim() || latest.title,
            badge: 'AI快讯',
            kind: 'ai_brief',
          },
        ]
      : [];
    const announces: MarqueeItem[] = announceRaw
      .filter((a) => a.published && (a.badge === 'AI上线' || a.badge === 'AI培训'))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .map((a) => ({
        id: a.id,
        title: a.title,
        badge: a.badge,
        kind: 'announce' as const,
      }));
    return [...news, ...announces];
  }, [announceRaw, briefPayload]);

  useEffect(() => {
    useStationAnnouncementStore.getState().hydrate();
    void hydrateBrief();
    ensureStationAnnouncementInbox();
  }, [hydrateBrief]);

  useEffect(() => {
    ensureStationAnnouncementInbox();
  }, [items]);

  const track = useMemo(() => {
    if (!items.length) return [];
    let unit = [...items];
    while (unit.length < 4) unit = [...unit, ...items];
    return [...unit, ...unit];
  }, [items]);

  if (!items.length) return null;

  const openItem = (item: MarqueeItem) => {
    if (item.kind === 'ai_brief') openAiNewsList();
    else openStationAnnouncement(item.id);
  };

  const openMore = () => {
    const hasBrief = items.some((i) => i.kind === 'ai_brief');
    if (hasBrief) openAiNewsList();
    else openStationAnnouncementList();
  };

  return (
    <div
      className={cn('flex items-center gap-2.5 py-1', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="shrink-0 text-[11px] font-semibold tracking-tight text-zinc-800">
        站内动态
      </span>
      <div className="plaza-marquee min-w-0 flex-1 overflow-hidden">
        <div
          className={cn(
            'plaza-marquee-track flex w-max items-center gap-5',
            paused && 'plaza-marquee-paused',
          )}
          style={{ animationDuration: `${Math.max(27, items.length * 10)}s` }}
        >
          {track.map((a, i) => (
            <button
              key={`${a.kind}-${a.id}-${i}`}
              type="button"
              onClick={() => openItem(a)}
              className="inline-flex max-w-[300px] shrink-0 items-baseline gap-1.5 text-left transition hover:opacity-80"
            >
              <span
                className={cn(
                  'shrink-0 text-[10px] font-semibold',
                  BADGE_CLASS[a.badge] ?? 'text-zinc-500',
                )}
              >
                {a.badge}
              </span>
              <span className="truncate text-[12px] text-zinc-600">{a.title}</span>
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={openMore}
        className="shrink-0 text-[11px] font-medium text-zinc-400 transition hover:text-zinc-700"
      >
        更多
      </button>
    </div>
  );
}
