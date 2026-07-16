import {
  SCENARIO_PUBLISHED_AT,
  isDiscoverScenarioId,
} from '@/domain/scenarioCapabilities';

/** 推荐专家 · 运营打标 New（演示种子） */
export const NEW_AGENT_IDS = [
  'agent-price-monitor',
  'agent-launch-sentiment',
  'agent-hr-resume',
  'agent-retail-coach',
  'agent-data-analysis',
] as const;

const NEW_AGENT_SET = new Set<string>(NEW_AGENT_IDS);

/** 场景发布后多少天内视为 New */
const SCENARIO_NEW_WINDOW_DAYS = 5;

export function isNewAgent(agentId: string): boolean {
  return NEW_AGENT_SET.has(agentId);
}

export function isNewScenario(scenarioId: string, now = new Date()): boolean {
  if (!isDiscoverScenarioId(scenarioId)) return false;
  const published = new Date(`${SCENARIO_PUBLISHED_AT[scenarioId]}T00:00:00`);
  if (Number.isNaN(published.getTime())) return false;
  const days = (now.getTime() - published.getTime()) / (24 * 60 * 60 * 1000);
  return days >= 0 && days <= SCENARIO_NEW_WINDOW_DAYS;
}
