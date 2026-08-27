import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { AI_NEWS_SEEDS, type AiNewsCadence } from '@/domain/aiNewsSeeds';
import { ensureAiNewsOverviewInbox } from '@/domain/aiNews';
import { useAiNewsStore, type AiNewsRecord } from '@/stores/aiNewsStore';
import { useAiBotDailyNewsStore } from '@/stores/aiBotDailyNewsStore';

type SyncFeedback = {
  ok: boolean;
  message: string;
};

function newDraft(): AiNewsRecord {
  const day = new Date().toISOString().slice(0, 10);
  return {
    id: `ainews-${day}-${Date.now().toString(36).slice(-4)}`,
    title: '',
    summary: '',
    body: '',
    cadence: 'daily',
    publishedAt: new Date().toISOString(),
    source: 'MSS AI 运营整理',
    published: true,
  };
}

/** 门户运营 · 每日 / 每周 AI 新闻 */
export function PortalAiNewsPanel() {
  const items = useAiNewsStore((s) => s.items);
  const hydrate = useAiNewsStore((s) => s.hydrate);
  const upsert = useAiNewsStore((s) => s.upsert);
  const remove = useAiNewsStore((s) => s.remove);
  const togglePublished = useAiNewsStore((s) => s.togglePublished);
  const resetToSeeds = useAiNewsStore((s) => s.resetToSeeds);
  const showToast = useAiNewsStore((s) => s.toast);
  const dismissToast = useAiNewsStore((s) => s.dismissToast);
  const syncing = useAiBotDailyNewsStore((s) => s.syncing);
  const syncFromSource = useAiBotDailyNewsStore((s) => s.syncFromSource);

  const [draft, setDraft] = useState<AiNewsRecord | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<SyncFeedback | null>(null);

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
    ensureAiNewsOverviewInbox();
    setDraft(null);
  };

  const pullLatestNews = async () => {
    if (syncing) return;
    setSyncFeedback(null);
    const result = await syncFromSource();
    setSyncFeedback({ ok: result.ok, message: result.message });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4">
        <p className="text-[12px] leading-relaxed text-zinc-500">
          配置每日 AI 新闻（同一天仅保留一条，重复发布会覆盖当日）。首页只滚动最新一期；历史在「我的消息 ·
          AI新闻总览」已迁至顶栏「AI快讯」。拉取新闻会更新顶栏「AI快讯」，不会覆盖下方站内稿；订阅为 WeLink
          二期预留。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void pullLatestNews()}
            disabled={syncing}
            aria-busy={syncing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-[12px] font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 disabled:cursor-wait disabled:opacity-60"
            title="从 AIHOT 拉取并更新顶栏 AI快讯"
          >
            <i
              className={cn(
                'fa-solid fa-arrows-rotate text-[10px]',
                syncing && 'animate-spin',
              )}
              aria-hidden="true"
            />
            {syncing ? '正在拉取…' : '拉取新闻'}
          </button>
          <button
            type="button"
            onClick={() => setDraft(newDraft())}
            className="rounded-xl bg-zinc-900 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-zinc-800"
          >
            新建新闻
          </button>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm('恢复系统默认 AI 新闻示例？当前自定义将被覆盖。')) return;
              resetToSeeds();
              ensureAiNewsOverviewInbox();
              setDraft(null);
            }}
            className="rounded-xl border border-zinc-200 px-3 py-1.5 text-[12px] font-medium text-zinc-600 hover:bg-zinc-50"
          >
            恢复默认示例
          </button>
          <span className="self-center text-[11px] text-zinc-400">
            已上架 {items.filter((a) => a.published).length} / {items.length} · 种子{' '}
            {AI_NEWS_SEEDS.length} 条可参考
          </span>
        </div>
      </div>

      {syncFeedback ? (
        <div
          role={syncFeedback.ok ? 'status' : 'alert'}
          aria-live="polite"
          className={cn(
            'flex items-start gap-2 rounded-xl border px-3 py-2 text-[12px]',
            syncFeedback.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700',
          )}
        >
          <i
            className={cn(
              'fa-solid mt-0.5 text-[11px]',
              syncFeedback.ok ? 'fa-circle-check' : 'fa-circle-exclamation',
            )}
            aria-hidden="true"
          />
          <span>{syncFeedback.message}</span>
        </div>
      ) : null}

      {showToast ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
          {showToast}
        </div>
      ) : null}

      {draft ? (
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold text-zinc-900">
              {items.some((a) => a.id === draft.id) ? '编辑新闻' : '新建新闻'}
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
              placeholder="今日 AI 简报：…"
            />
          </label>
          <label className="block text-[11px] font-medium text-zinc-500">
            跑马灯摘要（可选）
            <input
              value={draft.summary ?? ''}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] text-zinc-800"
              placeholder="滚动条展示；留空则用标题"
            />
          </label>
          <label className="block text-[11px] font-medium text-zinc-500">
            正文
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={6}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] text-zinc-800"
              placeholder="正文（在「AI新闻总览」阅读）"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="text-[11px] font-medium text-zinc-500">
              节奏
              <select
                value={draft.cadence}
                onChange={(e) =>
                  setDraft({ ...draft, cadence: e.target.value as AiNewsCadence })
                }
                className="ml-2 rounded-lg border border-zinc-200 px-2 py-1.5 text-[12px]"
              >
                <option value="daily">日更</option>
                <option value="weekly">周报</option>
              </select>
            </label>
            <label className="text-[11px] font-medium text-zinc-500">
              来源
              <input
                value={draft.source ?? ''}
                onChange={(e) => setDraft({ ...draft, source: e.target.value })}
                className="ml-2 rounded-lg border border-zinc-200 px-2 py-1.5 text-[12px]"
                placeholder="MSS AI 运营整理"
              />
            </label>
            <label className="inline-flex items-center gap-2 text-[12px] text-zinc-600">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
              />
              上架到首页与消息
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
                      a.cadence === 'weekly'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-sky-50 text-sky-800',
                    )}
                  >
                    {a.cadence === 'weekly' ? '周报' : '日更'}
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
                <p className="mt-1 line-clamp-2 text-[12px] text-zinc-500">
                  {a.summary || a.body}
                </p>
                <p className="mt-1 text-[10px] text-zinc-400">
                  {a.publishedAt.slice(0, 10)} · {a.id}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    togglePublished(a.id);
                    ensureAiNewsOverviewInbox();
                  }}
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
                    if (!window.confirm(`删除新闻「${a.title}」？`)) return;
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
            暂无新闻。可新建，或恢复默认示例。
          </div>
        )}
      </div>
    </div>
  );
}
