import { AgentSchema, getAgentsByWorkspace, type Agent } from '@/domain/agent';
import {
  getKnowledgeBasesByWorkspace,
  KnowledgeBaseSchema,
  type KnowledgeBase,
} from '@/domain/knowledge';
import { getMemoryStoresByWorkspace, MemoryStoreSchema, type MemoryLayer, type MemoryStore } from '@/domain/memory';
import { PromptSchema, getPromptsByWorkspace, type Prompt } from '@/domain/prompt';
import { getSkillsByWorkspace, SkillSchema, type Skill } from '@/domain/skill';
import { getToolsByWorkspace, PlatformToolSchema, type PlatformTool } from '@/domain/tool';
import { getWorkflowsByWorkspace, WorkflowSchema, type Workflow } from '@/domain/workflow';
import { apiUrl } from '@/api/client';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export class CenterApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CenterApiError';
  }
}

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  if (!useWorkspaceStore.getState().apiConnected) return fallback;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

/** 写操作：API 未连接或失败时抛错，禁止静默改本地 */
async function mutateJson<T>(url: string, init: RequestInit): Promise<T> {
  if (!useWorkspaceStore.getState().apiConnected) {
    throw new CenterApiError('共享服务未连接，变更未写入数据库');
  }

  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      throw new CenterApiError(`保存失败（HTTP ${response.status}）`);
    }
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof CenterApiError) throw err;
    throw new CenterApiError(err instanceof Error ? err.message : '保存失败');
  }
}

function parseList<T>(items: unknown[], schema: { parse: (v: unknown) => T }): T[] {
  return items
    .map((item) => {
      try {
        return schema.parse(item);
      } catch {
        return null;
      }
    })
    .filter((item): item is T => item !== null);
}

export async function fetchPrompts(workspaceId: string): Promise<Prompt[]> {
  const fallback = getPromptsByWorkspace(workspaceId);
  const payload = await fetchJson<{ prompts: unknown[] }>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/prompts`),
    { prompts: fallback },
  );
  return parseList(payload.prompts, PromptSchema);
}

export async function advancePromptLifecycle(workspaceId: string, promptId: string): Promise<Prompt> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/prompts/${promptId}/advance-lifecycle`),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  return PromptSchema.parse(updated);
}

export async function fetchAgents(workspaceId: string): Promise<Agent[]> {
  const fallback = getAgentsByWorkspace(workspaceId);
  const payload = await fetchJson<{ agents: unknown[] }>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/agents`),
    { agents: fallback },
  );
  return parseList(payload.agents, AgentSchema);
}

export async function patchAgentPersona(
  workspaceId: string,
  agentId: string,
  persona: string,
): Promise<Agent> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/agents/${agentId}`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona }),
    },
  );
  return AgentSchema.parse(updated);
}

export async function advanceAgentStatus(workspaceId: string, agentId: string): Promise<Agent> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/agents/${agentId}/advance-status`),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  return AgentSchema.parse(updated);
}

export async function fetchSkills(workspaceId: string): Promise<Skill[]> {
  const fallback = getSkillsByWorkspace(workspaceId);
  const payload = await fetchJson<{ skills: unknown[] }>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/skills`),
    { skills: fallback },
  );
  return parseList(payload.skills, SkillSchema);
}

export async function advanceSkillLifecycle(workspaceId: string, skillId: string): Promise<Skill> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/skills/${skillId}/advance-lifecycle`),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  return SkillSchema.parse(updated);
}

export async function fetchWorkflows(workspaceId: string): Promise<Workflow[]> {
  const fallback = getWorkflowsByWorkspace(workspaceId);
  const payload = await fetchJson<{ workflows: unknown[] }>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/workflows`),
    { workflows: fallback },
  );
  return parseList(payload.workflows, WorkflowSchema);
}

export async function advanceWorkflowStatus(
  workspaceId: string,
  workflowId: string,
): Promise<Workflow> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/workflows/${workflowId}/advance-status`),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  return WorkflowSchema.parse(updated);
}

export async function fetchKnowledgeBases(workspaceId: string): Promise<KnowledgeBase[]> {
  const fallback = getKnowledgeBasesByWorkspace(workspaceId);
  const payload = await fetchJson<{ bases: unknown[] }>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/knowledge-bases`),
    { bases: fallback },
  );
  return parseList(payload.bases, KnowledgeBaseSchema);
}

export async function runKnowledgePipelineApi(
  workspaceId: string,
  baseId: string,
  docId: string,
): Promise<KnowledgeBase> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/knowledge-bases/${baseId}/documents/${docId}/run-pipeline`),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  return KnowledgeBaseSchema.parse(updated);
}

export async function fetchTools(workspaceId: string): Promise<PlatformTool[]> {
  const fallback = getToolsByWorkspace(workspaceId);
  const payload = await fetchJson<{ tools: unknown[] }>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/tools`),
    { tools: fallback },
  );
  return parseList(payload.tools, PlatformToolSchema);
}

export async function fetchMemoryStores(workspaceId: string): Promise<MemoryStore[]> {
  const fallback = getMemoryStoresByWorkspace(workspaceId);
  const payload = await fetchJson<{ stores: unknown[] }>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/memory-stores`),
    { stores: fallback },
  );
  return parseList(payload.stores, MemoryStoreSchema);
}

export async function patchMemoryLayerPolicyApi(
  workspaceId: string,
  storeId: string,
  layer: MemoryLayer,
  patch: Partial<{ retentionDays: number; maxTokens: number; reflectionEnabled: boolean; decayRate: number }>,
): Promise<MemoryStore> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/memory-stores/${storeId}/layers/${layer}/policy`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    },
  );
  return MemoryStoreSchema.parse(updated);
}

export async function runMemoryReflectionApi(
  workspaceId: string,
  storeId: string,
): Promise<MemoryStore> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/memory-stores/${storeId}/run-reflection`),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  return MemoryStoreSchema.parse(updated);
}

export async function fetchExecutionHistory(
  workspaceId: string,
  limit = 50,
): Promise<
  Array<{
    id: string;
    chatId: string;
    message: string;
    status: string;
    startedAt: string;
    finishedAt?: string;
    agentName?: string;
  }>
> {
  if (!useWorkspaceStore.getState().apiConnected) return [];
  try {
    const res = await fetch(
      apiUrl(`/api/v1/workspaces/${workspaceId}/executions?limit=${limit}`),
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { executions?: Array<Record<string, unknown>> };
    return Array.isArray(body.executions)
      ? body.executions.map((e) => ({
          id: String(e.id ?? ''),
          chatId: String(e.chatId ?? ''),
          message: String(e.message ?? ''),
          status: String(e.status ?? ''),
          startedAt: String(e.startedAt ?? ''),
          finishedAt: e.finishedAt ? String(e.finishedAt) : undefined,
          agentName: e.agentName ? String(e.agentName) : undefined,
        }))
      : [];
  } catch {
    return [];
  }
}
