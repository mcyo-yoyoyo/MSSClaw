import { z } from 'zod';
import { ChatConfigSchema } from '@/domain/chat';
import { getPrototypeAgentsAsDomain } from '@/domain/prototype/adapters';
import { PROTOTYPE_WORKSPACE_ID } from '@/domain/prototype/constants';

export const ResourceStatusSchema = z.enum([
  'online',
  'draft',
  'testing',
  'approved',
  'released',
  'deprecated',
  'archived',
]);
export type ResourceStatus = z.infer<typeof ResourceStatusSchema>;

export const ResourceKindSchema = z.enum(['agent', 'workflow', 'knowledge', 'prompt']);
export type ResourceKind = z.infer<typeof ResourceKindSchema>;

export const WorkspaceResourceSchema = z.object({
  id: z.string(),
  kind: ResourceKindSchema,
  name: z.string(),
  status: ResourceStatusSchema,
  icon: z.string(),
  description: z.string().optional(),
  chatId: z.string().optional(),
  version: z.string().optional(),
});
export type WorkspaceResource = z.infer<typeof WorkspaceResourceSchema>;

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  namespace: z.string(),
  description: z.string(),
  memberCount: z.number(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const WorkspaceCatalogSchema = z.object({
  workspace: WorkspaceSchema,
  chats: z.record(z.string(), ChatConfigSchema),
  resources: z.array(WorkspaceResourceSchema),
  defaultChatId: z.string(),
});
export type WorkspaceCatalog = z.infer<typeof WorkspaceCatalogSchema>;

export const EXPLORER_SECTIONS = ['conversations', 'agents', 'workflows', 'knowledge', 'prompts'] as const;
export type ExplorerSection = (typeof EXPLORER_SECTIONS)[number];

function buildAgentResources() {
  return getPrototypeAgentsAsDomain().map((agent) => ({
    id: agent.id,
    kind: 'agent' as const,
    name: agent.name,
    status: 'online' as const,
    icon: agent.icon,
    chatId: agent.chatId,
    description: agent.description.slice(0, 80),
  }));
}

const PROTOTYPE_AGENT_RESOURCES = buildAgentResources();

const SHARED_KB_PROMPT: WorkspaceResource[] = [
  {
    id: 'kb-mss-enterprise',
    kind: 'knowledge',
    name: 'mss_enterprise_knowledge',
    status: 'online',
    icon: 'fa-database',
    description: 'Milvus · 按业务部门分区',
  },
  {
    id: 'prompt-qa-strict',
    kind: 'prompt',
    name: 'ENTERPRISE_QA_STRICT',
    status: 'released',
    icon: 'fa-file-lines',
    version: 'v3',
    description: '抗幻觉企业问答模板',
  },
];

/** 平台目录种子：接口不可用或返回空目录时使用 */
export const PLATFORM_CATALOG: WorkspaceCatalog = {
  workspace: {
    id: PROTOTYPE_WORKSPACE_ID,
    name: '华为全球营销服',
    namespace: 'hw.global.mkt',
    description: '机关职能 · 华为全球营销服务默认数据空间',
    memberCount: 4,
  },
  chats: {},
  defaultChatId: '',
  resources: [...PROTOTYPE_AGENT_RESOURCES, ...SHARED_KB_PROMPT],
};

export function getResourcesByKind(catalog: WorkspaceCatalog, kind: ResourceKind) {
  return catalog.resources.filter((item) => item.kind === kind);
}

export function getStatusLabel(status: ResourceStatus) {
  const labels: Record<ResourceStatus, string> = {
    online: 'Online',
    draft: 'Draft',
    testing: 'Testing',
    released: 'Released',
    approved: 'Approved',
    deprecated: 'Deprecated',
    archived: 'Archived',
  };
  return labels[status];
}

export function getStatusClass(status: ResourceStatus) {
  const classes: Record<ResourceStatus, string> = {
    online: 'text-green-600 bg-green-50 border-green-200',
    draft: 'text-amber-600 bg-amber-50 border-amber-200',
    testing: 'text-blue-600 bg-blue-50 border-blue-200',
    released: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    approved: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    deprecated: 'text-slate-500 bg-slate-100 border-slate-200',
    archived: 'text-slate-400 bg-slate-50 border-slate-200',
  };
  return classes[status];
}
