import { create } from 'zustand';
import {
  DEFAULT_BUSINESS_SCENARIO_CATEGORIES,
  setBusinessScenarioCatalog,
  type BusinessScenarioCategory,
  type BusinessScenarioId,
  isBusinessScenarioId,
} from '@/domain/businessScenarios';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
} from '@/api/platformDocsApi';

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

function normalizeCategories(
  saved: BusinessScenarioCategory[] | null,
): BusinessScenarioCategory[] {
  return (saved ?? [])
    .filter((category) => category?.id && isBusinessScenarioId(category.id))
    .map((category) => ({
      id: category.id,
      label: category.label?.trim() || category.id,
      fullLabel: category.fullLabel?.trim() || category.label?.trim() || category.id,
      icon: category.icon?.trim() || 'fa-cube',
      blurb: category.blurb?.trim() || '',
      tabVisible: category.tabVisible !== false,
    }));
}

function persist(categories: BusinessScenarioCategory[]) {
  setBusinessScenarioCatalog(categories);
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(currentWorkspaceId(), 'business-scenario-catalog', {
    categories,
  });
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

const initial: BusinessScenarioCategory[] = [];
setBusinessScenarioCatalog(initial);

export const useBusinessScenarioCatalogStore = create<BusinessScenarioCatalogState>(
  (set, get) => ({
    categories: initial,
    toast: null,

    hydrate: () => {
      void (async () => {
        if (!canUsePlatformDocsApi()) {
          const categories: BusinessScenarioCategory[] = [];
          setBusinessScenarioCatalog(categories);
          set({ categories });
          return;
        }
        try {
          const remote = await fetchPlatformDoc<
            BusinessScenarioCategory[] | { categories?: BusinessScenarioCategory[] }
          >(currentWorkspaceId(), 'business-scenario-catalog');
          const list = Array.isArray(remote)
            ? remote
            : Array.isArray(remote?.categories)
              ? remote.categories
              : null;
          const categories = normalizeCategories(list);
          setBusinessScenarioCatalog(categories);
          set({ categories });
        } catch {
          const categories: BusinessScenarioCategory[] = [];
          setBusinessScenarioCatalog(categories);
          set({ categories });
        }
      })();
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
      const categories = DEFAULT_BUSINESS_SCENARIO_CATEGORIES.map((item) => ({ ...item }));
      persist(categories);
      set({ categories, toast: '已恢复默认场景分类' });
    },

    dismissToast: () => set({ toast: null }),
  }),
);
