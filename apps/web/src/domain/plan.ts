import { PROTOTYPE_AGENTS } from '@/domain/prototype/agents';
import { PROTOTYPE_SKILLS } from '@/domain/prototype/skills';
import { generatePlanStepsWithLlm, isLlmConfigured } from '@/api/llmClient';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

export const EXEC_PLANS = {
  marketing: [
    '解析任务意图与业务实体',
    '并发拉取 SAP / Salesforce 数据',
    'PII 脱敏与 GDPR 校验',
    'SHAP 归因算法沙盒执行',
    '渲染看板并生成 NBA 策略',
  ],
  knowledge: [
    '提问重写与术语对齐',
    'Milvus 向量检索 Top-15',
    'Cross-Encoder 语义重排',
    '抗幻觉摘要与引用注入',
  ],
} as const;

export type ActionType = keyof typeof EXEC_PLANS;

export function getAgentById(agentId?: string) {
  if (!agentId) return null;
  const fromMarket = useMarketplaceStore.getState().agents.find((a) => a.id === agentId);
  if (fromMarket) return fromMarket;
  return PROTOTYPE_AGENTS.find((a) => a.id === agentId) ?? null;
}

export function getSkillLabels(agentId?: string): string[] {
  const agent = getAgentById(agentId);
  if (!agent) return [];
  const skills = useMarketplaceStore.getState().skills;
  return agent.skillIds
    .map((id) => skills.find((s) => s.id === id)?.name ?? PROTOTYPE_SKILLS.find((s) => s.id === id)?.name ?? id)
    .filter(Boolean);
}

export function inferActionType(agentId?: string): ActionType {
  const agent = getAgentById(agentId);
  if (!agent) return 'marketing';
  if (agent.chatId === 'knowledge' || agent.category === 'experience' || agent.category === 'process') {
    return 'knowledge';
  }
  return 'marketing';
}

export function resolveActionTypeFromText(text: string, agentId?: string): ActionType {
  if (
    text.includes('知识') ||
    text.includes('合规') ||
    text.includes('RAG') ||
    text.includes('SOP') ||
    text.includes('客诉') ||
    text.includes('/检索') ||
    text.includes('/rerank') ||
    text.includes('/会议纪要') ||
    text.includes('/文档生成') ||
    text.includes('/解析文档')
  ) {
    return 'knowledge';
  }
  return inferActionType(agentId);
}

export function buildPlanSteps(actionType: ActionType, agentId?: string): string[] {
  const baseSteps: string[] = [...EXEC_PLANS[actionType]];
  const skillNames = getSkillLabels(agentId);
  if (!skillNames.length) return baseSteps;
  const attachIdx = Math.min(2, baseSteps.length - 1);
  baseSteps[attachIdx] = `${baseSteps[attachIdx]} · ${skillNames.slice(0, 2).join('、')}`;
  if (skillNames.length > 2 && baseSteps.length > 3) {
    baseSteps[baseSteps.length - 1] = `${baseSteps[baseSteps.length - 1]} · ${skillNames[2]}`;
  }
  return baseSteps;
}

export async function resolvePlanSteps(params: {
  userTask: string;
  actionType: ActionType;
  agentId?: string;
  agentName: string;
  signal?: AbortSignal;
}): Promise<{ steps: string[]; fromLlm: boolean }> {
  const fallback = buildPlanSteps(params.actionType, params.agentId);
  if (!isLlmConfigured()) return { steps: fallback, fromLlm: false };
  const agent = getAgentById(params.agentId);
  try {
    const steps = await generatePlanStepsWithLlm({
      userTask: params.userTask,
      actionType: params.actionType,
      agentName: params.agentName,
      systemPrompt: agent?.systemPrompt,
      skillNames: getSkillLabels(params.agentId),
      fallbackSteps: fallback,
      signal: params.signal,
    });
    return { steps, fromLlm: true };
  } catch {
    return { steps: fallback, fromLlm: false };
  }
}

export function resolveAgentFromText(text: string) {
  const agents = useMarketplaceStore.getState().getPublishedAgents();
  for (const agent of agents) {
    const shortName = agent.name.replace(/\s*Agent\s*/i, '');
    if (text.includes(`@${agent.name}`) || text.includes(`@${shortName}`)) {
      return agent;
    }
  }
  return null;
}
