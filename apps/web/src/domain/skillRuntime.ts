import type { PrototypeSkillSeed } from '@/domain/prototype/types';
import { PROTOTYPE_SKILLS } from '@/domain/prototype/skills';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { getSkillPack } from '@/domain/skills/catalog';
import {
  ORDER_REVIEW_SKILL_ID,
  buildOrderReviewDemoPrompt,
} from '@/domain/skills/orderReviewSkill';

export {
  ORDER_REVIEW_PLAN_STEPS,
  ORDER_REVIEW_SKILL_ID,
  ORDER_REVIEW_SKILL_INSTRUCTIONS,
  buildOrderReviewDemoPrompt,
} from '@/domain/skills/orderReviewSkill';

export function getSkillById(skillId?: string | null): PrototypeSkillSeed | null {
  if (!skillId) return null;
  const fromMarket = useMarketplaceStore.getState().skills.find((s) => s.id === skillId);
  if (fromMarket) return fromMarket;
  return PROTOTYPE_SKILLS.find((s) => s.id === skillId) ?? null;
}

/** 从用户消息解析 slash 技能（如 /评论分析） */
export function resolveSkillFromText(text: string): PrototypeSkillSeed | null {
  const market = useMarketplaceStore.getState();
  const published = typeof market.getPublishedSkills === 'function' ? market.getPublishedSkills() : [];
  const skills = published.length ? published : PROTOTYPE_SKILLS.filter((s) => s.published);
  const trimmed = text.trim();
  const sorted = [...skills].sort((a, b) => b.command.length - a.command.length);
  for (const skill of sorted) {
    const cmd = skill.command.trim();
    if (!cmd) continue;
    if (trimmed === cmd || trimmed.startsWith(`${cmd} `) || trimmed.includes(` ${cmd} `)) {
      return skill;
    }
  }
  return null;
}

export function getSkillPlanSteps(skill: PrototypeSkillSeed | null): string[] | null {
  if (!skill) return null;
  const pack = getSkillPack(skill.id);
  if (pack?.planSteps?.length) return [...pack.planSteps];
  if (skill.planSteps?.length) return [...skill.planSteps];
  return null;
}

/** 技能页「调用」时使用的演示提示词 */
export function buildSkillDemoPrompt(skill: PrototypeSkillSeed): string {
  const pack = getSkillPack(skill.id);
  if (pack?.demoPrompt?.trim()) return pack.demoPrompt.trim();
  if (skill.id === ORDER_REVIEW_SKILL_ID || skill.command === '/评论分析') {
    return buildOrderReviewDemoPrompt(skill.command);
  }
  return `${skill.command} `;
}

export function buildSystemPromptWithSkill(
  agentSystemPrompt: string | undefined,
  skill: PrototypeSkillSeed | null,
): string | undefined {
  const parts: string[] = [];
  if (agentSystemPrompt?.trim()) parts.push(agentSystemPrompt.trim());
  const pack = skill ? getSkillPack(skill.id) : null;
  const body = (pack?.instructions ?? skill?.instructions)?.trim();
  if (body && skill) {
    parts.push(`## 当前挂载 Skill：${skill.name}（${skill.command}）\n\n${body}`);
  }
  return parts.length ? parts.join('\n\n') : undefined;
}
