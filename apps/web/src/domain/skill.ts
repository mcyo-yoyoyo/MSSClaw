import { z } from 'zod';
import {
  getPrototypeSkillsAsDomain,
} from '@/domain/prototype/adapters';
import { PROTOTYPE_WORKSPACE_ID } from '@/domain/prototype/constants';

export const SkillLifecycleSchema = z.enum(['create', 'debug', 'review', 'publish', 'online', 'deprecated']);
export type SkillLifecycle = z.infer<typeof SkillLifecycleSchema>;

export const SkillTraceStepSchema = z.object({
  timestamp: z.string(),
  phase: z.string(),
  latency: z.string(),
  status: z.enum(['ok', 'warn', 'error']),
  detail: z.string(),
});
export type SkillTraceStep = z.infer<typeof SkillTraceStepSchema>;

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  version: z.string(),
  lifecycle: SkillLifecycleSchema,
  updatedAt: z.string(),
  author: z.string(),
  promptName: z.string().optional(),
  toolNames: z.array(z.string()),
  inputSchema: z.string(),
  outputSchema: z.string(),
  retry: z.number(),
  timeoutMs: z.number(),
  memoryPolicy: z.string(),
  usedByAgents: z.array(z.string()),
  usedByWorkflows: z.array(z.string()),
  dependsOn: z.array(z.string()),
  tags: z.array(z.string()),
  lastTrace: z.array(SkillTraceStepSchema).optional(),
});
export type Skill = z.infer<typeof SkillSchema>;

export const SKILL_LIFECYCLE_FLOW: SkillLifecycle[] = ['create', 'debug', 'review', 'publish', 'online'];

const PROTOTYPE_SKILL_LIST = getPrototypeSkillsAsDomain();

export const SKILL_CATALOG: Record<string, Skill[]> = {
  [PROTOTYPE_WORKSPACE_ID]: PROTOTYPE_SKILL_LIST,
  'ws-3c-latam': PROTOTYPE_SKILL_LIST,
  'ws-global-marketing': [
    {
      id: 'skill-roi-compare',
      name: 'ROI_Compare',
      displayName: 'ROI Compare',
      description: '跨区域 Campaign ROI 对比与漏斗诊断。',
      version: 'v1.0',
      lifecycle: 'debug',
      updatedAt: '2026-07-07',
      author: 'Sarah',
      toolNames: ['GA4_Reporting_API'],
      inputSchema: '{ regions[], days }',
      outputSchema: '{ comparison_table, insights[] }',
      retry: 1,
      timeoutMs: 10000,
      memoryPolicy: 'none',
      usedByAgents: ['洞察 Agent'],
      usedByWorkflows: ['预算模拟流'],
      dependsOn: [],
      tags: ['roi', 'analytics'],
    },
  ],
  'ws-rd-knowledge': [
    {
      id: 'skill-spec-search',
      name: 'Spec_Search',
      displayName: 'Spec Search',
      description: '研发规格书与测试报告语义检索。',
      version: 'v1.0',
      lifecycle: 'online',
      updatedAt: '2026-05-30',
      author: 'RD-Team',
      toolNames: ['Milvus_gRPC'],
      inputSchema: '{ query, spec_type }',
      outputSchema: '{ documents[], scores[] }',
      retry: 2,
      timeoutMs: 6000,
      memoryPolicy: 'none',
      usedByAgents: ['研发 RAG Agent'],
      usedByWorkflows: [],
      dependsOn: [],
      tags: ['rd', 'spec'],
    },
  ],
};

export function getSkillsByWorkspace(workspaceId: string): Skill[] {
  return SKILL_CATALOG[workspaceId] ?? [];
}

export function findSkillById(workspaceId: string, id: string): Skill | undefined {
  return getSkillsByWorkspace(workspaceId).find((s) => s.id === id);
}

export function findSkillByName(workspaceId: string, name: string): Skill | undefined {
  return getSkillsByWorkspace(workspaceId).find((s) => s.name === name || s.displayName === name);
}

export function getSkillLifecycleLabel(lifecycle: SkillLifecycle) {
  const labels: Record<SkillLifecycle, string> = {
    create: 'Create',
    debug: 'Debug',
    review: 'Review',
    publish: 'Publish',
    online: 'Online',
    deprecated: 'Deprecated',
  };
  return labels[lifecycle];
}

export function getSkillLifecycleClass(lifecycle: SkillLifecycle) {
  const classes: Record<SkillLifecycle, string> = {
    create: 'bg-slate-100 text-slate-600 border-slate-200',
    debug: 'bg-blue-50 text-blue-600 border-blue-200',
    review: 'bg-amber-50 text-amber-600 border-amber-200',
    publish: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    online: 'bg-green-50 text-green-600 border-green-200',
    deprecated: 'bg-slate-50 text-slate-400 border-slate-200',
  };
  return classes[lifecycle];
}

export function getNextSkillLifecycle(current: SkillLifecycle): SkillLifecycle | null {
  const idx = SKILL_LIFECYCLE_FLOW.indexOf(current);
  if (idx < 0 || idx >= SKILL_LIFECYCLE_FLOW.length - 1) return null;
  return SKILL_LIFECYCLE_FLOW[idx + 1];
}

export function getSkillLifecycleAction(current: SkillLifecycle): string | null {
  const next = getNextSkillLifecycle(current);
  if (!next) return null;
  const actions: Partial<Record<SkillLifecycle, string>> = {
    debug: '提交调试',
    review: '提交评审',
    publish: '发布',
    online: '上线',
  };
  return actions[next] ?? `推进至 ${getSkillLifecycleLabel(next)}`;
}
