import { create } from 'zustand';
import { fetchKnowledgeBases, runKnowledgePipelineApi } from '@/api/centerApi';
import {
  findKnowledgeBaseByName,
  getKnowledgeBasesByWorkspace,
  type KnowledgeBase,
  type PipelineStage,
} from '@/domain/knowledge';
interface KnowledgeState {
  workspaceId: string;
  bases: KnowledgeBase[];
  selectedBaseId: string | null;
  selectedDocumentId: string | null;
  pipelineRunning: boolean;
  toast: string | null;

  loadWorkspace: (workspaceId: string) => void;
  selectBase: (id: string | null) => void;
  selectBaseByName: (name: string) => void;
  selectDocument: (id: string | null) => void;
  runPipeline: (baseId: string, docId: string) => Promise<void>;
  dismissToast: () => void;
  selectedBase: () => KnowledgeBase | null;
  selectedDocument: () => import('@/domain/knowledge').KnowledgeDocument | null;
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  workspaceId: 'ws-cn-marketing',
  bases: getKnowledgeBasesByWorkspace('ws-cn-marketing'),
  selectedBaseId: getKnowledgeBasesByWorkspace('ws-cn-marketing')[0]?.id ?? null,
  selectedDocumentId: null,
  pipelineRunning: false,
  toast: null,

  loadWorkspace: (workspaceId) => {
    void (async () => {
      const bases = await fetchKnowledgeBases(workspaceId);
      set({
        workspaceId,
        bases,
        selectedBaseId: bases[0]?.id ?? null,
        selectedDocumentId: null,
      });
    })();
  },
  selectBase: (id) => set({ selectedBaseId: id, selectedDocumentId: null }),

  selectBaseByName: (name) => {
    const base = findKnowledgeBaseByName(get().workspaceId, name);
    if (base) set({ selectedBaseId: base.id, selectedDocumentId: null });
  },

  selectDocument: (id) => set({ selectedDocumentId: id }),

  runPipeline: async (baseId, docId) => {
    if (get().pipelineRunning) return;

    set({ pipelineRunning: true });
    const { workspaceId } = get();

    const stages: Array<{ status: 'chunking' | 'embedding' | 'indexed'; stage: PipelineStage }> = [
      { status: 'chunking', stage: 'chunk' },
      { status: 'embedding', stage: 'embedding' },
      { status: 'indexed', stage: 'ready' },
    ];

    for (const step of stages) {
      await new Promise((r) => setTimeout(r, 600));
      set((state) => ({
        bases: state.bases.map((base) => {
          if (base.id !== baseId) return base;
          return {
            ...base,
            pipelineStage: step.stage,
            documents: base.documents.map((doc) =>
              doc.id === docId ? { ...doc, status: step.status, chunks: step.status === 'indexed' ? 64 : doc.chunks } : doc,
            ),
          };
        }),
      }));
    }

    const nextBases = await runKnowledgePipelineApi(workspaceId, baseId, docId, get().bases);
    const base = nextBases.find((b) => b.id === baseId);
    const doc = base?.documents.find((d) => d.id === docId);

    set({
      bases: nextBases,
      pipelineRunning: false,
      toast: doc ? `�?{doc.name}」索引完�?· 64 chunks` : 'Pipeline 完成',
    });
  },
  dismissToast: () => set({ toast: null }),

  selectedBase: () => {
    const { bases, selectedBaseId } = get();
    if (!selectedBaseId) return null;
    return bases.find((b) => b.id === selectedBaseId) ?? null;
  },

  selectedDocument: () => {
    const base = get().selectedBase();
    const { selectedDocumentId } = get();
    if (!base || !selectedDocumentId) return null;
    return base.documents.find((d) => d.id === selectedDocumentId) ?? null;
  },
}));

export function resolveKnowledgeBaseIdFromResource(resourceId: string, resourceName?: string | null, workspaceId?: string) {
  if (resourceId.startsWith('kb-')) return resourceId;
  if (resourceName && workspaceId) return findKnowledgeBaseByName(workspaceId, resourceName)?.id ?? null;
  return null;
}
