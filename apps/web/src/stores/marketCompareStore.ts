import { create } from 'zustand';
import type { MarketShelfCard, MarketShelfKind } from '@/domain/marketShelf';

const MAX = 3;

interface MarketCompareState {
  kind: MarketShelfKind | null;
  items: MarketShelfCard[];
  drawerOpen: boolean;
  toggle: (card: MarketShelfCard) => { ok: boolean; message?: string };
  remove: (id: string) => void;
  clear: () => void;
  setDrawerOpen: (open: boolean) => void;
  isSelected: (id: string, kind: MarketShelfKind) => boolean;
}

export const useMarketCompareStore = create<MarketCompareState>((set, get) => ({
  kind: null,
  items: [],
  drawerOpen: false,

  isSelected: (id, kind) =>
    get().kind === kind && get().items.some((x) => x.id === id),

  toggle: (card) => {
    const { kind, items } = get();
    const exists = items.some((x) => x.id === card.id && kind === card.kind);
    if (exists) {
      const next = items.filter((x) => x.id !== card.id);
      set({
        items: next,
        kind: next.length ? kind : null,
        drawerOpen: next.length >= 2 ? get().drawerOpen : false,
      });
      return { ok: true };
    }
    if (kind && kind !== card.kind) {
      return { ok: false, message: '请在同一货架内对比（外精选 / 公司 / MSS）' };
    }
    if (items.length >= MAX) {
      return { ok: false, message: `最多对比 ${MAX} 项，请先取消一项` };
    }
    const next = [...items, card];
    set({
      kind: card.kind,
      items: next,
      drawerOpen: next.length >= 2 ? true : get().drawerOpen,
    });
    return { ok: true };
  },

  remove: (id) => {
    const next = get().items.filter((x) => x.id !== id);
    set({
      items: next,
      kind: next.length ? get().kind : null,
      drawerOpen: next.length >= 2 ? get().drawerOpen : false,
    });
  },

  clear: () => set({ kind: null, items: [], drawerOpen: false }),

  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
}));
