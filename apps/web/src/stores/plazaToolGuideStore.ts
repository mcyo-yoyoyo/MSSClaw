import { create } from 'zustand';
import {
  flattenPlazaToolGuideSeeds,
  normalizePlazaToolGuideRecord,
  type PlazaToolGuide,
  type PlazaToolGuideRecord,
} from '@/domain/plazaToolGuides';
import { demoDefaults } from '@/domain/demoContentPolicy';
import { useWorkspaceStore } from '@/stores/workspaceStore';

function howtoSeeds(): PlazaToolGuideRecord[] {
  return demoDefaults(flattenPlazaToolGuideSeeds());
}

const LS_PREFIX = 'mssclaw_plaza_howto_v2_';

function storageKey(workspaceId: string) {
  return `${LS_PREFIX}${workspaceId}`;
}

function migrateFromV1(workspaceId: string): PlazaToolGuideRecord[] | null {
  try {
    const raw = localStorage.getItem(`mssclaw_plaza_howto_v1_${workspaceId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map((row) => normalizePlazaToolGuideRecord(row as PlazaToolGuideRecord))
      .filter((r): r is PlazaToolGuideRecord => Boolean(r));
  } catch {
    return null;
  }
}

function readLocal(workspaceId: string): PlazaToolGuideRecord[] {
  try {
    const seeds = howtoSeeds();
    const raw = localStorage.getItem(storageKey(workspaceId));
    if (!raw) {
      const legacy = migrateFromV1(workspaceId);
      if (!legacy?.length) return seeds;
      return mergeGuideCatalog(seeds, legacy);
    }
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return seeds;
    const normalized = parsed
      .map((row) => normalizePlazaToolGuideRecord(row as PlazaToolGuideRecord))
      .filter((r): r is PlazaToolGuideRecord => Boolean(r));
    return mergeGuideCatalog(seeds, normalized);
  } catch {
    return howtoSeeds();
  }
}

/** 种子优先补齐新 catalog 指导；同 id 以本地运营修改为准 */
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

function writeLocal(workspaceId: string, records: PlazaToolGuideRecord[]) {
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(records));
}

interface PlazaToolGuideState {
  ready: boolean;
  records: PlazaToolGuideRecord[];
  toast: string | null;
  bootstrap: (workspaceId?: string) => void;
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

  bootstrap: (workspaceId) => {
    const ws = workspaceId || useWorkspaceStore.getState().workspaceId;
    set({ records: readLocal(ws), ready: true });
  },

  persist: () => {
    const ws = useWorkspaceStore.getState().workspaceId;
    writeLocal(ws, get().records);
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
