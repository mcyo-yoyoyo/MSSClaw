import type {
  PortalCasePreviewFile,
  PortalContentItem,
} from '@/domain/prototype/portalContent';
import { FEATURED_SCENARIOS, type PortalMapCard, type ScenarioBundle } from '@/domain/portalMap';
import { getDeptLabel, getRegionLabel } from '@/domain/orgTaxonomy';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import type { PrototypeAgentSeed, PrototypeSkillSeed } from '@/domain/prototype/types';
import { isSkillRunnable } from '@/domain/skillRuntime';

/** 样板间成效卡（总裁演示用结构化字段） */
export interface CaseOutcomeCard {
  id: string;
  title: string;
  desc: string;
  type: PortalContentItem['type'];
  typeLabel: string;
  painPoint: string;
  impactMetric: string;
  steps: string[];
  applicable: string;
  skillId?: string;
  agentId?: string;
  toolId?: string;
  kbDocId?: string;
  homepageUrl?: string;
  isGold: boolean;
  scenarioTags: string[];
  publisher?: string;
  publishedAt?: string;
  previewFile?: PortalCasePreviewFile | null;
  layoutPreviewFile?: PortalCasePreviewFile | null;
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
    type: item.type,
    typeLabel,
    painPoint: pain,
    impactMetric: metric,
    steps,
    applicable: `适用：${depts}${region}`,
    skillId: item.primarySkillId || item.skillId,
    agentId: item.agentId,
    toolId: item.toolId,
    kbDocId: item.kbDocId,
    homepageUrl: item.homepageUrl,
    isGold: Boolean(item.isGold),
    scenarioTags: item.scenarioTags ?? [],
    publisher: item.publisher,
    publishedAt: item.publishedAt,
    previewFile: item.previewFile ?? null,
    layoutPreviewFile: item.layoutPreviewFile ?? null,
  };
}

export function getPortalItemById(id: string): PortalContentItem | null {
  return usePortalContentStore.getState().items.find((i) => i.id === id) ?? null;
}

export function outcomeFromNarrativeCard(card: PortalMapCard): CaseOutcomeCard | null {
  if (card.action.type !== 'case') {
    const kind =
      card.kind === 'insight' ||
      card.kind === 'training' ||
      card.kind === 'news' ||
      card.kind === 'playbook' ||
      card.kind === 'case'
        ? card.kind
        : 'case';
    return toCaseOutcomeCard(
      {
        id: card.id,
        type: kind,
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
  return sortThoughtLayerItems(related);
}

function scoreScenarioCaseItem(item: PortalContentItem): number {
  const typeScore =
    item.type === 'playbook'
      ? 5
      : item.type === 'case'
        ? 4
        : item.type === 'training'
          ? 3
          : item.type === 'news' || item.type === 'insight'
            ? 2
            : 0;
  return (item.isGold ? 6 : 0) + typeScore;
}

/** 学习包排序：场景方案 > 培训 > 洞察 > 可打样案例 */
export function sortThoughtLayerItems(items: PortalContentItem[]): PortalContentItem[] {
  const rank = (t: PortalContentItem['type']) =>
    t === 'playbook' ? 4 : t === 'training' ? 3 : t === 'news' || t === 'insight' ? 2 : t === 'case' ? 1 : 0;
  return [...items].sort(
    (a, b) =>
      rank(b.type) - rank(a.type) ||
      Number(Boolean(b.isGold)) - Number(Boolean(a.isGold)) ||
      (b.publishedAt || '').localeCompare(a.publishedAt || ''),
  );
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

/** 门户内容 → 命中的业务场景（用于运营「前端预览」深链） */
export function resolveScenarioIdForPortalItem(
  item: Pick<PortalContentItem, 'scenarioTags'>,
): string | null {
  const tags = item.scenarioTags ?? [];
  if (!tags.length) return null;
  const hit = FEATURED_SCENARIOS.find((s) => tags.some((t) => s.matchTags.includes(t)));
  return hit?.id ?? null;
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
  const gold =
    related.find((i) => i.isGold && i.type === 'case') ??
    related.find((i) => i.type === 'case' && (i.primarySkillId || i.skillId || i.agentId)) ??
    related.find((i) => i.isGold) ??
    related[0];

  if (gold) {
    const { skillId, agentId } = resolveInvokeIds(gold);
    if (skillId) {
      const skill = market.skills.find((s) => s.id === skillId && isSkillRunnable(s));
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

  const skillAction = bundle.skills[0]?.action;
  if (skillAction?.type === 'skill') {
    const skill = market.skills.find(
      (s) => s.id === skillAction.skillId && isSkillRunnable(s),
    );
    if (skill) return { skill, label: bundle.label };
  }
  if (skillAction?.type === 'agent') {
    const agent = market.agents.find((a) => a.id === skillAction.agentId);
    if (agent) return { agent, label: bundle.label };
  }

  return null;
}
