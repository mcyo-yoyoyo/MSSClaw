export type SearchableInternalOfficeScene = {
  id: string;
  label: string;
  english: string;
  description: string;
  tools: Array<{
    id: string;
    name: string;
    blurb: string;
  }>;
};

export type SearchableInternalOfficeCatalogTool = {
  id: string;
  name?: string;
  desc?: string;
  cardSummary?: string;
  productIntro?: string;
  bestFor?: string;
  tags?: readonly string[];
  coreCapabilities?: readonly string[];
  usageGuide?: readonly string[];
};

export const INTERNAL_OFFICE_SEARCH_HINTS = [
  '周报、方案、工作总结',
  '会后自动成稿',
  '查制度、找内部资料',
  '日常提问、总结、润色',
  '读懂文档提炼观点',
  '专项业务连续追问',
] as const;

const SEARCH_SEPARATORS = /[\s,，、。.!！?？;；:：/\\|()（）\[\]【】{}“”"'‘’_-]+/gu;

const INTERNAL_INTENT_RULES: ReadonlyArray<{
  sceneIds: readonly string[];
  aliases: readonly string[];
}> = [
  {
    sceneIds: ['capture'],
    aliases: ['会后', '会议', '纪要', '录音', '转写', '自动成稿'],
  },
  {
    sceneIds: ['read'],
    aliases: ['读懂文档', '文档解读', '阅读文档', '提炼观点', '观点提炼', '文档解析', '读报告'],
  },
  {
    sceneIds: ['write'],
    aliases: ['周报', '日报', '月报', '工作总结', '写总结', '写方案', '方案', '润色', '写作'],
  },
  {
    sceneIds: ['ask'],
    aliases: ['日常提问', '日常问答', '提问', '问答', '问一下', '任务处理'],
  },
  {
    sceneIds: ['search'],
    aliases: ['查制度', '找制度', '制度', '内部资料', '找资料', '信息查找', '信息检索', '智能搜索'],
  },
  {
    sceneIds: ['knowledge'],
    aliases: ['内部资料', '找资料', '知识库', '知识问答', '资料沉淀'],
  },
  {
    sceneIds: ['specialist'],
    aliases: ['专项业务', '专项问答', '连续追问', '业务追问', '小鲁班'],
  },
  {
    sceneIds: ['intel'],
    aliases: ['资讯追踪', '信息追踪', '情报', '主题监测', '信息研判'],
  },
  {
    sceneIds: ['agent'],
    aliases: ['多技能', '自动执行', '任务执行', '智能体', 'agent'],
  },
];

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(SEARCH_SEPARATORS, '');
}

function queryTerms(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(SEARCH_SEPARATORS)
        .map(normalizeSearchText)
        .filter(Boolean),
    ),
  ];
}

function catalogSearchText(tool: SearchableInternalOfficeCatalogTool | undefined): string[] {
  if (!tool) return [];
  return [
    tool.name ?? '',
    tool.desc ?? '',
    tool.cardSummary ?? '',
    tool.productIntro ?? '',
    tool.bestFor ?? '',
    ...(tool.tags ?? []),
    ...(tool.coreCapabilities ?? []),
    ...(tool.usageGuide ?? []),
  ];
}

/**
 * 内部办公场景搜索：
 * 1. 标点分段后按任一有效诉求匹配，避免推荐短语被当成完整字段；
 * 2. 搜索场景、绑定工具及工具详情全文；
 * 3. 对自然语言诉求补充稳定场景意图，覆盖“会后自动成稿”等非字面表达。
 */
export function filterInternalOfficeScenesBySearch<
  TScene extends SearchableInternalOfficeScene,
>(
  scenes: readonly TScene[],
  query: string,
  catalogTools: readonly SearchableInternalOfficeCatalogTool[] = [],
): TScene[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [...scenes];

  const terms = queryTerms(query);
  const catalogById = new Map(catalogTools.map((tool) => [tool.id, tool]));

  return scenes.filter((scene) => {
    const haystack = normalizeSearchText(
      [
        scene.id,
        scene.label,
        scene.description,
        scene.english,
        ...scene.tools.flatMap((tool) => [
          tool.name,
          tool.blurb,
          ...catalogSearchText(catalogById.get(tool.id)),
        ]),
      ].join(' '),
    );
    if (terms.some((term) => haystack.includes(term))) return true;

    return INTERNAL_INTENT_RULES.some(
      (rule) =>
        rule.sceneIds.includes(scene.id) &&
        rule.aliases.some((alias) => normalizedQuery.includes(normalizeSearchText(alias))),
    );
  });
}
