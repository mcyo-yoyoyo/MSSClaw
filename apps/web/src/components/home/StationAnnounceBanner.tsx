import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ensureStationAnnouncementInbox,
  openStationAnnouncement,
  openStationAnnouncementList,
  STATION_ANNOUNCEMENTS,
} from '@/domain/stationAnnouncements';

const BADGE_CLASS: Record<string, string> = {
  上线: 'text-[#C8102E]',
  培训: 'text-[#E85D04]',
  通知: 'text-zinc-500',
};

/** 站内公告广播条：压缩高度、无消息卡片外框 */
export function StationAnnounceBanner({ className }: { className?: string }) {
  const [paused, setPaused] = useState(false);
  const items = STATION_ANNOUNCEMENTS;

  useEffect(() => {
    ensureStationAnnouncementInbox();
  }, []);

  const track = useMemo(() => {
    if (!items.length) return [];
    let unit = [...items];
    while (unit.length < 4) unit = [...unit, ...items];
    return [...unit, ...unit];
  }, [items]);

  return (
    <div className={cn('flex items-center gap-2.5 py-1', className)}>
      <span className="shrink-0 text-[11px] font-semibold tracking-tight text-zinc-800">
        站内公告
      </span>
      <div
        className="plaza-marquee min-w-0 flex-1 overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {items.length ? (
          <div
            className={cn(
              'plaza-marquee-track flex w-max items-center gap-5',
              paused && 'plaza-marquee-paused',
            )}
            style={{ animationDuration: `${Math.max(16, items.length * 6)}s` }}
          >
            {track.map((a, i) => (
              <button
                key={`${a.id}-${i}`}
                type="button"
                onClick={() => openStationAnnouncement(a.id)}
                className="inline-flex max-w-[280px] shrink-0 items-baseline gap-1.5 text-left transition hover:opacity-80"
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
        ) : (
          <p className="text-[11px] text-zinc-400">暂无公告</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => openStationAnnouncementList()}
        className="shrink-0 text-[11px] font-medium text-zinc-400 transition hover:text-zinc-700"
      >
        更多
      </button>
    </div>
  );
}
