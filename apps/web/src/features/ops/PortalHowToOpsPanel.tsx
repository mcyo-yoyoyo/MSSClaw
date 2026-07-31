import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  guideNeedsUrl,
  PLAZA_GUIDE_TYPE_HINT,
  PLAZA_GUIDE_TYPE_LABEL,
  PLAZA_GUIDE_TYPE_OPTIONS,
  type PlazaGuideType,
  type PlazaToolGuideRecord,
} from '@/domain/plazaToolGuides';
import {
  formatHowtoFileSize,
  guideAllowsUpload,
  howtoUploadAccept,
  HOWTO_UPLOAD_MAX_MB,
  isHowtoDataUrl,
  readHowtoUploadFile,
} from '@/domain/howtoUpload';
import { isHomeAiTool } from '@/domain/aiToolCategories';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePlazaToolGuideStore } from '@/stores/plazaToolGuideStore';

function emptyDraft(toolId: string): PlazaToolGuideRecord {
  return {
    id: `howto-${Date.now()}`,
    toolId,
    title: '',
    type: 'link',
    url: '',
    fileName: undefined,
    blurb: '',
    body: '',
  };
}

export function PortalHowToOpsPanel() {
  const tools = useMarketplaceStore((s) => s.tools);
  const records = usePlazaToolGuideStore((s) => s.records);
  const upsert = usePlazaToolGuideStore((s) => s.upsert);
  const remove = usePlazaToolGuideStore((s) => s.remove);
  const resetToSeeds = usePlazaToolGuideStore((s) => s.resetToSeeds);
  const showToast = usePlazaToolGuideStore((s) => s.showToast);
  const bootstrap = usePlazaToolGuideStore((s) => s.bootstrap);

  const [toolFilter, setToolFilter] = useState<string>('all');
  const [draft, setDraft] = useState<PlazaToolGuideRecord | null>(null);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const homeTools = useMemo(
    () => tools.filter(isHomeAiTool).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
    [tools],
  );

  const toolName = useMemo(() => {
    const map = new Map(homeTools.map((t) => [t.id, t.name]));
    return (id: string) => map.get(id) ?? id;
  }, [homeTools]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records
      .filter((r) => (toolFilter === 'all' ? true : r.toolId === toolFilter))
      .filter((r) => {
        if (!q) return true;
        return `${r.title} ${r.blurb ?? ''} ${r.body ?? ''} ${toolName(r.toolId)} ${r.url}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        const na = toolName(a.toolId).localeCompare(toolName(b.toolId), 'zh-CN');
        if (na !== 0) return na;
        return a.title.localeCompare(b.title, 'zh-CN');
      });
  }, [records, toolFilter, search, toolName]);

  const handleUpload = async (file: File | undefined) => {
    if (!draft || !file) return;
    setUploading(true);
    try {
      const { dataUrl, fileName, size } = await readHowtoUploadFile(file, draft.type);
      setDraft({
        ...draft,
        url: dataUrl,
        fileName,
      });
      showToast(`已上传 ${fileName}（${formatHowtoFileSize(size)}）`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const clearUpload = () => {
    if (!draft) return;
    setDraft({ ...draft, url: '', fileName: undefined });
  };

  const saveDraft = () => {
    if (!draft) return;
    const title = draft.title.trim();
    if (!title) {
      showToast('请填写标题');
      return;
    }
    if (!draft.toolId) {
      showToast('请选择工具');
      return;
    }
    if (draft.type === 'text' && !draft.body?.trim()) {
      showToast('文字类型请填写正文');
      return;
    }
    if (guideNeedsUrl(draft.type) && !draft.url?.trim()) {
      showToast('请上传文件或填写资源链接（演示可先填 #）');
      return;
    }
    const isNew = !records.some((r) => r.id === draft.id);
    const url = draft.url.trim() || '#';
    upsert(
      {
        ...draft,
        title,
        url,
        fileName: isHowtoDataUrl(url) ? draft.fileName?.trim() || undefined : undefined,
        blurb: draft.blurb?.trim() || undefined,
        body: draft.body?.trim() || undefined,
      },
      isNew,
    );
    showToast(isNew ? '已新增 How to' : '已保存 How to');
    setDraft(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4">
        <p className="text-[12px] leading-relaxed text-zinc-500">
          维护找案例「常用 AI 工具（精选）」的{' '}
          <strong className="font-semibold text-zinc-700">How to</strong>
          ：支持上传或填链接（图片 / PDF / PPT / 短视频 / 文字附件）；「链接」类型仅填
          URL。单文件 ≤ {HOWTO_UPLOAD_MAX_MB}MB，大文件请用外链。保存后首页立刻生效。
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索指引或工具名…"
            className="min-w-[180px] flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-[12px]"
          />
          <select
            value={toolFilter}
            onChange={(e) => setToolFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 px-3 py-2 text-[12px]"
          >
            <option value="all">全部工具</option>
            {homeTools.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              setDraft(emptyDraft(toolFilter !== 'all' ? toolFilter : homeTools[0]?.id ?? ''))
            }
            className="rounded-xl bg-zinc-900 px-3 py-2 text-[12px] font-semibold text-white"
          >
            + 新建指引
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  '确定恢复为系统自带的示例指引？你改过、新建的 How to 都会被覆盖。',
                )
              ) {
                resetToSeeds();
                showToast('已恢复为默认示例指引');
              }
            }}
            className="rounded-xl border border-zinc-200 px-3 py-2 text-[12px] font-medium text-zinc-600 hover:bg-zinc-50"
          >
            恢复默认示例
          </button>
        </div>
      </div>

      {draft ? (
        <div className="rounded-2xl border border-zinc-300 bg-zinc-50/80 p-4">
          <p className="mb-3 text-[12px] font-semibold text-zinc-800">
            {records.some((r) => r.id === draft.id) ? '编辑指引' : '新建指引'}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-[11px] text-zinc-500">
              工具
              <select
                value={draft.toolId}
                onChange={(e) => setDraft({ ...draft, toolId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[12px] text-zinc-800"
              >
                {homeTools.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] text-zinc-500">
              形式
              <select
                value={draft.type}
                onChange={(e) => {
                  const next = e.target.value as PlazaGuideType;
                  setDraft({
                    ...draft,
                    type: next,
                    ...(isHowtoDataUrl(draft.url)
                      ? { url: '', fileName: undefined }
                      : {}),
                  });
                }}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[12px] text-zinc-800"
              >
                {PLAZA_GUIDE_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {PLAZA_GUIDE_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[10px] leading-snug text-zinc-400">
                {PLAZA_GUIDE_TYPE_HINT[draft.type]}
              </span>
            </label>
            <label className="block text-[11px] text-zinc-500 sm:col-span-2">
              标题
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[12px] text-zinc-800"
                placeholder="如：3 分钟上手"
              />
            </label>
            {guideAllowsUpload(draft.type) ? (
              <div className="sm:col-span-2">
                <p className="mb-1 text-[11px] text-zinc-500">
                  {draft.type === 'text' ? '附件（可选）' : '上传文件'}
                </p>
                {isHowtoDataUrl(draft.url) && draft.fileName ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-zinc-800">
                        {draft.fileName}
                      </p>
                      <p className="text-[10px] text-zinc-400">已上传到本机演示存储</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearUpload}
                      className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50"
                    >
                      移除
                    </button>
                  </div>
                ) : (
                  <label
                    className={cn(
                      'flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-5 text-center transition hover:border-zinc-400',
                      uploading && 'pointer-events-none opacity-60',
                    )}
                  >
                    <i className="fa-solid fa-cloud-arrow-up mb-1.5 text-base text-zinc-400" />
                    <span className="text-[12px] font-medium text-zinc-700">
                      {uploading ? '读取中…' : '点击上传'}
                    </span>
                    <span className="mt-0.5 text-[10px] text-zinc-400">
                      ≤ {HOWTO_UPLOAD_MAX_MB}MB · 与下方链接二选一即可
                    </span>
                    <input
                      type="file"
                      accept={howtoUploadAccept(draft.type) ?? undefined}
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        void handleUpload(f);
                      }}
                    />
                  </label>
                )}
              </div>
            ) : null}

            {guideNeedsUrl(draft.type) || draft.type === 'text' ? (
              <label className="block text-[11px] text-zinc-500 sm:col-span-2">
                {draft.type === 'link'
                  ? '链接 URL'
                  : draft.type === 'text'
                    ? '或填附件链接（可选）'
                    : isHowtoDataUrl(draft.url)
                      ? '资源链接（已用上传时可忽略）'
                      : '或填资源链接'}
                <input
                  value={isHowtoDataUrl(draft.url) ? '' : draft.url}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      url: e.target.value,
                      fileName: undefined,
                    })
                  }
                  disabled={isHowtoDataUrl(draft.url)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[12px] text-zinc-800 disabled:bg-zinc-50 disabled:text-zinc-400"
                  placeholder={
                    draft.type === 'image'
                      ? 'https://…/guide.png'
                      : draft.type === 'pdf'
                        ? 'https://…/guide.pdf'
                        : draft.type === 'video'
                          ? 'https://…/demo.mp4 或点播页'
                          : 'https://…  （演示可填 #）'
                  }
                />
              </label>
            ) : null}
            {draft.type === 'text' ? (
              <label className="block text-[11px] text-zinc-500 sm:col-span-2">
                正文（支持换行）
                <textarea
                  rows={5}
                  value={draft.body ?? ''}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[12px] leading-relaxed text-zinc-800"
                  placeholder={'1. 第一步…\n2. 第二步…'}
                />
              </label>
            ) : null}
            <label className="block text-[11px] text-zinc-500 sm:col-span-2">
              摘要（可选，列表展示）
              <input
                value={draft.blurb ?? ''}
                onChange={(e) => setDraft({ ...draft, blurb: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[12px] text-zinc-800"
                placeholder="一句话说明"
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={saveDraft}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-[12px] font-medium text-zinc-600"
            >
              取消
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {list.map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-2 rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600">
                  {toolName(r.toolId)}
                </span>
                <span className="rounded-md bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {PLAZA_GUIDE_TYPE_LABEL[r.type] ?? r.type}
                </span>
              </div>
              <p className="mt-1 truncate text-[13px] font-semibold text-zinc-900">{r.title}</p>
              {r.blurb ? (
                <p className="truncate text-[11px] text-zinc-500">{r.blurb}</p>
              ) : null}
              <p className="truncate text-[10px] text-zinc-400">
                {r.type === 'text'
                  ? (r.body ? `${r.body.slice(0, 48)}${r.body.length > 48 ? '…' : ''}` : '（无正文）')
                  : r.fileName
                    ? `上传 · ${r.fileName}`
                    : isHowtoDataUrl(r.url)
                      ? '上传文件'
                      : r.url || '#'}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => setDraft({ ...r })}
                className="rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
              >
                编辑
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`删除「${r.title}」？`)) {
                    remove(r.id);
                    showToast('已删除');
                  }
                }}
                className="rounded-lg border border-red-200 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50"
              >
                删除
              </button>
            </div>
          </div>
        ))}
        {!list.length ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-[12px] text-zinc-400">
            暂无指引，点击「新建指引」添加
          </div>
        ) : null}
      </div>
    </div>
  );
}
