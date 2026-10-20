import { AgentSchema, AGENT_SEEDS, type Agent } from '@/domain/agent';
import {
  KNOWLEDGE_SEEDS,
  KnowledgeBaseSchema,
  type KnowledgeBase,
} from '@/domain/knowledge';
import { MEMORY_SEEDS, MemoryStoreSchema, type MemoryLayer, type MemoryStore } from '@/domain/memory';
import { PromptSchema, PROMPT_SEEDS, type Prompt } from '@/domain/prompt';
import { SKILL_SEEDS, SkillSchema, type Skill } from '@/domain/skill';
import { TOOL_SEEDS, PlatformToolSchema, type PlatformTool } from '@/domain/tool';
import { WORKFLOW_SEEDS, WorkflowSchema, type Workflow } from '@/domain/workflow';
import { apiUrl } from '@/api/client';
import { fetchToolsApi } from '@/api/persistenceApi';
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

export async function fetchPrompts(): Promise<Prompt[]> {
  const fallback = PROMPT_SEEDS;
  const payload = await fetchJson<{ prompts: unknown[] }>(
    apiUrl(`/api/v1/prompts`),
    { prompts: fallback },
  );
  return parseList(payload.prompts, PromptSchema);
}

export async function advancePromptLifecycle(promptId: string): Promise<Prompt> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/prompts/${promptId}/advance-lifecycle`),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  return PromptSchema.parse(updated);
}

export async function fetchAgents(): Promise<Agent[]> {
  const fallback = AGENT_SEEDS;
  const payload = await fetchJson<{ agents: unknown[] }>(
    apiUrl(`/api/v1/agents`),
    { agents: fallback },
  );
  return parseList(payload.agents, AgentSchema);
}

export async function patchAgentPersona(
  agentId: string,
  persona: string,
): Promise<Agent> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/agents/${agentId}`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona }),
    },
  );
  return AgentSchema.parse(updated);
}

export async function advanceAgentStatus(agentId: string): Promise<Agent> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/agents/${agentId}/advance-status`),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  return AgentSchema.parse(updated);
}

export async function fetchSkills(): Promise<Skill[]> {
  const fallback = SKILL_SEEDS;
  const payload = await fetchJson<{ skills: unknown[] }>(
    apiUrl(`/api/v1/skills`),
    { skills: fallback },
  );
  return parseList(payload.skills, SkillSchema);
}

export async function advanceSkillLifecycle(skillId: string): Promise<Skill> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/skills/${skillId}/advance-lifecycle`),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  return SkillSchema.parse(updated);
}

export async function fetchWorkflows(): Promise<Workflow[]> {
  const fallback = WORKFLOW_SEEDS;
  const payload = await fetchJson<{ workflows: unknown[] }>(
    apiUrl(`/api/v1/workflows`),
    { workflows: fallback },
  );
  return parseList(payload.workflows, WorkflowSchema);
}

export async function advanceWorkflowStatus(
  workflowId: string,
): Promise<Workflow> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/workflows/${workflowId}/advance-status`),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  return WorkflowSchema.parse(updated);
}

export async function fetchKnowledgeBases(): Promise<KnowledgeBase[]> {
  const fallback = KNOWLEDGE_SEEDS;
  const payload = await fetchJson<{ bases: unknown[] }>(
    apiUrl(`/api/v1/knowledge-bases`),
    { bases: fallback },
  );
  return parseList(payload.bases, KnowledgeBaseSchema);
}

export async function runKnowledgePipelineApi(
  baseId: string,
  docId: string,
): Promise<KnowledgeBase> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/knowledge-bases/${baseId}/documents/${docId}/run-pipeline`),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  return KnowledgeBaseSchema.parse(updated);
}

export async function fetchTools(): Promise<PlatformTool[]> {
  // Tool 目录已迁移到部署级单例；保留参数仅为兼容 legacy store 调用方。
  const fallback = TOOL_SEEDS;
  if (!useWorkspaceStore.getState().apiConnected) return fallback;
  try {
    const payload = await fetchToolsApi();
    // 200 但缺少工具数组通常是旧代理/SPA fallback；保留静态目录，避免把已有列表清空。
    if (!Array.isArray(payload?.tools)) return fallback;
    const raw = payload.tools;
    // 新 marketplace 工具字段与旧 Tool 中心略有差异；仅为仍可访问的 legacy 页面
    // 填充其所需展示字段，主路径仍直接消费 marketplaceStore 的原始工具对象。
    return raw
      .map((item) => {
        try {
          return PlatformToolSchema.parse(item);
        } catch {
          return toLegacyPlatformTool(item);
        }
      })
      .filter((item): item is PlatformTool => item !== null);
  } catch {
    return fallback;
  }
}

function toLegacyPlatformTool(raw: unknown): PlatformTool | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const id = String(item.id ?? '').trim();
  if (!id) return null;
  const type =
    item.type === 'http' || item.type === 'mcp' || item.type === 'openapi' ||
    item.type === 'python' || item.type === 'node' || item.type === 'function'
      ? item.type
      : item.connectorType === 'mcp'
        ? 'mcp'
        : 'http';
  const status = item.status === 'testing' || item.status === 'deprecated' || item.status === 'draft'
    ? item.status
    : item.published === false
      ? 'draft'
      : 'active';
  const numberOr = (value: unknown, fallbackValue: number) =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallbackValue;
  const strings = (value: unknown) => Array.isArray(value) ? value.map(String) : [];
  return {
    id,
    name: String(item.name ?? id),
    displayName: String(item.displayName ?? item.name ?? id),
    description: String(item.description ?? item.desc ?? ''),
    type,
    status,
    version: String(item.version ?? item.versionLabel ?? '1.0'),
    endpoint: String(item.endpoint ?? item.homepageUrl ?? ''),
    ...(typeof item.method === 'string' ? { method: item.method } : {}),
    credentialType:
      item.credentialType === 'api_key' || item.credentialType === 'oauth2' ||
      item.credentialType === 'sso' || item.credentialType === 'secret_ref'
        ? item.credentialType
        : 'none',
    credentialLabel: String(item.credentialLabel ?? '无需凭证'),
    rateLimit: String(item.rateLimit ?? '未限制'),
    timeoutMs: numberOr(item.timeoutMs, 15000),
    usedBySkills: strings(item.usedBySkills),
    usedByAgents: strings(item.usedByAgents),
    tags: strings(item.tags),
    updatedAt: String(item.updatedAt ?? item.createdAt ?? ''),
    author: String(item.author ?? item.publisher ?? '平台'),
  };
}

export async function fetchMemoryStores(): Promise<MemoryStore[]> {
  const fallback = MEMORY_SEEDS;
  const payload = await fetchJson<{ stores: unknown[] }>(
    apiUrl(`/api/v1/memory-stores`),
    { stores: fallback },
  );
  return parseList(payload.stores, MemoryStoreSchema);
}

export async function patchMemoryLayerPolicyApi(
  storeId: string,
  layer: MemoryLayer,
  patch: Partial<{ retentionDays: number; maxTokens: number; reflectionEnabled: boolean; decayRate: number }>,
): Promise<MemoryStore> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/memory-stores/${storeId}/layers/${layer}/policy`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    },
  );
  return MemoryStoreSchema.parse(updated);
}

export async function runMemoryReflectionApi(
  storeId: string,
): Promise<MemoryStore> {
  const updated = await mutateJson<unknown>(
    apiUrl(`/api/v1/memory-stores/${storeId}/run-reflection`),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  return MemoryStoreSchema.parse(updated);
}

export async function fetchExecutionHistory(
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
      apiUrl(`/api/v1/executions?limit=${limit}`),
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
