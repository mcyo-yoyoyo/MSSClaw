import { create } from 'zustand';
import {
  defaultInternalOfficeSceneCatalog,
  isInternalOfficeSceneId,
  setInternalOfficeSceneCatalog,
  type InternalOfficeSceneCatalogEntry,
  type InternalOfficeSceneId,
} from '@/domain/internalOfficeScenes';

const LS_KEY = 'mssclaw_internal_office_scenes_v3';

function mergeWithDefaults(
  saved: InternalOfficeSceneCatalogEntry[] | null,
): InternalOfficeSceneCatalogEntry[] {
  const defaults = defaultInternalOfficeSceneCatalog();
  const byId = new Map(
    (saved ?? [])
      .filter((e) => e?.id && isInternalOfficeSceneId(e.id))
      .map((e) => [e.id, e] as const),
  );
  const orderedIds = saved?.length
    ? [
        ...saved.map((e) => e.id).filter(isInternalOfficeSceneId),
        ...defaults.map((e) => e.id).filter((id) => !byId.has(id)),
      ]
    : defaults.map((e) => e.id);

  const seen = new Set<string>();
  const result: InternalOfficeSceneCatalogEntry[] = [];
  for (const id of orderedIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const base = defaults.find((e) => e.id === id)!;
    const override = byId.get(id);
    result.push({
      id,
      label: override?.label?.trim() || base.label,
      english: override?.english?.trim() || base.english,
      description: override?.description?.trim() || base.description,
      icon: override?.icon?.trim() || base.icon,
      visible: override?.visible ?? base.visible,
      // 区分「未配置」与「显式空数组」：空数组表示运营清空绑定
      toolIds: Array.isArray(override?.toolIds)
        ? [...new Set(override.toolIds.filter(Boolean))]
        : [...base.toolIds],
      toolBlurbs: {
        ...base.toolBlurbs,
        ...(override?.toolBlurbs ?? {}),
      },
    });
  }
  return result;
}

function load(): InternalOfficeSceneCatalogEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as InternalOfficeSceneCatalogEntry[];
      if (Array.isArray(parsed)) return mergeWithDefaults(parsed);
    }
  } catch {
    /* ignore */
  }
  return mergeWithDefaults(null);
}

function persist(entries: InternalOfficeSceneCatalogEntry[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(entries));
  setInternalOfficeSceneCatalog(entries);
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

const initial = load();
setInternalOfficeSceneCatalog(initial);

export const useInternalOfficeSceneCatalogStore =
  create<InternalOfficeSceneCatalogState>((set, get) => ({
    entries: initial,
    toast: null,

    hydrate: () => {
      const entries = load();
      setInternalOfficeSceneCatalog(entries);
      set({ entries });
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
      const entries = mergeWithDefaults(null);
      persist(entries);
      set({ entries, toast: '已恢复默认办公场景' });
    },

    dismissToast: () => set({ toast: null }),
  }));
