/**
 * AI 项目 · How to 材料包
 * 将原「学习 / 准备 / 开干」三层收敛为条目级快速上手列表。
 */

import { PORTAL_CONTENT_TYPE_LABELS, type PortalContentItem } from '@/domain/prototype/portalContent';
import type { PlazaToolGuide } from '@/domain/plazaToolGuides';
import {
  buildJourneySummary,
  type JourneySummaryBlock,
} from '@/domain/scenarioShowcase';
import type { ScenarioBundle } from '@/domain/portalMap';
import { getScenarioEnv } from '@/domain/scenarioEnv';

function previewKindToGuideType(
  kind: NonNullable<PortalContentItem['previewFile']>['kind'],
): PlazaToolGuide['type'] {
  if (kind === 'pdf') return 'pdf';
  if (kind === 'pptx') return 'ppt';
  if (kind === 'image') return 'image';
  return 'link';
}

function journeyToGuides(
  scenarioId: string,
  blocks: JourneySummaryBlock[],
): PlazaToolGuide[] {
  return blocks.map((b) => ({
    id: `howto-journey-${scenarioId}-${b.id}`,
    title: b.title,
    type: 'text' as const,
    url: '#',
    blurb: `${b.label} · ${b.hint}`,
    body: b.bullets.map((line) => `• ${line}`).join('\n'),
  }));
}

function itemToGuide(item: PortalContentItem): PlazaToolGuide {
  const typeLabel = PORTAL_CONTENT_TYPE_LABELS[item.type] ?? item.type;
  if (item.previewFile?.dataUrl) {
    return {
      id: `howto-item-${item.id}`,
      title: item.title,
      type: previewKindToGuideType(item.previewFile.kind),
      url: item.previewFile.dataUrl,
      fileName: item.previewFile.name,
      blurb: `${typeLabel} · ${item.desc}`,
      body: item.steps?.length ? item.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') : undefined,
    };
  }
  if (item.homepageUrl && item.homepageUrl !== '#') {
    return {
      id: `howto-item-${item.id}`,
      title: item.title,
      type: 'link',
      url: item.homepageUrl,
      blurb: `${typeLabel} · ${item.desc}`,
    };
  }
  const bodyParts: string[] = [];
  if (item.desc) bodyParts.push(item.desc);
  if (item.painPoint) bodyParts.push(`痛点：${item.painPoint}`);
  if (item.impactMetric) bodyParts.push(`成效：${item.impactMetric}`);
  if (item.steps?.length) {
    bodyParts.push('', '步骤：', ...item.steps.map((s, i) => `${i + 1}. ${s}`));
  }
  return {
    id: `howto-item-${item.id}`,
    title: item.title,
    type: 'text',
    url: '#',
    blurb: typeLabel,
    body: bodyParts.join('\n') || '材料建设中',
  };
}

/**
 * 构建项目 How to：旅程三章（学/备/开干合一叙事）+ 门户材料条目
 */
export function buildProjectHowtoGuides(input: {
  scenarioId: string;
  label: string;
  items: PortalContentItem[];
  bundle?: Pick<
    ScenarioBundle,
    'label' | 'layers' | 'agents' | 'skills' | 'tools' | 'env'
  > | null;
}): PlazaToolGuide[] {
  const env = input.bundle?.env ?? getScenarioEnv(input.scenarioId) ?? null;
  const journey = buildJourneySummary({
    label: input.bundle?.label ?? input.label,
    layers: input.bundle?.layers ?? {
      thought: input.items.length > 0,
      toolkit: Boolean(env),
      capability: Boolean(
        (input.bundle?.agents.length ?? 0) +
          (input.bundle?.skills.length ?? 0) +
          (input.bundle?.tools.length ?? 0),
      ),
    },
    agents: input.bundle?.agents ?? [],
    skills: input.bundle?.skills ?? [],
    tools: input.bundle?.tools ?? [],
    env,
    items: input.items,
  });

  const guides = [
    ...journeyToGuides(input.scenarioId, journey),
    ...input.items.map(itemToGuide),
  ];
  return guides;
}
