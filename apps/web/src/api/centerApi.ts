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
import { apiUrl, isApiEnabled } from '@/api/client';

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  if (!isApiEnabled()) return fallback;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

async function mutateJson<T>(url: string, init: RequestInit, fallback: () => T | Promise<T>): Promise<T> {
  if (!isApiEnabled()) return fallback();

  try {
    const response = await fetch(url, init);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } catch {
    return fallback();
  }
}

export async function fetchPrompts(workspaceId: string): Promise<Prompt[]> {
  const fallback = getPromptsByWorkspace(workspaceId);
  const payload = await fetchJson<{ prompts: unknown[] }>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/prompts`),
    { prompts: fallback },
  );
  return payload.prompts
    .map((item) => {
      try {
        return PromptSchema.parse(item);
      } catch {
        return null;
      }
    })
    .filter((item): item is Prompt => item !== null);
}

export async function advancePromptLifecycle(workspaceId: string, promptId: string, local: Prompt[]): Promise<Prompt[]> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/prompts/${promptId}/advance-lifecycle`),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    () => null,
  );

  if (!updated) return local;
  try {
    const prompt = PromptSchema.parse(updated);
    return local.map((item) => (item.id === promptId ? prompt : item));
  } catch {
    return local;
  }
}

export async function fetchAgents(workspaceId: string): Promise<Agent[]> {
  const fallback = getAgentsByWorkspace(workspaceId);
  const payload = await fetchJson<{ agents: unknown[] }>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/agents`),
    { agents: fallback },
  );
  return payload.agents
    .map((item) => {
      try {
        return AgentSchema.parse(item);
      } catch {
        return null;
      }
    })
    .filter((item): item is Agent => item !== null);
}

export async function patchAgentPersona(
  workspaceId: string,
  agentId: string,
  persona: string,
  local: Agent[],
): Promise<Agent[]> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/agents/${agentId}`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona }),
    },
    () => null,
  );

  if (!updated) {
    return local.map((item) =>
      item.id === agentId ? { ...item, persona, updatedAt: new Date().toISOString().slice(0, 10) } : item,
    );
  }

  try {
    const agent = AgentSchema.parse(updated);
    return local.map((item) => (item.id === agentId ? agent : item));
  } catch {
    return local;
  }
}

export async function advanceAgentStatus(workspaceId: string, agentId: string, local: Agent[]): Promise<Agent[]> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/agents/${agentId}/advance-status`),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    () => null,
  );

  if (!updated) return local;
  try {
    const agent = AgentSchema.parse(updated);
    return local.map((item) => (item.id === agentId ? agent : item));
  } catch {
    return local;
  }
}

export async function fetchSkills(workspaceId: string): Promise<Skill[]> {
  const fallback = getSkillsByWorkspace(workspaceId);
  const payload = await fetchJson<{ skills: unknown[] }>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/skills`),
    { skills: fallback },
  );
  return payload.skills
    .map((item) => {
      try {
        return SkillSchema.parse(item);
      } catch {
        return null;
      }
    })
    .filter((item): item is Skill => item !== null);
}

export async function advanceSkillLifecycle(workspaceId: string, skillId: string, local: Skill[]): Promise<Skill[]> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/skills/${skillId}/advance-lifecycle`),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    () => null,
  );

  if (!updated) return local;
  try {
    const skill = SkillSchema.parse(updated);
    return local.map((item) => (item.id === skillId ? skill : item));
  } catch {
    return local;
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
  local: Workflow[],
): Promise<Workflow[]> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/workflows/${workflowId}/advance-status`),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    () => null,
  );
  if (!updated) return local;
  try {
    const workflow = WorkflowSchema.parse(updated);
    return local.map((item) => (item.id === workflowId ? workflow : item));
  } catch {
    return local;
  }
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
  local: KnowledgeBase[],
): Promise<KnowledgeBase[]> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/knowledge-bases/${baseId}/documents/${docId}/run-pipeline`),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    () => null,
  );
  if (!updated) return local;
  try {
    const base = KnowledgeBaseSchema.parse(updated);
    return local.map((item) => (item.id === baseId ? base : item));
  } catch {
    return local;
  }
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
  local: MemoryStore[],
): Promise<MemoryStore[]> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/memory-stores/${storeId}/layers/${layer}/policy`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    },
    () => null,
  );
  if (!updated) {
    return local.map((store) =>
      store.id === storeId
        ? {
            ...store,
            policies: store.policies.map((p) => (p.layer === layer ? { ...p, ...patch } : p)),
            updatedAt: new Date().toISOString().slice(0, 10),
          }
        : store,
    );
  }
  try {
    const store = MemoryStoreSchema.parse(updated);
    return local.map((item) => (item.id === storeId ? store : item));
  } catch {
    return local;
  }
}

export async function runMemoryReflectionApi(
  workspaceId: string,
  storeId: string,
  local: MemoryStore[],
): Promise<MemoryStore[]> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/workspaces/${workspaceId}/memory-stores/${storeId}/run-reflection`),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    () => null,
  );
  if (!updated) return local;
  try {
    const store = MemoryStoreSchema.parse(updated);
    return local.map((item) => (item.id === storeId ? store : item));
  } catch {
    return local;
  }
}
