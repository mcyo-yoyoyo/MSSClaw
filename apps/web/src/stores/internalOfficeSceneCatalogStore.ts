import { create } from 'zustand';
import {
  defaultInternalOfficeSceneCatalog,
  isInternalOfficeSceneId,
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
      label: entry.label?.trim() || entry.id,
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

function persist(entries: InternalOfficeSceneCatalogEntry[]) {
  setInternalOfficeSceneCatalog(entries);
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(currentWorkspaceId(), 'internal-office-scenes', entries);
}

interface InternalOfficeSceneCatalogState {
  entries: InternalOfficeSceneCatalogEntry[];
  toast: string | null;
  hydrate: () => void;
  updateEntry: (
    id: InternalOfficeSceneId,
    patch: Partial<Omit<InternalOfficeSceneCatalogEntry, 'id'>>,
  ) => void;
  setToolIds: (id: InternalOfficeSceneId, toolIds: string[]) => void;
  setToolBlurb: (id: InternalOfficeSceneId, toolId: string, blurb: string) => void;
  moveEntry: (id: InternalOfficeSceneId, dir: -1 | 1) => void;
  resetToDefaults: () => void;
  dismissToast: () => void;
}

const initial: InternalOfficeSceneCatalogEntry[] = [];
setInternalOfficeSceneCatalog(initial);

export const useInternalOfficeSceneCatalogStore =
  create<InternalOfficeSceneCatalogState>((set, get) => ({
    entries: initial,
    toast: null,

    hydrate: () => {
      void (async () => {
        if (!canUsePlatformDocsApi()) {
          const entries: InternalOfficeSceneCatalogEntry[] = [];
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
          const entries: InternalOfficeSceneCatalogEntry[] = [];
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
      persist(entries);
      set({ entries, toast: '已保存办公场景字典' });
    },

    setToolIds: (id, toolIds) => {
      get().updateEntry(id, { toolIds: [...new Set(toolIds.filter(Boolean))] });
    },

    setToolBlurb: (id, toolId, blurb) => {
      const entry = get().entries.find((e) => e.id === id);
      if (!entry) return;
      get().updateEntry(id, {
        toolBlurbs: { ...entry.toolBlurbs, [toolId]: blurb },
      });
    },

    moveEntry: (id, dir) => {
      const list = [...get().entries];
      const i = list.findIndex((e) => e.id === id);
      if (i < 0) return;
      const j = i + dir;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j]!, list[i]!];
      persist(list);
      set({ entries: list, toast: '已调整场景顺序' });
    },

    resetToDefaults: () => {
      const entries = defaultInternalOfficeSceneCatalog();
      persist(entries);
      set({ entries, toast: '已恢复默认办公场景' });
    },

    dismissToast: () => set({ toast: null }),
  }));
