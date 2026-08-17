import { create } from 'zustand';
import {
  emptyAgentHubFilterSelection,
  type AgentHubFilterSelection,
} from '@/domain/agentHubFilters';
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
  /** Agent Hub 页内维度：能力类型 · 开放范围 · 适配平台 */
  agentHubFilter: AgentHubFilterSelection;
  setOrgSelection: (next: OrgPerspectiveSelection) => void;
  setBusinessFilter: (next: BusinessScenarioId | 'all') => void;
  setSearch: (q: string) => void;
  setFavoritesOnly: (on: boolean) => void;
  setAgentHubFilter: (next: AgentHubFilterSelection) => void;
  reset: () => void;
}

export const useMarketFilterStore = create<MarketFilterState>((set) => ({
  orgSelection: emptyOrgPerspectiveSelection(),
  businessFilter: 'all',
  search: '',
  favoritesOnly: false,
  agentHubFilter: emptyAgentHubFilterSelection(),
  setOrgSelection: (orgSelection) => set({ orgSelection }),
  setBusinessFilter: (businessFilter) => set({ businessFilter }),
  setSearch: (search) => set({ search }),
  setFavoritesOnly: (favoritesOnly) => set({ favoritesOnly }),
  setAgentHubFilter: (agentHubFilter) => set({ agentHubFilter }),
  reset: () =>
    set({
      orgSelection: emptyOrgPerspectiveSelection(),
      businessFilter: 'all',
      search: '',
      favoritesOnly: false,
      agentHubFilter: emptyAgentHubFilterSelection(),
    }),
}));
