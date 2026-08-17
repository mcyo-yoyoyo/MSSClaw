import type { Prisma } from '@prisma/client';

export interface MarketplacePayload {
  agents?: unknown[];
  skills?: unknown[];
  tools?: unknown[];
  automations?: unknown[];
  kbDocs?: unknown[];
  externalCatalogVersion?: string;
}

type JsonRecord = Record<string, unknown>;

function asRecord(v: unknown): JsonRecord | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as JsonRecord) : null;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v : fallback;
}

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
}

/** Marketplace agent → center agent payload (loose compatible shape) */
export function mapMarketplaceAgentToCenter(raw: unknown): JsonRecord | null {
  const a = asRecord(raw);
  if (!a) return null;
  const id = str(a.id);
  if (!id) return null;
  const name = str(a.name, id);
  const skillIds = strArr(a.skillIds);
  const published = Boolean(a.published);
  return {
    id,
    name,
    description: str(a.desc ?? a.description),
    icon: str(a.icon, 'fa-robot'),
    color: str(a.color, 'rose'),
    persona: str(a.systemPrompt, `你是 ${name}，服务华为 MSS 营销服智枢平台。`),
    llm: { model: 'glm-5.1', temperature: 0.2, maxTokens: 4096 },
    bindings: {
      promptId: `prompt-${id}`,
      promptName: `${name}_BRIEF`,
      workflowIds: [],
      workflowNames: [],
      skillIds,
      skillNames: skillIds,
      knowledgeIds: [],
      knowledgeNames: [],
      toolIds: [],
      toolNames: [],
    },
    status: published ? 'online' : 'draft',
    version: 'v1.0',
    updatedAt: today(),
    author: str(a.author, 'marketplace'),
    chatId: str(a.chatId) || undefined,
    tags: [str(a.category), str(a.bizLine), str(a.homeTag)].filter(Boolean),
    planSteps: strArr(a.planSteps),
    published,
  };
}

export function mapMarketplaceSkillToCenter(raw: unknown): JsonRecord | null {
  const s = asRecord(raw);
  if (!s) return null;
  const id = str(s.id);
  if (!id) return null;
  const name = str(s.nameZh ?? s.name, id);
  const versionRaw = str(s.version, '1.0');
  return {
    id,
    name,
    displayName: name,
    description: str(s.descZh ?? s.desc ?? s.description),
    version: versionRaw.startsWith('v') ? versionRaw : `v${versionRaw}`,
    lifecycle: Boolean(s.published) ? 'online' : 'create',
    updatedAt: today(),
    author: str(s.author, 'marketplace'),
    toolNames: str(s.connector) ? [str(s.connector)] : [],
    inputSchema: '{ query: string, context?: object }',
    outputSchema: '{ result: object }',
    retry: 2,
    timeoutMs: 15000,
    memoryPolicy: 'session_readonly',
    usedByAgents: [],
    usedByWorkflows: [],
    dependsOn: [],
    tags: [...strArr(s.tags), str(s.category), str(s.command)].filter(Boolean),
    planSteps: strArr(s.planSteps),
    published: Boolean(s.published),
  };
}

export function mapMarketplaceToolToCenter(raw: unknown): JsonRecord | null {
  const t = asRecord(raw);
  if (!t) return null;
  const id = str(t.id);
  if (!id) return null;
  const name = str(t.name, id);
  const category = str(t.category, 'connector');
  const type =
    category === 'external' ? 'http' : category === 'platform' ? 'function' : 'http';
  return {
    id,
    name,
    displayName: name,
    description: str(t.desc ?? t.description),
    type,
    status: Boolean(t.published) ? 'active' : 'draft',
    version: 'v1.0',
    endpoint: str(t.homepageUrl ?? t.endpoint, ''),
    method: 'GET',
    credentialType: 'none',
    credentialLabel: '无',
    rateLimit: '—',
    timeoutMs: 15000,
    usedBySkills: [],
    usedByAgents: [],
    tags: [...strArr(t.tags), category].filter(Boolean),
    updatedAt: today(),
    author: str(t.author, 'marketplace'),
    published: Boolean(t.published),
  };
}

export function listMappedFromMarketplace(
  kind: 'agent' | 'skill' | 'tool',
  payload: MarketplacePayload | null | undefined,
): JsonRecord[] {
  if (!payload) return [];
  const mapper =
    kind === 'agent'
      ? mapMarketplaceAgentToCenter
      : kind === 'skill'
        ? mapMarketplaceSkillToCenter
        : mapMarketplaceToolToCenter;
  const source =
    kind === 'agent' ? payload.agents : kind === 'skill' ? payload.skills : payload.tools;
  if (!Array.isArray(source)) return [];
  return source.map(mapper).filter((x): x is JsonRecord => Boolean(x));
}

export function toPrismaJson(payload: JsonRecord): Prisma.InputJsonValue {
  return payload as Prisma.InputJsonValue;
}
