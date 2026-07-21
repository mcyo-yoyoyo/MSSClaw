import { z } from 'zod';

export const WorkflowNodeTypeSchema = z.enum([
  'start',
  'llm',
  'skill',
  'condition',
  'approval',
  'human',
  'merge',
  'end',
]);
export type WorkflowNodeType = z.infer<typeof WorkflowNodeTypeSchema>;

export const WorkflowStatusSchema = z.enum(['draft', 'testing', 'published', 'online', 'archived']);
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;

export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: WorkflowNodeTypeSchema,
  label: z.string(),
  description: z.string().optional(),
  config: z.record(z.string(), z.string()).optional(),
  x: z.number(),
  y: z.number(),
});
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;

export const WorkflowEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
});
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  status: WorkflowStatusSchema,
  updatedAt: z.string(),
  author: z.string(),
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
  tags: z.array(z.string()),
});
export type Workflow = z.infer<typeof WorkflowSchema>;

export const WORKFLOW_STATUS_FLOW: WorkflowStatus[] = ['draft', 'testing', 'published', 'online'];

export const NODE_META: Record<
  WorkflowNodeType,
  { icon: string; color: string; bg: string; border: string }
> = {
  start: { icon: 'fa-play', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300' },
  end: { icon: 'fa-flag-checkered', color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-300' },
  llm: { icon: 'fa-brain', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-300' },
  skill: { icon: 'fa-puzzle-piece', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300' },
  condition: { icon: 'fa-code-branch', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' },
  approval: { icon: 'fa-user-check', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300' },
  human: { icon: 'fa-user', color: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-300' },
  merge: { icon: 'fa-code-merge', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-300' },
};

const Q3_ATTRIBUTION: Workflow = {
  id: 'wf-q3-attribution',
  name: 'Q3 归因分析流',
  description: 'LangGraph · 营销异动归因：取数 → 归因 → 策略生成',
  version: 'v0.3',
  status: 'draft',
  updatedAt: '2026-07-06',
  author: 'Mcyo',
  tags: ['marketing', 'langgraph', 'attribution'],
  nodes: [
    { id: 'n1', type: 'start', label: 'Start', x: 80, y: 120 },
    { id: 'n2', type: 'skill', label: 'Intent Parser', description: 'Skill: Intent_Parser', config: { skill: 'Intent_Parser' }, x: 80, y: 220 },
    { id: 'n3', type: 'skill', label: 'SQL Generator', description: 'Skill: SQL_Generator', config: { skill: 'SQL_Generator' }, x: 80, y: 320 },
    { id: 'n4', type: 'condition', label: '数据量检查', description: 'rows > 1000', config: { expr: 'rows > 1000' }, x: 80, y: 420 },
    { id: 'n5', type: 'skill', label: 'SHAP Analyzer', description: 'Skill: Python_Sandbox', config: { skill: 'SHAPAnalyzer' }, x: 280, y: 420 },
    { id: 'n6', type: 'llm', label: 'NBA 策略生成', description: 'Shield-70B + Prompt', config: { prompt: 'MARKETING_ATTRIBUTION_BRIEF' }, x: 280, y: 520 },
    { id: 'n7', type: 'end', label: 'End', x: 280, y: 620 },
  ],
  edges: [
    { id: 'e1', from: 'n1', to: 'n2' },
    { id: 'e2', from: 'n2', to: 'n3' },
    { id: 'e3', from: 'n3', to: 'n4' },
    { id: 'e4', from: 'n4', to: 'n5', label: 'true' },
    { id: 'e5', from: 'n5', to: 'n6' },
    { id: 'e6', from: 'n6', to: 'n7' },
  ],
};

const BUDGET_SIM: Workflow = {
  id: 'wf-budget-sim',
  name: '预算模拟流',
  description: '跨区域 Campaign 预算模拟与审批',
  version: 'v0.2',
  status: 'testing',
  updatedAt: '2026-06-22',
  author: 'Sarah',
  tags: ['budget', 'campaign', 'approval'],
  nodes: [
    { id: 'b1', type: 'start', label: 'Start', x: 100, y: 100 },
    { id: 'b2', type: 'llm', label: '预算推演', config: { model: 'Shield-70B-Chat' }, x: 100, y: 200 },
    { id: 'b3', type: 'approval', label: 'Finance 审批', description: 'Budget > $100k', x: 100, y: 300 },
    { id: 'b4', type: 'human', label: 'Regional Lead', x: 100, y: 400 },
    { id: 'b5', type: 'merge', label: 'Merge', x: 100, y: 500 },
    { id: 'b6', type: 'end', label: 'End', x: 100, y: 600 },
  ],
  edges: [
    { id: 'be1', from: 'b1', to: 'b2' },
    { id: 'be2', from: 'b2', to: 'b3' },
    { id: 'be3', from: 'b3', to: 'b4', label: 'approved' },
    { id: 'be4', from: 'b4', to: 'b5' },
    { id: 'be5', from: 'b5', to: 'b6' },
  ],
};

const DEFAULT_WORKFLOWS = [Q3_ATTRIBUTION, BUDGET_SIM];

export const WORKFLOW_CATALOG: Record<string, Workflow[]> = {
  'ws-cn-marketing': DEFAULT_WORKFLOWS,
  'ws-apac': DEFAULT_WORKFLOWS,
  'ws-3c-latam': DEFAULT_WORKFLOWS,
  'ws-mea': DEFAULT_WORKFLOWS,
  'ws-eurasia': DEFAULT_WORKFLOWS,
  'ws-europe': DEFAULT_WORKFLOWS,
};

export function getWorkflowsByWorkspace(workspaceId: string): Workflow[] {
  return WORKFLOW_CATALOG[workspaceId] ?? DEFAULT_WORKFLOWS;
}

export function findWorkflowById(workspaceId: string, id: string): Workflow | undefined {
  return getWorkflowsByWorkspace(workspaceId).find((w) => w.id === id);
}

export function findWorkflowByName(workspaceId: string, name: string): Workflow | undefined {
  return getWorkflowsByWorkspace(workspaceId).find((w) => w.name === name);
}

export function getWorkflowStatusLabel(status: WorkflowStatus) {
  const labels: Record<WorkflowStatus, string> = {
    draft: 'Draft',
    testing: 'Testing',
    published: 'Published',
    online: 'Online',
    archived: 'Archived',
  };
  return labels[status];
}

export function getWorkflowStatusClass(status: WorkflowStatus) {
  const classes: Record<WorkflowStatus, string> = {
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    testing: 'bg-blue-50 text-blue-600 border-blue-200',
    published: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    online: 'bg-green-50 text-green-600 border-green-200',
    archived: 'bg-slate-50 text-slate-400 border-slate-200',
  };
  return classes[status];
}

export function getNextWorkflowStatus(current: WorkflowStatus): WorkflowStatus | null {
  const idx = WORKFLOW_STATUS_FLOW.indexOf(current);
  if (idx < 0 || idx >= WORKFLOW_STATUS_FLOW.length - 1) return null;
  return WORKFLOW_STATUS_FLOW[idx + 1];
}

export function getNodeCenter(node: WorkflowNode) {
  return { x: node.x + 90, y: node.y + 28 };
}
