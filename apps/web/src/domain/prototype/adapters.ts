import type { Agent } from '@/domain/agent';
import type { KnowledgeBase, KnowledgeDocument } from '@/domain/knowledge';
import type { Skill } from '@/domain/skill';
import { PROTOTYPE_AGENTS } from '@/domain/prototype/agents';
import { PROTOTYPE_SKILLS } from '@/domain/prototype/skills';
import { PROTOTYPE_KB_DOCS } from '@/domain/prototype/kb';
import type { PrototypeAgentSeed, PrototypeKbDocument, PrototypeSkillSeed } from '@/domain/prototype/types';

const SKILL_NAME_MAP = new Map(PROTOTYPE_SKILLS.map((s) => [s.id, s.name]));

function mapPrototypeColor(gradient: string): string {
  if (gradient.includes('cf0a2c') || gradient.includes('e0122f') || gradient.includes('rose')) return 'rose';
  if (gradient.includes('teal') || gradient.includes('cyan')) return 'teal';
  if (gradient.includes('emerald') || gradient.includes('green')) return 'emerald';
  if (gradient.includes('violet') || gradient.includes('purple')) return 'violet';
  if (gradient.includes('indigo') || gradient.includes('blue')) return 'indigo';
  if (gradient.includes('amber') || gradient.includes('orange')) return 'amber';
  if (gradient.includes('pink')) return 'pink';
  if (gradient.includes('sky')) return 'sky';
  if (gradient.includes('slate')) return 'slate';
  return 'rose';
}

function resolveSkillNames(skillIds: string[]): string[] {
  return skillIds.map((id) => SKILL_NAME_MAP.get(id) ?? id);
}

export function prototypeAgentToDomain(seed: PrototypeAgentSeed): Agent {
  const skillNames = resolveSkillNames(seed.skillIds);
  return {
    id: seed.id,
    name: seed.name,
    description: seed.desc,
    icon: seed.icon,
    color: mapPrototypeColor(seed.color),
    persona: seed.systemPrompt ?? `你是 ${seed.name}，服务华为 MSS 营销服智枢平台。`,
    llm: { model: 'glm-5.1', temperature: 0.2, maxTokens: 4096 },
    bindings: {
      promptId: `prompt-${seed.id}`,
      promptName: `${seed.name.replace(/\s*Agent\s*/i, '')}_BRIEF`,
      workflowIds: [],
      workflowNames: [],
      skillIds: seed.skillIds,
      skillNames,
      knowledgeIds: seed.chatId === 'knowledge' ? ['kb-mss-enterprise'] : [],
      knowledgeNames: seed.chatId === 'knowledge' ? ['mss_enterprise_knowledge'] : [],
      toolIds: [],
      toolNames: [],
    },
    status: seed.published ? 'online' : 'draft',
    version: 'v1.0',
    updatedAt: '2026-07-08',
    author: seed.author,
    chatId: seed.chatId,
    tags: [seed.category, seed.bizLine, seed.homeTag],
  };
}

export function prototypeSkillToDomain(seed: PrototypeSkillSeed): Skill {
  const usedByAgents = PROTOTYPE_AGENTS
    .filter((a) => a.skillIds.includes(seed.id))
    .map((a) => a.name);

  return {
    id: seed.id,
    name: seed.name,
    displayName: seed.name,
    description: seed.desc,
    version: seed.version.startsWith('v') ? `v${seed.version}` : `v${seed.version}`,
    lifecycle: seed.published ? 'online' : 'create',
    updatedAt: '2026-07-08',
    author: seed.author,
    toolNames: seed.connector ? [seed.connector] : [],
    inputSchema: '{ query: string, context?: object }',
    outputSchema: '{ result: object }',
    retry: 2,
    timeoutMs: 15000,
    memoryPolicy: 'session_readonly',
    usedByAgents,
    usedByWorkflows: [],
    dependsOn: [],
    tags: [...seed.tags, seed.category, seed.command],
  };
}

function mapDocType(type: string): KnowledgeDocument['type'] {
  const t = type.toLowerCase();
  if (t === 'pdf') return 'pdf';
  if (t === 'xlsx') return 'xlsx';
  if (t === 'docx') return 'docx';
  if (t === 'md') return 'md';
  return 'pdf';
}

function parseSizeMb(size: string): number {
  const match = size.match(/([\d.]+)\s*(MB|KB|GB)/i);
  if (!match) return 1;
  const n = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === 'GB') return n * 1024;
  if (unit === 'KB') return n / 1024;
  return n;
}

export function prototypeKbDocToDomain(doc: PrototypeKbDocument): KnowledgeDocument {
  return {
    id: doc.id,
    name: doc.title,
    type: mapDocType(doc.type),
    sizeMb: parseSizeMb(doc.size),
    status: doc.indexed ? 'indexed' : 'pending',
    chunks: doc.chunks,
    clearanceLevel: doc.clearance,
    updatedAt: doc.updatedAt,
    domain: doc.collection,
  };
}

export function buildPrototypeKnowledgeBase(): KnowledgeBase {
  const documents = PROTOTYPE_KB_DOCS.map(prototypeKbDocToDomain);
  const totalChunks = documents.reduce((sum, d) => sum + d.chunks, 0);

  return {
    id: 'kb-mss-enterprise',
    name: 'mss_enterprise_knowledge',
    description: '华为 MSS 营销服企业知识库 · 按业务部门分区 · Milvus Online',
    status: 'online',
    vectorDb: 'Milvus',
    collection: 'mss_enterprise_knowledge_v2',
    embeddingModel: 'bge-large-zh-v1.5',
    chunkStrategy: 'semantic_recursive',
    chunkSize: 512,
    overlap: 64,
    totalDocuments: documents.length,
    totalChunks,
    storageGb: 12.4,
    pipelineStage: 'ready',
    updatedAt: '2026-07-08',
    tags: ['rag', 'milvus', 'mss', 'biz-dept'],
    documents,
  };
}

export function getPrototypeAgentsAsDomain(): Agent[] {
  return PROTOTYPE_AGENTS.map(prototypeAgentToDomain);
}

export function getPrototypeSkillsAsDomain(): Skill[] {
  return PROTOTYPE_SKILLS.map(prototypeSkillToDomain);
}

export function getPrototypeKnowledgeBasesAsDomain(): KnowledgeBase[] {
  return [buildPrototypeKnowledgeBase()];
}

export function findPrototypeAgentById(id: string): PrototypeAgentSeed | undefined {
  return PROTOTYPE_AGENTS.find((a) => a.id === id);
}

export function findPrototypeSkillById(id: string): PrototypeSkillSeed | undefined {
  return PROTOTYPE_SKILLS.find((s) => s.id === id);
}
