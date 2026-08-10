import { create } from 'zustand';
import {
  DEFAULT_MSS_BUILD_STATS_COPY,
  type MssBuildStatsCopy,
} from '@/domain/mssBuildStatsCopy';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
} from '@/api/platformDocsApi';

function normalize(raw: Partial<MssBuildStatsCopy> | null | undefined): MssBuildStatsCopy {
  return {
    title: (raw?.title ?? DEFAULT_MSS_BUILD_STATS_COPY.title).trim() || DEFAULT_MSS_BUILD_STATS_COPY.title,
    coverageBlurb:
      (raw?.coverageBlurb ?? DEFAULT_MSS_BUILD_STATS_COPY.coverageBlurb).trim() ||
      DEFAULT_MSS_BUILD_STATS_COPY.coverageBlurb,
    goalBlurb: (raw?.goalBlurb ?? DEFAULT_MSS_BUILD_STATS_COPY.goalBlurb).trim(),
  };
}

function persist(copy: MssBuildStatsCopy) {
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(currentWorkspaceId(), 'mss-build-stats', copy);
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
  copy: { ...DEFAULT_MSS_BUILD_STATS_COPY },
  toast: null,

  hydrate: () => {
    void (async () => {
      if (!canUsePlatformDocsApi()) {
        set({ copy: { ...DEFAULT_MSS_BUILD_STATS_COPY } });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<Partial<MssBuildStatsCopy>>(
          currentWorkspaceId(),
          'mss-build-stats',
        );
        set({ copy: normalize(remote) });
      } catch {
        set({ copy: { ...DEFAULT_MSS_BUILD_STATS_COPY } });
      }
    })();
  },

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
