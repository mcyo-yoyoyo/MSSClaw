import type { RunnableAgentPack } from '@/domain/agents/types';
import { AGENT_PACKS } from '@/domain/agents/packs';

const BY_ID = new Map(AGENT_PACKS.map((p) => [p.id, p]));

export function getAllAgentPacks(): RunnableAgentPack[] {
  return AGENT_PACKS;
}

export function getAgentPack(agentId?: string | null): RunnableAgentPack | null {
  if (!agentId) return null;
  return BY_ID.get(agentId) ?? null;
}
