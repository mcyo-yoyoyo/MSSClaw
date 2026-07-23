import type {
  PortalCasePreviewFile,
  PortalContentItem,
} from '@/domain/prototype/portalContent';
import { FEATURED_SCENARIOS, type PortalMapCard, type ScenarioBundle } from '@/domain/portalMap';
import { getDeptLabel, getRegionLabel } from '@/domain/orgTaxonomy';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import type { PrototypeAgentSeed, PrototypeSkillSeed } from '@/domain/prototype/types';

/** 样板间成效卡（总裁演示用结构化字段） */
export interface CaseOutcomeCard {
  id: string;
  title: string;
  desc: string;
  typeLabel: string;
  painPoint: string;
  impactMetric: string;
  steps: string[];
  applicable: string;
  skillId?: string;
  agentId?: string;
  toolId?: string;
  kbDocId?: string;
  isGold: boolean;
  scenarioTags: string[];
  publisher?: string;
  publishedAt?: string;
  previewFile?: PortalCasePreviewFile | null;
}

export function resolveInvokeIds(item: PortalContentItem): {
  skillId?: string;
  agentId?: string;
} {
  return {
    skillId: item.primarySkillId || item.skillId,
    agentId: item.agentId,
  };
}

export function toCaseOutcomeCard(
  item: PortalContentItem,
  typeLabel = '场景案例',
): CaseOutcomeCard {
  const pain =
    item.painPoint?.trim() ||
    `业务痛点：${item.desc.slice(0, 80)}${item.desc.length > 80 ? '…' : ''}`;
  const metric = item.impactMetric?.trim() || '提效效果：见演示样例指标';
  const steps =
    item.steps?.length === 3
      ? item.steps
      : item.steps?.length
        ? item.steps.slice(0, 5)
        : ['在案例样板间打开本案例', '点击「一键打样」或「按此案例打样」', '在任务中心确认计划并查看交付物'];
  const depts =
    (item.ownerDeptIds ?? []).map(getDeptLabel).filter(Boolean).join('、') || '相关职能';
  const region = item.ownerRegionId ? ` · ${getRegionLabel(item.ownerRegionId)}` : '';
  return {
    id: item.id,
    title: item.title,
    desc: item.desc,
    typeLabel,
    painPoint: pain,
    impactMetric: metric,
    steps,
    applicable: `适用：${depts}${region}`,
    skillId: item.primarySkillId || item.skillId,
    agentId: item.agentId,
    toolId: item.toolId,
    kbDocId: item.kbDocId,
    isGold: Boolean(item.isGold),
    scenarioTags: item.scenarioTags ?? [],
    publisher: item.publisher,
    publishedAt: item.publishedAt,
    previewFile: item.previewFile ?? null,
  };
}

export function getPortalItemById(id: string): PortalContentItem | null {
  return usePortalContentStore.getState().items.find((i) => i.id === id) ?? null;
}

export function outcomeFromNarrativeCard(card: PortalMapCard): CaseOutcomeCard | null {
  if (card.action.type !== 'case') {
    return toCaseOutcomeCard(
      {
        id: card.id,
        type: card.kind === 'insight' || card.kind === 'training' || card.kind === 'news' ? card.kind : 'case',
        title: card.title,
        desc: card.desc,
        icon: card.icon,
        publishedAt: card.publishedAt ?? '',
        publisher: card.publisher,
        scenarioTags: [],
      },
      card.kindLabel,
    );
  }
  const item = getPortalItemById(card.action.caseId);
  if (!item) {
    return toCaseOutcomeCard(
      {
        id: card.action.caseId,
        type: 'case',
        title: card.title,
        desc: card.desc,
        icon: card.icon,
        publishedAt: card.publishedAt ?? '',
        publisher: card.publisher,
      },
      card.kindLabel,
    );
  }
  return toCaseOutcomeCard(item, card.kindLabel);
}

/** 场景关联的门户内容（优先金案例靠前） */
export function resolveScenarioCaseItems(bundle: ScenarioBundle): PortalContentItem[] {
  const portal = usePortalContentStore.getState().getPublishedItems();
  const caseIds = bundle.cases
    .filter((c) => c.action.type === 'case')
    .map((c) => (c.action.type === 'case' ? c.action.caseId : ''))
    .filter(Boolean);
  const related = portal.filter((i) => caseIds.includes(i.id));
  return [...related].sort((a, b) => Number(Boolean(b.isGold)) - Number(Boolean(a.isGold)));
}

function scoreScenarioCaseItem(item: PortalContentItem): number {
  return (item.isGold ? 4 : 0) + (item.type === 'case' ? 2 : 0) + (item.type === 'training' ? 1 : 0);
}

/** 首页橱窗下载：场景标签命中的全部门户内容（金案例优先） */
export function resolveCaseItemsForScenarioId(scenarioId: string): PortalContentItem[] {
  const portal = usePortalContentStore.getState().getPublishedItems();
  const def = FEATURED_SCENARIOS.find((s) => s.id === scenarioId);
  if (!def) return [];
  const matched = portal.filter((item) =>
    (item.scenarioTags ?? []).some((t) => def.matchTags.includes(t)),
  );
  return [...matched].sort((a, b) => scoreScenarioCaseItem(b) - scoreScenarioCaseItem(a));
}

/** 首页橱窗点击：取场景下优先打开的案例（金案例 > type=case > 其余） */
export function resolvePrimaryCaseIdForScenario(scenarioId: string): string | null {
  return resolveCaseItemsForScenarioId(scenarioId)[0]?.id ?? null;
}

/** 场景「一键打样」：优先金牌案例的主 Skill / Agent */
export function resolveScenarioDemoTarget(bundle: ScenarioBundle): {
  skill?: PrototypeSkillSeed;
  agent?: PrototypeAgentSeed;
  label: string;
} | null {
  const market = useMarketplaceStore.getState();
  const portal = usePortalContentStore.getState().getPublishedItems();
  const caseIds = bundle.cases
    .filter((c) => c.action.type === 'case')
    .map((c) => (c.action.type === 'case' ? c.action.caseId : ''));
  const related = portal.filter((i) => caseIds.includes(i.id));
  const gold = related.find((i) => i.isGold) ?? related[0];

  if (gold) {
    const { skillId, agentId } = resolveInvokeIds(gold);
    if (skillId) {
      const skill = market.skills.find((s) => s.id === skillId);
      if (skill) return { skill, label: gold.title };
    }
    if (agentId) {
      const agent = market.agents.find((a) => a.id === agentId);
      if (agent) return { agent, label: gold.title };
    }
  }

  const agentAction = bundle.agents[0]?.action;
  if (agentAction?.type === 'agent') {
    const agent = market.agents.find((a) => a.id === agentAction.agentId);
    if (agent) return { agent, label: bundle.label };
  }

  const toolAction = bundle.tools[0]?.action;
  if (toolAction?.type === 'skill') {
    const skill = market.skills.find((s) => s.id === toolAction.skillId);
    if (skill) return { skill, label: bundle.label };
  }
  if (toolAction?.type === 'agent') {
    const agent = market.agents.find((a) => a.id === toolAction.agentId);
    if (agent) return { agent, label: bundle.label };
  }

  return null;
}
