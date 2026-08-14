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

const LEGACY_OFFICE_LABELS = new Set([
  '记一下',
  '读一下',
  '写一下',
  '问一下',
  '搜一下',
  '答一下',
  '情报官',
  '知识库',
  'Agent',
]);

function mergeWithDefaults(
  saved: InternalOfficeSceneCatalogEntry[] | null,
): InternalOfficeSceneCatalogEntry[] {
  const defaults = defaultInternalOfficeSceneCatalog();
  const isLegacyCopy =
    Boolean(saved?.length) &&
    saved!.every((e) => !e.label?.trim() || LEGACY_OFFICE_LABELS.has(e.label.trim()));
  if (!saved?.length || isLegacyCopy) return defaults;

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

const initial = mergeWithDefaults(null);
setInternalOfficeSceneCatalog(initial);

export const useInternalOfficeSceneCatalogStore =
  create<InternalOfficeSceneCatalogState>((set, get) => ({
    entries: initial,
    toast: null,

    hydrate: () => {
      void (async () => {
        if (!canUsePlatformDocsApi()) {
          const entries = mergeWithDefaults(null);
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
          const entries = mergeWithDefaults(list);
          setInternalOfficeSceneCatalog(entries);
          set({ entries });
        } catch {
          const entries = mergeWithDefaults(null);
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
      const entries = mergeWithDefaults(null);
      persist(entries);
      set({ entries, toast: '已恢复默认办公场景' });
    },

    dismissToast: () => set({ toast: null }),
  }));
