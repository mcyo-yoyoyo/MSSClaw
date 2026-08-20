export const AGENT_HUB_SEARCH_HINTS = ['洞察', 'VOC', '内容生成'] as const;

export type AgentHubSearchDocument = {
  title: string;
  description: string;
};

const VOC_KEYWORDS = [
  'voc',
  'voice of customer',
  '客户之声',
  '用户反馈',
  '客户反馈',
  '用户问卷',
  '问卷',
  '订单评论',
  '用户评论',
  '客户评论',
  '评论',
  '客诉',
  '舆情',
] as const;

function normalize(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

function queryKeywords(query: string): string[] {
  const normalized = normalize(query);
  if (!normalized) return [];
  if (normalized === 'voc') return [...VOC_KEYWORDS];

  return normalized
    .split(/[\s，。！？、；：,!?;:()[\]{}【】]+/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

/** Agent Hub 仅按用户可见的标题与描述做关键词 OR 匹配。 */
export function matchesAgentHubSearch(
  document: AgentHubSearchDocument,
  query: string,
): boolean {
  const keywords = queryKeywords(query).map(normalize);
  if (!keywords.length) return true;

  const haystack = normalize(`${document.title} ${document.description}`);
  return keywords.some((keyword) => haystack.includes(keyword));
}
