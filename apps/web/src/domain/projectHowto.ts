/**
 * AI 项目 · How to 材料包
 * 收敛为门户材料条目列表（与文档画廊一致），不再注入学/备/开干旅程三章。
 */

import { PORTAL_CONTENT_TYPE_LABELS, type PortalContentItem } from '@/domain/prototype/portalContent';
import type { PlazaToolGuide } from '@/domain/plazaToolGuides';
import type { ScenarioBundle } from '@/domain/portalMap';

function previewKindToGuideType(
  kind: NonNullable<PortalContentItem['previewFile']>['kind'],
): PlazaToolGuide['type'] {
  if (kind === 'pdf') return 'pdf';
  if (kind === 'pptx') return 'ppt';
  if (kind === 'image') return 'image';
  if (kind === 'video') return 'video';
  return 'link';
}

function itemToGuide(item: PortalContentItem): PlazaToolGuide {
  const typeLabel = PORTAL_CONTENT_TYPE_LABELS[item.type] ?? item.type;
  const online = item.layoutPreviewFile?.dataUrl || item.layoutPreviewFile?.url
    ? item.layoutPreviewFile
    : item.previewFile?.dataUrl || item.previewFile?.url
      ? item.previewFile
      : null;
  if (online) {
    return {
      id: `howto-item-${item.id}`,
      title: item.title,
      type: previewKindToGuideType(online.kind),
      url: online.dataUrl || online.url || '#',
      fileName: online.name,
      blurb: `${typeLabel} · ${item.desc}`,
      body: item.steps?.length
        ? item.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')
        : undefined,
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

/** 构建项目 How to：仅门户材料条目（与画廊同源） */
export function buildProjectHowtoGuides(input: {
  scenarioId: string;
  label: string;
  items: PortalContentItem[];
  bundle?: Pick<
    ScenarioBundle,
    'label' | 'layers' | 'agents' | 'skills' | 'tools' | 'env'
  > | null;
}): PlazaToolGuide[] {
  void input.scenarioId;
  void input.label;
  void input.bundle;
  return input.items.map(itemToGuide);
}
