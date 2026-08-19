import { useEffect, useMemo, useRef, useState } from 'react';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { CenterPageHeader, StatCardGrid } from '@/components/center/CenterShell';
import { resolveToolMarketShelf } from '@/domain/aiToolCategories';
import type {
  InternalOfficeSceneCatalogEntry,
  InternalOfficeSceneId,
} from '@/domain/internalOfficeScenes';
import { cn } from '@/lib/utils';
import { useInternalOfficeSceneCatalogStore } from '@/stores/internalOfficeSceneCatalogStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

interface SceneDraft {
  label: string;
  english: string;
  description: string;
  visible: boolean;
  toolId: string;
}

interface DraftContext {
  entryId: InternalOfficeSceneId;
  workspaceId: string;
  revision: number;
}

interface CandidateTool {
  id: string;
  name: string;
  blurb: string;
  logoUrl: string;
}

interface ShelvedDraft {
  draft: SceneDraft;
  baseDraft: SceneDraft;
  context: DraftContext;
  entryLabel: string;
}

/** 路由或工作区切换时只在会话内保留未保存草稿，不写 localStorage。 */
const retainedOfficeSceneDrafts = new Map<string, ShelvedDraft>();

function retainedDraftKey(context: DraftContext): string {
  return `${context.workspaceId}\u0000${context.entryId}`;
}

function retainOfficeSceneDraft(draft: ShelvedDraft): void {
  retainedOfficeSceneDrafts.set(retainedDraftKey(draft.context), draft);
}

function listRetainedOfficeSceneDrafts(): ShelvedDraft[] {
  return [...retainedOfficeSceneDrafts.values()];
}

const LABEL_LIMIT = 120;
const ENGLISH_LIMIT = 80;
const DESCRIPTION_LIMIT = 4000;
const TOOL_BLURB_LIMIT = 500;
const SCENE_LIMIT = 100;

function draftOf(entry: InternalOfficeSceneCatalogEntry): SceneDraft {
  return {
    label: entry.label,
    english: entry.english,
    description: entry.description,
    visible: entry.visible,
    // 目录请求失败或工具下架时仍保留 DB 中的原绑定，避免普通编辑误解绑。
    toolId: entry.toolIds[0] ?? '',
  };
}

function sameDraft(a: SceneDraft | null, b: SceneDraft | null): boolean {
  return Boolean(
    a &&
      b &&
      a.label === b.label &&
      a.english === b.english &&
      a.description === b.description &&
      a.visible === b.visible &&
      a.toolId === b.toolId,
  );
}

/** 原版主从布局；数据仍以服务器数据库的 fresh 快照为准。 */
export function OfficeSceneOpsPage() {
  const tools = useMarketplaceStore((state) => state.tools);
  const toolsReady = useMarketplaceStore((state) => state.ready);
  const marketplaceLoadError = useMarketplaceStore((state) => state.loadError);
  const showToast = useMarketplaceStore((state) => state.showToast);

  const entries = useInternalOfficeSceneCatalogStore((state) => state.entries);
  const loading = useInternalOfficeSceneCatalogStore((state) => state.loading);
  const saving = useInternalOfficeSceneCatalogStore((state) => state.saving);
  const loaded = useInternalOfficeSceneCatalogStore((state) => state.loaded);
  const sceneWorkspaceId = useInternalOfficeSceneCatalogStore(
    (state) => state.workspaceId,
  );
  const revision = useInternalOfficeSceneCatalogStore((state) => state.revision);
  const hydrate = useInternalOfficeSceneCatalogStore((state) => state.hydrate);
  const updateEntry = useInternalOfficeSceneCatalogStore(
    (state) => state.updateEntry,
  );
  const moveEntry = useInternalOfficeSceneCatalogStore((state) => state.moveEntry);
  const addEntry = useInternalOfficeSceneCatalogStore((state) => state.addEntry);
  const removeEntry = useInternalOfficeSceneCatalogStore(
    (state) => state.removeEntry,
  );
  const toast = useInternalOfficeSceneCatalogStore((state) => state.toast);
  const toastTone = useInternalOfficeSceneCatalogStore(
    (state) => state.toastTone,
  );
  const dismissToast = useInternalOfficeSceneCatalogStore(
    (state) => state.dismissToast,
  );

  const [selectedId, setSelectedId] =
    useState<InternalOfficeSceneId | null>(null);
  const [draft, setDraft] = useState<SceneDraft | null>(null);
  const [baseDraft, setBaseDraft] = useState<SceneDraft | null>(null);
  const [draftContext, setDraftContext] = useState<DraftContext | null>(null);
  const [toolQuery, setToolQuery] = useState('');
  const [editorError, setEditorError] = useState<string | null>(null);
  const [shelvedDrafts, setShelvedDrafts] = useState<ShelvedDraft[]>(() =>
    listRetainedOfficeSceneDrafts(),
  );

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!toast) return;
    if (toastTone === 'ok') showToast(toast);
    if (toastTone !== 'error') dismissToast();
  }, [dismissToast, showToast, toast, toastTone]);

  const candidateTools = useMemo((): CandidateTool[] => {
    return tools
      .filter(
        (tool) =>
          tool.published === true &&
          resolveToolMarketShelf(tool) === 'internal',
      )
      .map((tool) => ({
        id: tool.id,
        name: tool.name?.trim() || tool.id,
        blurb: tool.desc?.trim() || '',
        logoUrl: tool.logoUrl?.trim() ?? '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  }, [tools]);

  const toolById = useMemo(
    () => new Map(candidateTools.map((tool) => [tool.id, tool])),
    [candidateTools],
  );
  const selected = entries.find((entry) => entry.id === selectedId) ?? null;
  const selectedIndex = entries.findIndex((entry) => entry.id === selectedId);
  const dirty = Boolean(draft && baseDraft && !sameDraft(draft, baseDraft));
  const toolCatalogAvailable = toolsReady && !marketplaceLoadError;
  const pageReady = loaded && toolCatalogAvailable;
  const draftStale = Boolean(
    draftContext &&
      (loading ||
        !sceneWorkspaceId ||
        draftContext.workspaceId !== sceneWorkspaceId ||
        draftContext.revision !== revision ||
        draftContext.entryId !== selectedId),
  );
  const controlsDisabled = saving || loading || !pageReady || draftStale;
  const latestDraftRef = useRef<{
    dirty: boolean;
    draft: SceneDraft | null;
    baseDraft: SceneDraft | null;
    context: DraftContext | null;
    entryLabel: string;
  }>({
    dirty: false,
    draft: null,
    baseDraft: null,
    context: null,
    entryLabel: '',
  });
  latestDraftRef.current = {
    dirty,
    draft,
    baseDraft,
    context: draftContext,
    entryLabel: selected?.label ?? '',
  };
  const previousWorkspaceRef = useRef(sceneWorkspaceId);

  useEffect(() => {
    const previousWorkspace = previousWorkspaceRef.current;
    previousWorkspaceRef.current = sceneWorkspaceId;
    if (
      !previousWorkspace ||
      !sceneWorkspaceId ||
      previousWorkspace === sceneWorkspaceId ||
      !dirty ||
      !draft ||
      !baseDraft ||
      !draftContext
    ) {
      return;
    }
    const retained = {
      draft: { ...draft },
      baseDraft: { ...baseDraft },
      context: { ...draftContext },
      entryLabel: selected?.label ?? draftContext.entryId,
    };
    retainOfficeSceneDraft(retained);
    setShelvedDrafts(listRetainedOfficeSceneDrafts());
  }, [baseDraft, dirty, draft, draftContext, sceneWorkspaceId, selected?.label]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty && retainedOfficeSceneDrafts.size === 0) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    return () => {
      const latest = latestDraftRef.current;
      if (
        latest.dirty &&
        latest.draft &&
        latest.baseDraft &&
        latest.context
      ) {
        retainOfficeSceneDraft({
          draft: { ...latest.draft },
          baseDraft: { ...latest.baseDraft },
          context: { ...latest.context },
          entryLabel: latest.entryLabel || latest.context.entryId,
        });
      }
    };
  }, []);

  const installDraft = (
    entry: InternalOfficeSceneCatalogEntry,
    nextRevision = revision,
  ) => {
    if (!sceneWorkspaceId) return;
    const next = draftOf(entry);
    setDraft(next);
    setBaseDraft(next);
    setDraftContext({
      entryId: entry.id,
      workspaceId: sceneWorkspaceId,
      revision: nextRevision,
    });
    setToolQuery('');
    setEditorError(null);
  };

  useEffect(() => {
    if (!entries.length) {
      setSelectedId(null);
      setDraft(null);
      setBaseDraft(null);
      setDraftContext(null);
      return;
    }
    if (!selectedId || !entries.some((entry) => entry.id === selectedId)) {
      setSelectedId(entries[0]!.id);
    }
  }, [entries, selectedId]);

  useEffect(() => {
    if (!selected || !sceneWorkspaceId) return;
    if (
      draftContext?.entryId === selected.id &&
      draftContext.workspaceId === sceneWorkspaceId
    ) {
      return;
    }
    installDraft(selected);
    // installDraft 仅在选择/工作区改变时建立 DB 草稿基线。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, sceneWorkspaceId]);

  const filteredCandidates = useMemo(() => {
    const query = toolQuery.trim().toLocaleLowerCase();
    if (!query) return candidateTools;
    return candidateTools.filter((tool) =>
      `${tool.name} ${tool.blurb}`.toLocaleLowerCase().includes(query),
    );
  }, [candidateTools, toolQuery]);

  const stats = useMemo(() => {
    const visible = entries.filter((entry) => entry.visible).length;
    const bound = new Set(entries.flatMap((entry) => entry.toolIds)).size;
    const empty = entries.filter((entry) => !entry.toolIds.length).length;
    return [
      ['场景总数', entries.length],
      ['业务可见', visible],
      ['已绑定工具', bound],
      ['未绑定场景', empty],
    ] as [string, string | number][];
  }, [entries]);

  const boundTool = draft ? (toolById.get(draft.toolId) ?? null) : null;
  const staleBoundTool = Boolean(draft?.toolId && !boundTool);

  const patchDraft = (patch: Partial<SceneDraft>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setEditorError(null);
  };
  const dismissShelvedDraft = (shelvedDraft: ShelvedDraft) => {
    retainedOfficeSceneDrafts.delete(retainedDraftKey(shelvedDraft.context));
    setShelvedDrafts(listRetainedOfficeSceneDrafts());
  };
  const restoreShelvedDraft = (shelvedDraft: ShelvedDraft) => {
    if (
      !shelvedDraft ||
      !sceneWorkspaceId ||
      shelvedDraft.context.workspaceId !== sceneWorkspaceId ||
      saving ||
      loading
    ) {
      return;
    }
    if (
      dirty &&
      !window.confirm(
        '当前场景有未保存的改动，恢复保留草稿后将覆盖这些改动。确定继续？',
      )
    ) {
      return;
    }
    const entry = entries.find(
      (item) => item.id === shelvedDraft.context.entryId,
    );
    if (!entry) {
      setEditorError('原场景已不存在，无法恢复该草稿。');
      return;
    }
    setSelectedId(entry.id);
    setDraft({ ...shelvedDraft.draft });
    setBaseDraft(draftOf(entry));
    setDraftContext({
      entryId: entry.id,
      workspaceId: sceneWorkspaceId,
      revision,
    });
    setEditorError('已恢复会话内保留的草稿，请核对当前数据库内容后再保存。');
    dismissShelvedDraft(shelvedDraft);
  };
  const storeError = (fallback: string) =>
    useInternalOfficeSceneCatalogStore.getState().toast || fallback;
  const confirmDiscard = (action: string) =>
    !dirty ||
    window.confirm(`当前场景有未保存的改动，${action}后将丢失。确定继续？`);

  const selectScene = (id: InternalOfficeSceneId) => {
    if (id === selectedId || saving || loading || !confirmDiscard('切换场景')) {
      return;
    }
    setSelectedId(id);
    setDraft(null);
    setBaseDraft(null);
    setDraftContext(null);
    setToolQuery('');
    setEditorError(null);
  };

  const addScene = async () => {
    if (
      !pageReady ||
      saving ||
      loading ||
      entries.length >= SCENE_LIMIT ||
      !confirmDiscard('新增场景')
    ) {
      return;
    }
    const actionWorkspaceId = sceneWorkspaceId;
    if (!actionWorkspaceId) return;
    const id = await addEntry();
    if (
      useInternalOfficeSceneCatalogStore.getState().workspaceId !==
      actionWorkspaceId
    ) {
      return;
    }
    if (!id) {
      setEditorError(storeError('新增失败，数据库内容未改变。'));
      return;
    }
    const state = useInternalOfficeSceneCatalogStore.getState();
    const created = state.entries.find((entry) => entry.id === id);
    setSelectedId(id);
    if (created) installDraft(created, state.revision);
  };

  const saveDraft = async () => {
    if (!selected || !draft || controlsDisabled) return;
    const actionWorkspaceId = sceneWorkspaceId;
    const actionEntryId = selected.id;
    if (!actionWorkspaceId) return;
    const label = draft.label.trim();
    if (!label) {
      setEditorError('请填写场景名。');
      return;
    }
    const tool = toolById.get(draft.toolId) ?? null;
    const patch: Partial<Omit<InternalOfficeSceneCatalogEntry, 'id'>> = {
      label,
      english: draft.english.trim(),
      description: draft.description.trim(),
      visible: draft.visible,
      toolIds: draft.toolId ? [draft.toolId] : [],
    };
    // 只在用户真正换绑时写场景说明；普通文案编辑必须保留 DB 中已有的
    // 场景专属 toolBlurb，不能被 marketplace 的通用工具描述覆盖。
    if (tool && draft.toolId !== baseDraft?.toolId) {
      patch.toolBlurbs = {
        [tool.id]: tool.blurb.slice(0, TOOL_BLURB_LIMIT),
      };
    }
    setEditorError(null);
    const ok = await updateEntry(actionEntryId, patch);
    if (
      useInternalOfficeSceneCatalogStore.getState().workspaceId !==
      actionWorkspaceId
    ) {
      return;
    }
    if (!ok) {
      setEditorError(storeError('保存失败，草稿已保留。'));
      return;
    }
    const state = useInternalOfficeSceneCatalogStore.getState();
    const saved = state.entries.find((entry) => entry.id === actionEntryId);
    if (saved) installDraft(saved, state.revision);
  };

  const discardDraft = () => {
    if (selected && !saving && !loading) installDraft(selected);
  };

  const reorderScene = async (direction: -1 | 1) => {
    if (
      !selected ||
      controlsDisabled ||
      !confirmDiscard(direction < 0 ? '上移场景' : '下移场景')
    ) {
      return;
    }
    const actionWorkspaceId = sceneWorkspaceId;
    const actionEntryId = selected.id;
    if (!actionWorkspaceId) return;
    const ok = await moveEntry(actionEntryId, direction);
    if (
      useInternalOfficeSceneCatalogStore.getState().workspaceId !==
      actionWorkspaceId
    ) {
      return;
    }
    if (!ok) {
      setEditorError(storeError('排序失败，数据库内容未改变。'));
      return;
    }
    const state = useInternalOfficeSceneCatalogStore.getState();
    const moved = state.entries.find((entry) => entry.id === actionEntryId);
    if (moved) installDraft(moved, state.revision);
  };

  const deleteScene = async () => {
    if (!selected || controlsDisabled) return;
    const draftNotice = dirty ? '，未保存的草稿也会丢失' : '';
    if (
      !window.confirm(
        `删除场景「${selected.label}」？业务侧将不再展示${draftNotice}，该操作不可撤销。`,
      )
    ) {
      return;
    }
    const actionWorkspaceId = sceneWorkspaceId;
    const actionEntryId = selected.id;
    if (!actionWorkspaceId) return;
    const ok = await removeEntry(actionEntryId);
    if (
      useInternalOfficeSceneCatalogStore.getState().workspaceId !==
      actionWorkspaceId
    ) {
      return;
    }
    if (!ok) {
      setEditorError(storeError('删除失败，数据库中的场景仍然保留。'));
      return;
    }
    const state = useInternalOfficeSceneCatalogStore.getState();
    const next = state.entries[0] ?? null;
    setSelectedId(next?.id ?? null);
    if (next) installDraft(next, state.revision);
  };

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl">
        <CenterPageHeader
          title="配置办公场景"
          subtitle="内部办公推荐页的场景字典：陈列文案、展示顺序与场景内的工具绑定"
          tip={
            <>
              每个场景绑定一个数据库中的内部工具。这里维护文案、顺序、可见性和绑定关系；所有操作均在数据库保存并重新读取成功后生效。
            </>
          }
          actions={
            <button
              type="button"
              disabled={
                !pageReady || loading || saving || entries.length >= SCENE_LIMIT
              }
              onClick={() => void addScene()}
              className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
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

        {marketplaceLoadError ? (
          <div
            role="alert"
            className="mb-3 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-800"
          >
            数据库工具目录加载失败。场景仍可查看，但为避免误清除绑定，编辑已暂时禁用，请检查后端连接后刷新。
          </div>
        ) : null}

        {shelvedDrafts.map((shelvedDraft) => (
          <div
            key={retainedDraftKey(shelvedDraft.context)}
            role="alert"
            className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-800"
          >
            <span className="min-w-0 flex-1">
              已在当前会话保留「{shelvedDraft.entryLabel}」的未保存草稿（工作区 {shelvedDraft.context.workspaceId}），未写入数据库。
            </span>
            {shelvedDraft.context.workspaceId === sceneWorkspaceId ? (
              <button
                type="button"
                disabled={saving || loading}
                onClick={() => restoreShelvedDraft(shelvedDraft)}
                className="rounded-lg border border-amber-300 bg-white px-2 py-1 font-medium disabled:opacity-40"
              >
                恢复草稿
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => dismissShelvedDraft(shelvedDraft)}
              className="rounded-lg px-2 py-1 text-amber-700 hover:bg-amber-100"
            >
              放弃草稿
            </button>
          </div>
        ))}

        {!toolsReady || (loading && !loaded) ? (
          <LoadingMasterDetail />
        ) : !entries.length ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-14 text-center text-[13px] text-zinc-400">
            {loaded
              ? '数据库中暂无办公场景，可点击右上角「新增场景」。'
              : '尚未从数据库加载场景字典，请检查后端连接。'}
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
            <SceneList
              entries={entries}
              selectedId={selectedId}
              toolById={toolById}
              disabled={saving || loading}
              onSelect={selectScene}
            />

            {selected && draft ? (
              <section className="space-y-3">
                <div className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm">
                  <SceneEditorHeader
                    entry={selected}
                    boundTool={boundTool}
                    index={selectedIndex}
                    total={entries.length}
                    draft={draft}
                    disabled={controlsDisabled}
                    onMove={reorderScene}
                    onVisible={(visible) => patchDraft({ visible })}
                    onDelete={deleteScene}
                  />

                  {editorError ? (
                    <div
                      role="alert"
                      className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700"
                    >
                      {editorError}
                    </div>
                  ) : null}
                  {draftStale ? (
                    <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                      数据库快照已变化。请放弃旧草稿后重新编辑。
                    </div>
                  ) : null}

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block text-[11px] text-zinc-600">
                      场景名
                      <input
                        disabled={controlsDisabled}
                        maxLength={LABEL_LIMIT}
                        value={draft.label}
                        onChange={(event) =>
                          patchDraft({ label: event.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-zinc-400 disabled:bg-zinc-50"
                      />
                    </label>
                    <label className="block text-[11px] text-zinc-600">
                      英文副标
                      <input
                        disabled={controlsDisabled}
                        maxLength={ENGLISH_LIMIT}
                        value={draft.english}
                        onChange={(event) =>
                          patchDraft({ english: event.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-zinc-400 disabled:bg-zinc-50"
                      />
                    </label>
                  </div>
                  <label className="mt-2 block text-[11px] text-zinc-600">
                    简介
                    <textarea
                      disabled={controlsDisabled}
                      maxLength={DESCRIPTION_LIMIT}
                      rows={2}
                      value={draft.description}
                      onChange={(event) =>
                        patchDraft({ description: event.target.value })
                      }
                      className="mt-1 w-full resize-none rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-zinc-400 disabled:bg-zinc-50"
                    />
                  </label>
                </div>

                <ToolBindingEditor
                  draft={draft}
                  boundTool={boundTool}
                  staleBoundTool={staleBoundTool}
                  candidates={filteredCandidates}
                  query={toolQuery}
                  disabled={controlsDisabled}
                  onQuery={setToolQuery}
                  onSelect={(toolId) => patchDraft({ toolId })}
                />

                <div className="sticky bottom-0 flex items-center justify-end gap-2 rounded-2xl border border-black/[0.05] bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
                  <span
                    className={cn(
                      'mr-auto text-[11px]',
                      saving || !dirty ? 'text-zinc-400' : 'text-amber-700',
                    )}
                  >
                    {saving
                      ? '正在写入并重新读取数据库…'
                      : draftStale
                        ? '数据已刷新，请放弃旧草稿'
                        : dirty
                          ? '● 有未保存的改动'
                          : '当前内容来自数据库'}
                  </span>
                  <button
                    type="button"
                    disabled={saving || loading || (!dirty && !draftStale)}
                    onClick={discardDraft}
                    className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium text-zinc-600 transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    放弃改动
                  </button>
                  <button
                    type="button"
                    disabled={controlsDisabled || !dirty || !draft.label.trim()}
                    onClick={() => void saveDraft()}
                    className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
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

function LoadingMasterDetail() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
      <div className="h-[460px] animate-pulse rounded-2xl border border-zinc-200 bg-white" />
      <div className="h-[460px] animate-pulse rounded-2xl border border-zinc-200 bg-white" />
    </div>
  );
}

function SceneList({
  entries,
  selectedId,
  toolById,
  disabled,
  onSelect,
}: {
  entries: InternalOfficeSceneCatalogEntry[];
  selectedId: InternalOfficeSceneId | null;
  toolById: Map<string, CandidateTool>;
  disabled: boolean;
  onSelect: (id: InternalOfficeSceneId) => void;
}) {
  return (
    <nav
      className="rounded-2xl border border-black/[0.05] bg-white/80 p-2 shadow-sm"
      aria-label="办公场景列表"
    >
      <ul className="space-y-1">
        {entries.map((entry) => {
          const active = entry.id === selectedId;
          const tool = toolById.get(entry.toolIds[0] ?? '');
          return (
            <li key={entry.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(entry.id)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition disabled:cursor-not-allowed',
                  active ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100/80',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    active ? 'bg-white/15' : 'bg-zinc-50 ring-1 ring-zinc-100',
                  )}
                >
                  {tool ? (
                    <ToolLogo
                      name={tool.name}
                      logoUrl={tool.logoUrl}
                      size={18}
                      className="rounded"
                    />
                  ) : (
                    <i className="fa-regular fa-square-minus text-[13px] text-zinc-300" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold">
                    {entry.label}
                  </span>
                  <span
                    className={cn(
                      'block truncate text-[10px]',
                      active ? 'text-white/60' : 'text-zinc-400',
                    )}
                  >
                    {tool?.name ??
                      (entry.toolIds.length ? '绑定工具已失效' : '未绑定工具')}
                    {entry.visible ? '' : ' · 已隐藏'}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SceneEditorHeader({
  entry,
  boundTool,
  index,
  total,
  draft,
  disabled,
  onMove,
  onVisible,
  onDelete,
}: {
  entry: InternalOfficeSceneCatalogEntry;
  boundTool: CandidateTool | null;
  index: number;
  total: number;
  draft: SceneDraft;
  disabled: boolean;
  onMove: (direction: -1 | 1) => Promise<void>;
  onVisible: (visible: boolean) => void;
  onDelete: () => Promise<void>;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-50 ring-1 ring-zinc-100">
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
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-zinc-900">
            {entry.label}
            <span className="ml-2 text-[11px] font-medium text-zinc-400">
              {entry.id}
            </span>
          </p>
          <p className="truncate text-[11px] text-zinc-400">{entry.english}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={disabled || index <= 0}
          onClick={() => void onMove(-1)}
          className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] disabled:opacity-40"
        >
          上移
        </button>
        <button
          type="button"
          disabled={disabled || index === total - 1}
          onClick={() => void onMove(1)}
          className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] disabled:opacity-40"
        >
          下移
        </button>
        <label className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2 py-1 text-[11px]">
          <input
            type="checkbox"
            disabled={disabled}
            checked={draft.visible}
            onChange={(event) => onVisible(event.target.checked)}
            className="accent-zinc-800"
          />
          业务可见
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void onDelete()}
          className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] text-zinc-500 hover:border-rose-200 hover:text-rose-600 disabled:opacity-40"
        >
          删除
        </button>
      </div>
    </div>
  );
}

function ToolBindingEditor({
  draft,
  boundTool,
  staleBoundTool,
  candidates,
  query,
  disabled,
  onQuery,
  onSelect,
}: {
  draft: SceneDraft;
  boundTool: CandidateTool | null;
  staleBoundTool: boolean;
  candidates: CandidateTool[];
  query: string;
  disabled: boolean;
  onQuery: (query: string) => void;
  onSelect: (toolId: string) => void;
}) {
  return (
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
            disabled={disabled}
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="搜索公司工具…"
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50/80 py-1.5 pl-8 pr-2.5 text-[12px] outline-none focus:border-zinc-400 disabled:bg-zinc-100"
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
            <p className="truncate text-[11px] text-zinc-500">
              {boundTool.blurb || '暂无工具说明'}
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect('')}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-500 hover:text-rose-600 disabled:opacity-40"
          >
            取消绑定
          </button>
        </div>
      ) : staleBoundTool ? (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-dashed border-rose-200 bg-rose-50/60 px-3 py-2 text-[11px] text-rose-700">
          <span className="min-w-0 flex-1">
            数据库绑定的工具（{draft.toolId}）已下架或不存在；保存其它字段不会自动清除该绑定。
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect('')}
            className="shrink-0 rounded-lg border border-rose-200 bg-white px-2 py-1 text-[10px] hover:bg-rose-100 disabled:opacity-40"
          >
            清除绑定
          </button>
        </div>
      ) : (
        <p
          className="mb-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-700"
        >
          尚未绑定工具，该场景在业务侧无法打开。
        </p>
      )}

      <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
        点选绑定（名称与说明取自「配置工具」数据库）
      </p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="场景绑定工具">
        {candidates.map((tool) => {
          const active = draft.toolId === tool.id;
          return (
            <label
              key={tool.id}
              title={tool.blurb}
              className={cn(
                'inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition',
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                active
                  ? 'border-zinc-800 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
              )}
            >
              <input
                type="radio"
                name="office-scene-tool"
                disabled={disabled}
                checked={active}
                onChange={() => onSelect(tool.id)}
                className="sr-only"
              />
              <ToolLogo
                name={tool.name}
                logoUrl={tool.logoUrl}
                size={16}
                className="rounded"
              />
              <span className="truncate">{tool.name}</span>
            </label>
          );
        })}
        {!candidates.length ? (
          <p className="text-[11px] text-zinc-400">
            没有匹配的公司工具，请先在「配置工具」登记并上架。
          </p>
        ) : null}
      </div>
    </div>
  );
}
