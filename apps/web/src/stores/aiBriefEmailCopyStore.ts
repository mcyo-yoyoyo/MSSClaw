import { create } from 'zustand';
import {
  DEFAULT_AI_BRIEF_EMAIL_COPY,
  type AiBriefEmailCopy,
} from '@/domain/aiBriefEmailCopy';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
} from '@/api/platformDocsApi';

function normalize(raw: Partial<AiBriefEmailCopy> | null | undefined): AiBriefEmailCopy {
  return {
    brandLabel:
      (raw?.brandLabel ?? DEFAULT_AI_BRIEF_EMAIL_COPY.brandLabel).trim() ||
      DEFAULT_AI_BRIEF_EMAIL_COPY.brandLabel,
    headline:
      (raw?.headline ?? DEFAULT_AI_BRIEF_EMAIL_COPY.headline).trim() ||
      DEFAULT_AI_BRIEF_EMAIL_COPY.headline,
    dateSuffix:
      (raw?.dateSuffix ?? DEFAULT_AI_BRIEF_EMAIL_COPY.dateSuffix).trim() ||
      DEFAULT_AI_BRIEF_EMAIL_COPY.dateSuffix,
    ctaTitle:
      (raw?.ctaTitle ?? DEFAULT_AI_BRIEF_EMAIL_COPY.ctaTitle).trim() ||
      DEFAULT_AI_BRIEF_EMAIL_COPY.ctaTitle,
    ctaBlurb:
      (raw?.ctaBlurb ?? DEFAULT_AI_BRIEF_EMAIL_COPY.ctaBlurb).trim() ||
      DEFAULT_AI_BRIEF_EMAIL_COPY.ctaBlurb,
    ctaButtonLabel:
      (raw?.ctaButtonLabel ?? DEFAULT_AI_BRIEF_EMAIL_COPY.ctaButtonLabel).trim() ||
      DEFAULT_AI_BRIEF_EMAIL_COPY.ctaButtonLabel,
    platformUrl: (raw?.platformUrl ?? DEFAULT_AI_BRIEF_EMAIL_COPY.platformUrl).trim(),
    footerNote:
      (raw?.footerNote ?? DEFAULT_AI_BRIEF_EMAIL_COPY.footerNote).trim() ||
      DEFAULT_AI_BRIEF_EMAIL_COPY.footerNote,
  };
}

function persist(copy: AiBriefEmailCopy) {
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(currentWorkspaceId(), 'ai-brief-email-copy', copy);
}

interface AiBriefEmailCopyState {
  copy: AiBriefEmailCopy;
  toast: string | null;
  hydrate: () => void;
  update: (patch: Partial<AiBriefEmailCopy>) => void;
  resetToDefaults: () => void;
  dismissToast: () => void;
}

export const useAiBriefEmailCopyStore = create<AiBriefEmailCopyState>((set, get) => ({
  copy: { ...DEFAULT_AI_BRIEF_EMAIL_COPY },
  toast: null,

  hydrate: () => {
    void (async () => {
      if (!canUsePlatformDocsApi()) {
        set({ copy: { ...DEFAULT_AI_BRIEF_EMAIL_COPY } });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<Partial<AiBriefEmailCopy>>(
          currentWorkspaceId(),
          'ai-brief-email-copy',
        );
        set({ copy: normalize(remote) });
      } catch {
        set({ copy: { ...DEFAULT_AI_BRIEF_EMAIL_COPY } });
      }
    })();
  },

  update: (patch) => {
    const next = normalize({ ...get().copy, ...patch });
    persist(next);
    set({
      copy: next,
      toast: canUsePlatformDocsApi()
        ? '已保存 AI 快讯邮件文案'
        : '共享服务未连通，文案未持久化',
    });
  },

  resetToDefaults: () => {
    const next = { ...DEFAULT_AI_BRIEF_EMAIL_COPY };
    persist(next);
    set({ copy: next, toast: '已恢复默认邮件文案' });
  },

  dismissToast: () => set({ toast: null }),
}));
