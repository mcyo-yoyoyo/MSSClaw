import { create } from 'zustand';
import {
  DEFAULT_BUSINESS_SCENARIO_CATEGORIES,
  setBusinessScenarioCatalog,
  type BusinessScenarioCategory,
  type BusinessScenarioId,
  isBusinessScenarioId,
} from '@/domain/businessScenarios';

const LS_KEY = 'mssclaw_business_scene_catalog_v1';

const ICON_PRESETS = [
  'fa-chart-line',
  'fa-pen-nib',
  'fa-handshake',
  'fa-headset',
  'fa-chart-column',
  'fa-scale-balanced',
  'fa-book-open',
  'fa-briefcase',
  'fa-lightbulb',
  'fa-robot',
  'fa-store',
  'fa-users',
] as const;

export const BUSINESS_SCENE_ICON_PRESETS = ICON_PRESETS;

function mergeWithDefaults(
  saved: BusinessScenarioCategory[] | null,
): BusinessScenarioCategory[] {
  const byId = new Map(
    (saved ?? [])
      .filter((c) => c?.id && isBusinessScenarioId(c.id))
      .map((c) => [c.id, c] as const),
  );
  const orderedIds = saved?.length
    ? [
        ...saved.map((c) => c.id).filter(isBusinessScenarioId),
        ...DEFAULT_BUSINESS_SCENARIO_CATEGORIES.map((c) => c.id).filter(
          (id) => !byId.has(id),
        ),
      ]
    : DEFAULT_BUSINESS_SCENARIO_CATEGORIES.map((c) => c.id);

  const seen = new Set<string>();
  const result: BusinessScenarioCategory[] = [];
  for (const id of orderedIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const base = DEFAULT_BUSINESS_SCENARIO_CATEGORIES.find((c) => c.id === id)!;
    const override = byId.get(id);
    result.push({
      id,
      label: override?.label?.trim() || base.label,
      fullLabel: override?.fullLabel?.trim() || base.fullLabel,
      icon: override?.icon?.trim() || base.icon,
      blurb: override?.blurb?.trim() || base.blurb,
      tabVisible: override?.tabVisible ?? base.tabVisible,
    });
  }
  return result;
}

function load(): BusinessScenarioCategory[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BusinessScenarioCategory[];
      if (Array.isArray(parsed)) return mergeWithDefaults(parsed);
    }
  } catch {
    /* ignore */
  }
  return mergeWithDefaults(null);
}

function persist(categories: BusinessScenarioCategory[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(categories));
  setBusinessScenarioCatalog(categories);
}

interface BusinessScenarioCatalogState {
  categories: BusinessScenarioCategory[];
  toast: string | null;
  hydrate: () => void;
  updateCategory: (
    id: BusinessScenarioId,
    patch: Partial<Omit<BusinessScenarioCategory, 'id'>>,
  ) => void;
  moveCategory: (id: BusinessScenarioId, dir: -1 | 1) => void;
  resetToDefaults: () => void;
  dismissToast: () => void;
}

const initial = load();
setBusinessScenarioCatalog(initial);

export const useBusinessScenarioCatalogStore = create<BusinessScenarioCatalogState>(
  (set, get) => ({
    categories: initial,
    toast: null,

    hydrate: () => {
      const categories = load();
      setBusinessScenarioCatalog(categories);
      set({ categories });
    },

    updateCategory: (id, patch) => {
      const categories = get().categories.map((c) =>
        c.id === id
          ? {
              ...c,
              ...patch,
              label: (patch.label ?? c.label).trim() || c.label,
              fullLabel: (patch.fullLabel ?? c.fullLabel).trim() || c.fullLabel,
              icon: (patch.icon ?? c.icon).trim() || c.icon,
              blurb: (patch.blurb ?? c.blurb).trim(),
            }
          : c,
      );
      persist(categories);
      set({
        categories,
        toast: patch.tabVisible !== undefined ? '已更新集市可见性' : null,
      });
    },

    moveCategory: (id, dir) => {
      const list = [...get().categories];
      const i = list.findIndex((c) => c.id === id);
      if (i < 0) return;
      const j = i + dir;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j]!, list[i]!];
      persist(list);
      set({ categories: list, toast: '已调整展示顺序' });
    },

    resetToDefaults: () => {
      const categories = mergeWithDefaults(null);
      persist(categories);
      set({ categories, toast: '已恢复默认场景分类' });
    },

    dismissToast: () => set({ toast: null }),
  }),
);
