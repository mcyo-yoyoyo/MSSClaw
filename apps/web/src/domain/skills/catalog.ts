import type { RunnableSkillPack } from '@/domain/skills/types';
import { OFFICE_SKILL_PACKS } from '@/domain/skills/packs/office';
import { MANAGE_SKILL_PACKS } from '@/domain/skills/packs/manage';
import { PROCESS_SKILL_PACKS } from '@/domain/skills/packs/process';
import { EXPERIENCE_SKILL_PACKS } from '@/domain/skills/packs/experience';

const ALL_PACKS: RunnableSkillPack[] = [
  ...OFFICE_SKILL_PACKS,
  ...MANAGE_SKILL_PACKS,
  ...PROCESS_SKILL_PACKS,
  ...EXPERIENCE_SKILL_PACKS,
];

const PACK_BY_ID = new Map(ALL_PACKS.map((p) => [p.id, p]));

export function getAllSkillPacks(): RunnableSkillPack[] {
  return ALL_PACKS;
}

export function getSkillPack(skillId?: string | null): RunnableSkillPack | null {
  if (!skillId) return null;
  return PACK_BY_ID.get(skillId) ?? null;
}

export function getSkillPackByCommand(command?: string | null): RunnableSkillPack | null {
  if (!command?.trim()) return null;
  const cmd = command.trim();
  return ALL_PACKS.find((p) => {
    // demoPrompt 以 /command 开头
    return p.demoPrompt.startsWith(`${cmd} `) || p.demoPrompt === cmd;
  }) ?? null;
}
