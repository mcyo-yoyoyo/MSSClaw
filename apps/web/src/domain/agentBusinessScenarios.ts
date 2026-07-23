import {
  BUSINESS_SCENARIO_CATEGORIES,
  type BusinessScenarioId,
} from '@/domain/businessScenarios';
import { getSkillBusinessScenario } from '@/domain/skillBusinessScenarios';
import type { PrototypeAgentSeed } from '@/domain/prototype/types';

/**
 * 业务「做任务 · 场景专家」短名单（顺序即展示序）。
 * 营销 = 问数/问报告/智能分析；知识 = 知识问答/陪练。
 * 细粒度专家仍保留在配置专家与案例打样，不进业务橱窗。
 */
export const DO_TASK_SCENE_EXPERT_IDS = ['agent-marketing', 'agent-knowledge'] as const;

/**
 * Agent → 主业务场景显式覆盖（无主技能映射时使用）。
 * 常规优先：primarySkillId / skillIds → SKILL_TO_BUSINESS_SCENARIO。
 */
export const AGENT_TO_BUSINESS_SCENARIO: Record<string, BusinessScenarioId> = {
  'agent-marketing': 'S8',
  'agent-data-analysis': 'S8',
  'agent-doc-review': 'S4',
  'agent-file-organize': 'S7',
  'agent-ppt': 'S2',
  'agent-meeting': 'S7',
  'agent-launch-sentiment': 'S1',
  'agent-survey': 'S1',
  'agent-review-collect': 'S1',
  'agent-review-translate': 'S2',
  'agent-review': 'S1',
  'agent-retail-insight': 'S1',
  'agent-price-monitor': 'S1',
  'agent-hr-resume': 'S7',
  'agent-training': 'S3',
  'agent-knowledge': 'S6',
  'agent-retail-coach': 'S3',
};

/** 运营/案例侧按场景推荐（细粒度）；业务橱窗不走此表 */
export const HOME_BUSINESS_AGENTS: Record<BusinessScenarioId, string[]> = {
  S1: [
    'agent-price-monitor',
    'agent-launch-sentiment',
    'agent-review',
    'agent-review-collect',
    'agent-retail-insight',
    'agent-survey',
  ],
  S2: ['agent-ppt', 'agent-review-translate'],
  S3: ['agent-retail-coach', 'agent-training'],
  S4: ['agent-doc-review'],
  S5: ['agent-knowledge'],
  S6: ['agent-knowledge'],
  S8: ['agent-marketing', 'agent-data-analysis'],
  S7: ['agent-meeting', 'agent-hr-resume', 'agent-file-organize'],
};

export function getAgentBusinessScenario(agent: PrototypeAgentSeed): BusinessScenarioId | null {
  const primaryId = agent.primarySkillId || agent.skillIds?.[0];
  if (primaryId) {
    const fromPrimary = getSkillBusinessScenario(primaryId);
    if (fromPrimary) return fromPrimary;
  }
  for (const sid of agent.skillIds ?? []) {
    const fromSkill = getSkillBusinessScenario(sid);
    if (fromSkill) return fromSkill;
  }
  return AGENT_TO_BUSINESS_SCENARIO[agent.id] ?? null;
}

export function getAgentBusinessLabel(agent: PrototypeAgentSeed): string | null {
  const id = getAgentBusinessScenario(agent);
  if (!id) return null;
  return BUSINESS_SCENARIO_CATEGORIES.find((c) => c.id === id)?.label ?? null;
}

/** 未显式配置时：短名单内视为精选露出 */
export function resolveAgentFeaturedInDoTask(agent: PrototypeAgentSeed): boolean {
  if (typeof agent.featuredInDoTask === 'boolean') return agent.featuredInDoTask;
  return (DO_TASK_SCENE_EXPERT_IDS as readonly string[]).includes(agent.id);
}

/**
 * 业务做任务 · 场景专家：已上架 ∩ 精选露出。
 * 默认精选为营销 / 知识门面；运营可在配置专家中勾选更多。
 */
export function listDoTaskSceneExperts(agents: PrototypeAgentSeed[]): PrototypeAgentSeed[] {
  const featured = agents.filter((a) => a.published && resolveAgentFeaturedInDoTask(a));
  const byId = new Map(featured.map((a) => [a.id, a]));
  const ordered: PrototypeAgentSeed[] = [];
  const seen = new Set<string>();

  for (const id of DO_TASK_SCENE_EXPERT_IDS) {
    const agent = byId.get(id);
    if (!agent) continue;
    ordered.push(agent);
    seen.add(id);
  }
  for (const agent of featured) {
    if (seen.has(agent.id)) continue;
    ordered.push(agent);
  }
  return ordered;
}

/** 「全部」时交错取各场景推荐专家（运营/扩展用） */
export function listRecommendedAgentIdsForBusiness(
  businessId: BusinessScenarioId | 'all',
  limit = 16,
): string[] {
  if (businessId !== 'all') {
    return (HOME_BUSINESS_AGENTS[businessId] ?? []).slice(0, limit);
  }
  const buckets = BUSINESS_SCENARIO_CATEGORIES.filter((c) => c.tabVisible)
    .map((c) => HOME_BUSINESS_AGENTS[c.id] ?? [])
    .filter((ids) => ids.length > 0);
  const out: string[] = [];
  let i = 0;
  while (out.length < limit) {
    let added = false;
    for (const bucket of buckets) {
      if (i < bucket.length) {
        const id = bucket[i]!;
        if (!out.includes(id)) out.push(id);
        added = true;
        if (out.length >= limit) break;
      }
    }
    if (!added) break;
    i += 1;
  }
  return out;
}

/** @deprecated 业务橱窗请用 listDoTaskSceneExperts；保留供扩展 */
export function filterAgentsForBusiness(
  agents: PrototypeAgentSeed[],
  businessId: BusinessScenarioId | 'all',
  limit = 16,
): PrototypeAgentSeed[] {
  void businessId;
  void limit;
  return listDoTaskSceneExperts(agents);
}
