import { z } from 'zod';
import {
  getPrototypeAgentsAsDomain,
} from '@/domain/prototype/adapters';
import { PROTOTYPE_WORKSPACE_ID } from '@/domain/prototype/constants';

export const AgentStatusSchema = z.enum(['draft', 'testing', 'published', 'online', 'offline']);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const AgentLlmSchema = z.object({
  model: z.string(),
  temperature: z.number(),
  maxTokens: z.number(),
});
export type AgentLlm = z.infer<typeof AgentLlmSchema>;

export const AgentBindingsSchema = z.object({
  promptId: z.string(),
  promptName: z.string(),
  workflowIds: z.array(z.string()),
  workflowNames: z.array(z.string()),
  skillIds: z.array(z.string()),
  skillNames: z.array(z.string()),
  knowledgeIds: z.array(z.string()),
  knowledgeNames: z.array(z.string()),
  toolIds: z.array(z.string()),
  toolNames: z.array(z.string()),
});
export type AgentBindings = z.infer<typeof AgentBindingsSchema>;

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  color: z.string(),
  persona: z.string(),
  llm: AgentLlmSchema,
  bindings: AgentBindingsSchema,
  status: AgentStatusSchema,
  version: z.string(),
  updatedAt: z.string(),
  author: z.string(),
  chatId: z.string().optional(),
  tags: z.array(z.string()),
});
export type Agent = z.infer<typeof AgentSchema>;

export const AGENT_STATUS_FLOW: AgentStatus[] = ['draft', 'testing', 'published', 'online'];

const PROTOTYPE_AGENT_LIST = getPrototypeAgentsAsDomain();

export const AGENT_CATALOG: Record<string, Agent[]> = {
  [PROTOTYPE_WORKSPACE_ID]: PROTOTYPE_AGENT_LIST,
  'ws-3c-latam': PROTOTYPE_AGENT_LIST,
  'ws-global-marketing': [
    {
      id: 'agent-insight',
      name: '洞察 Agent',
      description: '跨区域 Campaign 效果洞察与预算模拟',
      icon: 'fa-lightbulb',
      color: 'amber',
      persona: `你是全球营销中台的洞察分析师。
职责：ROI 对比、渠道漏斗诊断、预算模拟建议。`,
      llm: { model: 'Shield-70B-Chat', temperature: 0.3, maxTokens: 4096 },
      bindings: {
        promptId: 'prompt-campaign-brief',
        promptName: 'CAMPAIGN_BRIEF_GENERATOR',
        workflowIds: ['wf-budget-sim'],
        workflowNames: ['预算模拟流'],
        skillIds: ['skill-roi-compare'],
        skillNames: ['ROI_Compare'],
        knowledgeIds: ['kb-campaign-playbook'],
        knowledgeNames: ['global_campaign_playbook'],
        toolIds: ['tool-ga4'],
        toolNames: ['GA4_Reporting_API'],
      },
      status: 'online',
      version: 'v1.2',
      updatedAt: '2026-06-10',
      author: 'Sarah',
      chatId: 'insight_agent',
      tags: ['global', 'campaign', 'roi'],
    },
  ],
  'ws-rd-knowledge': [
    {
      id: 'agent-rd-rag',
      name: '研发 RAG Agent',
      description: '研发规格书、测试报告与 SOP 检索',
      icon: 'fa-flask',
      color: 'cyan',
      persona: `你是研发知识库 Agent，服务硬件与软件研发团队。
职责：规格对比、测试报告检索、SOP 查询。`,
      llm: { model: 'Shield-70B-Chat', temperature: 0.1, maxTokens: 8192 },
      bindings: {
        promptId: 'prompt-spec-compare',
        promptName: 'SPEC_COMPARE_STRICT',
        workflowIds: [],
        workflowNames: [],
        skillIds: ['skill-spec-search'],
        skillNames: ['Spec_Search'],
        knowledgeIds: ['kb-rd-spec'],
        knowledgeNames: ['rd_spec_library'],
        toolIds: ['tool-milvus'],
        toolNames: ['Milvus_gRPC'],
      },
      status: 'published',
      version: 'v1.0',
      updatedAt: '2026-05-30',
      author: 'RD-Team',
      chatId: 'rd_rag',
      tags: ['rd', 'spec', 'rag'],
    },
  ],
};

export function getAgentsByWorkspace(workspaceId: string): Agent[] {
  return AGENT_CATALOG[workspaceId] ?? AGENT_CATALOG['ws-3c-latam'];
}

export function findAgentById(workspaceId: string, id: string): Agent | undefined {
  return getAgentsByWorkspace(workspaceId).find((a) => a.id === id);
}

export function findAgentByName(workspaceId: string, name: string): Agent | undefined {
  return getAgentsByWorkspace(workspaceId).find((a) => a.name === name);
}

export function getAgentStatusLabel(status: AgentStatus) {
  const labels: Record<AgentStatus, string> = {
    draft: 'Draft',
    testing: 'Testing',
    published: 'Published',
    online: 'Online',
    offline: 'Offline',
  };
  return labels[status];
}

export function getAgentStatusClass(status: AgentStatus) {
  const classes: Record<AgentStatus, string> = {
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    testing: 'bg-blue-50 text-blue-600 border-blue-200',
    published: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    online: 'bg-green-50 text-green-600 border-green-200',
    offline: 'bg-slate-100 text-slate-400 border-slate-200',
  };
  return classes[status];
}

export function getNextAgentStatus(current: AgentStatus): AgentStatus | null {
  const idx = AGENT_STATUS_FLOW.indexOf(current);
  if (idx < 0 || idx >= AGENT_STATUS_FLOW.length - 1) return null;
  return AGENT_STATUS_FLOW[idx + 1];
}

export function getAgentPublishAction(current: AgentStatus): string | null {
  const next = getNextAgentStatus(current);
  if (!next) return null;
  const actions: Partial<Record<AgentStatus, string>> = {
    testing: '提交测试',
    published: '审批发布',
    online: '上线运行',
  };
  return actions[next] ?? `推进至 ${getAgentStatusLabel(next)}`;
}
