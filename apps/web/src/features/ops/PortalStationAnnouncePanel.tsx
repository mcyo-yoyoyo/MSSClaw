import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ANNOUNCEMENT_TAG_MAX_LENGTH,
  ANNOUNCEMENT_TAG_PRESET_COLORS,
  ANNOUNCEMENT_TITLE_SOFT_LIMIT,
  announcementTagChipStyle,
  announcementTagColor,
  normalizeAnnouncementColor,
} from '@/domain/stationAnnouncementTags';
import {
  useStationAnnouncementStore,
  type StationAnnouncementRecord,
} from '@/stores/stationAnnouncementStore';

function newDraft(): StationAnnouncementRecord {
  return {
    id: `ann-${Date.now().toString(36)}`,
    title: '',
    body: '',
    badge: '',
    publishedAt: new Date().toISOString(),
    published: true,
  };
}

/** 首页公告条的预览：和 StationAnnounceBanner 的单行布局一致 */
function HomeLinePreview({
  badge,
  badgeColor,
  title,
}: {
  badge: string;
  badgeColor?: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2">
      <span className="shrink-0 text-[11px] font-semibold tracking-tight text-zinc-800">
        站内公告
      </span>
      <div className="flex h-5 min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        {badge ? (
          <span
            className="shrink-0 text-[10px] font-semibold"
            style={{ color: announcementTagColor(badge, badgeColor) }}
          >
            {badge}
          </span>
        ) : null}
        <span className="truncate text-[12px] text-zinc-600">
          {title.trim() || '（标题预览）'}
        </span>
      </div>
      <span className="shrink-0 text-[10px] text-zinc-400">1/1 · × · 更多</span>
    </div>
  );
}

/** 门户运营 · 站内公告（首页公告条 + 我的消息） */
export function PortalStationAnnouncePanel() {
  const items = useStationAnnouncementStore((s) => s.items);
  const hydrate = useStationAnnouncementStore((s) => s.hydrate);
  const upsert = useStationAnnouncementStore((s) => s.upsert);
  const remove = useStationAnnouncementStore((s) => s.remove);
  const togglePublished = useStationAnnouncementStore((s) => s.togglePublished);
  const listTags = useStationAnnouncementStore((s) => s.listTags);

  const [draft, setDraft] = useState<StationAnnouncementRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StationAnnouncementRecord | null>(null);
  const knownTags = useMemo(() => listTags(), [items, listTags]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const editing = Boolean(draft && items.some((a) => a.id === draft.id));

  const save = () => {
    if (!draft) return;
    if (!draft.title.trim()) return;
    upsert(
      {
        ...draft,
        publishedAt: draft.publishedAt || new Date().toISOString(),
      },
      !editing,
    );
    setDraft(null);
  };

  const titleLength = draft?.title.trim().length ?? 0;
  const titleTooLong = titleLength > ANNOUNCEMENT_TITLE_SOFT_LIMIT;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4">
        <p className="text-[12px] leading-relaxed text-zinc-500">
          配置首页「站内公告」。已上架公告对
          <strong className="font-semibold text-zinc-700">全部用户</strong>
          可见：首页一次滚动一条标题，点标题进「我的消息」看全文；用户点 ×
          擦掉即视为已读，之后不再滚动。
          <strong className="font-semibold text-zinc-700">下架</strong>
          只退出首页滚动，已发出的消息保留；
          <strong className="font-semibold text-zinc-700">删除</strong>
          会一并撤回消息，用于误发。
        </p>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setDraft(newDraft())}
            className="rounded-xl bg-zinc-900 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-zinc-800"
          >
            新建公告
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {items.length ? (
          items.map((a) => (
            <article
              key={a.id}
              className="flex flex-col gap-2 rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {a.badge ? (
                    <span
                      className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                      style={announcementTagChipStyle(
                        announcementTagColor(a.badge, a.badgeColor),
                      )}
                    >
                      {a.badge}
                    </span>
                  ) : null}
                  <h4 className="truncate text-[13px] font-semibold text-zinc-900">{a.title}</h4>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                      a.published ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-400',
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
                  onClick={() => setPendingDelete(a)}
                  className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50"
                >
                  删除
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-12 text-center text-[13px] text-zinc-400">
            暂无公告。点「新建公告」发布第一条。
          </div>
        )}
      </div>

      {pendingDelete ? (
        // 删除是不可撤销的写操作，遮罩同样不做点击关闭。
        <div className="modal-backdrop fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="删除公告"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-black/5 bg-white shadow-apple-lg"
          >
            <div className="px-5 py-4">
              <h3 className="text-[15px] font-semibold text-zinc-900">删除公告</h3>
              <p className="mt-2 truncate text-[13px] font-medium text-zinc-800">
                「{pendingDelete.title}」
              </p>
              <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-zinc-500">
                <li>· 从首页公告条移除</li>
                <li>· 所有用户「我的消息」里的这条通知一并撤回</li>
                <li>· 删除后不可恢复；只是想停止滚动请用「下架」</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2 border-t border-black/[0.06] px-5 py-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-[12px] font-medium text-zinc-600 hover:bg-zinc-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  remove(pendingDelete.id);
                  if (draft?.id === pendingDelete.id) setDraft(null);
                  setPendingDelete(null);
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-red-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {draft ? (
        // 遮罩不绑定点击关闭：表单里有未保存的正文，误点阴影不能丢草稿。
        <div className="modal-backdrop fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editing ? '编辑公告' : '新建公告'}
            className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-apple-lg"
          >
            <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
              <div>
                <h3 className="text-[15px] font-semibold text-zinc-900">
                  {editing ? '编辑公告' : '新建公告'}
                </h3>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  保存即对全部用户生效，首页公告条与「我的消息」同步更新
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDraft(null)}
                aria-label="关闭"
                className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              >
                <i className="fa-solid fa-xmark text-[13px]" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              <label className="block text-[11px] font-medium text-zinc-500">
                标题
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  autoFocus
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] text-zinc-800"
                  placeholder="一句话标题，首页只滚动这一行"
                />
                <span
                  className={cn(
                    'mt-1 block text-[10px]',
                    titleTooLong ? 'text-amber-700' : 'text-zinc-400',
                  )}
                >
                  {titleLength} 字 · 建议不超过 {ANNOUNCEMENT_TITLE_SOFT_LIMIT} 字
                  {titleTooLong ? '，超出部分在首页会被省略号截断' : ''}
                </span>
              </label>

              <label className="block text-[11px] font-medium text-zinc-500">
                正文
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  rows={5}
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] text-zinc-800"
                  placeholder="消息详情全文（用户点标题后在「我的消息」阅读，支持换行分段）"
                />
              </label>

              <div className="flex flex-wrap items-start gap-4">
                <label className="text-[11px] font-medium text-zinc-500">
                  标签
                  <input
                    value={draft.badge}
                    onChange={(e) => setDraft({ ...draft, badge: e.target.value })}
                    list="station-announce-tags"
                    maxLength={ANNOUNCEMENT_TAG_MAX_LENGTH}
                    className="ml-2 w-36 rounded-lg border border-zinc-200 px-2 py-1.5 text-[12px] text-zinc-800"
                    placeholder="如 AI上线 / 维护"
                  />
                  <datalist id="station-announce-tags">
                    {knownTags.map((tag) => (
                      <option key={tag} value={tag} />
                    ))}
                  </datalist>
                  <span className="ml-2 text-[10px] text-zinc-400">可自定义，留空则不显示</span>
                </label>
                <label className="inline-flex items-center gap-2 self-center text-[12px] text-zinc-600">
                  <input
                    type="checkbox"
                    checked={draft.published}
                    onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                  />
                  上架到首页公告条
                </label>
              </div>

              <div className="text-[11px] font-medium text-zinc-500">
                标签颜色
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, badgeColor: undefined })}
                    aria-pressed={!draft.badgeColor}
                    className={cn(
                      'rounded-lg border px-2 py-1 text-[11px] font-medium transition',
                      draft.badgeColor
                        ? 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                        : 'border-zinc-900 text-zinc-900',
                    )}
                  >
                    自动
                  </button>
                  {ANNOUNCEMENT_TAG_PRESET_COLORS.map((preset) => {
                    const active = normalizeAnnouncementColor(draft.badgeColor) === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setDraft({ ...draft, badgeColor: preset.value })}
                        aria-label={`标签颜色 ${preset.label}`}
                        aria-pressed={active}
                        title={preset.label}
                        className={cn(
                          'h-6 w-6 rounded-full border-2 transition',
                          active ? 'border-zinc-900' : 'border-transparent hover:border-zinc-300',
                        )}
                        style={{ backgroundColor: preset.value }}
                      />
                    );
                  })}
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-50">
                    自定义
                    <input
                      type="color"
                      value={announcementTagColor(draft.badge, draft.badgeColor)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          badgeColor: normalizeAnnouncementColor(e.target.value) || undefined,
                        })
                      }
                      aria-label="自定义标签颜色"
                      className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
                    />
                  </label>
                </div>
                <span className="mt-1.5 block text-[10px] text-zinc-400">
                  「自动」按标签文字取色，同一个标签在所有页面同色；选定颜色只影响这条公告。
                </span>
              </div>

              <HomeLinePreview
                badge={draft.badge}
                badgeColor={draft.badgeColor}
                title={draft.title}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-black/[0.06] px-5 py-3">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-[12px] font-medium text-zinc-600 hover:bg-zinc-50"
              >
                取消
              </button>
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
        </div>
      ) : null}
    </div>
  );
}
