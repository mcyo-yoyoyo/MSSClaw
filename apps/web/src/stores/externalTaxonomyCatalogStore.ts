import { create } from 'zustand';
import {
  EXTERNAL_TOOL_TYPES,
  EXTERNAL_WORK_SCENES,
  type ExternalToolTypeId,
  type ExternalWorkSceneId,
} from '@/domain/externalToolTaxonomy';
import {
  defaultExternalTaxonomyCatalog,
  setExternalTaxonomyCatalog,
  type ExternalTaxonomyCatalog,
  type ExternalToolTypeCatalogEntry,
  type ExternalWorkSceneCatalogEntry,
} from '@/domain/externalTaxonomyCatalog';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
} from '@/api/platformDocsApi';

const TYPE_IDS = new Set(EXTERNAL_TOOL_TYPES.map((t) => t.id));
const SCENE_IDS = new Set(EXTERNAL_WORK_SCENES.map((s) => s.id));

function normalizeCatalog(
  saved: Partial<ExternalTaxonomyCatalog> | null,
): ExternalTaxonomyCatalog {
  const savedTypes = (saved?.types ?? []).filter((t) => t?.id && TYPE_IDS.has(t.id));
  const savedScenes = (saved?.scenes ?? []).filter(
    (s) => s?.id && SCENE_IDS.has(s.id),
  );
  return {
    version: 2,
    types: savedTypes.map((item) => ({
      id: item.id,
      label: item.label?.trim() || item.id,
      csvLabel: item.csvLabel?.trim() || item.label?.trim() || item.id,
      icon: item.icon?.trim() || 'fa-cube',
      visible: item.visible !== false,
      filterTypeIds: Array.isArray(item.filterTypeIds)
        ? (item.filterTypeIds.filter((id) => TYPE_IDS.has(id)) as ExternalToolTypeId[])
        : [item.id],
    })),
    scenes: savedScenes.map((item) => ({
      id: item.id,
      label: item.label?.trim() || item.id,
      icon: item.icon?.trim() || 'fa-cube',
      visible: item.visible !== false,
      typeIds: Array.isArray(item.typeIds)
        ? (item.typeIds.filter((id) => TYPE_IDS.has(id)) as ExternalToolTypeId[])
        : [],
    })),
  };
}

function persist(catalog: ExternalTaxonomyCatalog) {
  setExternalTaxonomyCatalog(catalog);
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(currentWorkspaceId(), 'external-taxonomy', catalog);
}

interface ExternalTaxonomyCatalogState {
  catalog: ExternalTaxonomyCatalog;
  toast: string | null;
  hydrate: () => void;
  updateType: (
    id: ExternalToolTypeId,
    patch: Partial<Omit<ExternalToolTypeCatalogEntry, 'id'>>,
  ) => void;
  updateScene: (
    id: ExternalWorkSceneId,
    patch: Partial<Omit<ExternalWorkSceneCatalogEntry, 'id'>>,
  ) => void;
  moveType: (id: ExternalToolTypeId, dir: -1 | 1) => void;
  moveScene: (id: ExternalWorkSceneId, dir: -1 | 1) => void;
  resetToDefaults: () => void;
  dismissToast: () => void;
}

const initial: ExternalTaxonomyCatalog = { version: 2, types: [], scenes: [] };
setExternalTaxonomyCatalog(initial);

export const useExternalTaxonomyCatalogStore = create<ExternalTaxonomyCatalogState>(
  (set, get) => ({
    catalog: initial,
    toast: null,

    hydrate: () => {
      void (async () => {
        if (!canUsePlatformDocsApi()) {
          const catalog: ExternalTaxonomyCatalog = { version: 2, types: [], scenes: [] };
          setExternalTaxonomyCatalog(catalog);
          set({ catalog });
          return;
        }
        try {
          const remote = await fetchPlatformDoc<Partial<ExternalTaxonomyCatalog>>(
            currentWorkspaceId(),
            'external-taxonomy',
          );
          const catalog = normalizeCatalog(remote);
          setExternalTaxonomyCatalog(catalog);
          set({ catalog });
        } catch {
          const catalog: ExternalTaxonomyCatalog = { version: 2, types: [], scenes: [] };
          setExternalTaxonomyCatalog(catalog);
          set({ catalog });
        }
      })();
    },

    updateType: (id, patch) => {
      const catalog: ExternalTaxonomyCatalog = {
        ...get().catalog,
        types: get().catalog.types.map((t) =>
          t.id === id
            ? {
                ...t,
                ...patch,
                label: (patch.label ?? t.label).trim() || t.label,
                csvLabel: (patch.csvLabel ?? t.csvLabel).trim() || t.csvLabel,
                icon: (patch.icon ?? t.icon).trim() || t.icon,
              }
            : t,
        ),
      };
      persist(catalog);
      set({ catalog, toast: '已保存工具类型字典' });
    },

    updateScene: (id, patch) => {
      const catalog: ExternalTaxonomyCatalog = {
        ...get().catalog,
        scenes: get().catalog.scenes.map((s) =>
          s.id === id
            ? {
                ...s,
                ...patch,
                label: (patch.label ?? s.label).trim() || s.label,
                typeIds: patch.typeIds
                  ? (patch.typeIds.filter((tid) =>
                      TYPE_IDS.has(tid),
                    ) as ExternalToolTypeId[])
                  : s.typeIds,
              }
            : s,
        ),
      };
      persist(catalog);
      set({ catalog, toast: '已保存工作场景字典' });
    },

    moveType: (id, dir) => {
      const list = [...get().catalog.types];
      const i = list.findIndex((t) => t.id === id);
      if (i < 0) return;
      const j = i + dir;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j]!, list[i]!];
      const catalog = { ...get().catalog, types: list };
      persist(catalog);
      set({ catalog, toast: '已调整类型顺序' });
    },

    moveScene: (id, dir) => {
      const list = [...get().catalog.scenes];
      const i = list.findIndex((s) => s.id === id);
      if (i < 0) return;
      const j = i + dir;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j]!, list[i]!];
      const catalog = { ...get().catalog, scenes: list };
      persist(catalog);
      set({ catalog, toast: '已调整场景顺序' });
    },

    resetToDefaults: () => {
      const catalog = defaultExternalTaxonomyCatalog();
      persist(catalog);
      set({ catalog, toast: '已恢复默认外精选分类' });
    },

    dismissToast: () => set({ toast: null }),
  }),
);
