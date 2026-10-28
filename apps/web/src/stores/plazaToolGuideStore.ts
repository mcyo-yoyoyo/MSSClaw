import { create } from 'zustand';
import {
  flattenPlazaToolGuideSeeds,
  normalizePlazaToolGuideRecord,
  type PlazaToolGuide,
  type PlazaToolGuideRecord,
} from '@/domain/plazaToolGuides';
import { demoDefaults } from '@/domain/demoContentPolicy';
import {
  canUsePlatformDocsApi,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
} from '@/api/platformDocsApi';

function howtoSeeds(): PlazaToolGuideRecord[] {
  return demoDefaults(flattenPlazaToolGuideSeeds());
}

/** 合并默认指南；同 id 以运营修改为准 */
function mergeGuideCatalog(
  seeds: PlazaToolGuideRecord[],
  saved: PlazaToolGuideRecord[],
): PlazaToolGuideRecord[] {
  const map = new Map(seeds.map((s) => [s.id, s]));
  for (const row of saved) {
    if (!row?.id) continue;
    map.set(row.id, row);
  }
  return [...map.values()];
}

function persist(records: PlazaToolGuideRecord[]) {
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc('plaza-howto', { records });
}

interface PlazaToolGuideState {
  ready: boolean;
  records: PlazaToolGuideRecord[];
  toast: string | null;
  bootstrap: () => void;
  hydrate: () => void;
  persist: () => void;
  guidesFor: (toolId: string) => PlazaToolGuide[];
  upsert: (record: PlazaToolGuideRecord, isNew?: boolean) => void;
  remove: (id: string) => void;
  resetToSeeds: () => void;
  showToast: (msg: string) => void;
  dismissToast: () => void;
}

export const usePlazaToolGuideStore = create<PlazaToolGuideState>((set, get) => ({
  ready: false,
  records: howtoSeeds(),
  toast: null,

  hydrate: () => {
    void (async () => {
      const seeds = howtoSeeds();
      if (!canUsePlatformDocsApi()) {
        set({ records: seeds, ready: true });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<{ records?: PlazaToolGuideRecord[] }>('plaza-howto',
        );
        const saved = Array.isArray(remote?.records)
          ? remote.records
              .map((row) => normalizePlazaToolGuideRecord(row))
              .filter((r): r is PlazaToolGuideRecord => Boolean(r))
          : [];
        set({
          records: saved.length ? mergeGuideCatalog(seeds, saved) : seeds,
          ready: true,
        });
      } catch {
        set({ records: seeds, ready: true });
      }
    })();
  },

  bootstrap: () => {
    get().hydrate();
  },

  persist: () => {
    persist(get().records);
  },

  guidesFor: (toolId) =>
    get()
      .records.filter((r) => r.toolId === toolId)
      .map(({ toolId: _t, ...g }) => g),

  upsert: (record, isNew = false) => {
    set((s) => ({
      records: isNew
        ? [record, ...s.records]
        : s.records.map((r) => (r.id === record.id ? record : r)),
    }));
    get().persist();
  },

  remove: (id) => {
    set((s) => ({ records: s.records.filter((r) => r.id !== id) }));
    get().persist();
  },

  resetToSeeds: () => {
    set({ records: howtoSeeds() });
    get().persist();
  },

  showToast: (msg) => set({ toast: msg }),
  dismissToast: () => set({ toast: null }),
}));

/** 确保首页读取前已灌入 */
export function ensurePlazaToolGuidesBootstrapped() {
  const s = usePlazaToolGuideStore.getState();
  if (!s.ready) s.bootstrap();
}
