import { create } from 'zustand';
import { advanceWorkflowStatus as advanceWorkflowStatusApi, fetchWorkflows } from '@/api/centerApi';
import {
  findWorkflowByName,
  getNextWorkflowStatus,
  getWorkflowsByWorkspace,
  type Workflow,
  type WorkflowStatus,
} from '@/domain/workflow';

interface WorkflowState {
  workspaceId: string;
  workflows: Workflow[];
  selectedWorkflowId: string | null;
  selectedNodeId: string | null;
  statusFilter: WorkflowStatus | 'all';
  debugRunning: boolean;
  debugTrace: string[];
  toast: string | null;

  loadWorkspace: (workspaceId: string) => void;
  selectWorkflow: (id: string | null) => void;
  selectWorkflowByName: (name: string) => void;
  selectNode: (nodeId: string | null) => void;
  setStatusFilter: (filter: WorkflowStatus | 'all') => void;
  advanceStatus: (workflowId: string) => void;
  runDebug: (workflowId: string) => Promise<void>;
  dismissToast: () => void;
  selectedWorkflow: () => Workflow | null;
  filteredWorkflows: () => Workflow[];
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workspaceId: 'ws-cn-marketing',
  workflows: getWorkflowsByWorkspace('ws-cn-marketing'),
  selectedWorkflowId: getWorkflowsByWorkspace('ws-cn-marketing')[0]?.id ?? null,
  selectedNodeId: null,
  statusFilter: 'all',
  debugRunning: false,
  debugTrace: [],
  toast: null,

  loadWorkspace: (workspaceId) => {
    void (async () => {
      const workflows = await fetchWorkflows(workspaceId);
      set({
        workspaceId,
        workflows,
        selectedWorkflowId: workflows[0]?.id ?? null,
        selectedNodeId: null,
        statusFilter: 'all',
        debugTrace: [],
      });
    })();
  },

  selectWorkflow: (id) => set({ selectedWorkflowId: id, selectedNodeId: null, debugTrace: [] }),

  selectWorkflowByName: (name) => {
    const wf = findWorkflowByName(get().workspaceId, name);
    if (wf) set({ selectedWorkflowId: wf.id, selectedNodeId: null, debugTrace: [] });
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  setStatusFilter: (filter) => set({ statusFilter: filter }),

  advanceStatus: (workflowId) => {
    void (async () => {
      const { workflows, workspaceId } = get();
      const target = workflows.find((w) => w.id === workflowId);
      if (!target) return;

      let nextWorkflows = await advanceWorkflowStatusApi(workspaceId, workflowId, workflows);
      if (nextWorkflows === workflows) {
        const next = getNextWorkflowStatus(target.status);
        if (!next) return;
        nextWorkflows = workflows.map((w) =>
          w.id === workflowId ? { ...w, status: next, updatedAt: new Date().toISOString().slice(0, 10) } : w,
        );
      }

      const updated = nextWorkflows.find((w) => w.id === workflowId);
      set({
        workflows: nextWorkflows,
        toast: updated ? `�?{target.name}」已推进�?${updated.status}` : `�?{target.name}」已更新`,
      });
    })();
  },

  runDebug: async (workflowId) => {
    const wf = get().workflows.find((w) => w.id === workflowId);
    if (!wf || get().debugRunning) return;

    set({ debugRunning: true, debugTrace: ['�?启动 Workflow Debug...'] });

    for (const node of wf.nodes) {
      await new Promise((r) => setTimeout(r, 400));
      set((state) => ({
        selectedNodeId: node.id,
        debugTrace: [...state.debugTrace, `�?${node.label} (${node.type})`],
      }));
    }

    set({
      debugRunning: false,
      toast: `�?{wf.name}」Debug 完成 · ${wf.nodes.length} nodes`,
    });
  },

  dismissToast: () => set({ toast: null }),

  selectedWorkflow: () => {
    const { workflows, selectedWorkflowId } = get();
    if (!selectedWorkflowId) return null;
    return workflows.find((w) => w.id === selectedWorkflowId) ?? null;
  },

  filteredWorkflows: () => {
    const { workflows, statusFilter } = get();
    if (statusFilter === 'all') return workflows;
    return workflows.filter((w) => w.status === statusFilter);
  },
}));

export function resolveWorkflowIdFromResource(resourceId: string, resourceName?: string | null, workspaceId?: string) {
  if (resourceId.startsWith('wf-')) return resourceId;
  if (resourceName && workspaceId) return findWorkflowByName(workspaceId, resourceName)?.id ?? null;
  return null;
}
