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

function mergeCatalog(
  saved: Partial<ExternalTaxonomyCatalog> | null,
): ExternalTaxonomyCatalog {
  const defaults = defaultExternalTaxonomyCatalog();
  const savedTypes = (saved?.types ?? []).filter((t) => t?.id && TYPE_IDS.has(t.id));
  const savedScenes = (saved?.scenes ?? []).filter(
    (s) => s?.id && SCENE_IDS.has(s.id),
  );
  const typeById = new Map(savedTypes.map((t) => [t.id, t] as const));
  const sceneById = new Map(savedScenes.map((s) => [s.id, s] as const));

  const typeOrder = savedTypes.length
    ? [
        ...savedTypes.map((t) => t.id),
        ...defaults.types.map((t) => t.id).filter((id) => !typeById.has(id)),
      ]
    : defaults.types.map((t) => t.id);

  const sceneOrder = savedScenes.length
    ? [
        ...savedScenes.map((s) => s.id),
        ...defaults.scenes.map((s) => s.id).filter((id) => !sceneById.has(id)),
      ]
    : defaults.scenes.map((s) => s.id);

  const types: ExternalToolTypeCatalogEntry[] = [];
  const seenT = new Set<string>();
  for (const id of typeOrder) {
    if (seenT.has(id)) continue;
    seenT.add(id);
    const base = defaults.types.find((t) => t.id === id)!;
    const o = typeById.get(id);
    types.push({
      id,
      label: o?.label?.trim() || base.label,
      csvLabel: o?.csvLabel?.trim() || base.csvLabel,
      icon: o?.icon?.trim() || base.icon,
      visible: o?.visible ?? base.visible,
    });
  }

  const scenes: ExternalWorkSceneCatalogEntry[] = [];
  const seenS = new Set<string>();
  for (const id of sceneOrder) {
    if (seenS.has(id)) continue;
    seenS.add(id);
    const base = defaults.scenes.find((s) => s.id === id)!;
    const o = sceneById.get(id);
    scenes.push({
      id,
      label: o?.label?.trim() || base.label,
      icon: o?.icon?.trim() || base.icon,
      visible: o?.visible ?? base.visible,
      // 区分「未配置」与「显式空数组」：空数组表示运营清空关联
      typeIds: Array.isArray(o?.typeIds)
        ? (o.typeIds.filter((tid) => TYPE_IDS.has(tid)) as ExternalToolTypeId[])
        : [...base.typeIds],
    });
  }

  return { types, scenes };
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

const initial = mergeCatalog(null);
setExternalTaxonomyCatalog(initial);

export const useExternalTaxonomyCatalogStore = create<ExternalTaxonomyCatalogState>(
  (set, get) => ({
    catalog: initial,
    toast: null,

    hydrate: () => {
      void (async () => {
        if (!canUsePlatformDocsApi()) {
          const catalog = mergeCatalog(null);
          setExternalTaxonomyCatalog(catalog);
          set({ catalog });
          return;
        }
        try {
          const remote = await fetchPlatformDoc<Partial<ExternalTaxonomyCatalog>>(
            currentWorkspaceId(),
            'external-taxonomy',
          );
          const catalog = mergeCatalog(remote);
          setExternalTaxonomyCatalog(catalog);
          set({ catalog });
        } catch {
          const catalog = mergeCatalog(null);
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
      const catalog = mergeCatalog(null);
      persist(catalog);
      set({ catalog, toast: '已恢复默认外精选分类' });
    },

    dismissToast: () => set({ toast: null }),
  }),
);
