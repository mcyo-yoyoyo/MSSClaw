import { create } from 'zustand';
import { PROTOTYPE_AGENTS } from '@/domain/prototype/agents';
import { PROTOTYPE_SKILLS } from '@/domain/prototype/skills';
import { PROTOTYPE_TOOLS } from '@/domain/prototype/tools';
import { PROTOTYPE_AUTOMATIONS } from '@/domain/prototype/automations';
import { PROTOTYPE_KB_DOCS } from '@/domain/prototype/kb';
import type {
  PrototypeAgentSeed,
  PrototypeAutomation,
  PrototypeKbDocument,
  PrototypeSkillSeed,
  PrototypeToolSeed,
} from '@/domain/prototype/types';
import type { EfficiencyCategory } from '@/domain/prototype/types';
import { kbDocFromFile, readKbFileAsText } from '@/domain/kbUtils';
import { parseSkillUpload } from '@/domain/skillExport';
import { parseAgentUpload } from '@/domain/agentExport';
import { parseKbDocument } from '@/api/kbClient';
import { rebuildKbVectorIndex } from '@/api/kbClient';
import { loadMarketplace, scheduleSaveMarketplace } from '@/domain/persistence/storage';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import {
  matchesAssetOrgFilters,
  type AssetScopeFilter,
  type DeptFilter,
  type RegionFilter,
} from '@/domain/assetFilters';
import { getCurrentOrgAffiliation, getCurrentPlatformRole, getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';

type CategoryFilter = EfficiencyCategory | 'all';

interface MarketplaceState {
  ready: boolean;
  agents: PrototypeAgentSeed[];
  skills: PrototypeSkillSeed[];
  tools: PrototypeToolSeed[];
  automations: PrototypeAutomation[];
  kbDocs: PrototypeKbDocument[];
  agentFilter: CategoryFilter;
  skillFilter: CategoryFilter;
  agentSearch: string;
  skillSearch: string;
  toolSearch: string;
  agentDeptFilter: DeptFilter;
  agentRegionFilter: RegionFilter;
  agentScopeFilter: AssetScopeFilter;
  skillDeptFilter: DeptFilter;
  skillRegionFilter: RegionFilter;
  skillScopeFilter: AssetScopeFilter;
  toolDeptFilter: DeptFilter;
  toolRegionFilter: RegionFilter;
  toolScopeFilter: AssetScopeFilter;
  toolEfficiencyFilter: CategoryFilter;
  kbFilter: string;
  kbSearch: string;
  kbDeptFilter: DeptFilter;
  kbRegionFilter: RegionFilter;
  kbEfficiencyFilter: CategoryFilter;
  toast: string | null;

  bootstrap: (workspaceId: string) => Promise<void>;
  persist: () => void;
  upsertAgent: (agent: PrototypeAgentSeed, isNew?: boolean) => void;
  upsertSkill: (skill: PrototypeSkillSeed, isNew?: boolean) => void;
  upsertTool: (tool: PrototypeToolSeed, isNew?: boolean) => void;
  upsertAutomation: (automation: PrototypeAutomation, isNew?: boolean) => void;
  upsertKbDoc: (doc: PrototypeKbDocument, isNew?: boolean) => void;
  uploadKbFile: (file: File) => Promise<string | null>;
  importSkillFile: (file: File) => Promise<PrototypeSkillSeed[]>;
  importAgentFile: (file: File) => Promise<PrototypeAgentSeed[]>;
  syncKbIndex: () => void;
  getPublishedAgents: () => PrototypeAgentSeed[];
  getPublishedSkills: () => PrototypeSkillSeed[];
  getPublishedTools: () => PrototypeToolSeed[];
  setAgentFilter: (f: CategoryFilter) => void;
  setSkillFilter: (f: CategoryFilter) => void;
  setAgentSearch: (q: string) => void;
  setSkillSearch: (q: string) => void;
  setToolSearch: (q: string) => void;
  setAgentDeptFilter: (f: DeptFilter) => void;
  setAgentRegionFilter: (f: RegionFilter) => void;
  setAgentScopeFilter: (f: AssetScopeFilter) => void;
  setSkillDeptFilter: (f: DeptFilter) => void;
  setSkillRegionFilter: (f: RegionFilter) => void;
  setSkillScopeFilter: (f: AssetScopeFilter) => void;
  setToolDeptFilter: (f: DeptFilter) => void;
  setToolRegionFilter: (f: RegionFilter) => void;
  setToolScopeFilter: (f: AssetScopeFilter) => void;
  setToolEfficiencyFilter: (f: CategoryFilter) => void;
  setKbFilter: (id: string) => void;
  setKbSearch: (q: string) => void;
  setKbDeptFilter: (f: DeptFilter) => void;
  setKbRegionFilter: (f: RegionFilter) => void;
  setKbEfficiencyFilter: (f: CategoryFilter) => void;
  filteredAgents: () => PrototypeAgentSeed[];
  filteredSkills: () => PrototypeSkillSeed[];
  filteredTools: () => PrototypeToolSeed[];
  filteredKbDocs: () => PrototypeKbDocument[];
  bumpAgentInvokes: (id: string) => void;
  bumpSkillInvokes: (id: string) => void;
  bumpToolInvokes: (id: string) => void;
  toggleAutomation: (id: string) => void;
  markAutomationRun: (id: string) => void;
  dismissToast: () => void;
  showToast: (msg: string) => void;
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  ready: false,
  agents: structuredClone(PROTOTYPE_AGENTS),
  skills: structuredClone(PROTOTYPE_SKILLS),
  tools: structuredClone(PROTOTYPE_TOOLS),
  automations: structuredClone(PROTOTYPE_AUTOMATIONS),
  kbDocs: structuredClone(PROTOTYPE_KB_DOCS),
  agentFilter: 'all',
  skillFilter: 'all',
  agentSearch: '',
  skillSearch: '',
  toolSearch: '',
  agentDeptFilter: 'all',
  agentRegionFilter: 'all',
  agentScopeFilter: 'all',
  skillDeptFilter: 'all',
  skillRegionFilter: 'all',
  skillScopeFilter: 'all',
  toolDeptFilter: 'all',
  toolRegionFilter: 'all',
  toolScopeFilter: 'all',
  toolEfficiencyFilter: 'all',
  kbFilter: 'all',
  kbSearch: '',
  kbDeptFilter: 'all',
  kbRegionFilter: 'all',
  kbEfficiencyFilter: 'all',
  toast: null,

  bootstrap: async (workspaceId) => {
    const snapshot = await loadMarketplace(workspaceId);
    set({ ...snapshot, ready: true });
  },

  persist: () => {
    const { agents, skills, tools, automations, kbDocs } = get();
    const workspaceId = useWorkspaceStore.getState().workspaceId;
    scheduleSaveMarketplace(workspaceId, { agents, skills, tools, automations, kbDocs });
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

  upsertTool: (tool, isNew = false) => {
    set((s) => ({
      tools: isNew ? [tool, ...s.tools] : s.tools.map((t) => (t.id === tool.id ? tool : t)),
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
    const baseDoc = { ...kbDocFromFile(file, kbFilter), id: docId, indexed: false };
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
          indexed: false,
          desc: parsed.preview.slice(0, 160) || baseDoc.desc,
          tags: [...new Set([...baseDoc.tags, '已解析', '待审批'])],
        },
        false,
      );
      get().showToast(`「${baseDoc.title}」解析完成，已提交上架审批`);
    } catch {
      get().showToast(`「${baseDoc.title}」解析失败，请稍后重试`);
    }
    return docId;
  },

  importSkillFile: async (file) => {
    try {
      const items = await parseSkillUpload(file);
      const importedSkills: PrototypeSkillSeed[] = [];
      const userName = getCurrentUserName() || 'Imported';
      const userId = getCurrentUserId();

      for (const parsed of items) {
        const idTaken = get().skills.some((s) => s.id === parsed.id);
        const skill: PrototypeSkillSeed = {
          ...(idTaken
            ? { ...parsed, id: `skill-import-${Date.now()}-${importedSkills.length}` }
            : parsed),
          // 导入视为当前用户构建，便于在「我构建的」中找到
          publisher: userName,
          publisherUserId: userId || parsed.publisherUserId,
          author: parsed.author || userName,
        };

        get().upsertSkill(skill, true);
        importedSkills.push(skill);
      }

      if (importedSkills.length > 0) {
        const names = importedSkills.map((s) => s.name).join('、');
        get().showToast(
          importedSkills.length === 1
            ? `已导入技能「${names}」（列表顶部 · 可筛「我构建的」）`
            : `已导入 ${importedSkills.length} 个技能：${names}`,
        );
      } else {
        get().showToast('未能识别有效的 Skill 包（支持 .skill.zip / SKILL.md / JSON）');
      }
      return importedSkills;
    } catch {
      get().showToast('Skill 包解析失败，请检查 ZIP / SKILL.md / JSON 格式');
      return [];
    }
  },

  importAgentFile: async (file) => {
    try {
      const items = await parseAgentUpload(file);
      const imported: PrototypeAgentSeed[] = [];
      const userName = getCurrentUserName() || 'Imported';
      const userId = getCurrentUserId();

      for (const parsed of items) {
        const idTaken = get().agents.some((a) => a.id === parsed.id);
        const agent: PrototypeAgentSeed = {
          ...(idTaken
            ? { ...parsed, id: `agent-import-${Date.now()}-${imported.length}` }
            : parsed),
          publisher: userName,
          publisherUserId: userId || parsed.publisherUserId,
          author: parsed.author || userName,
        };
        get().upsertAgent(agent, true);
        imported.push(agent);
      }

      if (imported.length > 0) {
        const names = imported.map((a) => a.name).join('、');
        get().showToast(
          imported.length === 1
            ? `已导入专家「${names}」（列表顶部 · 可筛「我构建的」）`
            : `已导入 ${imported.length} 个专家：${names}`,
        );
      } else {
        get().showToast('未能识别有效的专家包（支持 .agent.zip / JSON）');
      }
      return imported;
    } catch {
      get().showToast('专家包解析失败，请检查 ZIP / JSON 格式');
      return [];
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
  getPublishedTools: () => get().tools.filter((t) => t.published),

  setAgentFilter: (f) => set({ agentFilter: f }),
  setSkillFilter: (f) => set({ skillFilter: f }),
  setAgentSearch: (q) => set({ agentSearch: q }),
  setSkillSearch: (q) => set({ skillSearch: q }),
  setToolSearch: (q) => set({ toolSearch: q }),
  setAgentDeptFilter: (f) => set({ agentDeptFilter: f }),
  setAgentRegionFilter: (f) => set({ agentRegionFilter: f }),
  setAgentScopeFilter: (f) => set({ agentScopeFilter: f }),
  setSkillDeptFilter: (f) => set({ skillDeptFilter: f }),
  setSkillRegionFilter: (f) => set({ skillRegionFilter: f }),
  setSkillScopeFilter: (f) => set({ skillScopeFilter: f }),
  setToolDeptFilter: (f) => set({ toolDeptFilter: f }),
  setToolRegionFilter: (f) => set({ toolRegionFilter: f }),
  setToolScopeFilter: (f) => set({ toolScopeFilter: f }),
  setToolEfficiencyFilter: (f) => set({ toolEfficiencyFilter: f }),
  setKbFilter: (id) => set({ kbFilter: id }),
  setKbSearch: (q) => set({ kbSearch: q }),
  setKbDeptFilter: (f) => set({ kbDeptFilter: f }),
  setKbRegionFilter: (f) => set({ kbRegionFilter: f }),
  setKbEfficiencyFilter: (f) => set({ kbEfficiencyFilter: f }),

  filteredAgents: () => {
    const {
      agents,
      agentFilter,
      agentSearch,
      agentDeptFilter,
      agentRegionFilter,
      agentScopeFilter,
    } = get();
    const q = agentSearch.trim().toLowerCase();
    const userId = getCurrentUserId();
    const userName = getCurrentUserName();
    const affiliation = getCurrentOrgAffiliation();
    const role = getCurrentPlatformRole();
    return agents.filter((a) => {
      if (agentFilter !== 'all') {
        if (agentFilter === 'office' && a.category !== 'office' && a.category !== 'experience') {
          return false;
        }
        if (agentFilter !== 'office' && a.category !== agentFilter) return false;
      }
      if (q && !`${a.name} ${a.desc} ${a.bizLine}`.toLowerCase().includes(q)) return false;
      return matchesAssetOrgFilters(
        {
          ...a,
          ownerDeptIds: a.ownerDeptIds?.length ? a.ownerDeptIds : [a.homeTag],
        },
        {
          deptFilter: agentDeptFilter,
          regionFilter: agentRegionFilter,
          scopeFilter: agentScopeFilter,
          currentUserId: userId,
          currentUserName: userName,
          affiliation,
          role,
        },
      );
    });
  },

  filteredSkills: () => {
    const {
      skills,
      skillFilter,
      skillSearch,
      skillDeptFilter,
      skillRegionFilter,
      skillScopeFilter,
    } = get();
    const q = skillSearch.trim().toLowerCase();
    const userId = getCurrentUserId();
    const userName = getCurrentUserName();
    const affiliation = getCurrentOrgAffiliation();
    const role = getCurrentPlatformRole();
    return skills.filter((s) => {
      if (skillFilter !== 'all') {
        if (skillFilter === 'office' && s.category !== 'office' && s.category !== 'experience') {
          return false;
        }
        if (skillFilter !== 'office' && s.category !== skillFilter) return false;
      }
      if (q && !`${s.name} ${s.desc} ${s.tags.join(' ')}`.toLowerCase().includes(q)) return false;
      return matchesAssetOrgFilters(s, {
        deptFilter: skillDeptFilter,
        regionFilter: skillRegionFilter,
        scopeFilter: skillScopeFilter,
        currentUserId: userId,
        currentUserName: userName,
        affiliation,
        role,
      });
    });
  },

  filteredTools: () => {
    const {
      tools,
      toolSearch,
      toolDeptFilter,
      toolRegionFilter,
      toolScopeFilter,
      toolEfficiencyFilter,
    } = get();
    const q = toolSearch.trim().toLowerCase();
    const userId = getCurrentUserId();
    const userName = getCurrentUserName();
    const affiliation = getCurrentOrgAffiliation();
    const role = getCurrentPlatformRole();
    return tools.filter((t) => {
      if (q && !`${t.name} ${t.desc} ${t.tags.join(' ')}`.toLowerCase().includes(q)) return false;
      if (toolEfficiencyFilter !== 'all') {
        const blob = `${t.desc} ${(t.scenarioTags ?? []).join(' ')} ${t.tags.join(' ')}`;
        const hit =
          toolEfficiencyFilter === 'office'
            ? /办公提效|编码助手|通用对话|企业协作|PPT|会议/.test(blob)
            : toolEfficiencyFilter === 'manage'
              ? /管理提效|价格|评论|零售|舆情|问卷/.test(blob)
              : /流程提效|招聘|培训|JD|面试|准入/.test(blob);
        if (!hit) return false;
      }
      return matchesAssetOrgFilters(t, {
        deptFilter: toolDeptFilter,
        regionFilter: toolRegionFilter,
        scopeFilter: toolScopeFilter,
        currentUserId: userId,
        currentUserName: userName,
        affiliation,
        role,
      });
    });
  },

  filteredKbDocs: () => {
    const { kbDocs, kbFilter, kbSearch, kbDeptFilter, kbRegionFilter, kbEfficiencyFilter } = get();
    const q = kbSearch.trim().toLowerCase();
    const DEPT_COLLECTIONS: Record<string, string[]> = {
      gtm: ['gtm'],
      mkt: ['mkt'],
      ecommerce: ['ecommerce'],
      retail: ['retail'],
      service: ['service'],
      channel: ['channel'],
      hr: ['hr'],
      finance: ['finance'],
      quality: ['quality'],
    };
    return kbDocs.filter((d) => {
      if (kbFilter !== 'all' && d.collection !== kbFilter) return false;
      if (q && !`${d.title} ${d.desc} ${d.tags.join(' ')}`.toLowerCase().includes(q)) return false;
      if (kbDeptFilter !== 'all') {
        const cols = DEPT_COLLECTIONS[kbDeptFilter] ?? [kbDeptFilter];
        if (!cols.includes(d.collection) && d.collection !== 'public' && d.collection !== 'other') {
          return false;
        }
      }
      if (kbRegionFilter !== 'all') {
        const regionLabels: Record<string, string[]> = {
          china: ['中国', 'china', 'CN'],
          apac: ['亚太', 'apac', 'APAC'],
          mea: ['中东', 'mea', 'MEA'],
          latam: ['拉美', 'latam', 'LATAM', 'MX'],
          europe: ['欧洲', 'EU', 'europe'],
          eurasia: ['欧亚', 'eurasia', '俄罗斯', 'russia'],
        };
        const keys = regionLabels[kbRegionFilter] ?? [];
        const blob = `${d.title} ${d.desc} ${d.tags.join(' ')}`;
        if (keys.length && !keys.some((k) => blob.toLowerCase().includes(k.toLowerCase()))) {
          // 无区域线索的文档在筛选区域时仍保留（公共知识）
          if (d.collection !== 'public') return false;
        }
      }
      if (kbEfficiencyFilter !== 'all') {
        const blob = `${d.title} ${d.desc} ${d.tags.join(' ')}`;
        const hit =
          kbEfficiencyFilter === 'office'
            ? /平台|指南|Agent|文档|办公|会议|PPT/.test(blob)
            : kbEfficiencyFilter === 'manage'
              ? /价格|offer|评论|零售|舆情|问卷|洞察|返利|价盘/.test(blob)
              : /招聘|JD|简历|培训|Nova|SOP|客诉|合规|审计/.test(blob);
        if (!hit) return false;
      }
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

  bumpToolInvokes: (id) => {
    set((s) => ({
      tools: s.tools.map((t) => (t.id === id ? { ...t, invokes: t.invokes + 1 } : t)),
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
