import { create } from 'zustand';
import {
  DEFAULT_AI_BRIEF_EMAIL_COPY,
  type AiBriefEmailCopy,
} from '@/domain/aiBriefEmailCopy';

const LS_KEY = 'mssclaw_ai_brief_email_copy_v2';
const LS_KEY_V1 = 'mssclaw_ai_brief_email_copy_v1';

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

/** v1 → v2：强制初始化主标题 / 引导标题 / 按钮文案，保留其余配置 */
function migrateV1ToV2(raw: Partial<AiBriefEmailCopy>): AiBriefEmailCopy {
  return normalize({
    ...raw,
    headline: DEFAULT_AI_BRIEF_EMAIL_COPY.headline,
    ctaTitle: DEFAULT_AI_BRIEF_EMAIL_COPY.ctaTitle,
    ctaButtonLabel: DEFAULT_AI_BRIEF_EMAIL_COPY.ctaButtonLabel,
  });
}

function load(): AiBriefEmailCopy {
  try {
    const rawV2 = localStorage.getItem(LS_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Partial<AiBriefEmailCopy>;
      return normalize(parsed);
    }
    const rawV1 = localStorage.getItem(LS_KEY_V1);
    if (rawV1) {
      const parsed = JSON.parse(rawV1) as Partial<AiBriefEmailCopy>;
      const migrated = migrateV1ToV2(parsed);
      persist(migrated);
      localStorage.removeItem(LS_KEY_V1);
      return migrated;
    }
  } catch {
    /* ignore */
  }
  const defaults = { ...DEFAULT_AI_BRIEF_EMAIL_COPY };
  persist(defaults);
  return defaults;
}

function persist(copy: AiBriefEmailCopy) {
  localStorage.setItem(LS_KEY, JSON.stringify(copy));
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
  copy: load(),
  toast: null,

  hydrate: () => set({ copy: load() }),

  update: (patch) => {
    const next = normalize({ ...get().copy, ...patch });
    persist(next);
    set({ copy: next, toast: '已保存 AI 快讯邮件文案' });
  },

  resetToDefaults: () => {
    const next = { ...DEFAULT_AI_BRIEF_EMAIL_COPY };
    persist(next);
    set({ copy: next, toast: '已恢复默认邮件文案' });
  },

  dismissToast: () => set({ toast: null }),
}));
