import type { ScenarioBundle } from '@/domain/portalMap';
import { REVIEW_PIPELINE_STEPS } from '@/domain/reviewPipeline';
import type { PrototypeAgentSeed, PrototypeSkillSeed } from '@/domain/prototype/types';
import { buildAgentDemoPrompt } from '@/domain/agents/runtime';
import { buildSkillDemoPrompt } from '@/domain/skillRuntime';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { resolveScenarioDemoTarget } from '@/domain/portalCase';

/** 场景专家团单步 */
export interface ScenarioPipelineStep {
  agentId: string;
  skillId?: string;
  label: string;
  command?: string;
  blurb: string;
}

export type ScenarioDemoMode = 'solo' | 'team';

export interface ScenarioDemoPlan {
  mode: ScenarioDemoMode;
  scenarioId: string;
  scenarioLabel: string;
  /** 专家团步骤（mode=team） */
  steps: ScenarioPipelineStep[];
  /** 单点目标（mode=solo） */
  soloAgent?: PrototypeAgentSeed;
  soloSkill?: PrototypeSkillSeed;
  label: string;
}

/**
 * 显式专家团定义：≥2 个 Agent 的顺序链路。
 * 未列出的场景按「单点金牌能力」回落。
 */
export const SCENARIO_TEAM_PIPELINES: Record<string, ScenarioPipelineStep[]> = {
  'ecommerce-review': REVIEW_PIPELINE_STEPS.map((s) => ({ ...s })),
  'retail-training': [
    {
      agentId: 'agent-training',
      skillId: 'skill-training-gen',
      label: '培训内容',
      command: '/培训内容',
      blurb: '生成门店培训脚本与课件要点',
    },
    {
      agentId: 'agent-retail-coach',
      skillId: 'skill-retail-coach',
      label: '零售陪练',
      command: '/陪练',
      blurb: '卖点演练、考核反馈与话术纠偏',
    },
  ],
  // hr-interview 等：单 Agent 多 Skill → 走单点打样，不进专家团
};

export function getScenarioTeamPipeline(scenarioId: string): ScenarioPipelineStep[] | null {
  const steps = SCENARIO_TEAM_PIPELINES[scenarioId];
  return steps && steps.length >= 2 ? steps : null;
}

/** 解析场景打样计划：有专家团定义 → team；否则 → 单点金牌 Skill/Agent */
export function resolveScenarioDemoPlan(bundle: ScenarioBundle): ScenarioDemoPlan | null {
  const team = getScenarioTeamPipeline(bundle.id);
  if (team) {
    return {
      mode: 'team',
      scenarioId: bundle.id,
      scenarioLabel: bundle.label,
      steps: team,
      label: bundle.label,
    };
  }

  const target = resolveScenarioDemoTarget(bundle);
  if (!target) return null;

  return {
    mode: 'solo',
    scenarioId: bundle.id,
    scenarioLabel: bundle.label,
    steps: [],
    soloAgent: target.agent,
    soloSkill: target.skill,
    label: target.label,
  };
}

/** 解析专家团某一步可调用的 Agent / Skill */
export function resolvePipelineStepTargets(step: ScenarioPipelineStep): {
  agent?: PrototypeAgentSeed;
  skill?: PrototypeSkillSeed;
} {
  const market = useMarketplaceStore.getState();
  const agent = market.agents.find((a) => a.id === step.agentId && a.published);
  const skill = step.skillId
    ? market.skills.find((s) => s.id === step.skillId && s.published)
    : undefined;
  return { agent, skill };
}

/** 构建专家团某一步的同会话接力提示（可附带上一步输出） */
export function buildExpertTeamStepPrompt(
  plan: Pick<ScenarioDemoPlan, 'scenarioLabel' | 'steps'>,
  stepIndex: number,
  previousOutput?: string,
): string {
  const step = plan.steps[stepIndex];
  if (!step) return '';
  const total = plan.steps.length;
  const prefix = `【专家团 ${stepIndex + 1}/${total} · ${plan.scenarioLabel} · ${step.label}】`;
  const { agent, skill } = resolvePipelineStepTargets(step);
  const body = skill
    ? buildSkillDemoPrompt(skill)
    : agent
      ? buildAgentDemoPrompt(agent)
      : step.blurb;

  if (stepIndex > 0 && previousOutput?.trim()) {
    const prevLabel = plan.steps[stepIndex - 1]?.label ?? '上一步';
    const summary = previousOutput.trim().slice(0, 1800);
    return `${prefix}\n以下为上一步「${prevLabel}」输出，请在此基础上继续：\n---\n${summary}\n---\n\n${body}`;
  }
  return `${prefix}\n${body}`;
}
