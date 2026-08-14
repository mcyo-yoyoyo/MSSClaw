import { create } from 'zustand';
import type { BusinessScenarioId } from '@/domain/businessScenarios';
import {
  emptyOrgPerspectiveSelection,
  type OrgPerspectiveSelection,
} from '@/domain/orgAxisTags';

interface MarketFilterState {
  orgSelection: OrgPerspectiveSelection;
  businessFilter: BusinessScenarioId | 'all';
  search: string;
  /** 仅看我的收藏（跨货架卡片 id+kind） */
  favoritesOnly: boolean;
  setOrgSelection: (next: OrgPerspectiveSelection) => void;
  setBusinessFilter: (next: BusinessScenarioId | 'all') => void;
  setSearch: (q: string) => void;
  setFavoritesOnly: (on: boolean) => void;
  reset: () => void;
}

export const useMarketFilterStore = create<MarketFilterState>((set) => ({
  orgSelection: emptyOrgPerspectiveSelection(),
  businessFilter: 'all',
  search: '',
  favoritesOnly: false,
  setOrgSelection: (orgSelection) => set({ orgSelection }),
  setBusinessFilter: (businessFilter) => set({ businessFilter }),
  setSearch: (search) => set({ search }),
  setFavoritesOnly: (favoritesOnly) => set({ favoritesOnly }),
  reset: () =>
    set({
      orgSelection: emptyOrgPerspectiveSelection(),
      businessFilter: 'all',
      search: '',
      favoritesOnly: false,
    }),
}));
