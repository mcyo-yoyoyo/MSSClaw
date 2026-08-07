import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  STATION_ANNOUNCEMENT_SEEDS,
  type StationAnnouncementBadge,
} from '@/domain/stationAnnouncementSeeds';
import {
  useStationAnnouncementStore,
  type StationAnnouncementRecord,
} from '@/stores/stationAnnouncementStore';

const BADGES: StationAnnouncementBadge[] = ['AI上线', 'AI培训'];

function newDraft(): StationAnnouncementRecord {
  return {
    id: `ann-${Date.now().toString(36)}`,
    title: '',
    body: '',
    badge: 'AI上线',
    publishedAt: new Date().toISOString(),
    published: true,
  };
}

/** 门户运营 · 站内公告（首页跑马灯） */
export function PortalStationAnnouncePanel() {
  const items = useStationAnnouncementStore((s) => s.items);
  const hydrate = useStationAnnouncementStore((s) => s.hydrate);
  const upsert = useStationAnnouncementStore((s) => s.upsert);
  const remove = useStationAnnouncementStore((s) => s.remove);
  const togglePublished = useStationAnnouncementStore((s) => s.togglePublished);
  const resetToSeeds = useStationAnnouncementStore((s) => s.resetToSeeds);
  const showToast = useStationAnnouncementStore((s) => s.toast);
  const dismissToast = useStationAnnouncementStore((s) => s.dismissToast);

  const [draft, setDraft] = useState<StationAnnouncementRecord | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!showToast) return;
    const t = window.setTimeout(() => dismissToast(), 2400);
    return () => window.clearTimeout(t);
  }, [showToast, dismissToast]);

  const save = () => {
    if (!draft) return;
    if (!draft.title.trim()) return;
    const isNew = !items.some((a) => a.id === draft.id);
    upsert(
      {
        ...draft,
        publishedAt: draft.publishedAt || new Date().toISOString(),
      },
      isNew,
    );
    setDraft(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4">
        <p className="text-[12px] leading-relaxed text-zinc-500">
          配置首页横向「站内动态」跑马灯。仅
          <strong className="font-semibold text-zinc-700">AI上线 / AI培训</strong>
          会与「AI快讯」一并露出；通知类内容不再进入首页滚动。仅
          <strong className="font-semibold text-zinc-700">已上架</strong>
          项对业务用户可见，并同步到「我的消息」。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDraft(newDraft())}
            className="rounded-xl bg-zinc-900 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-zinc-800"
          >
            新建公告
          </button>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm('恢复系统默认公告示例？当前自定义将被覆盖。')) return;
              resetToSeeds();
              setDraft(null);
            }}
            className="rounded-xl border border-zinc-200 px-3 py-1.5 text-[12px] font-medium text-zinc-600 hover:bg-zinc-50"
          >
            恢复默认示例
          </button>
          <span className="self-center text-[11px] text-zinc-400">
            已上架 {items.filter((a) => a.published).length} / {items.length} · 种子{' '}
            {STATION_ANNOUNCEMENT_SEEDS.length} 条可参考
          </span>
        </div>
      </div>

      {showToast ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
          {showToast}
        </div>
      ) : null}

      {draft ? (
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold text-zinc-900">
              {items.some((a) => a.id === draft.id) ? '编辑公告' : '新建公告'}
            </h3>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="text-[12px] text-zinc-500 hover:text-zinc-800"
            >
              取消
            </button>
          </div>
          <label className="block text-[11px] font-medium text-zinc-500">
            标题
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] text-zinc-800"
              placeholder="一句话标题，跑马灯主文案"
            />
          </label>
          <label className="block text-[11px] font-medium text-zinc-500">
            正文
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={4}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] text-zinc-800"
              placeholder="消息详情全文（点击公告后在「我的消息」阅读）"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="text-[11px] font-medium text-zinc-500">
              类型
              <select
                value={draft.badge}
                onChange={(e) =>
                  setDraft({ ...draft, badge: e.target.value as StationAnnouncementBadge })
                }
                className="ml-2 rounded-lg border border-zinc-200 px-2 py-1.5 text-[12px]"
              >
                {BADGES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex items-center gap-2 text-[12px] text-zinc-600">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
              />
              上架到首页跑马灯
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={save}
              disabled={!draft.title.trim()}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-40"
            >
              保存
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {items.length ? (
          items.map((a) => (
            <article
              key={a.id}
              className="flex flex-col gap-2 rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                      a.badge === 'AI上线'
                        ? 'bg-red-50 text-[#C8102E]'
                        : 'bg-orange-50 text-[#E85D04]',
                    )}
                  >
                    {a.badge}
                  </span>
                  <h4 className="truncate text-[13px] font-semibold text-zinc-900">{a.title}</h4>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                      a.published
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-zinc-100 text-zinc-400',
                    )}
                  >
                    {a.published ? '已上架' : '未上架'}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] text-zinc-500">{a.body}</p>
                <p className="mt-1 text-[10px] text-zinc-400">
                  {a.publishedAt.slice(0, 10)} · {a.id}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => togglePublished(a.id)}
                  className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  {a.published ? '下架' : '上架'}
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ ...a })}
                  className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`删除公告「${a.title}」？`)) return;
                    remove(a.id);
                  }}
                  className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50"
                >
                  删除
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-12 text-center text-[13px] text-zinc-400">
            暂无公告。可新建，或恢复默认示例。
          </div>
        )}
      </div>
    </div>
  );
}
