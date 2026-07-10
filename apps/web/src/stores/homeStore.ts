import { create } from 'zustand';
import type { HomeCategory, PrototypeAgentSeed } from '@/domain/prototype/types';
import { HOME_BIZ_AGENTS } from '@/domain/prototype/home';
import { resolveAgentFromText as resolveAgentFromTextPlan } from '@/domain/plan';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

interface HomeState {
  category: HomeCategory;
  draftText: string;
  setCategory: (cat: HomeCategory) => void;
  setDraftText: (text: string) => void;
  fillPrompt: (label: string) => void;
  getFeaturedAgents: () => PrototypeAgentSeed[];
  resolveAgentFromText: (text: string) => PrototypeAgentSeed | null;
}

export const useHomeStore = create<HomeState>((set, get) => ({
  category: 'mkt',
  draftText: '',

  setCategory: (cat) => set({ category: cat }),
  setDraftText: (text) => set({ draftText: text }),

  fillPrompt: (label) => set({ draftText: buildHomePrompt(label) }),

  getFeaturedAgents: () => {
    const { category } = get();
    const ids = new Set(HOME_BIZ_AGENTS[category] ?? []);
    return useMarketplaceStore
      .getState()
      .getPublishedAgents()
      .filter((a) => ids.has(a.id));
  },

  resolveAgentFromText: (text) => resolveAgentFromTextPlan(text),
}));

export function buildHomePrompt(label: string): string {
  if (label.includes('SOP') || label.includes('知识') || label.includes('合规')) {
    return `${label}：/检索 `;
  }
  return `${label}：`;
}

export function getSlashQuery(text: string, mode: '/' | '@'): string {
  const match = mode === '/' ? text.match(/\/([^\s]*)$/) : text.match(/@([^\s]*)$/);
  return match?.[1] ?? '';
}
