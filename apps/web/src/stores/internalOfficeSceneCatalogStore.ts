import { create } from 'zustand';
import {
  createOfficeSceneId,
  isInternalOfficeSceneId,
  setInternalOfficeSceneCatalog,
  type InternalOfficeSceneCatalogEntry,
  type InternalOfficeSceneId,
} from '@/domain/internalOfficeScenes';
import { reorderVisibleOfficeSceneEntries } from '@/domain/internalOfficeSceneOrder';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  savePlatformDoc,
} from '@/api/platformDocsApi';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const DOC_KIND = 'internal-office-scenes' as const;
const DOCUMENT_VERSION = 2;

interface InternalOfficeSceneDocument {
  version?: number;
  revision?: number;
  expectedRevision?: number;
  entries?: InternalOfficeSceneCatalogEntry[];
}

type RemoteInternalOfficeSceneDocument =
  | InternalOfficeSceneCatalogEntry[]
  | InternalOfficeSceneDocument;

export type NewInternalOfficeSceneInput = Partial<
  Omit<InternalOfficeSceneCatalogEntry, 'id'>
> & {
  id?: InternalOfficeSceneId;
  /** 新增后在数组中的 0-based 目标位置；省略时追加到末尾。 */
  position?: number;
};

function normalizeToolBlurbs(
  toolIds: string[],
  saved: Record<string, string> | undefined,
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const toolId of toolIds) {
    const blurb = saved?.[toolId];
    if (typeof blurb === 'string') normalized[toolId] = blurb;
  }
  return normalized;
}

function normalizeEntries(
  saved: InternalOfficeSceneCatalogEntry[] | null,
): InternalOfficeSceneCatalogEntry[] {
  const entries = saved ?? [];
  const seenIds = new Set<string>();
  return entries.map((entry, index) => {
    const invalid = (field: string): never => {
      throw new Error(`invalid_internal_office_scene_document:entries[${index}].${field}`);
    };
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return invalid('object');
    }
    if (
      typeof entry.id !== 'string' ||
      entry.id !== entry.id.trim().toLowerCase() ||
      !isInternalOfficeSceneId(entry.id) ||
      seenIds.has(entry.id)
    ) {
      return invalid('id');
    }
    seenIds.add(entry.id);
    if (
      typeof entry.label !== 'string' ||
      !entry.label.trim() ||
      entry.label.trim().length > 120
    ) {
      return invalid('label');
    }
    if (typeof entry.english !== 'string' || entry.english.trim().length > 80) {
      return invalid('english');
    }
    if (
      typeof entry.description !== 'string' ||
      entry.description.trim().length > 4000
    ) {
      return invalid('description');
    }
    if (typeof entry.icon !== 'string' || entry.icon.trim().length > 100) {
      return invalid('icon');
    }
    if (typeof entry.visible !== 'boolean') return invalid('visible');
    if (!Array.isArray(entry.toolIds) || entry.toolIds.length > 1) {
      return invalid('toolIds');
    }
    const toolIds = entry.toolIds.map((toolId) => {
      if (
        typeof toolId !== 'string' ||
        !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(toolId)
      ) {
        return invalid('toolIds');
      }
      return toolId;
    });
    if (
      !entry.toolBlurbs ||
      typeof entry.toolBlurbs !== 'object' ||
      Array.isArray(entry.toolBlurbs)
    ) {
      return invalid('toolBlurbs');
    }
    for (const [toolId, blurb] of Object.entries(entry.toolBlurbs)) {
      if (!toolIds.includes(toolId) || typeof blurb !== 'string' || blurb.trim().length > 500) {
        return invalid('toolBlurbs');
      }
    }
    // hydrate 不修剪、不去重、不补默认值；读取到的正式状态与数据库保持一致。
    return {
      id: entry.id,
      label: entry.label,
      english: entry.english,
      description: entry.description,
      icon: entry.icon,
      visible: entry.visible,
      toolIds: [...toolIds],
      toolBlurbs: { ...entry.toolBlurbs },
    };
  });
}

function patchEntry(
  entry: InternalOfficeSceneCatalogEntry,
  patch: Partial<Omit<InternalOfficeSceneCatalogEntry, 'id'>>,
): InternalOfficeSceneCatalogEntry {
  const toolIds =
    patch.toolIds === undefined
      ? entry.toolIds
      : [...new Set(patch.toolIds.filter(Boolean))];
  const mergedToolBlurbs =
    patch.toolBlurbs === undefined
      ? entry.toolBlurbs
      : { ...entry.toolBlurbs, ...patch.toolBlurbs };
  return {
    ...entry,
    ...patch,
    label: (patch.label ?? entry.label).trim() || entry.label,
    english: patch.english === undefined ? entry.english : patch.english.trim(),
    description:
      patch.description === undefined ? entry.description : patch.description.trim(),
    icon: (patch.icon ?? entry.icon).trim() || entry.icon || 'fa-cube',
    toolIds,
    // 后端要求说明只能引用当前绑定工具；换绑时不能把旧工具说明一并提交。
    toolBlurbs: normalizeToolBlurbs(toolIds, mergedToolBlurbs),
  };
}

function parseRevision(value: unknown): number {
  const revision = Number(value);
  return Number.isSafeInteger(revision) && revision >= 0 ? revision : 0;
}

function parseRemoteDocument(remote: RemoteInternalOfficeSceneDocument | null): {
  entries: InternalOfficeSceneCatalogEntry[];
  revision: number;
} {
  if (Array.isArray(remote)) {
    return { entries: normalizeEntries(remote), revision: 0 };
  }
  if (!remote || !Array.isArray(remote.entries)) {
    throw new Error('invalid_internal_office_scene_document');
  }
  return {
    entries: normalizeEntries(remote.entries),
    revision: parseRevision(remote.revision),
  };
}

function moveToPosition(
  entries: InternalOfficeSceneCatalogEntry[],
  id: InternalOfficeSceneId,
  position: number,
): InternalOfficeSceneCatalogEntry[] {
  const sourceIndex = entries.findIndex((entry) => entry.id === id);
  if (sourceIndex < 0 || !Number.isFinite(position)) return entries;
  const next = [...entries];
  const [entry] = next.splice(sourceIndex, 1);
  if (!entry) return entries;
  const targetIndex = Math.max(0, Math.min(Math.trunc(position), next.length));
  next.splice(targetIndex, 0, entry);
  return next;
}

async function fetchFreshDocument(workspaceId: string) {
  const remote = await fetchPlatformDoc<RemoteInternalOfficeSceneDocument>(
    workspaceId,
    DOC_KIND,
    { fresh: true },
  );
  return parseRemoteDocument(remote);
}

type StoreSet = (partial: Partial<InternalOfficeSceneCatalogState>) => void;
type StoreGet = () => InternalOfficeSceneCatalogState;

/**
 * 所有异步读写共用一个代次。切换工作区或发起新的 fresh hydrate 后，旧请求即使
 * 迟到也不能再发布到全局 catalog，避免 A 工作区数据覆盖 B 工作区。
 */
let operationGeneration = 0;

function publishDatabaseSnapshot(
  set: StoreSet,
  snapshot: {
    workspaceId: string;
    entries: InternalOfficeSceneCatalogEntry[];
    revision: number;
  },
  state?: Partial<InternalOfficeSceneCatalogState>,
) {
  setInternalOfficeSceneCatalog(snapshot.entries);
  set({
    workspaceId: snapshot.workspaceId,
    entries: snapshot.entries,
    revision: snapshot.revision,
    loaded: true,
    ...state,
  });
}

function mutationFailureMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.endsWith('_409')) {
    return '保存冲突：数据已被其他管理员更新。当前卡片仍保留保存前的数据库快照，请刷新后重试。';
  }
  return '保存失败：改动未写入服务器，当前卡片仍为保存前的数据库数据。请确认登录状态与后端连接后重试。';
}

async function persistDatabaseSnapshot(
  get: StoreGet,
  set: StoreSet,
  entries: InternalOfficeSceneCatalogEntry[],
  okMessage: string,
): Promise<boolean> {
  const state = get();
  const workspaceId = state.workspaceId;

  if (state.loading || state.saving) return false;
  if (!state.loaded || !workspaceId) {
    set({
      toast: '场景数据尚未从服务器加载完成，请刷新后重试。',
      toastTone: 'error',
    });
    return false;
  }
  if (currentWorkspaceId() !== workspaceId) {
    set({
      toast: '工作区已切换，本次改动未提交。请等待当前工作区数据加载完成。',
      toastTone: 'error',
    });
    return false;
  }
  if (!canUsePlatformDocsApi()) {
    set({
      toast: '未连接后端，本次改动未提交，页面仍保留数据库中的原数据。',
      toastTone: 'error',
    });
    return false;
  }

  const revision = state.revision;
  const generation = ++operationGeneration;
  set({ saving: true, toast: '保存中…', toastTone: 'pending' });

  let writeSucceeded = false;
  try {
    await savePlatformDoc(workspaceId, DOC_KIND, {
      version: DOCUMENT_VERSION,
      revision,
      expectedRevision: revision,
      entries,
    });
    writeSucceeded = true;
    // PUT 成功仍不直接发布草稿；fresh GET 的 canonical 文档才是正式状态。
    const fresh = await fetchFreshDocument(workspaceId);
    if (
      generation !== operationGeneration ||
      get().workspaceId !== workspaceId ||
      currentWorkspaceId() !== workspaceId
    ) {
      return false;
    }
    publishDatabaseSnapshot(
      set,
      { workspaceId, entries: fresh.entries, revision: fresh.revision },
      { saving: false, loading: false, toast: okMessage, toastTone: 'ok' },
    );
    return true;
  } catch (error) {
    if (generation !== operationGeneration || get().workspaceId !== workspaceId) {
      return false;
    }
    set({
      saving: false,
      toast: writeSucceeded
        ? '数据已写入服务器，但读取确认失败。当前卡片暂未更新，请刷新后查看数据库结果。'
        : mutationFailureMessage(error),
      toastTone: 'error',
    });
    return false;
  }
}

export type SceneToastTone = 'ok' | 'error' | 'pending';

export interface InternalOfficeSceneCatalogState {
  entries: InternalOfficeSceneCatalogEntry[];
  workspaceId: string | null;
  revision: number;
  loading: boolean;
  saving: boolean;
  loaded: boolean;
  toast: string | null;
  toastTone: SceneToastTone;
  hydrate: (workspaceId?: string) => Promise<boolean>;
  updateEntry: (
    id: InternalOfficeSceneId,
    patch: Partial<Omit<InternalOfficeSceneCatalogEntry, 'id'>>,
    /** 保存后在数组中的 0-based 目标位置；省略时保持原位置。 */
    position?: number,
  ) => Promise<boolean>;
  setToolIds: (id: InternalOfficeSceneId, toolIds: string[]) => Promise<boolean>;
  moveEntry: (id: InternalOfficeSceneId, dir: -1 | 1) => Promise<boolean>;
  reorderVisibleEntry: (
    activeId: InternalOfficeSceneId,
    beforeId: InternalOfficeSceneId | null,
    /** 拖拽开始时完整、未筛选的可见场景顺序。 */
    visibleIds: InternalOfficeSceneId[],
    /** 拖拽开始时的数据库 revision；变化后本次放置作废。 */
    startRevision?: number,
  ) => Promise<boolean>;
  addEntry: (input?: NewInternalOfficeSceneInput) => Promise<InternalOfficeSceneId | null>;
  removeEntry: (id: InternalOfficeSceneId) => Promise<boolean>;
  dismissToast: () => void;
}

const initial: InternalOfficeSceneCatalogEntry[] = [];
setInternalOfficeSceneCatalog(initial);

export const useInternalOfficeSceneCatalogStore =
  create<InternalOfficeSceneCatalogState>((set, get) => ({
    entries: initial,
    workspaceId: null,
    revision: 0,
    loading: false,
    saving: false,
    loaded: false,
    toast: null,
    toastTone: 'ok',

    hydrate: async (requestedWorkspaceId) => {
      const workspaceId = (requestedWorkspaceId || currentWorkspaceId()).trim();
      if (!workspaceId || workspaceId !== currentWorkspaceId()) return false;

      const previous = get();
      if (
        previous.workspaceId === workspaceId &&
        (previous.loading || previous.saving)
      ) {
        return false;
      }

      const switchedWorkspace = previous.workspaceId !== workspaceId;
      const generation = ++operationGeneration;
      if (switchedWorkspace) setInternalOfficeSceneCatalog([]);
      set({
        workspaceId,
        entries: switchedWorkspace ? [] : previous.entries,
        revision: switchedWorkspace ? 0 : previous.revision,
        loading: true,
        saving: false,
        loaded: switchedWorkspace ? false : previous.loaded,
        toast: null,
        toastTone: 'ok',
      });

      if (!canUsePlatformDocsApi()) {
        if (generation === operationGeneration && get().workspaceId === workspaceId) {
          set({
            loading: false,
            toast: '未连接后端，无法加载办公场景数据库。',
            toastTone: 'error',
          });
        }
        return false;
      }

      try {
        const fresh = await fetchFreshDocument(workspaceId);
        if (
          generation !== operationGeneration ||
          get().workspaceId !== workspaceId ||
          currentWorkspaceId() !== workspaceId
        ) {
          return false;
        }
        publishDatabaseSnapshot(
          set,
          { workspaceId, entries: fresh.entries, revision: fresh.revision },
          { loading: false, saving: false, toast: null, toastTone: 'ok' },
        );
        return true;
      } catch {
        if (generation !== operationGeneration || get().workspaceId !== workspaceId) {
          return false;
        }
        // 同工作区刷新失败时保留此前已确认的 DB 快照；跨工作区则保持空数据。
        set({
          loading: false,
          toast: '办公场景数据库加载失败，未使用本地默认数据替代。请稍后重试。',
          toastTone: 'error',
        });
        return false;
      }
    },

    updateEntry: async (id, patch, position) => {
      const current = get().entries;
      if (!current.some((entry) => entry.id === id)) return false;
      let next = current.map((entry) =>
        entry.id === id ? patchEntry(entry, patch) : entry,
      );
      if (position !== undefined) next = moveToPosition(next, id, position);
      return persistDatabaseSnapshot(get, set, next, '已保存办公场景');
    },

    setToolIds: async (id, toolIds) =>
      get().updateEntry(id, { toolIds: [...new Set(toolIds.filter(Boolean))] }),

    addEntry: async (input) => {
      const list = get().entries;
      const requestedId = input?.id?.trim().toLowerCase();
      if (requestedId && !isInternalOfficeSceneId(requestedId)) {
        set({ toast: '场景 ID 格式不正确，未创建场景。', toastTone: 'error' });
        return null;
      }
      if (requestedId && list.some((entry) => entry.id === requestedId)) {
        set({ toast: '场景 ID 已存在，未创建场景。', toastTone: 'error' });
        return null;
      }

      const id = requestedId || createOfficeSceneId(list.map((entry) => entry.id));
      const entry: InternalOfficeSceneCatalogEntry = {
        id,
        label: input?.label?.trim() || '新场景',
        english: input?.english?.trim() || '',
        description: input?.description?.trim() || '',
        icon: input?.icon?.trim() || 'fa-cube',
        // 未绑定工具前默认不对业务可见，避免露出空场景。
        visible: input?.visible ?? false,
        toolIds: [...new Set((input?.toolIds ?? []).filter(Boolean))],
        toolBlurbs: {},
      };
      entry.toolBlurbs = normalizeToolBlurbs(entry.toolIds, input?.toolBlurbs);
      let next = [...list, entry];
      if (input?.position !== undefined) {
        next = moveToPosition(next, id, input.position);
      }
      const saved = await persistDatabaseSnapshot(get, set, next, '已新增办公场景');
      return saved ? id : null;
    },

    removeEntry: async (id) => {
      const current = get().entries;
      const next = current.filter((entry) => entry.id !== id);
      if (next.length === current.length) return false;
      return persistDatabaseSnapshot(get, set, next, '已删除办公场景');
    },

    moveEntry: async (id, dir) => {
      const current = get().entries;
      const index = current.findIndex((entry) => entry.id === id);
      const target = index + dir;
      if (index < 0 || target < 0 || target >= current.length) return false;
      const next = moveToPosition(current, id, target);
      return persistDatabaseSnapshot(get, set, next, '已调整场景顺序');
    },

    reorderVisibleEntry: async (
      activeId,
      beforeId,
      visibleIds,
      startRevision,
    ) => {
      const state = get();
      if (
        startRevision !== undefined &&
        (!Number.isSafeInteger(startRevision) || startRevision !== state.revision)
      ) {
        set({
          toast: '场景顺序已刷新，本次拖拽未提交。请按当前顺序重试。',
          toastTone: 'error',
        });
        return false;
      }
      const next = reorderVisibleOfficeSceneEntries(
        state.entries,
        activeId,
        beforeId,
        visibleIds,
      );
      if (!next) return false;
      return persistDatabaseSnapshot(get, set, next, '已调整场景顺序');
    },

    dismissToast: () => set({ toast: null, toastTone: 'ok' }),
  }));

// 工作区切换是同步发生的，而各业务数据的重新 bootstrap 可能要等待网络。先立即清空
// 上一个工作区的正式快照，保证等待 B 工作区 hydrate 时绝不会短暂展示 A 的场景。
useWorkspaceStore.subscribe((state, previous) => {
  if (state.workspaceId === previous.workspaceId) return;
  operationGeneration += 1;
  setInternalOfficeSceneCatalog([]);
  useInternalOfficeSceneCatalogStore.setState({
    entries: [],
    workspaceId: state.workspaceId,
    revision: 0,
    loading: false,
    saving: false,
    loaded: false,
    toast: null,
    toastTone: 'ok',
  });
});
