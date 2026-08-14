/**
 * 1.0 P0：一句话找能力（规则 + 标签匹配 MVP，可后续接 RAG）
 * 输入诉求 → 跨外/内/MSS 货架卡片打分 → 返回推荐理由
 */

import {
  MARKET_SHELF_META,
  type MarketShelfCard,
  type MarketShelfKind,
} from '@/domain/marketShelf';

export type IntentMatch = {
  card: MarketShelfCard;
  score: number;
  reason: string;
};

/** 常见作业意图 → 关键词（运营后续可配置化） */
const INTENT_LEXICON: { intent: string; keywords: string[] }[] = [
  { intent: '做PPT/汇报材料', keywords: ['ppt', '幻灯', '演示', '汇报', '路演', 'gamma', '美化稿'] },
  { intent: '竞品/行业分析', keywords: ['竞品', '行业', '调研', '分析', '市场研究', '对标'] },
  { intent: '写报告/方案', keywords: ['报告', '方案', '总结', '周报', '纪要', '写作', '润色'] },
  { intent: '翻译/多语言', keywords: ['翻译', '英文', '多语言', 'localize', '译'] },
  { intent: '信息搜索/查制度', keywords: ['搜索', '检索', '查制度', '资料', '知识', '问答', 'w3'] },
  { intent: '价格监控', keywords: ['价格', '价监', '比价', 'pricing', '报价'] },
  { intent: '客诉/评论', keywords: ['客诉', '评论', '舆情', '差评', 'voice', 'voc'] },
  { intent: '数据处理', keywords: ['数据', '表格', 'excel', '清洗', '统计'] },
  { intent: '会议纪要', keywords: ['会议', '纪要', '录音', '转写', 'minutes'] },
  { intent: '创意/营销', keywords: ['创意', '营销', '文案', '海报', '推广', 'campaign'] },
  { intent: '培训/辅导', keywords: ['培训', '辅导', '教练', '演练', '学习'] },
  { intent: '人事/招聘', keywords: ['人事', '招聘', 'hr', '简历'] },
];

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[，。！？、；：""''（）()【】\[\]\s]+/g, ' ')
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length >= 1);
}

function haystackOf(card: MarketShelfCard): string {
  return [
    card.title,
    card.description,
    card.outcomeHint ?? '',
    card.productName ?? '',
    ...(card.sceneTags ?? []),
    ...card.badges.map((b) => b.label),
    card.kind,
    MARKET_SHELF_META[card.kind].label,
    card.securityLevel ?? '',
  ]
    .join(' ')
    .toLowerCase();
}

function matchedIntents(tokens: string[], raw: string): string[] {
  const hits: string[] = [];
  for (const row of INTENT_LEXICON) {
    if (row.keywords.some((k) => raw.includes(k) || tokens.some((t) => t.includes(k) || k.includes(t)))) {
      hits.push(row.intent);
    }
  }
  return hits;
}

function scoreCard(
  card: MarketShelfCard,
  tokens: string[],
  _raw: string,
  intents: string[],
): { score: number; reason: string } | null {
  const hay = haystackOf(card);
  let score = 0;
  const hits: string[] = [];

  for (const t of tokens) {
    if (t.length < 2) continue;
    if (card.title.toLowerCase().includes(t)) {
      score += 12;
      hits.push(`标题含「${t}」`);
    } else if (hay.includes(t)) {
      score += 5;
      hits.push(`简介/标签含「${t}」`);
    }
  }

  for (const intent of intents) {
    const lex = INTENT_LEXICON.find((x) => x.intent === intent);
    if (!lex) continue;
    const kwHit = lex.keywords.filter((k) => hay.includes(k));
    if (kwHit.length) {
      score += 8 + kwHit.length * 2;
      hits.push(`适合「${intent}」`);
    }
  }

  if (card.featured) score += 3;
  if (card.heat > 20) score += 2;

  if (score <= 0) return null;

  const kindLabel = MARKET_SHELF_META[card.kind].shortLabel;
  const reason =
    hits.slice(0, 2).join(' · ') ||
    `与诉求相关（${kindLabel}）`;

  return { score, reason };
}

export function searchCapabilitiesByIntent(
  query: string,
  cards: MarketShelfCard[],
  limit = 8,
): IntentMatch[] {
  const raw = query.trim().toLowerCase();
  if (!raw) return [];
  const tokens = tokenize(raw);
  const intents = matchedIntents(tokens, raw);

  const scored: IntentMatch[] = [];
  for (const card of cards) {
    const r = scoreCard(card, tokens, raw, intents);
    if (!r) continue;
    scored.push({ card, score: r.score, reason: r.reason });
  }

  scored.sort((a, b) => b.score - a.score || b.card.heat - a.card.heat);
  return scored.slice(0, limit);
}

export function intentSearchHintExamples(): string[] {
  return [
    '我要做一份竞品分析',
    '帮我快速出 PPT',
    '查一下公司制度',
    '翻译客户英文邮件',
    '监控友商价格',
  ];
}

export function shelfKindLabel(kind: MarketShelfKind): string {
  return MARKET_SHELF_META[kind].label;
}
