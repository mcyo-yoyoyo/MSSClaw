import { create } from 'zustand';
import {
  DEFAULT_MSS_BUILD_STATS_COPY,
  type MssBuildStatsCopy,
} from '@/domain/mssBuildStatsCopy';

const LS_KEY = 'mssclaw_mss_build_stats_copy_v1';

function normalize(raw: Partial<MssBuildStatsCopy> | null | undefined): MssBuildStatsCopy {
  return {
    title: (raw?.title ?? DEFAULT_MSS_BUILD_STATS_COPY.title).trim() || DEFAULT_MSS_BUILD_STATS_COPY.title,
    coverageBlurb:
      (raw?.coverageBlurb ?? DEFAULT_MSS_BUILD_STATS_COPY.coverageBlurb).trim() ||
      DEFAULT_MSS_BUILD_STATS_COPY.coverageBlurb,
    goalBlurb: (raw?.goalBlurb ?? DEFAULT_MSS_BUILD_STATS_COPY.goalBlurb).trim(),
  };
}

function load(): MssBuildStatsCopy {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MssBuildStatsCopy>;
      return normalize(parsed);
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_MSS_BUILD_STATS_COPY };
}

function persist(copy: MssBuildStatsCopy) {
  localStorage.setItem(LS_KEY, JSON.stringify(copy));
}

interface MssBuildStatsCopyState {
  copy: MssBuildStatsCopy;
  toast: string | null;
  hydrate: () => void;
  update: (patch: Partial<MssBuildStatsCopy>) => void;
  resetToDefaults: () => void;
  dismissToast: () => void;
}

export const useMssBuildStatsCopyStore = create<MssBuildStatsCopyState>((set, get) => ({
  copy: load(),
  toast: null,

  hydrate: () => set({ copy: load() }),

  update: (patch) => {
    const next = normalize({ ...get().copy, ...patch });
    persist(next);
    set({ copy: next, toast: '已保存建设概况口径' });
  },

  resetToDefaults: () => {
    const next = { ...DEFAULT_MSS_BUILD_STATS_COPY };
    persist(next);
    set({ copy: next, toast: '已恢复默认口径文案' });
  },

  dismissToast: () => set({ toast: null }),
}));
