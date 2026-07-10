import { create } from 'zustand';

interface CommandPaletteState {
  open: boolean;
  query: string;
  selectedIndex: number;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  setQuery: (q: string) => void;
  setSelectedIndex: (i: number) => void;
  resetPalette: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set, get) => ({
  open: false,
  query: '',
  selectedIndex: 0,

  openPalette: () => set({ open: true, query: '', selectedIndex: 0 }),

  closePalette: () => set({ open: false, query: '', selectedIndex: 0 }),

  togglePalette: () => {
    if (get().open) get().closePalette();
    else get().openPalette();
  },

  setQuery: (q) => set({ query: q, selectedIndex: 0 }),

  setSelectedIndex: (i) => set({ selectedIndex: i }),

  resetPalette: () => set({ query: '', selectedIndex: 0 }),
}));
