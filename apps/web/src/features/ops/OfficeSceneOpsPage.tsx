import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { CenterPageHeader, StatCardGrid } from '@/components/center/CenterShell';
import { ToolLogo } from '@/components/brand/ToolLogo';
import {
  listDefaultInternalOfficeTools,
  type InternalOfficeSceneId,
} from '@/domain/internalOfficeScenes';
import { resolveToolMarketShelf } from '@/domain/aiToolCategories';
import { resolveToolLogoUrl } from '@/domain/toolLogo';
import { useInternalOfficeSceneCatalogStore } from '@/stores/internalOfficeSceneCatalogStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

interface SceneDraft {
  label: string;
  english: string;
  description: string;
  visible: boolean;
  toolIds: string[];
}

interface CandidateTool {
  id: string;
  name: string;
  blurb: string;
  homepageUrl: string;
  logoUrl: string;
}

/**
 * 管理后台 · 配置办公场景
 *
 * 主从布局：左栏点选场景 → 右栏展示并编辑该场景的文案与绑定工具。
 * 与「配置工具」的分工：工具主数据（链接 / Logo / 上架）在配置工具维护，
 * 这里只决定场景如何陈列、展示顺序，以及绑定哪一个公司工具（一个场景一个）。
 */
export function OfficeSceneOpsPage() {
  const tools = useMarketplaceStore((s) => s.tools);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const entries = useInternalOfficeSceneCatalogStore((s) => s.entries);
  const hydrate = useInternalOfficeSceneCatalogStore((s) => s.hydrate);
  const updateEntry = useInternalOfficeSceneCatalogStore((s) => s.updateEntry);
  const moveEntry = useInternalOfficeSceneCatalogStore((s) => s.moveEntry);
  const addEntry = useInternalOfficeSceneCatalogStore((s) => s.addEntry);
  const removeEntry = useInternalOfficeSceneCatalogStore((s) => s.removeEntry);
  const toast = useInternalOfficeSceneCatalogStore((s) => s.toast);
  const toastTone = useInternalOfficeSceneCatalogStore((s) => s.toastTone);
  const dismissToast = useInternalOfficeSceneCatalogStore((s) => s.dismissToast);

  const [selectedId, setSelectedId] = useState<InternalOfficeSceneId | null>(null);
  const [toolQuery, setToolQuery] = useState('');
  /** 表单改动先落草稿，点「保存」才写库；新增/删除/排序仍即时生效 */
  const [draft, setDraft] = useState<SceneDraft | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    // 成功走全局 toast；「保存中」只在操作条里体现，不弹窗打扰
    if (!toast) return;
    if (toastTone === 'ok') showToast(toast);
    if (toastTone !== 'error') dismissToast();
  }, [toast, toastTone, showToast, dismissToast]);

  /** 默认选中第一个场景；选中项被删除或未加载时回落 */
  useEffect(() => {
    if (!entries.length) return;
    if (selectedId && entries.some((e) => e.id === selectedId)) return;
    setSelectedId(entries[0]!.id);
  }, [entries, selectedId]);

  const candidateTools = useMemo((): CandidateTool[] => {
    const byId = new Map(listDefaultInternalOfficeTools().map((t) => [t.id, t]));
    for (const t of tools) {
      if (t.published === false) continue;
      const shelf = resolveToolMarketShelf(t);
      const isInternal =
        shelf === 'internal' ||
        t.sourceType === 'internal' ||
        Boolean(t.tags?.includes('hw-internal'));
      if (!isInternal || byId.has(t.id)) continue;
      byId.set(t.id, {
        id: t.id,
        name: t.name,
        blurb: t.desc || t.name,
        homepageUrl: t.homepageUrl || '#',
        logoUrl: resolveToolLogoUrl(t) || '',
      });
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  }, [tools]);

  const toolById = useMemo(
    () => new Map(candidateTools.map((t) => [t.id, t])),
    [candidateTools],
  );

  const selected = entries.find((e) => e.id === selectedId) ?? null;
  const selectedIndex = entries.findIndex((e) => e.id === selectedId);

  const draftOf = (entry: typeof selected): SceneDraft | null =>
    entry
      ? {
          label: entry.label,
          english: entry.english,
          description: entry.description,
          visible: entry.visible,
          toolIds: [...entry.toolIds],
        }
      : null;

  /** 切换场景或外部数据变化时重置草稿 */
  useEffect(() => {
    const entry = entries.find((e) => e.id === selectedId) ?? null;
    setDraft(draftOf(entry));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, entries]);

  const dirty = Boolean(
    selected &&
      draft &&
      (draft.label !== selected.label ||
        draft.english !== selected.english ||
        draft.description !== selected.description ||
        draft.visible !== selected.visible ||
        draft.toolIds.join('|') !== selected.toolIds.join('|')),
  );

  const patchDraft = (patch: Partial<SceneDraft>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  const saveDraft = () => {
    if (!selected || !draft) return;
    updateEntry(selected.id, {
      label: draft.label,
      english: draft.english,
      description: draft.description,
      visible: draft.visible,
      toolIds: draft.toolIds,
    });
  };

  /** 有未保存改动时切换场景先确认，避免静默丢失 */
  const selectScene = (id: InternalOfficeSceneId) => {
    if (id === selectedId) return;
    if (dirty && !window.confirm('当前场景有未保存的改动，切换后将丢失。确定切换？')) return;
    setSelectedId(id);
  };

  const filteredCandidates = useMemo(() => {
    const q = toolQuery.trim().toLocaleLowerCase();
    if (!q) return candidateTools;
    return candidateTools.filter((t) =>
      `${t.name} ${t.blurb}`.toLocaleLowerCase().includes(q),
    );
  }, [candidateTools, toolQuery]);

  const stats = useMemo(() => {
    const visible = entries.filter((e) => e.visible).length;
    const bound = new Set(entries.flatMap((e) => e.toolIds)).size;
    const empty = entries.filter((e) => !e.toolIds.length).length;
    return [
      ['场景总数', entries.length],
      ['业务可见', visible],
      ['已绑定工具', bound],
      ['未绑定场景', empty],
    ] as [string, string | number][];
  }, [entries]);

  const boundTool = draft ? toolById.get(draft.toolIds[0] ?? '') ?? null : null;

  /** 一个场景只挂一个工具：点选即替换，再点当前项则清空 */
  const selectTool = (toolId: string) => {
    if (!draft) return;
    patchDraft({ toolIds: draft.toolIds[0] === toolId ? [] : [toolId] });
  };

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl">
        <CenterPageHeader
          title="配置办公场景"
          subtitle="公司工具推荐页的场景字典：陈列文案、展示顺序与场景内的工具绑定"
          tip={
            <>
              每个场景绑定一个公司工具。工具的名称、说明、访问链接与 Logo 均取自「配置工具」，此处不重复维护；
              这里只决定场景如何陈列、展示顺序与绑定哪个工具；场景图标即所绑工具的图标，无需单独配置。场景未绑定工具时业务侧无法打开。表单改动需点「保存」才写入；新增、删除与排序即时生效。
            </>
          }
          actions={
            <button
              type="button"
              onClick={() => setSelectedId(addEntry())}
              className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition"
            >
              <i className="fa-solid fa-plus mr-1" />
              新增场景
            </button>
          }
        />

        <StatCardGrid items={stats} />

        {toast && toastTone === 'error' ? (
          <div
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800"
          >
            <i className="fa-solid fa-triangle-exclamation mt-0.5 text-[11px]" />
            <span className="flex-1">{toast}</span>
            <button
              type="button"
              onClick={dismissToast}
              className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium text-rose-700 hover:bg-rose-100"
            >
              知道了
            </button>
          </div>
        ) : null}

        {!entries.length ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-14 text-center text-[13px] text-zinc-400">
            尚未加载场景字典。可点右上角「新增场景」自建，或确认后端连接是否正常。
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
            {/* 左：场景列表 */}
            <nav
              className="rounded-2xl border border-black/[0.05] bg-white/80 p-2 shadow-sm"
              aria-label="办公场景列表"
            >
              <ul className="space-y-1">
                {entries.map((entry) => {
                  const active = entry.id === selectedId;
                  const entryTool = toolById.get(entry.toolIds[0] ?? '');
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => selectScene(entry.id)}
                        aria-current={active ? 'true' : undefined}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition',
                          active ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100/80',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                            active ? 'bg-white/15' : 'bg-zinc-50 ring-1 ring-zinc-100',
                          )}
                        >
                          {entryTool ? (
                            <ToolLogo
                              name={entryTool.name}
                              logoUrl={entryTool.logoUrl}
                              size={18}
                              className="rounded"
                            />
                          ) : (
                            <i
                              className={cn(
                                'fa-regular fa-square-minus text-[13px]',
                                active ? 'text-white/50' : 'text-zinc-300',
                              )}
                            />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-semibold">
                            {entry.label}
                          </span>
                          <span
                            className={cn(
                              'block text-[10px]',
                              active ? 'text-white/60' : 'text-zinc-400',
                            )}
                          >
                            {toolById.get(entry.toolIds[0] ?? '')?.name ?? '未绑定工具'}
                            {entry.visible ? '' : ' · 已隐藏'}
                          </span>
                        </span>
                        {!entry.toolIds.length ? (
                          <i
                            className="fa-solid fa-triangle-exclamation text-[10px] text-amber-500"
                            title="未绑定工具，业务侧无法打开"
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* 右：选中场景详情 */}
            {selected && draft ? (
              <section className="space-y-3">
                <div className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-50 ring-1 ring-zinc-100">
                        {boundTool ? (
                          <ToolLogo
                            name={boundTool.name}
                            logoUrl={boundTool.logoUrl}
                            size={22}
                            className="rounded"
                          />
                        ) : (
                          <i className="fa-regular fa-square-minus text-[14px] text-zinc-300" />
                        )}
                      </span>
                      <div>
                        <p className="text-[13px] font-semibold text-zinc-900">
                          {selected.label}
                          <span className="ml-2 text-[11px] font-medium text-zinc-400">
                            {selected.id}
                          </span>
                        </p>
                        <p className="text-[11px] text-zinc-400">{selected.english}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={selectedIndex <= 0}
                        onClick={() => moveEntry(selected.id, -1)}
                        className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] disabled:opacity-40"
                      >
                        上移
                      </button>
                      <button
                        type="button"
                        disabled={selectedIndex === entries.length - 1}
                        onClick={() => moveEntry(selected.id, 1)}
                        className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] disabled:opacity-40"
                      >
                        下移
                      </button>
                      <label className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2 py-1 text-[11px]">
                        <input
                          type="checkbox"
                          className="accent-zinc-800"
                          checked={draft.visible}
                          onChange={(e) => patchDraft({ visible: e.target.checked })}
                        />
                        业务可见
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm(`删除场景「${selected.label}」？业务侧将不再展示，该操作不可撤销。`)) return;
                          removeEntry(selected.id);
                        }}
                        className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] text-zinc-500 transition hover:border-rose-200 hover:text-rose-600"
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block text-[11px] text-zinc-600">
                      场景名
                      <input
                        value={draft.label}
                        onChange={(e) => patchDraft({ label: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-zinc-400"
                      />
                    </label>
                    <label className="block text-[11px] text-zinc-600">
                      英文副标
                      <input
                        value={draft.english}
                        onChange={(e) => patchDraft({ english: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-zinc-400"
                      />
                    </label>
                  </div>
                  <label className="mt-2 block text-[11px] text-zinc-600">
                    简介
                    <textarea
                      rows={2}
                      value={draft.description}
                      onChange={(e) => patchDraft({ description: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-zinc-400"
                    />
                  </label>
                </div>

                {/* 场景内的工具：一个场景只挂一个 */}
                <div className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-zinc-800">
                      场景内工具
                      <span className="ml-2 font-normal text-zinc-400">
                        每个场景绑定一个公司工具
                      </span>
                    </p>
                    <label className="relative w-full sm:w-56">
                      <span className="sr-only">搜索工具</span>
                      <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400" />
                      <input
                        value={toolQuery}
                        onChange={(e) => setToolQuery(e.target.value)}
                        placeholder="搜索公司工具…"
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50/80 py-1.5 pl-8 pr-2.5 text-[12px] outline-none transition focus:border-zinc-400 focus:bg-white"
                      />
                    </label>
                  </div>

                  {boundTool ? (
                    <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-zinc-100 bg-zinc-50/80 p-2.5">
                      <ToolLogo
                        name={boundTool.name}
                        logoUrl={boundTool.logoUrl}
                        size={22}
                        className="shrink-0 rounded"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-zinc-800">
                          {boundTool.name}
                        </p>
                        <p className="truncate text-[11px] text-zinc-500">{boundTool.blurb}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => patchDraft({ toolIds: [] })}
                        className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-500 transition hover:border-rose-200 hover:text-rose-600"
                      >
                        取消绑定
                      </button>
                    </div>
                  ) : (
                    <p className="mb-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-700">
                      尚未绑定工具，该场景在业务侧无法打开。
                    </p>
                  )}

                  {draft.toolIds.length > 1 ? (
                    <p className="mb-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
                      该场景存量绑定了 {draft.toolIds.length} 个工具，重新点选将只保留一个。
                    </p>
                  ) : null}

                  <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
                    点选绑定（名称与说明取自「配置工具」）
                  </p>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="场景绑定工具">
                    {filteredCandidates.map((t) => {
                      const on = draft.toolIds[0] === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          title={t.blurb}
                          onClick={() => selectTool(t.id)}
                          className={cn(
                            'inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition',
                            on
                              ? 'border-zinc-800 bg-zinc-900 text-white'
                              : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
                          )}
                        >
                          <ToolLogo name={t.name} logoUrl={t.logoUrl} size={16} className="rounded" />
                          <span className="truncate">{t.name}</span>
                        </button>
                      );
                    })}
                    {!filteredCandidates.length ? (
                      <p className="text-[11px] text-zinc-400">
                        没有匹配的公司工具。工具需先在「配置工具」登记为公司工具并上架。
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="sticky bottom-0 flex items-center justify-end gap-2 rounded-2xl border border-black/[0.05] bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
                  {toastTone === 'pending' ? (
                    <span className="mr-auto inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                      <i className="fa-solid fa-spinner fa-spin text-[10px]" />
                      保存中…
                    </span>
                  ) : dirty ? (
                    <span className="mr-auto inline-flex items-center gap-1.5 text-[11px] text-amber-700">
                      <i className="fa-solid fa-circle text-[6px]" />
                      有未保存的改动
                    </span>
                  ) : (
                    <span className="mr-auto text-[11px] text-zinc-400">改动已保存</span>
                  )}
                  <button
                    type="button"
                    disabled={!dirty}
                    onClick={() => setDraft(draftOf(selected))}
                    className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium text-zinc-600 transition hover:bg-black/[0.03] disabled:opacity-40"
                  >
                    放弃改动
                  </button>
                  <button
                    type="button"
                    disabled={!dirty}
                    onClick={saveDraft}
                    className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition disabled:opacity-40"
                  >
                    保存
                  </button>
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
