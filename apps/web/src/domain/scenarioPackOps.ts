import { FEATURED_SCENARIOS, type ScenarioDef } from '@/domain/portalMap';
import {
  PORTAL_CONTENT_TYPE_LABELS,
  type PortalContentItem,
} from '@/domain/prototype/portalContent';
import { showcaseTabOf, type ShowcaseTabId } from '@/domain/scenarioShowcase';

/** 运营侧三槽：与用户学习层 Tab 一一对应，由不同负责人维护 */
export type ScenarioPackSlotId = ShowcaseTabId;

export const SCENARIO_PACK_SLOTS: {
  id: ScenarioPackSlotId;
  /** 新建时写入的 type */
  createType: 'news' | 'case' | 'training';
  label: string;
  ownerHint: string;
  blurb: string;
}[] = [
  {
    id: 'insight',
    createType: 'news',
    label: '前沿洞察',
    ownerHint: '洞察负责人',
    blurb: '行业观点 · 方案材料 · PPT',
  },
  {
    id: 'case',
    createType: 'case',
    label: '场景案例',
    ownerHint: '案例负责人',
    blurb: '可打样样板 · 挂 Skill/Agent',
  },
  {
    id: 'training',
    createType: 'training',
    label: '培训课件',
    ownerHint: '课件负责人',
    blurb: '培训材料 · 授课外链',
  },
];

export function slotOfItem(item: PortalContentItem): ScenarioPackSlotId {
  return showcaseTabOf(item.type);
}

export function itemMatchesScenario(
  item: PortalContentItem,
  def: ScenarioDef,
): boolean {
  return (item.scenarioTags ?? []).some((t) => def.matchTags.includes(t));
}

export type ScenarioPackSlot = {
  id: ScenarioPackSlotId;
  label: string;
  ownerHint: string;
  blurb: string;
  createType: 'news' | 'case' | 'training';
  items: PortalContentItem[];
  publishedCount: number;
};

export type ScenarioContentPack = {
  scenario: ScenarioDef;
  /** 建议写入新建内容的首个标签 */
  primaryTag: string;
  slots: Record<ScenarioPackSlotId, ScenarioPackSlot>;
  totalItems: number;
  filledSlots: number;
  complete: boolean;
};

export function buildScenarioContentPacks(
  items: PortalContentItem[],
): ScenarioContentPack[] {
  return FEATURED_SCENARIOS.map((scenario) => {
    const matched = items.filter((item) => itemMatchesScenario(item, scenario));
    const slots = Object.fromEntries(
      SCENARIO_PACK_SLOTS.map((meta) => {
        const slotItems = matched.filter((i) => slotOfItem(i) === meta.id);
        return [
          meta.id,
          {
            id: meta.id,
            label: meta.label,
            ownerHint: meta.ownerHint,
            blurb: meta.blurb,
            createType: meta.createType,
            items: slotItems,
            publishedCount: slotItems.filter((i) => i.published !== false).length,
          } satisfies ScenarioPackSlot,
        ];
      }),
    ) as Record<ScenarioPackSlotId, ScenarioPackSlot>;

    const filledSlots = SCENARIO_PACK_SLOTS.filter((s) => slots[s.id].items.length > 0)
      .length;

    return {
      scenario,
      primaryTag: scenario.matchTags[0] ?? scenario.label,
      slots,
      totalItems: matched.length,
      filledSlots,
      complete: filledSlots >= SCENARIO_PACK_SLOTS.length,
    };
  });
}

/** 场景标签未命中任何 featured 场景的内容 */
export function listOrphanPortalItems(items: PortalContentItem[]): PortalContentItem[] {
  return items.filter(
    (item) => !FEATURED_SCENARIOS.some((def) => itemMatchesScenario(item, def)),
  );
}

export function packCompletenessLabel(pack: ScenarioContentPack): string {
  return `${pack.filledSlots}/${SCENARIO_PACK_SLOTS.length} 槽`;
}

export function typeLabel(type: PortalContentItem['type']): string {
  return PORTAL_CONTENT_TYPE_LABELS[type] ?? type;
}
