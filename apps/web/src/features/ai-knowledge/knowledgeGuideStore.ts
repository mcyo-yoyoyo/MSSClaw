import { create } from 'zustand';
export const useKnowledgeGuide = create<{ active: boolean; step: number; start: () => void; go: (step: number) => void; close: () => void }>((set) => ({
  active: false, step: 0,
  start: () => set({ active: true, step: 0 }),
  go: step => set({ active: true, step }),
  close: () => set({ active: false }),
}));
