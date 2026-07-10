import { z } from 'zod';
import { ChatConfigSchema, INITIAL_CHATS } from '@/domain/chat';
import { getPrototypeAgentsAsDomain } from '@/domain/prototype/adapters';
import { PROTOTYPE_WORKSPACE_ID } from '@/domain/prototype/constants';
import { PROTOTYPE_WORKSPACES } from '@/domain/prototype/workspaces';

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

const CN_MARKETING_CATALOG: WorkspaceCatalog = {
  workspace: {
    id: PROTOTYPE_WORKSPACE_ID,
    name: PROTOTYPE_WORKSPACES[PROTOTYPE_WORKSPACE_ID].label,
    namespace: 'cn.marketing',
    description: '华为终端中国区营销服智枢作战空间',
    memberCount: 42,
  },
  chats: structuredClone(INITIAL_CHATS),
  defaultChatId: 'marketing',
  resources: [
    ...PROTOTYPE_AGENT_RESOURCES,
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
  ],
};

const LATAM_CATALOG: WorkspaceCatalog = {
  workspace: {
    id: 'ws-3c-latam',
    name: '3C 拉美事业部',
    namespace: '3c.latam',
    description: '拉美穿戴与智能终端业务作战空间（兼容工作区 · 数据同设计稿）',
    memberCount: 28,
  },
  chats: structuredClone(INITIAL_CHATS),
  defaultChatId: 'marketing',
  resources: [
    ...PROTOTYPE_AGENT_RESOURCES.slice(0, 6),
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
  ],
};

const GLOBAL_CATALOG: WorkspaceCatalog = {
  workspace: {
    id: 'ws-global-marketing',
    name: '全球营销中台',
    namespace: 'global.marketing',
    description: '跨区域 Campaign 与渠道策略协同',
    memberCount: 56,
  },
  chats: {
    campaign_ops: {
      id: 'campaign_ops',
      title: '全球 Campaign Ops',
      type: 'group',
      icon: 'fa-bullhorn',
      color: 'violet',
      status: '12 位成员 · 多区域协同',
      history: [
        {
          role: 'other',
          name: 'Sarah (Global PM)',
          avatar: 'bg-violet-500',
          text: '亚太区 Black Friday 素材包是否已对齐？',
        },
        { role: 'system', text: '您进入了全球营销中台工作区' },
      ],
      prompts: ['@营销 Agent 汇总亚太区近 30 天 Campaign ROI', '@知识 Agent 查询各区域合规投放限制'],
    },
    insight_agent: {
      id: 'insight_agent',
      title: '洞察 Agent',
      type: 'bot',
      icon: 'fa-lightbulb',
      color: 'amber',
      status: '已接入全球媒介与转化漏斗',
      history: [
        {
          role: 'agent',
          name: '洞察 Agent',
          text: '您好！我可以帮您做跨区 Campaign 效果对比、渠道 ROI 诊断与预算模拟。',
        },
      ],
      prompts: ['对比 NA / EMEA / APAC 近 4 周 CTR 趋势', '输出 Q4 预算再分配建议'],
    },
  },
  defaultChatId: 'insight_agent',
  resources: [
    {
      id: 'agent-insight',
      kind: 'agent',
      name: '洞察 Agent',
      status: 'online',
      icon: 'fa-lightbulb',
      chatId: 'insight_agent',
    },
    {
      id: 'wf-budget-sim',
      kind: 'workflow',
      name: '预算模拟流',
      status: 'testing',
      icon: 'fa-diagram-project',
    },
    {
      id: 'kb-campaign-playbook',
      kind: 'knowledge',
      name: 'global_campaign_playbook',
      status: 'online',
      icon: 'fa-database',
    },
    {
      id: 'prompt-campaign-brief',
      kind: 'prompt',
      name: 'CAMPAIGN_BRIEF_GENERATOR',
      status: 'released',
      icon: 'fa-file-lines',
      version: 'v2',
    },
  ],
};

const RD_CATALOG: WorkspaceCatalog = {
  workspace: {
    id: 'ws-rd-knowledge',
    name: '研发知识库',
    namespace: 'rd.knowledge',
    description: '产品规格、SOP、合规与研发文档中心',
    memberCount: 112,
  },
  chats: {
    rd_rag: {
      id: 'rd_rag',
      title: '研发 RAG Agent',
      type: 'bot',
      icon: 'fa-flask',
      color: 'cyan',
      status: '已挂载规格书 / SOP / 合规库',
      history: [
        {
          role: 'agent',
          name: '研发 RAG Agent',
          text: '您好！我可以检索产品规格、测试报告、合规标准与研发 SOP，并给出引用溯源。',
        },
      ],
      prompts: ['查询旗舰机影像模组规格差异', '检索电池热管理相关测试报告'],
    },
  },
  defaultChatId: 'rd_rag',
  resources: [
    {
      id: 'agent-rd-rag',
      kind: 'agent',
      name: '研发 RAG Agent',
      status: 'online',
      icon: 'fa-flask',
      chatId: 'rd_rag',
    },
    {
      id: 'kb-rd-spec',
      kind: 'knowledge',
      name: 'rd_spec_library',
      status: 'online',
      icon: 'fa-database',
    },
    {
      id: 'prompt-spec-compare',
      kind: 'prompt',
      name: 'SPEC_COMPARE_STRICT',
      status: 'approved',
      icon: 'fa-file-lines',
      version: 'v1',
    },
  ],
};

export const WORKSPACE_CATALOG: Record<string, WorkspaceCatalog> = {
  [PROTOTYPE_WORKSPACE_ID]: CN_MARKETING_CATALOG,
  'ws-3c-latam': LATAM_CATALOG,
  'ws-global-marketing': GLOBAL_CATALOG,
  'ws-rd-knowledge': RD_CATALOG,
};

export const WORKSPACE_LIST = Object.values(WORKSPACE_CATALOG).map((item) => item.workspace);

export function getWorkspaceCatalog(workspaceId: string): WorkspaceCatalog {
  return WORKSPACE_CATALOG[workspaceId] ?? LATAM_CATALOG;
}

/** 为自定义租户生成最小可用 Catalog（复用默认会话模板） */
export function createTenantCatalog(input: {
  id: string;
  name: string;
  namespace: string;
  description?: string;
  memberCount?: number;
}): WorkspaceCatalog {
  return {
    workspace: {
      id: input.id,
      name: input.name,
      namespace: input.namespace,
      description: input.description?.trim() || `${input.name} 租户空间`,
      memberCount: input.memberCount ?? 1,
    },
    chats: structuredClone(INITIAL_CHATS),
    defaultChatId: 'marketing',
    resources: [
      {
        id: 'agent-marketing',
        kind: 'agent',
        name: '营销 Agent',
        status: 'online',
        icon: 'fa-chart-pie',
        chatId: 'marketing',
      },
      {
        id: 'agent-knowledge',
        kind: 'agent',
        name: '知识 Agent',
        status: 'online',
        icon: 'fa-book-open',
        chatId: 'knowledge',
      },
    ],
  };
}

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
