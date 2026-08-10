import { create } from 'zustand';
import {
  advanceAgentStatus as advanceAgentStatusApi,
  CenterApiError,
  fetchAgents,
  patchAgentPersona,
} from '@/api/centerApi';
import {
  findAgentByName,
  getAgentsByWorkspace,
  type Agent,
  type AgentStatus,
} from '@/domain/agent';

interface AgentState {
  workspaceId: string;
  agents: Agent[];
  selectedAgentId: string | null;
  statusFilter: AgentStatus | 'all';
  testInput: string;
  testRunning: boolean;
  toast: string | null;

  loadWorkspace: (workspaceId: string) => void;
  selectAgent: (agentId: string | null) => void;
  selectAgentByName: (name: string) => void;
  setStatusFilter: (filter: AgentStatus | 'all') => void;
  updatePersona: (agentId: string, persona: string) => void;
  advanceStatus: (agentId: string) => void;
  setTestInput: (value: string) => void;
  runTest: (agentId: string) => Promise<void>;
  dismissToast: () => void;
  selectedAgent: () => Agent | null;
  filteredAgents: () => Agent[];
}

export const useAgentStore = create<AgentState>((set, get) => ({
  workspaceId: 'ws-cn-marketing',
  agents: getAgentsByWorkspace('ws-cn-marketing'),
  selectedAgentId: getAgentsByWorkspace('ws-cn-marketing')[0]?.id ?? null,
  statusFilter: 'all',
  testInput: '',
  testRunning: false,
  toast: null,

  loadWorkspace: (workspaceId) => {
    void (async () => {
      const agents = await fetchAgents(workspaceId);
      set({
        workspaceId,
        agents,
        selectedAgentId: agents[0]?.id ?? null,
        statusFilter: 'all',
        testInput: '',
      });
    })();
  },

  selectAgent: (agentId) => set({ selectedAgentId: agentId }),

  selectAgentByName: (name) => {
    const agent = findAgentByName(get().workspaceId, name) ?? get().agents.find((a) => a.name === name);
    if (agent) set({ selectedAgentId: agent.id });
  },

  setStatusFilter: (filter) => set({ statusFilter: filter }),

  updatePersona: (agentId, persona) => {
    void (async () => {
      const { agents, workspaceId } = get();
      try {
        const updated = await patchAgentPersona(workspaceId, agentId, persona);
        set({
          agents: agents.map((a) => (a.id === agentId ? updated : a)),
          toast: `「${updated.name}」人设已保存到共享库`,
        });
      } catch (err) {
        set({
          toast: err instanceof CenterApiError ? err.message : '人设保存失败',
        });
      }
    })();
  },

  advanceStatus: (agentId) => {
    void (async () => {
      const { agents, workspaceId } = get();
      const target = agents.find((a) => a.id === agentId);
      if (!target) return;
      try {
        const updated = await advanceAgentStatusApi(workspaceId, agentId);
        set({
          agents: agents.map((a) => (a.id === agentId ? updated : a)),
          toast: `「${target.name}」已推进到 ${updated.status}`,
        });
      } catch (err) {
        set({
          toast: err instanceof CenterApiError ? err.message : '状态推进失败',
        });
      }
    })();
  },

  setTestInput: (value) => set({ testInput: value }),

  runTest: async (agentId) => {
    const agent = get().agents.find((a) => a.id === agentId);
    if (!agent || get().testRunning) return;

    set({ testRunning: true });
    await new Promise((resolve) => setTimeout(resolve, 1200));
    set({
      testRunning: false,
      toast: `「${agent.name}」测试通过 · 绑定 ${agent.bindings.skillIds.length} Skills · Latency 1.2s（本地演示）`,
    });
  },

  dismissToast: () => set({ toast: null }),

  selectedAgent: () => {
    const { agents, selectedAgentId } = get();
    if (!selectedAgentId) return null;
    return agents.find((a) => a.id === selectedAgentId) ?? null;
  },

  filteredAgents: () => {
    const { agents, statusFilter } = get();
    if (statusFilter === 'all') return agents;
    return agents.filter((a) => a.status === statusFilter);
  },
}));

export function resolveAgentIdFromResource(resourceId: string, resourceName?: string | null, workspaceId?: string) {
  if (resourceId.startsWith('agent-')) return resourceId;
  if (resourceName && workspaceId) return findAgentByName(workspaceId, resourceName)?.id ?? null;
  return null;
}
