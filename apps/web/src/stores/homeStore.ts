import { create } from 'zustand';
import type { PrototypeAgentSeed } from '@/domain/prototype/types';
import { resolveAgentFromText as resolveAgentFromTextPlan } from '@/domain/plan';

interface HomeState {
  draftText: string;
  composerFocusKey: number;
  setDraftText: (text: string) => void;
  requestComposerFocus: () => void;
  fillPrompt: (label: string) => void;
  resolveAgentFromText: (text: string) => PrototypeAgentSeed | null;
}

export const useHomeStore = create<HomeState>((set) => ({
  draftText: '',
  composerFocusKey: 0,

  setDraftText: (text) => set({ draftText: text }),
  requestComposerFocus: () => set((s) => ({ composerFocusKey: s.composerFocusKey + 1 })),
  fillPrompt: (label) => set({ draftText: buildHomePrompt(label) }),
  resolveAgentFromText: (text) => resolveAgentFromTextPlan(text),
}));

export function buildHomePrompt(label: string): string {
  return label;
}

export function getSlashQuery(text: string, mode: '/' | '@'): string {
  const match = mode === '/' ? text.match(/\/([^\s]*)$/) : text.match(/@([^\s]*)$/);
  return match?.[1] ?? '';
}
