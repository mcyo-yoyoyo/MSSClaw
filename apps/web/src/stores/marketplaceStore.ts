import { create } from 'zustand';
import { PROTOTYPE_AGENTS } from '@/domain/prototype/agents';
import { PROTOTYPE_SKILLS } from '@/domain/prototype/skills';
import { PROTOTYPE_AUTOMATIONS } from '@/domain/prototype/automations';
import { PROTOTYPE_KB_DOCS } from '@/domain/prototype/kb';
import type { PrototypeAgentSeed, PrototypeAutomation, PrototypeKbDocument, PrototypeSkillSeed } from '@/domain/prototype/types';
import type { EfficiencyCategory } from '@/domain/prototype/types';
import { kbDocFromFile, readKbFileAsText } from '@/domain/kbUtils';
import { parseSkillImport } from '@/domain/skillExport';
import { parseKbDocument } from '@/api/kbClient';
import { rebuildKbVectorIndex } from '@/api/kbClient';
import { loadMarketplace, scheduleSaveMarketplace } from '@/domain/persistence/storage';
import { useWorkspaceStore } from '@/stores/workspaceStore';

type CategoryFilter = EfficiencyCategory | 'all';

interface MarketplaceState {
  ready: boolean;
  agents: PrototypeAgentSeed[];
  skills: PrototypeSkillSeed[];
  automations: PrototypeAutomation[];
  kbDocs: PrototypeKbDocument[];
  agentFilter: CategoryFilter;
  skillFilter: CategoryFilter;
  agentSearch: string;
  skillSearch: string;
  kbFilter: string;
  kbSearch: string;
  toast: string | null;

  bootstrap: (workspaceId: string) => Promise<void>;
  persist: () => void;
  upsertAgent: (agent: PrototypeAgentSeed, isNew?: boolean) => void;
  upsertSkill: (skill: PrototypeSkillSeed, isNew?: boolean) => void;
  upsertAutomation: (automation: PrototypeAutomation, isNew?: boolean) => void;
  upsertKbDoc: (doc: PrototypeKbDocument, isNew?: boolean) => void;
  uploadKbFile: (file: File) => Promise<void>;
  importSkillFile: (file: File) => Promise<void>;
  syncKbIndex: () => void;
  getPublishedAgents: () => PrototypeAgentSeed[];
  getPublishedSkills: () => PrototypeSkillSeed[];
  setAgentFilter: (f: CategoryFilter) => void;
  setSkillFilter: (f: CategoryFilter) => void;
  setAgentSearch: (q: string) => void;
  setSkillSearch: (q: string) => void;
  setKbFilter: (id: string) => void;
  setKbSearch: (q: string) => void;
  filteredAgents: () => PrototypeAgentSeed[];
  filteredSkills: () => PrototypeSkillSeed[];
  filteredKbDocs: () => PrototypeKbDocument[];
  bumpAgentInvokes: (id: string) => void;
  bumpSkillInvokes: (id: string) => void;
  toggleAutomation: (id: string) => void;
  markAutomationRun: (id: string) => void;
  dismissToast: () => void;
  showToast: (msg: string) => void;
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  ready: false,
  agents: structuredClone(PROTOTYPE_AGENTS),
  skills: structuredClone(PROTOTYPE_SKILLS),
  automations: structuredClone(PROTOTYPE_AUTOMATIONS),
  kbDocs: structuredClone(PROTOTYPE_KB_DOCS),
  agentFilter: 'all',
  skillFilter: 'all',
  agentSearch: '',
  skillSearch: '',
  kbFilter: 'all',
  kbSearch: '',
  toast: null,

  bootstrap: async (workspaceId) => {
    const snapshot = await loadMarketplace(workspaceId);
    set({ ...snapshot, ready: true });
  },

  persist: () => {
    const { agents, skills, automations, kbDocs } = get();
    const workspaceId = useWorkspaceStore.getState().workspaceId;
    scheduleSaveMarketplace(workspaceId, { agents, skills, automations, kbDocs });
  },

  upsertAgent: (agent, isNew = false) => {
    set((s) => ({
      agents: isNew ? [agent, ...s.agents] : s.agents.map((a) => (a.id === agent.id ? agent : a)),
    }));
    get().persist();
  },

  upsertSkill: (skill, isNew = false) => {
    set((s) => ({
      skills: isNew ? [skill, ...s.skills] : s.skills.map((sk) => (sk.id === skill.id ? skill : sk)),
    }));
    get().persist();
  },

  upsertAutomation: (automation, isNew = false) => {
    set((s) => ({
      automations: isNew
        ? [automation, ...s.automations]
        : s.automations.map((a) => (a.id === automation.id ? automation : a)),
    }));
    get().persist();
  },

  upsertKbDoc: (doc, isNew = false) => {
    set((s) => ({
      kbDocs: isNew ? [doc, ...s.kbDocs] : s.kbDocs.map((d) => (d.id === doc.id ? doc : d)),
    }));
    get().persist();
  },

  uploadKbFile: async (file) => {
    const { kbFilter } = get();
    const docId = `kb-upload-${Date.now()}`;
    const baseDoc = { ...kbDocFromFile(file, kbFilter), id: docId };
    get().upsertKbDoc(baseDoc, true);
    get().showToast('文档已入库，正在解析…');

    try {
      const workspaceId = useWorkspaceStore.getState().workspaceId;
      const content = await readKbFileAsText(file);
      const parsed = await parseKbDocument(workspaceId, {
        filename: file.name,
        content,
        sizeBytes: file.size,
      });
      const chunkTexts = parsed.chunks.map((c) => c.text);
      get().upsertKbDoc(
        {
          ...baseDoc,
          chunks: parsed.chunkCount,
          chunkTexts,
          indexed: true,
          desc: parsed.preview.slice(0, 160) || baseDoc.desc,
          tags: [...new Set([...baseDoc.tags, '已解析'])],
        },
        false,
      );
      get().showToast(`「${baseDoc.title}」解析完成 · ${parsed.chunkCount} chunks`);
    } catch {
      get().showToast(`「${baseDoc.title}」解析失败，请稍后重试`);
    }
  },

  importSkillFile: async (file) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      const items = Array.isArray(json) ? json : [json];
      let imported = 0;

      for (const item of items) {
        const parsed = parseSkillImport(item);
        if (!parsed) continue;

        const idTaken = get().skills.some((s) => s.id === parsed.id);
        const skill: PrototypeSkillSeed = idTaken
          ? { ...parsed, id: `skill-import-${Date.now()}-${imported}` }
          : parsed;

        get().upsertSkill(skill, true);
        imported += 1;
      }

      if (imported > 0) {
        get().showToast(`已导入 ${imported} 个 Skill`);
      } else {
        get().showToast('未能识别有效的 Skill 包格式');
      }
    } catch {
      get().showToast('Skill 包解析失败，请检查 JSON 格式');
    }
  },

  syncKbIndex: () => {
    const pending = get().kbDocs.filter((d) => !d.indexed);
    if (!pending.length) {
      void (async () => {
        const workspaceId = useWorkspaceStore.getState().workspaceId;
        const result = await rebuildKbVectorIndex(workspaceId, get().kbDocs);
        get().showToast(result.message ?? '知识库索引已是最新');
      })();
      return;
    }
    get().showToast('正在同步 Milvus 向量索引…');
    let i = 0;
    const timer = setInterval(() => {
      if (i >= pending.length) {
        clearInterval(timer);
        get().persist();
        void (async () => {
          const workspaceId = useWorkspaceStore.getState().workspaceId;
          const result = await rebuildKbVectorIndex(workspaceId, get().kbDocs);
          get().showToast(result.message ?? `同步完成 · ${pending.length} 篇文档已索引`);
        })();
        return;
      }
      const id = pending[i].id;
      set((s) => ({
        kbDocs: s.kbDocs.map((d) =>
          d.id === id
            ? { ...d, indexed: true, chunks: d.chunks || Math.floor(Math.random() * 100 + 30) }
            : d,
        ),
      }));
      i++;
    }, 400);
  },

  getPublishedAgents: () => get().agents.filter((a) => a.published),
  getPublishedSkills: () => get().skills.filter((s) => s.published),

  setAgentFilter: (f) => set({ agentFilter: f }),
  setSkillFilter: (f) => set({ skillFilter: f }),
  setAgentSearch: (q) => set({ agentSearch: q }),
  setSkillSearch: (q) => set({ skillSearch: q }),
  setKbFilter: (id) => set({ kbFilter: id }),
  setKbSearch: (q) => set({ kbSearch: q }),

  filteredAgents: () => {
    const { agents, agentFilter, agentSearch } = get();
    const q = agentSearch.trim().toLowerCase();
    return agents.filter((a) => {
      if (agentFilter !== 'all' && a.category !== agentFilter) return false;
      if (q && !`${a.name} ${a.desc} ${a.bizLine}`.toLowerCase().includes(q)) return false;
      return true;
    });
  },

  filteredSkills: () => {
    const { skills, skillFilter, skillSearch } = get();
    const q = skillSearch.trim().toLowerCase();
    return skills.filter((s) => {
      if (skillFilter !== 'all' && s.category !== skillFilter) return false;
      if (q && !`${s.name} ${s.desc} ${s.tags.join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
  },

  filteredKbDocs: () => {
    const { kbDocs, kbFilter, kbSearch } = get();
    const q = kbSearch.trim().toLowerCase();
    return kbDocs.filter((d) => {
      if (kbFilter !== 'all' && d.collection !== kbFilter) return false;
      if (q && !`${d.title} ${d.desc} ${d.tags.join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
  },

  bumpAgentInvokes: (id) => {
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, invokes: a.invokes + 1 } : a)),
    }));
    get().persist();
  },

  bumpSkillInvokes: (id) => {
    set((s) => ({
      skills: s.skills.map((sk) => (sk.id === id ? { ...sk, invokes: sk.invokes + 1 } : sk)),
    }));
    get().persist();
  },

  toggleAutomation: (id) =>
    set((s) => {
      const next = {
        automations: s.automations.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
        toast: s.automations.find((a) => a.id === id)
          ? `${s.automations.find((a) => a.id === id)!.enabled ? '已暂停' : '已启用'}自动化`
          : null,
      };
      queueMicrotask(() => get().persist());
      return next;
    }),

  markAutomationRun: (id) => {
    set((s) => ({
      automations: s.automations.map((a) => (a.id === id ? { ...a, lastRun: '刚刚' } : a)),
    }));
    get().persist();
  },

  dismissToast: () => set({ toast: null }),
  showToast: (msg) => set({ toast: msg }),
}));
