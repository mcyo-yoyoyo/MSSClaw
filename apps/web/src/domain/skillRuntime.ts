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

/**
 * Skill 运行开关。旧数据没有 callable 时沿用 published，避免存量能力突然不可用。
 * published 是运行前提，callable 是新数据的独立运行开关。
 */
export function isSkillCallable(
  skill: Pick<PrototypeSkillSeed, 'published' | 'callable'>,
): boolean {
  return Boolean(
    skill.published &&
      (typeof skill.callable === 'boolean' ? skill.callable : true),
  );
}

/** 在线执行至少需要 Skill 正文或可解析的 slash command。 */
export function hasSkillExecutionBody(
  skill: Pick<PrototypeSkillSeed, 'instructions' | 'command'>,
): boolean {
  return Boolean(skill.instructions?.trim() || skill.command?.trim());
}

/** 业务端统一的 Skill 可执行判定。 */
export function isSkillRunnable(
  skill: Pick<PrototypeSkillSeed, 'published' | 'callable' | 'instructions' | 'command'>,
): boolean {
  return isSkillCallable(skill) && hasSkillExecutionBody(skill);
}

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
  const skills = (published.length ? published : PROTOTYPE_SKILLS.filter((s) => s.published))
    .filter(isSkillRunnable);
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
