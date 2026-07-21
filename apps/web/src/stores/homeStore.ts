import { create } from 'zustand';
import type { HomeCategory, PrototypeAgentSeed } from '@/domain/prototype/types';
import { HOME_BIZ_AGENTS, HOME_REGION_AGENTS } from '@/domain/prototype/home';
import { resolveAgentFromText as resolveAgentFromTextPlan } from '@/domain/plan';
import type { OrgAffiliation, RegionId } from '@/domain/orgTaxonomy';
import type { PlatformRole } from '@/domain/rbac';
import { hasGlobalOrgScope } from '@/domain/rolePerspective';
import { AGENT_ROLE_BY_ID, type AgentRoleId } from '@/domain/agentRoles';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

/** Expert browse axis: Agent role | NP | Region */
export type ExpertBrowseAxis = 'agent' | 'dept' | 'region';

interface HomeState {
  homeMode: 'assistant' | 'portal';
  expertAxis: ExpertBrowseAxis;
  agentRoleId: AgentRoleId;
  category: HomeCategory;
  regionId: RegionId;
  draftText: string;
  /** ???????????????????? */
  composerFocusKey: number;
  setHomeMode: (mode: 'assistant' | 'portal') => void;
  setExpertAxis: (axis: ExpertBrowseAxis) => void;
  setAgentRoleId: (id: AgentRoleId) => void;
  setCategory: (cat: HomeCategory) => void;
  setRegionId: (id: RegionId) => void;
  setDraftText: (text: string) => void;
  requestComposerFocus: () => void;
  fillPrompt: (label: string) => void;
  applyUserOrgDefaults: (aff: OrgAffiliation, role?: PlatformRole) => void;
  getFeaturedAgents: () => PrototypeAgentSeed[];
  resolveAgentFromText: (text: string) => PrototypeAgentSeed | null;
}

export const useHomeStore = create<HomeState>((set, get) => ({
  homeMode: 'portal',
  expertAxis: 'agent',
  agentRoleId: 'scout',
  category: 'ecommerce',
  regionId: 'latam',
  draftText: '',
  composerFocusKey: 0,

  setHomeMode: (homeMode) => set({ homeMode }),
  setExpertAxis: (expertAxis) => set({ expertAxis }),
  setAgentRoleId: (agentRoleId) => set({ expertAxis: 'agent', agentRoleId }),
  setCategory: (cat) => set({ expertAxis: 'dept', category: cat }),
  setRegionId: (id) => set({ expertAxis: 'region', regionId: id }),
  setDraftText: (text) => set({ draftText: text }),
  requestComposerFocus: () => set((s) => ({ composerFocusKey: s.composerFocusKey + 1 })),

  fillPrompt: (label) => set({ draftText: buildHomePrompt(label) }),

  applyUserOrgDefaults: (aff, role) => {
    const region = aff.regionId ?? 'latam';
    if (hasGlobalOrgScope(role)) {
      set({
        expertAxis: 'agent',
        agentRoleId: 'scout',
        category: 'ecommerce',
        regionId: region,
      });
      return;
    }
    if (aff.regionId) {
      set({
        expertAxis: 'agent',
        agentRoleId: 'scout',
        regionId: region,
        category: 'ecommerce',
      });
    } else {
      set({
        expertAxis: 'agent',
        agentRoleId: 'scout',
        category: 'ecommerce',
        regionId: region,
      });
    }
  },

  getFeaturedAgents: () => {
    const { expertAxis, agentRoleId, category, regionId } = get();
    const published = useMarketplaceStore.getState().getPublishedAgents();
    if (expertAxis === 'agent') {
      return published.filter((a) => AGENT_ROLE_BY_ID[a.id] === agentRoleId);
    }
    const ids = new Set(
      expertAxis === 'region'
        ? (HOME_REGION_AGENTS[regionId] ?? [])
        : (HOME_BIZ_AGENTS[category] ?? []),
    );
    return published.filter((a) => ids.has(a.id));
  },

  resolveAgentFromText: (text) => resolveAgentFromTextPlan(text),
}));

export function buildHomePrompt(label: string): string {
  if (label.includes('SOP') || label.includes('??') || label.includes('??')) {
    return `${label} ï¿?/?? `;
  }
  if (label.includes('??') || label.includes('??') || label.includes('??')) {
    return `${label}?????????`;
  }
  return `${label}`;
}

export function getSlashQuery(text: string, mode: '/' | '@'): string {
  const match = mode === '/' ? text.match(/\/([^\s]*)$/) : text.match(/@([^\s]*)$/);
  return match?.[1] ?? '';
}
