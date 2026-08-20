import type {
  PrototypeAgentSeed,
  PrototypeSkillSeed,
} from '@/domain/prototype/types';

export type HomeProjectDetailTarget =
  | { kind: 'skill'; item: PrototypeSkillSeed }
  | { kind: 'agent'; item: PrototypeAgentSeed };

/** Resolve an AI Hub card to the detail modal that should open on the home page. */
export function resolveHomeProjectDetailTarget(
  cardId: string,
  skills: readonly PrototypeSkillSeed[],
  agents: readonly PrototypeAgentSeed[],
): HomeProjectDetailTarget | null {
  const skill = skills.find((item) => item.id === cardId);
  if (skill) return { kind: 'skill', item: skill };

  const agent = agents.find((item) => item.id === cardId);
  if (agent) return { kind: 'agent', item: agent };

  return null;
}
