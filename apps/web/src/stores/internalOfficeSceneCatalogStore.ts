import { create } from 'zustand';
import {
  createOfficeSceneId,
  defaultInternalOfficeSceneCatalog,
  isInternalOfficeSceneId,
  migrateInternalOfficeSceneLabel,
  setInternalOfficeSceneCatalog,
  type InternalOfficeSceneCatalogEntry,
  type InternalOfficeSceneId,
} from '@/domain/internalOfficeScenes';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
} from '@/api/platformDocsApi';

function normalizeEntries(
  saved: InternalOfficeSceneCatalogEntry[] | null,
): InternalOfficeSceneCatalogEntry[] {
  return (saved ?? [])
    .filter((entry) => entry?.id && isInternalOfficeSceneId(entry.id))
    .map((entry) => ({
      id: entry.id,
      label: migrateInternalOfficeSceneLabel(entry.label?.trim() || entry.id),
      english: entry.english?.trim() || '',
      description: entry.description?.trim() || '',
      icon: entry.icon?.trim() || 'fa-cube',
      visible: entry.visible !== false,
      toolIds: Array.isArray(entry.toolIds)
        ? [...new Set(entry.toolIds.filter(Boolean))]
        : [],
      toolBlurbs:
        entry.toolBlurbs && typeof entry.toolBlurbs === 'object'
          ? { ...entry.toolBlurbs }
          : {},
    }));
}

type StoreSet = (partial: Partial<InternalOfficeSceneCatalogState>) => void;

/**
 * 落库并如实反馈结果。
 *
 * 此前未连后端时直接 return、写请求失败也被 void 吞掉，而调用方无条件
 * 弹「已保存」——运营看到成功提示但数据从未落库（典型触发：登录态过期）。
 */
function persist(
  entries: InternalOfficeSceneCatalogEntry[],
  set: StoreSet,
  okMessage: string,
) {
  setInternalOfficeSceneCatalog(entries);
  set({ entries });

  if (!canUsePlatformDocsApi()) {
    set({
      toast: '未连接后端，改动只在当前页面生效、刷新即丢失。请检查登录状态或后端连接后重试。',
      toastTone: 'error',
    });
    return;
  }

  set({ toast: '保存中…', toastTone: 'pending' });
  scheduleSavePlatformDoc(currentWorkspaceId(), 'internal-office-scenes', {
    version: 2,
    entries,
  })
    .then(() => set({ toast: okMessage, toastTone: 'ok' }))
    .catch(() =>
      set({
        toast: '保存失败：改动未写入服务器。请确认登录状态与后端连接后重试。',
        toastTone: 'error',
      }),
    );
}

export type SceneToastTone = 'ok' | 'error' | 'pending';

interface InternalOfficeSceneCatalogState {
  entries: InternalOfficeSceneCatalogEntry[];
  toast: string | null;
  toastTone: SceneToastTone;
  hydrate: () => void;
  updateEntry: (
    id: InternalOfficeSceneId,
    patch: Partial<Omit<InternalOfficeSceneCatalogEntry, 'id'>>,
  ) => void;
  setToolIds: (id: InternalOfficeSceneId, toolIds: string[]) => void;
  moveEntry: (id: InternalOfficeSceneId, dir: -1 | 1) => void;
  addEntry: () => InternalOfficeSceneId;
  removeEntry: (id: InternalOfficeSceneId) => void;
  resetToDefaults: () => void;
  dismissToast: () => void;
}

const initial: InternalOfficeSceneCatalogEntry[] = [];
setInternalOfficeSceneCatalog(initial);

export const useInternalOfficeSceneCatalogStore =
  create<InternalOfficeSceneCatalogState>((set, get) => ({
    entries: initial,
    toast: null,
    toastTone: 'ok',

    hydrate: () => {
      void (async () => {
        if (!canUsePlatformDocsApi()) {
          // 未连后端：保留已拉到的场景，避免业务页整页变空
          const entries = get().entries;
          setInternalOfficeSceneCatalog(entries);
          set({ entries });
          return;
        }
        try {
          const remote = await fetchPlatformDoc<
            InternalOfficeSceneCatalogEntry[] | { entries?: InternalOfficeSceneCatalogEntry[] }
          >(currentWorkspaceId(), 'internal-office-scenes');
          const list = Array.isArray(remote)
            ? remote
            : Array.isArray(remote?.entries)
              ? remote.entries
              : null;
          const entries = normalizeEntries(list);
          setInternalOfficeSceneCatalog(entries);
          set({ entries });
        } catch {
          const entries = get().entries;
          setInternalOfficeSceneCatalog(entries);
          set({ entries });
        }
      })();
    },

    updateEntry: (id, patch) => {
      const entries = get().entries.map((e) =>
        e.id === id
          ? {
              ...e,
              ...patch,
              label: (patch.label ?? e.label).trim() || e.label,
              english: (patch.english ?? e.english).trim() || e.english,
              description: (patch.description ?? e.description).trim() || e.description,
              icon: (patch.icon ?? e.icon).trim() || e.icon,
              toolIds: patch.toolIds ? [...new Set(patch.toolIds.filter(Boolean))] : e.toolIds,
              toolBlurbs: patch.toolBlurbs
                ? { ...e.toolBlurbs, ...patch.toolBlurbs }
                : e.toolBlurbs,
            }
          : e,
      );
      persist(entries, set, '已保存办公场景字典');
    },

    setToolIds: (id, toolIds) => {
      get().updateEntry(id, { toolIds: [...new Set(toolIds.filter(Boolean))] });
    },


    addEntry: () => {
      const list = get().entries;
      const id = createOfficeSceneId(list.map((e) => e.id));
      const entry: InternalOfficeSceneCatalogEntry = {
        id,
        label: '新场景',
        english: '',
        description: '',
        icon: 'fa-cube',
        // 未绑定工具前默认不对业务可见，避免露出空场景
        visible: false,
        toolIds: [],
        toolBlurbs: {},
      };
      const next = [...list, entry];
      persist(next, set, '已新增办公场景');
      return id;
    },

    removeEntry: (id) => {
      const next = get().entries.filter((e) => e.id !== id);
      if (next.length === get().entries.length) return;
      persist(next, set, '已删除办公场景');
    },

    moveEntry: (id, dir) => {
      const list = [...get().entries];
      const i = list.findIndex((e) => e.id === id);
      if (i < 0) return;
      const j = i + dir;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j]!, list[i]!];
      persist(list, set, '已调整场景顺序');
    },

    resetToDefaults: () => {
      const entries = defaultInternalOfficeSceneCatalog();
      persist(entries, set, '已恢复默认办公场景');
    },

    dismissToast: () => set({ toast: null, toastTone: 'ok' }),
  }));
