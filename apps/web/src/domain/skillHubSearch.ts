export const SKILL_HUB_SEARCH_HINTS = [
  '信息洞察',
  '隐私合规',
  '工作总结',
  'VOC',
] as const;

export const SKILL_BODY_SUMMARY_LIMIT = 800;

export type SkillHubSearchDocument = {
  title: string;
  description: string;
  instructions?: string;
};

type QuickHintRule = {
  allFields: readonly string[];
  /** 避免正文中泛化提醒造成误命中。 */
  titleOrDescriptionOnly?: readonly string[];
};

const QUICK_HINT_RULES: Record<string, QuickHintRule> = {
  '信息洞察': { allFields: ['信息洞察', '洞察'] },
  '隐私合规': {
    allFields: ['隐私合规', '隐私', '个人信息', '敏感信息', 'pii', '数据脱敏'],
    titleOrDescriptionOnly: ['合规'],
  },
  '工作总结': { allFields: ['工作总结'] },
  voc: { allFields: ['voc', 'voice of customer', '客户之声', '用户反馈', '评论'] },
};

function normalize(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

function queryKeywords(query: string): string[] {
  const normalized = normalize(query);
  if (!normalized) return [];

  return normalized
    .split(/[，。！？、；：,!?;:()[\]{}【】]+/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

/** Skill 详情页的「正文摘要」口径：只展示并检索前 800 字。 */
export function skillBodySummary(instructions?: string): string {
  return (instructions ?? '').slice(0, SKILL_BODY_SUMMARY_LIMIT);
}

/**
 * Skill Hub 关键词检索只使用用户可见的三块内容：
 * 标题、描述、Skill 正文摘要。快捷词可扩展为同义关键词，其他输入按原词检索。
 */
export function matchesSkillHubSearch(
  document: SkillHubSearchDocument,
  query: string,
): boolean {
  const normalizedQuery = normalize(query);
  const keywords = queryKeywords(normalizedQuery);
  if (!keywords.length) return true;

  const titleAndDescription = normalize([document.title, document.description].join(' '));
  const bodySummary = normalize(skillBodySummary(document.instructions));
  const haystack = `${titleAndDescription} ${bodySummary}`.trim();
  const quickRule = QUICK_HINT_RULES[normalizedQuery];
  if (quickRule) {
    return (
      quickRule.allFields.map(normalize).some((keyword) => haystack.includes(keyword)) ||
      (quickRule.titleOrDescriptionOnly ?? [])
        .map(normalize)
        .some((keyword) => titleAndDescription.includes(keyword))
    );
  }
  return keywords.some((keyword) => haystack.includes(keyword));
}
