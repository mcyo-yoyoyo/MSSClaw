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
  setOrgSelection: (next: OrgPerspectiveSelection) => void;
  setBusinessFilter: (next: BusinessScenarioId | 'all') => void;
  setSearch: (q: string) => void;
  reset: () => void;
}

export const useMarketFilterStore = create<MarketFilterState>((set) => ({
  orgSelection: emptyOrgPerspectiveSelection(),
  businessFilter: 'all',
  search: '',
  setOrgSelection: (orgSelection) => set({ orgSelection }),
  setBusinessFilter: (businessFilter) => set({ businessFilter }),
  setSearch: (search) => set({ search }),
  reset: () =>
    set({
      orgSelection: emptyOrgPerspectiveSelection(),
      businessFilter: 'all',
      search: '',
    }),
}));
