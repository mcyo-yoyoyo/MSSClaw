import { z } from 'zod';
import {
  getPrototypeKnowledgeBasesAsDomain,
} from '@/domain/prototype/adapters';
import { PROTOTYPE_WORKSPACE_ID } from '@/domain/prototype/constants';

export const PipelineStageSchema = z.enum(['document', 'chunk', 'embedding', 'index', 'retriever', 'ready']);
export type PipelineStage = z.infer<typeof PipelineStageSchema>;

export const DocumentStatusSchema = z.enum(['pending', 'chunking', 'embedding', 'indexed', 'failed']);
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;

export const KnowledgeBaseStatusSchema = z.enum(['draft', 'indexing', 'online', 'syncing', 'deprecated']);
export type KnowledgeBaseStatus = z.infer<typeof KnowledgeBaseStatusSchema>;

export const KnowledgeDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['pdf', 'docx', 'xlsx', 'md', 'html']),
  sizeMb: z.number(),
  status: DocumentStatusSchema,
  chunks: z.number(),
  clearanceLevel: z.string(),
  updatedAt: z.string(),
  domain: z.string(),
});
export type KnowledgeDocument = z.infer<typeof KnowledgeDocumentSchema>;

export const KnowledgeBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: KnowledgeBaseStatusSchema,
  vectorDb: z.string(),
  collection: z.string(),
  embeddingModel: z.string(),
  chunkStrategy: z.string(),
  chunkSize: z.number(),
  overlap: z.number(),
  totalDocuments: z.number(),
  totalChunks: z.number(),
  storageGb: z.number(),
  pipelineStage: PipelineStageSchema,
  updatedAt: z.string(),
  tags: z.array(z.string()),
  documents: z.array(KnowledgeDocumentSchema),
});
export type KnowledgeBase = z.infer<typeof KnowledgeBaseSchema>;

export const PIPELINE_STAGES: { id: PipelineStage; label: string; icon: string }[] = [
  { id: 'document', label: 'Document', icon: 'fa-file' },
  { id: 'chunk', label: 'Chunk', icon: 'fa-scissors' },
  { id: 'embedding', label: 'Embedding', icon: 'fa-vector-square' },
  { id: 'index', label: 'Index', icon: 'fa-database' },
  { id: 'retriever', label: 'Retriever', icon: 'fa-magnifying-glass' },
  { id: 'ready', label: 'Ready', icon: 'fa-circle-check' },
];

const PROTOTYPE_KB_LIST = getPrototypeKnowledgeBasesAsDomain();

export const KNOWLEDGE_CATALOG: Record<string, KnowledgeBase[]> = {
  [PROTOTYPE_WORKSPACE_ID]: PROTOTYPE_KB_LIST,
  'ws-apac': PROTOTYPE_KB_LIST,
  'ws-3c-latam': PROTOTYPE_KB_LIST,
  'ws-mea': PROTOTYPE_KB_LIST,
  'ws-eurasia': PROTOTYPE_KB_LIST,
  'ws-europe': PROTOTYPE_KB_LIST,
};

export function getKnowledgeBasesByWorkspace(workspaceId: string): KnowledgeBase[] {
  return KNOWLEDGE_CATALOG[workspaceId] ?? PROTOTYPE_KB_LIST;
}

export function findKnowledgeBaseById(workspaceId: string, id: string): KnowledgeBase | undefined {
  return getKnowledgeBasesByWorkspace(workspaceId).find((kb) => kb.id === id);
}

export function findKnowledgeBaseByName(workspaceId: string, name: string): KnowledgeBase | undefined {
  return getKnowledgeBasesByWorkspace(workspaceId).find((kb) => kb.name === name);
}

export function getDocumentStatusLabel(status: DocumentStatus) {
  const labels: Record<DocumentStatus, string> = {
    pending: 'Pending',
    chunking: 'Chunking',
    embedding: 'Embedding',
    indexed: 'Indexed',
    failed: 'Failed',
  };
  return labels[status];
}

export function getDocumentStatusClass(status: DocumentStatus) {
  const classes: Record<DocumentStatus, string> = {
    pending: 'bg-slate-100 text-slate-600',
    chunking: 'bg-blue-50 text-blue-600',
    embedding: 'bg-amber-50 text-amber-600',
    indexed: 'bg-green-50 text-green-600',
    failed: 'bg-red-50 text-red-600',
  };
  return classes[status];
}

export function getKbStatusClass(status: KnowledgeBaseStatus) {
  const classes: Record<KnowledgeBaseStatus, string> = {
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    indexing: 'bg-amber-50 text-amber-600 border-amber-200',
    online: 'bg-green-50 text-green-600 border-green-200',
    syncing: 'bg-blue-50 text-blue-600 border-blue-200',
    deprecated: 'bg-slate-50 text-slate-400 border-slate-200',
  };
  return classes[status];
}

export function getPipelineStageIndex(stage: PipelineStage) {
  return PIPELINE_STAGES.findIndex((s) => s.id === stage);
}

export function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
