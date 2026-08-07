import { useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { flattenAiBotNews } from '@/domain/aiBotDailyNews';
import { useAiBotDailyNewsStore } from '@/stores/aiBotDailyNewsStore';
import { useAiNewsPreferenceStore } from '@/stores/aiNewsPreferenceStore';
import { useAppViewStore } from '@/stores/appViewStore';

/** 首页 Hero 右侧：扁平板化 AI 快讯露出 */
export function HomeAiBriefTeaser() {
  const payload = useAiBotDailyNewsStore((s) => s.payload);
  const loading = useAiBotDailyNewsStore((s) => s.loading);
  const hydrate = useAiBotDailyNewsStore((s) => s.hydrate);
  const pref = useAiNewsPreferenceStore((s) => s.pref);
  const hydratePref = useAiNewsPreferenceStore((s) => s.hydrate);
  const setAppView = useAppViewStore((s) => s.setAppView);

  useEffect(() => {
    void hydrate();
    hydratePref();
  }, [hydrate, hydratePref]);

  const items = useMemo(() => flattenAiBotNews(payload).slice(0, 3), [payload]);
  const dateLabel = payload.groups[0]?.dateLabel;

  return (
    <aside className="home-brief-teaser">
      <div className="home-brief-teaser__head">
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="truncate text-[13px] font-semibold tracking-tight text-[#1d1d1f]">AI快讯</p>
          {dateLabel ? (
            <span className="truncate text-[11px] font-medium text-[#86868b]">{dateLabel}</span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setAppView('ai-brief')}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition',
              pref.emailSubscribed
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'bg-[#1d1d1f] text-white hover:bg-[#2c2c2e]',
            )}
          >
            <i className="fa-regular fa-envelope text-[8px]" />
            {pref.emailSubscribed ? '已订阅' : '订阅'}
          </button>
          <button
            type="button"
            onClick={() => setAppView('ai-brief')}
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#0071e3] transition hover:underline"
          >
            全部
            <i className="fa-solid fa-arrow-right text-[8px]" />
          </button>
        </div>
      </div>

      <div className="home-brief-teaser__list">
        {loading && !items.length ? (
          <p className="py-2 text-[11px] text-[#86868b]">
            <i className="fa-solid fa-spinner fa-spin mr-1 text-[10px]" />
            加载中…
          </p>
        ) : !items.length ? (
          <p className="py-2 text-[11px] text-[#86868b]">暂无快讯</p>
        ) : (
          items.map((item, i) => (
            <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="home-brief-teaser__row">
              <span className="w-3.5 shrink-0 font-mono text-[10px] tabular-nums text-[#86868b]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span title={item.title}>{item.title}</span>
            </a>
          ))
        )}
      </div>
    </aside>
  );
}
