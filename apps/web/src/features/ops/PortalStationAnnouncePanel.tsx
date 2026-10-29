import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { cn } from '@/lib/utils';
import { uploadWorkspaceBlob } from '@/api/blobApi';
import { AnnouncementBody } from '@/components/common/AnnouncementBody';
import {
  ANNOUNCEMENT_IMAGE_MAX_BYTES,
  ANNOUNCEMENT_IMAGE_MAX_COUNT,
  ANNOUNCEMENT_IMAGE_TYPES,
  announcementImageMarkdown,
  announcementSummary,
  countAnnouncementImages,
  insertImageLine,
} from '@/domain/announcementBody';
import {
  ANNOUNCEMENT_TAG_MAX_LENGTH,
  ANNOUNCEMENT_TITLE_SOFT_LIMIT,
  announcementTagChipStyle,
  announcementTagColor,
} from '@/domain/stationAnnouncementTags';
import { useStationAnnouncementStore } from '@/stores/stationAnnouncementStore';
import type { StationAnnouncement } from '@/domain/stationAnnouncementSeeds';

function newDraft(): StationAnnouncement {
  return {
    id: `ann-${Date.now().toString(36)}`,
    title: '',
    body: '',
    badge: '',
    publishedAt: new Date().toISOString(),
    pinned: false,
    listed: true,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取失败'));
    reader.readAsDataURL(file);
  });
}

/** 首页公告条的预览：和 StationAnnounceBanner 的单行布局一致 */
function HomeLinePreview({
  badge,
  badgeColor,
  title,
  pinned,
}: {
  badge: string;
  badgeColor?: string;
  title: string;
  pinned: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2">
      <span className="shrink-0 text-[11px] font-semibold tracking-tight text-zinc-800">
        站内公告
      </span>
      <div className="flex h-5 min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        {pinned ? (
          <span className="shrink-0 text-[10px] font-semibold text-amber-700">置顶</span>
        ) : null}
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
  const togglePinned = useStationAnnouncementStore((s) => s.togglePinned);
  const toggleListed = useStationAnnouncementStore((s) => s.toggleListed);
  const listTags = useStationAnnouncementStore((s) => s.listTags);

  const [draft, setDraft] = useState<StationAnnouncement | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StationAnnouncement | null>(null);
  const [uploadingImages, setUploadingImages] = useState(0);
  const [imageError, setImageError] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 上传是异步的：插入时以当下的正文为准，免得覆盖上传期间运营新打的字
  const draftRef = useRef<StationAnnouncement | null>(draft);
  draftRef.current = draft;
  const knownTags = useMemo(() => listTags(), [items, listTags]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // 从长列表下方点「编辑」时，编辑页顶部可能在视口上方
  const editorRef = useRef<HTMLDivElement>(null);
  const draftId = draft?.id;
  useEffect(() => {
    const el = editorRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' });
  }, [draftId]);

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

  /** 逐张上传并插到光标处（图片独占一行）；超格式、超大小、超张数的跳过并提示 */
  const insertImages = async (files: File[]) => {
    const images = files.filter((file) => file.type.startsWith('image/'));
    if (!images.length || !draftRef.current) return;
    setImageError('');
    let cursor = bodyRef.current?.selectionStart ?? draftRef.current.body.length;
    for (const file of images) {
      const current: StationAnnouncement | null = draftRef.current;
      if (!current) return;
      if (!(ANNOUNCEMENT_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        setImageError(`${file.name}：只支持 PNG / JPG / WebP / GIF`);
        continue;
      }
      if (file.size > ANNOUNCEMENT_IMAGE_MAX_BYTES) {
        setImageError(`${file.name} 超过 5MB，请压缩后再插入`);
        continue;
      }
      if (countAnnouncementImages(current.body) >= ANNOUNCEMENT_IMAGE_MAX_COUNT) {
        setImageError(`每条公告最多 ${ANNOUNCEMENT_IMAGE_MAX_COUNT} 张图片`);
        break;
      }
      setUploadingImages((n) => n + 1);
      try {
        const uploaded = await uploadWorkspaceBlob({
          name: file.name,
          mimeType: file.type,
          dataUrl: await readFileAsDataUrl(file),
        });
        const latest: StationAnnouncement | null = draftRef.current;
        if (!latest) return;
        const next = insertImageLine(latest.body, cursor, announcementImageMarkdown(file.name, uploaded.id));
        cursor = next.cursor;
        draftRef.current = { ...latest, body: next.body };
        setDraft(draftRef.current);
      } catch {
        setImageError(`${file.name} 上传失败，请重试`);
      } finally {
        setUploadingImages((n) => n - 1);
      }
    }
    requestAnimationFrame(() => {
      bodyRef.current?.focus();
      bodyRef.current?.setSelectionRange(cursor, cursor);
    });
  };

  const onBodyPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = [...event.clipboardData.files].filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;
    event.preventDefault();
    void insertImages(files);
  };

  const onBodyDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;
    event.preventDefault();
    void insertImages(files);
  };

  const imageCount = draft ? countAnnouncementImages(draft.body) : 0;
  const titleLength = draft?.title.trim().length ?? 0;
  const titleTooLong = titleLength > ANNOUNCEMENT_TITLE_SOFT_LIMIT;

  // 编辑是面板内的二级页面：弹窗太窄，正文和图片预览挤不开
  if (draft) {
    return (
      <div ref={editorRef} className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="mb-1.5 inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-500 transition hover:text-zinc-900"
            >
              <i className="fa-solid fa-arrow-left text-[11px]" />
              返回公告列表
            </button>
            <h3 className="text-[16px] font-semibold text-zinc-900">
              {editing ? '编辑公告' : '新建公告'}
            </h3>
            <p className="mt-0.5 text-[12px] text-zinc-500">
              保存即对全部用户生效，首页公告条与「我的消息」同步更新
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[12px] font-medium text-zinc-600 transition hover:bg-zinc-50 active:scale-[0.97]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!draft.title.trim() || uploadingImages > 0}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800 active:scale-[0.97] disabled:opacity-40"
            >
              {uploadingImages > 0 ? '图片上传中…' : '保存'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
          <section className="min-w-0 space-y-5 rounded-2xl border border-zinc-200/90 bg-white p-5">
            <label className="block text-[12px] font-medium text-zinc-600">
              标题
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                autoFocus
                className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-[14px] text-zinc-800"
                placeholder="一句话标题，首页只滚动这一行"
              />
              <span
                className={cn(
                  'mt-1 block text-[11px] font-normal',
                  titleTooLong ? 'text-amber-700' : 'text-zinc-400',
                )}
              >
                {titleLength} 字 · 建议不超过 {ANNOUNCEMENT_TITLE_SOFT_LIMIT} 字
                {titleTooLong ? '，超出部分在首页会被省略号截断' : ''}
              </span>
            </label>

            <div>
              <label className="block text-[12px] font-medium text-zinc-600">
                正文
                <textarea
                  ref={bodyRef}
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  onPaste={onBodyPaste}
                  onDrop={onBodyDrop}
                  rows={14}
                  className="mt-1.5 w-full resize-y rounded-xl border border-zinc-200 px-3 py-2.5 text-[13px] font-normal leading-relaxed text-zinc-800"
                  placeholder="消息详情全文（用户点标题后在「我的消息」阅读，支持换行分段；可直接粘贴截图）"
                />
              </label>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-zinc-400">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImages > 0 || imageCount >= ANNOUNCEMENT_IMAGE_MAX_COUNT}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <i className="fa-regular fa-image text-[11px]" />
                  {uploadingImages > 0 ? '上传中…' : '插入图片'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ANNOUNCEMENT_IMAGE_TYPES.join(',')}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = [...(e.target.files ?? [])];
                    e.target.value = '';
                    void insertImages(files);
                  }}
                />
                <span>
                  也可粘贴截图或拖入图片 · PNG / JPG / WebP / GIF，单张不超过 5MB，最多 {ANNOUNCEMENT_IMAGE_MAX_COUNT} 张
                  （已插入 {imageCount} 张）
                </span>
                {imageError ? <span className="text-red-600">{imageError}</span> : null}
              </div>
            </div>

            <div className="flex flex-wrap items-start gap-4 border-t border-zinc-100 pt-5">
              <label className="text-[12px] font-medium text-zinc-600">
                标签
                <input
                  value={draft.badge}
                  onChange={(e) => setDraft({ ...draft, badge: e.target.value })}
                  list="station-announce-tags"
                  maxLength={ANNOUNCEMENT_TAG_MAX_LENGTH}
                  className="ml-2 w-40 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] font-normal text-zinc-800"
                  placeholder="如 AI上线 / 维护"
                />
                <datalist id="station-announce-tags">
                  {knownTags.map((tag) => (
                    <option key={tag} value={tag} />
                  ))}
                </datalist>
                <span className="ml-2 text-[11px] font-normal text-zinc-400">可自定义，留空则不显示</span>
              </label>
              <label className="inline-flex items-center gap-2 self-center text-[12px] text-zinc-600">
                <input
                  type="checkbox"
                  checked={draft.pinned}
                  onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })}
                />
                置顶公告
              </label>
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-zinc-600">首页公告条</p>
              <HomeLinePreview
                badge={draft.badge}
                badgeColor={draft.badgeColor}
                title={draft.title}
                pinned={draft.pinned}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-zinc-600">「我的消息」里的样子</p>
              <div className="max-h-[70vh] space-y-3 overflow-y-auto rounded-2xl border border-zinc-200/90 bg-white p-4">
                <h4 className="text-[16px] font-semibold text-zinc-900">
                  {draft.title.trim() || '（标题预览）'}
                </h4>
                {draft.body.trim() ? (
                  <AnnouncementBody body={draft.body} />
                ) : (
                  <p className="text-[12px] text-zinc-400">正文和插入的图片会按这里的样子展示。</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4">
        <p className="text-[12px] leading-relaxed text-zinc-500">
          配置首页「站内公告」。公告保存后对
          <strong className="font-semibold text-zinc-700">全部用户</strong>
          可见：首页一次滚动一条标题，点标题进「我的消息」看全文；用户点 ×
          擦掉即视为已读，之后不再滚动。
          可同时<strong className="font-semibold text-zinc-700">置顶</strong>
          多条公告，置顶公告优先展示；置顶组和普通组内均按创建时间倒序，最新创建的排在最前。
          <strong className="font-semibold text-zinc-700">下架</strong>
          后首页和「我的消息」不再展示，记录仍留在这里，可重新上架；重新上架会再次通知所有人。
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
              className={cn(
                'flex flex-col gap-2 rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
                a.listed === false && 'bg-zinc-50/80',
              )}
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
                  {a.pinned ? (
                    <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      置顶
                    </span>
                  ) : null}
                  {a.listed === false ? (
                    <span className="rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                      已下架
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] text-zinc-500">{announcementSummary(a.body)}</p>
                <p className="mt-1 text-[10px] text-zinc-400">
                  {a.publishedAt.slice(0, 10)} · {a.id}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => togglePinned(a.id)}
                  aria-pressed={a.pinned}
                  className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  {a.pinned ? '取消置顶' : '置顶'}
                </button>
                <button
                  type="button"
                  onClick={() => toggleListed(a.id)}
                  aria-pressed={a.listed !== false}
                  className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  {a.listed === false ? '重新上架' : '下架'}
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
                <li>· 删除后不可恢复</li>
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
    </div>
  );
}
