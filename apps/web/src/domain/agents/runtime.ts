import type { PrototypeAgentSeed, PrototypeSkillSeed } from '@/domain/prototype/types';
import { PROTOTYPE_SKILLS } from '@/domain/prototype/skills';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { getAgentPack } from '@/domain/agents/catalog';
import { getSkillPack } from '@/domain/skills/catalog';
import { buildSkillDemoPrompt, getSkillById } from '@/domain/skillRuntime';

export function getPrimarySkill(agent: PrototypeAgentSeed): PrototypeSkillSeed | null {
  const pack = getAgentPack(agent.id);
  const primaryId = agent.primarySkillId || pack?.primarySkillId || agent.skillIds[0];
  return getSkillById(primaryId);
}

/** 专家中心「调用」默认演示任务：@专家 + 主 Skill 演示提示 */
export function buildAgentDemoPrompt(agent: PrototypeAgentSeed): string {
  if (agent.demoPrompt?.trim()) return agent.demoPrompt.trim();
  const pack = getAgentPack(agent.id);
  if (pack?.demoPrompt?.trim()) return pack.demoPrompt.trim();

  const primary = getPrimarySkill(agent);
  if (primary) {
    const skillPrompt = buildSkillDemoPrompt(primary);
    return `@${agent.name} ${skillPrompt}`;
  }
  return `@${agent.name} 请基于演示样例，按你的职责完成一次完整任务并给出结论与行动建议。`;
}

export function getAgentSystemPrompt(agent: PrototypeAgentSeed | null | undefined): string | undefined {
  if (!agent) return undefined;
  const pack = getAgentPack(agent.id);
  // 用户编辑过的 Persona 优先于种子 pack
  const text = (agent.systemPrompt || pack?.systemPrompt || '').trim();
  return text || undefined;
}

/** 多 Skill 编排计划：专家计划优先，否则主 Skill 计划 + 其余 Skill 挂载步骤 */
export function buildAgentOrchestrationSteps(
  agent: PrototypeAgentSeed | null | undefined,
  mountedSkill: PrototypeSkillSeed | null,
): string[] | null {
  if (!agent) return mountedSkill?.planSteps?.length ? [...mountedSkill.planSteps] : null;

  const pack = getAgentPack(agent.id);
  if (agent.planSteps?.length) return [...agent.planSteps];
  if (pack?.planSteps?.length) return [...pack.planSteps];

  const marketSkills = useMarketplaceStore.getState().skills;
  const resolveName = (id: string) =>
    marketSkills.find((s) => s.id === id)?.name ??
    PROTOTYPE_SKILLS.find((s) => s.id === id)?.name ??
    id;

  const steps: string[] = [];
  if (mountedSkill?.planSteps?.length) {
    steps.push(`【主 Skill · ${mountedSkill.name}】`);
    steps.push(...mountedSkill.planSteps);
  }
  for (const id of agent.skillIds) {
    if (mountedSkill && id === mountedSkill.id) continue;
    const sp = getSkillPack(id);
    steps.push(`编排挂载：${resolveName(id)}${sp ? `（${sp.planSteps[0] ?? ''}）` : ''}`);
  }
  return steps.length ? steps : null;
}

export function getAgentMockReport(agentId?: string | null): string | null {
  const pack = getAgentPack(agentId);
  return pack?.mockReport?.trim() || null;
}
