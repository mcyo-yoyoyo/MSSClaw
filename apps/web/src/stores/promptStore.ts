import { create } from 'zustand';
import {
  advancePromptLifecycle as advancePromptLifecycleApi,
  fetchPrompts,
} from '@/api/centerApi';
import {
  findPromptByName,
  getNextLifecycle,
  getPromptsByWorkspace,
  type Prompt,
  type PromptLifecycle,
} from '@/domain/prompt';

interface PromptState {
  workspaceId: string;
  prompts: Prompt[];
  selectedPromptId: string | null;
  lifecycleFilter: PromptLifecycle | 'all';
  toast: string | null;

  loadWorkspace: (workspaceId: string) => void;
  selectPrompt: (promptId: string | null) => void;
  selectPromptByName: (name: string) => void;
  setLifecycleFilter: (filter: PromptLifecycle | 'all') => void;
  advanceLifecycle: (promptId: string) => void;
  dismissToast: () => void;
  selectedPrompt: () => Prompt | null;
  filteredPrompts: () => Prompt[];
}

export const usePromptStore = create<PromptState>((set, get) => ({
  workspaceId: 'ws-cn-marketing',
  prompts: getPromptsByWorkspace('ws-cn-marketing'),
  selectedPromptId: getPromptsByWorkspace('ws-cn-marketing')[0]?.id ?? null,
  lifecycleFilter: 'all',
  toast: null,

  loadWorkspace: (workspaceId) => {
    void (async () => {
      const prompts = await fetchPrompts(workspaceId);
      set({
        workspaceId,
        prompts,
        selectedPromptId: prompts[0]?.id ?? null,
        lifecycleFilter: 'all',
      });
    })();
  },

  selectPrompt: (promptId) => set({ selectedPromptId: promptId }),

  selectPromptByName: (name) => {
    const prompt = findPromptByName(get().workspaceId, name) ?? get().prompts.find((p) => p.name === name);
    if (prompt) set({ selectedPromptId: prompt.id });
  },

  setLifecycleFilter: (filter) => set({ lifecycleFilter: filter }),

  advanceLifecycle: (promptId) => {
    void (async () => {
      const { prompts, workspaceId } = get();
      const target = prompts.find((p) => p.id === promptId);
      if (!target) return;

      let nextPrompts = await advancePromptLifecycleApi(workspaceId, promptId, prompts);
      if (nextPrompts === prompts) {
        const next = getNextLifecycle(target.lifecycle);
        if (!next) return;
        nextPrompts = prompts.map((p) =>
          p.id === promptId ? { ...p, lifecycle: next, updatedAt: new Date().toISOString().slice(0, 10) } : p,
        );
      }

      const updated = nextPrompts.find((p) => p.id === promptId);
      set({
        prompts: nextPrompts,
        toast: updated ? `�?{target.name}」已推进�?${updated.lifecycle}` : `�?{target.name}」已更新`,
      });
    })();
  },

  dismissToast: () => set({ toast: null }),

  selectedPrompt: () => {
    const { prompts, selectedPromptId } = get();
    if (!selectedPromptId) return null;
    return prompts.find((p) => p.id === selectedPromptId) ?? null;
  },

  filteredPrompts: () => {
    const { prompts, lifecycleFilter } = get();
    if (lifecycleFilter === 'all') return prompts;
    return prompts.filter((p) => p.lifecycle === lifecycleFilter);
  },
}));

export function mapResourceToPromptId(resourceId: string): string | null {
  if (resourceId.startsWith('prompt-')) return resourceId;
  return null;
}

export function resolvePromptIdFromResource(resourceId: string, resourceName?: string | null, workspaceId?: string) {
  const mapped = mapResourceToPromptId(resourceId);
  if (mapped) return mapped;
  if (resourceName && workspaceId) {
    return findPromptByName(workspaceId, resourceName)?.id ?? null;
  }
  return null;
}
