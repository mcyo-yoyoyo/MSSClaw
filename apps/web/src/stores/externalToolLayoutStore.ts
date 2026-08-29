import { create } from 'zustand';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  savePlatformDoc,
} from '@/api/platformDocsApi';
import {
  addExternalToolCategoryFeatured,
  cloneExternalToolLayoutDocument,
  externalToolLayoutsEqual,
  parseExternalToolLayoutDocument,
  removeExternalToolCategoryFeatured,
  reorderExternalToolCategoryFeatured,
  reorderExternalToolLayoutAllList,
  setExternalToolCategoryFeatured,
  setExternalToolCategoryList,
  setExternalToolLayoutAllList,
  toExternalToolLayoutSavePayload,
  type ExternalToolLayoutAllListKey,
  type ExternalToolCategoryFeaturedListKey,
  type ExternalToolCategoryListKey,
  type ExternalToolLayoutDocument,
} from '@/domain/externalToolLayout';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSessionStore } from '@/stores/sessionStore';

const DOC_KIND = 'external-tool-layout' as const;

type StateSet = (partial: Partial<ExternalToolLayoutState>) => void;
type StateGet = () => ExternalToolLayoutState;

let operationGeneration = 0;
const stagedDraftsByWorkspace = new Map<string, ExternalToolLayoutDocument>();

function layoutsHaveSameContent(
  left: ExternalToolLayoutDocument,
  right: ExternalToolLayoutDocument,
): boolean {
  return externalToolLayoutsEqual({ ...left, revision: right.revision }, right);
}

function mutationError(error: unknown): string {
  return error instanceof Error ? error.message : '外部工具布局修改失败';
}

function saveError(error: unknown, writeSucceeded: boolean): string {
  if (writeSucceeded) {
    return '布局已写入服务器，但读取确认失败。请刷新后确认数据库结果。';
  }
  const message = error instanceof Error ? error.message : '';
  if (message.endsWith('_409')) {
    return '保存冲突：布局已被其他管理员更新。请取消草稿并刷新后重试。';
  }
  return '外部工具布局保存失败，草稿仍保留在当前页面。';
}

function updateDraft(
  get: StateGet,
  set: StateSet,
  update: (draft: ExternalToolLayoutDocument) => ExternalToolLayoutDocument,
): void {
  const state = get();
  if (state.loading || state.saving) return;
  const base =
    state.draft ?? (state.document ? cloneExternalToolLayoutDocument(state.document) : null);
  if (!base || !state.document) {
    set({ error: '外部工具布局尚未从服务器加载。' });
    return;
  }
  try {
    const draft = update(base);
    set({
      draft,
      dirty: !externalToolLayoutsEqual(draft, state.document),
      error: null,
    });
  } catch (error) {
    set({ error: mutationError(error) });
  }
}

export interface ExternalToolLayoutState {
  workspaceId: string | null;
  document: ExternalToolLayoutDocument | null;
  draft: ExternalToolLayoutDocument | null;
  dirty: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  hydrate: (workspaceId?: string) => Promise<boolean>;
  beginEdit: () => boolean;
  cancelEdit: () => void;
  saveDraft: () => Promise<boolean>;
  setAllList: (key: ExternalToolLayoutAllListKey, ids: readonly string[]) => void;
  setCategoryFeatured: (
    categoryId: string,
    ids: readonly string[],
    key?: ExternalToolCategoryFeaturedListKey,
  ) => void;
  setCategoryList: (
    categoryId: string,
    ids: readonly string[],
    key: ExternalToolCategoryListKey,
  ) => void;
  reorderAllList: (
    key: ExternalToolLayoutAllListKey,
    activeId: string,
    overId: string | null,
  ) => void;
  reorderCategoryFeatured: (
    categoryId: string,
    activeId: string,
    overId: string | null,
    key?: ExternalToolCategoryFeaturedListKey,
  ) => void;
  addCategoryFeatured: (
    categoryId: string,
    toolId: string,
    beforeId?: string | null,
    key?: ExternalToolCategoryFeaturedListKey,
  ) => void;
  removeCategoryFeatured: (
    categoryId: string,
    toolId: string,
    key?: ExternalToolCategoryFeaturedListKey,
  ) => void;
  clearError: () => void;
}

export const useExternalToolLayoutStore = create<ExternalToolLayoutState>((set, get) => ({
  workspaceId: null,
  document: null,
  draft: null,
  dirty: false,
  loading: false,
  saving: false,
  error: null,

  hydrate: async (requestedWorkspaceId) => {
    const workspaceId = (requestedWorkspaceId || currentWorkspaceId()).trim();
    const previous = get();
    if (!workspaceId || workspaceId !== currentWorkspaceId()) return false;
    if (previous.loading || previous.saving) return false;
    if (previous.workspaceId === workspaceId && previous.dirty) {
      set({ error: '当前有未保存的布局草稿，请先保存或取消。' });
      return false;
    }

    const switchedWorkspace = previous.workspaceId !== workspaceId;
    const generation = ++operationGeneration;
    set({
      workspaceId,
      document: switchedWorkspace ? null : previous.document,
      draft: null,
      dirty: false,
      loading: true,
      saving: false,
      error: null,
    });

    if (!canUsePlatformDocsApi()) {
      if (generation === operationGeneration && get().workspaceId === workspaceId) {
        set({ loading: false, error: '未连接后端，无法加载外部工具布局。' });
      }
      return false;
    }

    try {
      const remote = await fetchPlatformDoc<unknown>(workspaceId, DOC_KIND, { fresh: true });
      const document = parseExternalToolLayoutDocument(remote);
      if (
        generation !== operationGeneration ||
        get().workspaceId !== workspaceId ||
        currentWorkspaceId() !== workspaceId
      ) {
        return false;
      }
      const stagedDraft = stagedDraftsByWorkspace.get(workspaceId);
      if (stagedDraft && layoutsHaveSameContent(stagedDraft, document)) {
        stagedDraftsByWorkspace.delete(workspaceId);
        set({ document, draft: null, dirty: false, loading: false, error: null });
      } else if (stagedDraft) {
        const revisionChanged = stagedDraft.revision !== document.revision;
        set({
          document,
          draft: cloneExternalToolLayoutDocument(stagedDraft),
          dirty: true,
          loading: false,
          error: revisionChanged
            ? '已恢复该工作区未保存的布局草稿，但服务器版本已更新。请取消草稿后重新编辑。'
            : '已恢复该工作区未保存的布局草稿。',
        });
      } else {
        set({ document, draft: null, dirty: false, loading: false, error: null });
      }
      return true;
    } catch {
      if (generation === operationGeneration && get().workspaceId === workspaceId) {
        set({
          loading: false,
          error: '外部工具布局加载失败，未使用本地默认数据替代。',
        });
      }
      return false;
    }
  },

  beginEdit: () => {
    const state = get();
    if (state.loading || state.saving || !state.document) {
      if (!state.document) set({ error: '外部工具布局尚未从服务器加载。' });
      return false;
    }
    if (state.draft) return true;
    set({
      draft: cloneExternalToolLayoutDocument(state.document),
      dirty: false,
      error: null,
    });
    return true;
  },

  cancelEdit: () => {
    const state = get();
    if (state.saving) return;
    if (state.workspaceId) stagedDraftsByWorkspace.delete(state.workspaceId);
    set({ draft: null, dirty: false, error: null });
  },

  saveDraft: async () => {
    const state = get();
    const workspaceId = state.workspaceId;
    if (state.loading || state.saving) return false;
    if (!state.document || !state.draft || !workspaceId) {
      set({ error: '没有可保存的外部工具布局草稿。' });
      return false;
    }
    if (!state.dirty) {
      stagedDraftsByWorkspace.delete(workspaceId);
      set({ draft: null, error: null });
      return true;
    }
    if (workspaceId !== currentWorkspaceId()) {
      set({ error: '工作区已切换，本次布局改动未提交。' });
      return false;
    }
    if (state.draft.revision !== state.document.revision) {
      set({ error: '服务器布局已更新，当前草稿不能直接覆盖。请取消草稿后重新编辑。' });
      return false;
    }
    if (!canUsePlatformDocsApi()) {
      set({ error: '未连接后端，本次布局改动未提交。' });
      return false;
    }

    const generation = ++operationGeneration;
    const payload = toExternalToolLayoutSavePayload(state.draft, state.document.revision);
    set({ saving: true, error: null });
    let writeSucceeded = false;
    try {
      await savePlatformDoc(workspaceId, DOC_KIND, payload);
      writeSucceeded = true;
      const remote = await fetchPlatformDoc<unknown>(workspaceId, DOC_KIND, { fresh: true });
      const document = parseExternalToolLayoutDocument(remote);
      if (
        generation !== operationGeneration ||
        get().workspaceId !== workspaceId ||
        currentWorkspaceId() !== workspaceId
      ) {
        return false;
      }
      set({
        document,
        draft: null,
        dirty: false,
        saving: false,
        error: null,
      });
      stagedDraftsByWorkspace.delete(workspaceId);
      return true;
    } catch (error) {
      if (generation === operationGeneration && get().workspaceId === workspaceId) {
        set({ saving: false, error: saveError(error, writeSucceeded) });
      }
      return false;
    }
  },

  setAllList: (key, ids) => {
    updateDraft(get, set, (draft) => setExternalToolLayoutAllList(draft, key, ids));
  },

  setCategoryFeatured: (categoryId, ids, key = 'overseasFeaturedIds') => {
    updateDraft(get, set, (draft) =>
      setExternalToolCategoryFeatured(draft, categoryId, ids, key),
    );
  },

  setCategoryList: (categoryId, ids, key) => {
    updateDraft(get, set, (draft) =>
      setExternalToolCategoryList(draft, categoryId, ids, key),
    );
  },

  reorderAllList: (key, activeId, overId) => {
    updateDraft(get, set, (draft) =>
      reorderExternalToolLayoutAllList(draft, key, activeId, overId),
    );
  },

  reorderCategoryFeatured: (
    categoryId,
    activeId,
    overId,
    key = 'overseasFeaturedIds',
  ) => {
    updateDraft(get, set, (draft) =>
      reorderExternalToolCategoryFeatured(draft, categoryId, activeId, overId, key),
    );
  },

  addCategoryFeatured: (
    categoryId,
    toolId,
    beforeId = null,
    key = 'overseasFeaturedIds',
  ) => {
    updateDraft(get, set, (draft) =>
      addExternalToolCategoryFeatured(draft, categoryId, toolId, beforeId, key),
    );
  },

  removeCategoryFeatured: (categoryId, toolId, key = 'overseasFeaturedIds') => {
    updateDraft(get, set, (draft) =>
      removeExternalToolCategoryFeatured(draft, categoryId, toolId, key),
    );
  },

  clearError: () => set({ error: null }),
}));

useWorkspaceStore.subscribe((state, previous) => {
  if (state.workspaceId === previous.workspaceId) return;
  const layoutState = useExternalToolLayoutStore.getState();
  if (layoutState.workspaceId && layoutState.dirty && layoutState.draft) {
    stagedDraftsByWorkspace.set(
      layoutState.workspaceId,
      cloneExternalToolLayoutDocument(layoutState.draft),
    );
  }
  operationGeneration += 1;
  useExternalToolLayoutStore.setState({
    workspaceId: state.workspaceId,
    document: null,
    draft: null,
    dirty: false,
    loading: false,
    saving: false,
    error: null,
  });
});

useSessionStore.subscribe((state, previous) => {
  const userId = state.user?.id ?? null;
  const previousUserId = previous.user?.id ?? null;
  if (userId === previousUserId) return;

  stagedDraftsByWorkspace.clear();
  operationGeneration += 1;
  useExternalToolLayoutStore.setState({
    workspaceId: currentWorkspaceId(),
    document: null,
    draft: null,
    dirty: false,
    loading: false,
    saving: false,
    error: null,
  });

  if (userId && state.isAuthenticated && canUsePlatformDocsApi()) {
    void useExternalToolLayoutStore.getState().hydrate(currentWorkspaceId());
  }
});
