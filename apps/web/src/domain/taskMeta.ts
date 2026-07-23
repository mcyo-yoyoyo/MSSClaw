import type { BusinessScenarioId } from '@/domain/businessScenarios';
import { getPrimaryBusinessScenario } from '@/domain/businessScenarios';
import { AGENT_TO_BUSINESS_SCENARIO } from '@/domain/agentBusinessScenarios';
import { getSkillBusinessScenario } from '@/domain/skillBusinessScenarios';
import type { DiscoverScenarioId } from '@/domain/scenarioCapabilities';

/** 任务来源：侧栏暂不分组，供后续筛选 / 外嵌 Agent 区分 */
export type TaskSource = 'skill' | 'expert' | 'case_demo' | 'embedded' | 'other';

export interface TaskCreateMeta {
  taskSource?: TaskSource;
  businessScenarioId?: BusinessScenarioId | 'all' | null;
  skillId?: string;
  agentId?: string;
  /** 案例地图 / 专家团的发现场景 id → 映射业务场景 */
  discoverScenarioId?: string;
}

export function inferTaskSource(meta: TaskCreateMeta): TaskSource {
  if (meta.taskSource) return meta.taskSource;
  if (meta.skillId) return 'skill';
  if (meta.agentId) return 'expert';
  if (meta.discoverScenarioId) return 'case_demo';
  return 'other';
}

export function inferBusinessScenarioId(meta: TaskCreateMeta): BusinessScenarioId | undefined {
  if (meta.businessScenarioId && meta.businessScenarioId !== 'all') {
    return meta.businessScenarioId;
  }
  if (meta.skillId) {
    const fromSkill = getSkillBusinessScenario(meta.skillId);
    if (fromSkill) return fromSkill;
  }
  if (meta.agentId) {
    const fromAgent = AGENT_TO_BUSINESS_SCENARIO[meta.agentId];
    if (fromAgent) return fromAgent;
  }
  if (meta.discoverScenarioId) {
    return getPrimaryBusinessScenario(meta.discoverScenarioId as DiscoverScenarioId) ?? undefined;
  }
  return undefined;
}

export function resolveTaskCreateMeta(meta: TaskCreateMeta = {}): {
  taskSource: TaskSource;
  businessScenarioId?: BusinessScenarioId;
  skillId?: string;
} {
  return {
    taskSource: inferTaskSource(meta),
    businessScenarioId: inferBusinessScenarioId(meta),
    skillId: meta.skillId,
  };
}
