import type { PortalContentItem } from '@/domain/prototype/portalContent';
import { PORTAL_CONTENT_TYPE_LABELS } from '@/domain/prototype/portalContent';
import type { PortalMapCard, ScenarioBundle } from '@/domain/portalMap';
import { toCaseOutcomeCard, type CaseOutcomeCard } from '@/domain/portalCase';
import {
  SCENARIO_JOURNEY_COPY,
  type ScenarioEnv,
} from '@/domain/scenarioEnv';
import { getDeptLabel, getRegionLabel } from '@/domain/orgTaxonomy';

/** 样板间弹窗横向 Tab（学习内容三态） */
export type ShowcaseTabId = 'insight' | 'case' | 'training';

export const SHOWCASE_TABS: { id: ShowcaseTabId; label: string }[] = [
  { id: 'insight', label: '前沿洞察' },
  { id: 'case', label: '场景案例' },
  { id: 'training', label: '培训课件' },
];

export function showcaseTabOf(type: PortalContentItem['type'] | string): ShowcaseTabId {
  if (type === 'training') return 'training';
  if (type === 'case') return 'case';
  // news / insight / playbook → 前沿洞察（方案材料并入洞察预览）
  return 'insight';
}

export function filterCardsByShowcaseTab(
  cards: PortalMapCard[],
  tab: ShowcaseTabId | 'all',
): PortalMapCard[] {
  if (tab === 'all') return cards;
  return cards.filter((c) => showcaseTabOf(c.kind) === tab);
}

export function groupItemsByShowcaseTab(
  items: PortalContentItem[],
): Record<ShowcaseTabId, PortalContentItem[]> {
  const out: Record<ShowcaseTabId, PortalContentItem[]> = {
    insight: [],
    case: [],
    training: [],
  };
  for (const item of items) {
    out[showcaseTabOf(item.type)].push(item);
  }
  return out;
}

export function outcomeAudience(item: PortalContentItem): string {
  const tags = (item.scenarioTags ?? []).filter(Boolean);
  if (tags.length) return `对象：${tags.slice(0, 4).join('、')}`;
  return '对象：业务用户与相关职能同事';
}

export function enrichOutcomeMeta(card: CaseOutcomeCard, item?: PortalContentItem | null): CaseOutcomeCard & {
  audience: string;
} {
  return {
    ...card,
    audience: item ? outcomeAudience(item) : '对象：业务用户与相关职能同事',
  };
}

export interface JourneySummaryBlock {
  id: 'learn' | 'prepare' | 'run';
  label: string;
  title: string;
  bullets: string[];
  hint: string;
}

/** 从真实上架内容 + 准备环境提炼学/准备/开干概要 */
export function buildJourneySummary(
  bundle: Pick<ScenarioBundle, 'label' | 'layers' | 'agents' | 'skills' | 'tools' | 'env'> & {
    items: PortalContentItem[];
  },
): JourneySummaryBlock[] {
  const grouped = groupItemsByShowcaseTab(bundle.items);
  const learnBits: string[] = [];
  for (const tab of SHOWCASE_TABS) {
    const list = grouped[tab.id];
    if (!list.length) continue;
    const head = list[0]!;
    learnBits.push(
      `${tab.label}「${head.title}」${list.length > 1 ? `等 ${list.length} 份` : ''}：${trimText(head.desc, 42)}`,
    );
  }
  if (!learnBits.length) {
    learnBits.push('本场景学习材料建设中，可先浏览样板间其他层或稍后回来。');
  }

  const env = bundle.env;
  const prepareBits = summarizeEnv(env);
  const runBits: string[] = [];
  if (bundle.skills.length) {
    runBits.push(
      `技能：${bundle.skills
        .slice(0, 3)
        .map((s) => s.title)
        .join('、')}${bundle.skills.length > 3 ? '…' : ''}`,
    );
  }
  if (bundle.agents.length) {
    runBits.push(
      `专家：${bundle.agents
        .slice(0, 2)
        .map((a) => a.title)
        .join('、')}${bundle.agents.length > 2 ? '…' : ''}`,
    );
  }
  if (bundle.tools.length) {
    runBits.push(`工具对照 ${bundle.tools.length} 项（详情见准备/开干层）`);
  }
  if (!runBits.length) {
    runBits.push('开干能力挂载中；齐套后可用顶栏「一键打样」在线跑任务。');
  }

  return [
    {
      id: 'learn',
      label: SCENARIO_JOURNEY_COPY.learnBadge,
      title: '学习 · 先看洞察 / 案例 / 课件',
      bullets: learnBits.slice(0, 3),
      hint: bundle.layers.thought ? '已有可预览材料' : '学习层待建设',
    },
    {
      id: 'prepare',
      label: SCENARIO_JOURNEY_COPY.layerBadge,
      title: '准备 · 体外条件清单',
      bullets: prepareBits,
      hint: bundle.layers.toolkit ? '已有准备参照' : '准备清单待补充',
    },
    {
      id: 'run',
      label: SCENARIO_JOURNEY_COPY.runBadge,
      title: '开干 · 在线一键打样',
      bullets: runBits.slice(0, 3),
      hint: bundle.layers.capability ? '可一键打样' : '开干能力待挂载',
    },
  ];
}

function summarizeEnv(env?: ScenarioEnv | null): string[] {
  if (!env) return ['暂无硬件 / Coding / 模型参照，可下载学习包后体外配置。'];
  const bits: string[] = [];
  if (env.hardware?.trim()) bits.push(`硬件：${trimText(env.hardware, 36)}`);
  const coding = (env.codingTools ?? []).map((t) => t.name).filter(Boolean);
  if (coding.length) bits.push(`AI Coding：${coding.slice(0, 3).join('、')}`);
  const models = [...(env.cloudModels ?? []), ...(env.localModels ?? [])].map((m) => m.name);
  if (models.length) bits.push(`模型：${models.slice(0, 3).join('、')}`);
  if (!bits.length) return ['暂无硬件 / Coding / 模型参照，可下载学习包后体外配置。'];
  return bits;
}

function trimText(s: string, n: number): string {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export function applicableFromItem(item: PortalContentItem): string {
  const depts =
    (item.ownerDeptIds ?? []).map(getDeptLabel).filter(Boolean).join('、') || '相关职能';
  const region = item.ownerRegionId ? ` · ${getRegionLabel(item.ownerRegionId)}` : '';
  return `适用范围：${depts}${region}`;
}

export function itemToShowcaseCard(item: PortalContentItem): CaseOutcomeCard & { audience: string } {
  const base = toCaseOutcomeCard(item, PORTAL_CONTENT_TYPE_LABELS[item.type]);
  return enrichOutcomeMeta(
    { ...base, applicable: applicableFromItem(item) },
    item,
  );
}
