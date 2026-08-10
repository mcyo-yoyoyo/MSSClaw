/**
 * Agent Hub 精选推荐：点击卡片时的案例材料预览（演示预置）
 * 使用 SVG 幻灯片模拟方案/案例文档在线预览效果。
 */

import type { PortalContentItem, PortalCasePreviewFile } from '@/domain/prototype/portalContent';
import { FEATURED_SCENARIOS } from '@/domain/portalMap';

/** Agent Hub 默认精选三场景（无运营置顶时优先露出） */
export const AGENT_HUB_FEATURED_SCENARIO_IDS = [
  'price-offer-monitor',
  'ecommerce-review',
  'l10n-translation',
] as const;

type PresetDeck = {
  scenarioId: string;
  slides: {
    title: string;
    subtitle: string;
    bullets: string[];
    metric?: string;
    footer?: string;
  }[];
};

const DECKS: PresetDeck[] = [
  {
    scenarioId: 'price-offer-monitor',
    slides: [
      {
        title: '商城价格 & Offer 监测',
        subtitle: '金案例材料 · 拉美价盘异动闭环',
        bullets: [
          '覆盖 18 国多渠道价盘与 Offer 抽样',
          '异动清单自动聚合，异常价一键下钻',
          '周报模板对齐 GTM / 渠道双视角',
        ],
        metric: '异动闭环 2 天 → 4 小时 · 周报工时 −70%',
        footer: '案例材料预览 · MSS Agent Hub',
      },
      {
        title: '打样三步走',
        subtitle: '价格监测金牌 Skill 演示路径',
        bullets: [
          '① 打开本案例并挂载「价格监测」Skill',
          '② 选定国家 / 渠道，生成异动清单',
          '③ 导出周报并同步 WeLink 值班群',
        ],
        footer: '可下载学习包（MVP）；标准方案起可在线打样',
      },
    ],
  },
  {
    scenarioId: 'ecommerce-review',
    slides: [
      {
        title: '电渠评论采集与分析',
        subtitle: '金案例材料 · 采集 → 翻译 → 洞察',
        bullets: [
          'Amazon / Lazada 购买页评论抽样采集',
          '多语种统一译为中英对照，保留原文',
          '情感判断 · 卖点 GAP · 分角色建议',
        ],
        metric: '评论洞察从周级人工 → 日级自动产出',
        footer: '案例材料预览 · MSS Agent Hub',
      },
      {
        title: '三段式专家链路',
        subtitle: '评分采集 / 语种翻译 / 订单评论分析',
        bullets: [
          '① 调用「评分采集」拿到干净样本',
          '② 「评论翻译」输出中英对照稿',
          '③ 「订单评论分析」生成 VoC 报告',
        ],
        footer: '适合电商 / 服务 / MKT 联合评审',
      },
    ],
  },
  {
    scenarioId: 'l10n-translation',
    slides: [
      {
        title: '小语种本地化翻译',
        subtitle: '金案例材料 · 质检与术语一致性',
        bullets: [
          '阿语 / 法语等卖点卡批量本地化',
          '术语库约束 + 中英对照质检清单',
          '输出可直接进设计的本地化文案包',
        ],
        metric: '本地化返工率明显下降 · 交付周期缩短',
        footer: '案例材料预览 · MSS Agent Hub',
      },
      {
        title: '质检清单示例',
        subtitle: '上线前必过的 4 道关',
        bullets: [
          '品牌词 / 规格数字不可翻译错误',
          '禁译清单与敏感词自动高亮',
          '对照原文抽检 10% + 人工终审签字',
          '导出双语对照表归档至知识库',
        ],
        footer: '配置技能页可查看完整正文与计划',
      },
    ],
  },
];

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSlideSvg(slide: PresetDeck['slides'][number], index: number, total: number): string {
  const bullets = slide.bullets
    .map(
      (b, i) => `
      <g transform="translate(64 ${292 + i * 48})">
        <circle cx="10" cy="10" r="5" fill="#0EA5E9"/>
        <text x="28" y="15" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="20" fill="#3F3F46">${escapeXml(b)}</text>
      </g>`,
    )
    .join('');
  const metricBlock = slide.metric
    ? `
    <rect x="64" y="520" width="832" height="56" rx="14" fill="#F0F9FF" stroke="#BAE6FD"/>
    <text x="88" y="555" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="20" font-weight="600" fill="#0369A1">${escapeXml(slide.metric)}</text>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F8FAFC"/>
      <stop offset="100%" stop-color="#EFF6FF"/>
    </linearGradient>
  </defs>
  <rect width="960" height="640" fill="url(#bg)"/>
  <rect x="0" y="0" width="12" height="640" fill="#0284C7"/>
  <text x="64" y="72" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="14" font-weight="700" letter-spacing="2" fill="#0284C7">AGENT HUB · CASE PREVIEW</text>
  <text x="64" y="128" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="36" font-weight="700" fill="#0F172A">${escapeXml(slide.title)}</text>
  <text x="64" y="172" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="18" fill="#64748B">${escapeXml(slide.subtitle)}</text>
  <line x1="64" y1="204" x2="320" y2="204" stroke="#7DD3FC" stroke-width="3"/>
  ${bullets}
  ${metricBlock}
  <text x="64" y="610" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="14" fill="#94A3B8">${escapeXml(slide.footer || 'MSS 工具集市')}</text>
  <text x="880" y="610" text-anchor="end" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="14" fill="#94A3B8">${index + 1} / ${total}</text>
</svg>`;
}

function svgToPreviewFile(name: string, svg: string): PortalCasePreviewFile {
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return {
    name,
    mimeType: 'image/svg+xml',
    size: svg.length,
    kind: 'image',
    dataUrl,
  };
}

function deckToItems(deck: PresetDeck): PortalContentItem[] {
  const def = FEATURED_SCENARIOS.find((s) => s.id === deck.scenarioId);
  return deck.slides.map((slide, i) => {
    const file = svgToPreviewFile(
      `${deck.scenarioId}-preview-${i + 1}.svg`,
      buildSlideSvg(slide, i, deck.slides.length),
    );
    return {
      id: `agent-hub-preset-${deck.scenarioId}-${i + 1}`,
      type: i === 0 ? 'playbook' : 'case',
      title: slide.title,
      desc: slide.subtitle,
      icon: def?.icon || 'fa-file-lines',
      publishedAt: '2026-08-06',
      publisher: 'MSS Agent Hub',
      published: true,
      isGold: i === 0,
      scenarioTags: def?.matchTags ?? [],
      painPoint: slide.bullets[0],
      impactMetric: slide.metric,
      steps: slide.bullets.slice(0, 3),
      previewFile: file,
      layoutPreviewFile: file,
    } satisfies PortalContentItem;
  });
}

const PRESET_BY_SCENARIO = new Map(
  DECKS.map((d) => [d.scenarioId, deckToItems(d)] as const),
);

export function getAgentHubPresetItems(scenarioId: string): PortalContentItem[] {
  return PRESET_BY_SCENARIO.get(scenarioId) ?? [];
}

/** 真实材料无预览时，注入预置案例材料；已有预览则前置预置封面增强演示 */
export function withAgentHubCasePreview(
  scenarioId: string,
  items: PortalContentItem[],
): PortalContentItem[] {
  const presets = getAgentHubPresetItems(scenarioId);
  if (!presets.length) return items;
  const hasRealPreview = items.some(
    (i) =>
      Boolean(i.layoutPreviewFile?.dataUrl || i.layoutPreviewFile?.url) ||
      Boolean(i.previewFile?.dataUrl || i.previewFile?.url),
  );
  if (!hasRealPreview) return [...presets, ...items];
  // 已有真实附件时仍把预置封面放最前，保证精选点击即见设计感预览
  return [...presets, ...items];
}

/** 精选推荐优先露出预置三场景（无运营 pin 时） */
export function preferAgentHubFeaturedOrder<T extends { id: string; featured?: boolean }>(
  cards: T[],
): T[] {
  const preferred = AGENT_HUB_FEATURED_SCENARIO_IDS as readonly string[];
  const byId = new Map(cards.map((c) => [c.id, c]));
  const head = preferred.map((id) => byId.get(id)).filter(Boolean) as T[];
  if (head.length < 2) return cards;
  const headIds = new Set(head.map((c) => c.id));
  const rest = cards.filter((c) => !headIds.has(c.id));
  return [
    ...head.map((c) => ({ ...c, featured: true })),
    ...rest.map((c) => ({ ...c, featured: false })),
  ];
}
