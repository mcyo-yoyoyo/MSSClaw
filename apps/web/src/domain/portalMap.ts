import type { AppView } from '@/domain/appView';
import type {
  AssetVisibility,
  DeptId,
  OrgAffiliation,
  PortalAssetType,
  RegionId,
} from '@/domain/orgTaxonomy';
import {
  HQ_DEPTS,
  PORTAL_ASSET_TYPE_LABELS,
  REGIONS,
  getDeptLabel,
  getRegionLabel,
} from '@/domain/orgTaxonomy';
import type { PlatformRole } from '@/domain/rbac';
import { canViewAsset } from '@/domain/assetVisibility';
import type {
  PrototypeAgentSeed,
  PrototypeSkillSeed,
  PrototypeToolSeed,
} from '@/domain/prototype/types';
import {
  PORTAL_CONTENT_TYPE_LABELS,
  type PortalContentItem,
} from '@/domain/prototype/portalContent';

export type PortalShelfId = 'related' | 'mine' | 'latest';

export const PORTAL_SHELVES: { id: PortalShelfId; label: string; hint: string }[] = [
  { id: 'related', label: '与我相关', hint: '按登录人职能/区域推荐' },
  { id: 'mine', label: '我构建的', hint: '我发布或登记的资产' },
  { id: 'latest', label: '最新赋能', hint: '洞察 · 培训 · 讯息 · 新工具' },
];

export type PortalCardAction =
  | { type: 'agent'; agentId: string }
  | { type: 'skill'; skillId: string }
  | { type: 'tool'; toolId: string; homepageUrl?: string }
  | { type: 'external'; url: string }
  | { type: 'kb'; docId: string }
  | { type: 'case'; caseId: string }
  | { type: 'navigate'; view: AppView };

export interface PortalMapCard {
  id: string;
  kind: PortalAssetType;
  title: string;
  desc: string;
  icon: string;
  /** 可选品牌 Logo（业界 SaaS） */
  logoUrl?: string;
  kindLabel: string;
  meta?: string;
  publishedAt?: string;
  ownerDeptIds?: DeptId[];
  ownerRegionId?: RegionId | null;
  ownerRegionIds?: RegionId[];
  publisher?: string;
  publisherUserId?: string;
  visibility?: AssetVisibility;
  action: PortalCardAction;
}

function kindLabel(kind: PortalAssetType): string {
  if (kind === 'case' || kind === 'insight' || kind === 'training' || kind === 'news') {
    return PORTAL_CONTENT_TYPE_LABELS[kind];
  }
  return PORTAL_ASSET_TYPE_LABELS[kind] ?? kind;
}

function fromAgent(a: PrototypeAgentSeed): PortalMapCard {
  return {
    id: `agent:${a.id}`,
    kind: 'agent',
    title: a.name,
    desc: a.desc,
    icon: a.icon,
    kindLabel: kindLabel('agent'),
    meta: a.bizLine,
    ownerDeptIds: a.ownerDeptIds ?? [a.homeTag],
    ownerRegionId: a.ownerRegionIds?.[0] ?? null,
    ownerRegionIds: a.ownerRegionIds,
    publisher: a.publisher ?? a.author,
    publisherUserId: a.publisherUserId,
    visibility: a.visibility ?? 'public',
    action: { type: 'agent', agentId: a.id },
  };
}

function fromSkill(s: PrototypeSkillSeed): PortalMapCard {
  const external = s.sourceType === 'external';
  return {
    id: `skill:${s.id}`,
    kind: external ? 'external_tool' : 'skill',
    title: s.name,
    desc: s.desc,
    icon: s.icon,
    kindLabel: kindLabel(external ? 'external_tool' : 'skill'),
    meta: s.command,
    ownerDeptIds: s.ownerDeptIds,
    ownerRegionId: s.ownerRegionId ?? null,
    publisher: s.publisher ?? s.author,
    publisherUserId: s.publisherUserId,
    visibility: s.visibility ?? 'public',
    action:
      external && s.homepageUrl
        ? { type: 'external', url: s.homepageUrl }
        : { type: 'skill', skillId: s.id },
  };
}

function isAiSaasTool(t: PrototypeToolSeed): boolean {
  if (t.category === 'platform') return true;
  if (t.tags?.includes('ai-saas')) return true;
  return (t.scenarioTags ?? []).some((tag) =>
    ['编码助手', '通用对话', '长文研究', '企业协作'].includes(tag),
  );
}

function fromTool(t: PrototypeToolSeed): PortalMapCard {
  const external = t.sourceType === 'external';
  const aiSaas = isAiSaasTool(t);
  let action: PortalCardAction;
  if (aiSaas && t.homepageUrl) {
    action = { type: 'external', url: t.homepageUrl };
  } else if (external && !aiSaas) {
    // 区域自建外部工具：进 Tool 中心打开详情（可再点官网）
    action = { type: 'tool', toolId: t.id, homepageUrl: t.homepageUrl };
  } else {
    action = { type: 'tool', toolId: t.id, homepageUrl: t.homepageUrl };
  }

  return {
    id: `tool:${t.id}`,
    kind: external || aiSaas ? 'external_tool' : 'tool',
    title: t.name,
    desc: t.desc,
    icon: t.icon,
    logoUrl: t.logoUrl,
    kindLabel: kindLabel(external || aiSaas ? 'external_tool' : 'tool'),
    meta: t.scenarioTags?.[0] || t.publisher || t.author,
    ownerDeptIds: t.ownerDeptIds,
    ownerRegionId: t.ownerRegionId ?? null,
    publisher: t.publisher ?? t.author,
    publisherUserId: t.publisherUserId,
    visibility: t.visibility ?? 'public',
    action,
  };
}

function fromPortalContent(item: PortalContentItem): PortalMapCard {
  const caseKinds = new Set(['case', 'insight', 'training', 'news']);
  let action: PortalCardAction;

  if (caseKinds.has(item.type)) {
    action = { type: 'case', caseId: item.id };
  } else if (item.kbDocId) {
    action = { type: 'kb', docId: item.kbDocId };
  } else if (item.homepageUrl) {
    action = { type: 'external', url: item.homepageUrl };
  } else if (item.agentId) {
    action = { type: 'agent', agentId: item.agentId };
  } else if (item.skillId) {
    action = { type: 'skill', skillId: item.skillId };
  } else if (item.toolId) {
    action = { type: 'tool', toolId: item.toolId };
  } else {
    action = { type: 'navigate', view: 'ai-map' };
  }

  return {
    id: `portal:${item.id}`,
    kind: item.type,
    title: item.title,
    desc: item.desc,
    icon: item.icon,
    kindLabel: kindLabel(item.type),
    meta: item.scenarioTags?.slice(0, 2).join(' · '),
    publishedAt: item.publishedAt,
    ownerDeptIds: item.ownerDeptIds,
    ownerRegionId: item.ownerRegionId ?? null,
    publisher: item.publisher,
    publisherUserId: item.publisherUserId,
    visibility: item.visibility ?? 'public',
    action,
  };
}

function matchesAffiliation(card: PortalMapCard, aff: OrgAffiliation): boolean {
  const deptOk =
    !aff.deptIds.length ||
    !card.ownerDeptIds?.length ||
    card.ownerDeptIds.some((d) => aff.deptIds.includes(d));
  const regionOk = !aff.regionId || !card.ownerRegionId || card.ownerRegionId === aff.regionId;
  return deptOk && regionOk;
}

function isMine(card: PortalMapCard, userId: string, userName: string): boolean {
  if (userId && card.publisherUserId === userId) return true;
  if (userName && card.publisher === userName) return true;
  return false;
}

function matchesAxis(
  card: PortalMapCard,
  axis: 'dept' | 'region',
  deptId: DeptId,
  regionId: RegionId,
): boolean {
  if (axis === 'dept') {
    if (!card.ownerDeptIds?.length) return true;
    return card.ownerDeptIds.includes(deptId);
  }
  if (!card.ownerRegionId) return true;
  return card.ownerRegionId === regionId;
}

export interface BuildPortalCardsInput {
  agents: PrototypeAgentSeed[];
  skills: PrototypeSkillSeed[];
  tools: PrototypeToolSeed[];
  portalContent: PortalContentItem[];
  affiliation: OrgAffiliation;
  userId: string;
  userName: string;
  role?: PlatformRole;
  shelf: PortalShelfId;
  axis: 'dept' | 'region';
  deptId: DeptId;
  regionId: RegionId;
  limit?: number;
}

function visibleCards(
  cards: PortalMapCard[],
  affiliation: OrgAffiliation,
  userId: string,
  userName: string,
  role?: PlatformRole,
): PortalMapCard[] {
  return cards.filter((c) =>
    canViewAsset(c, { userId, userName, affiliation, role }),
  );
}

/** 组装首页门户货架卡片 */
export function buildPortalShelfCards(input: BuildPortalCardsInput): PortalMapCard[] {
  const {
    agents,
    skills,
    tools,
    portalContent,
    affiliation,
    userId,
    userName,
    role,
    shelf,
    axis,
    deptId,
    regionId,
    limit = 9,
  } = input;

  const contentCards = portalContent
    .filter((i) => i.published !== false)
    .map(fromPortalContent);
  const agentCards = agents.filter((a) => a.published).map(fromAgent);
  const skillCards = skills.filter((s) => s.published).map(fromSkill);
  const toolCards = tools.filter((t) => t.published).map(fromTool);

  let pool: PortalMapCard[] = [];

  if (shelf === 'related') {
    pool = [...contentCards, ...toolCards, ...skillCards, ...agentCards].filter((c) =>
      matchesAffiliation(c, affiliation),
    );
  } else if (shelf === 'mine') {
    pool = [...toolCards, ...skillCards, ...contentCards, ...agentCards].filter((c) =>
      isMine(c, userId, userName),
    );
  } else {
    pool = [
      ...contentCards,
      ...toolCards.filter((t) => t.kind === 'external_tool'),
    ].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
  }

  pool = visibleCards(pool, affiliation, userId, userName, role);

  if (shelf === 'related') {
    pool = pool.filter((c) => matchesAxis(c, axis, deptId, regionId));
  }

  const seen = new Set<string>();
  const unique = pool.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  return unique.slice(0, limit);
}

/** 场景化地图：按当前职能/区域混排能力与知识 */
export function buildScenarioMapCards(input: Omit<BuildPortalCardsInput, 'shelf' | 'limit'>): PortalMapCard[] {
  return buildPortalShelfCards({ ...input, shelf: 'related', limit: 6 });
}

export type AiMapTreeSelection =
  | { kind: 'related' }
  | { kind: 'mine' }
  | { kind: 'all' }
  | { kind: 'dept'; id: DeptId }
  | { kind: 'region'; id: RegionId }
  | { kind: 'type'; id: PortalAssetType }
  | { kind: 'tag'; tag: string };

export interface AiMapCatalogInput {
  agents: PrototypeAgentSeed[];
  skills: PrototypeSkillSeed[];
  tools: PrototypeToolSeed[];
  portalContent: PortalContentItem[];
  affiliation: OrgAffiliation;
  userId: string;
  userName: string;
  role?: PlatformRole;
  selection: AiMapTreeSelection;
  search: string;
}

/** 全量目录（Agent/Skill/Tool/门户内容） */
export function buildAiMapCatalog(input: {
  agents: PrototypeAgentSeed[];
  skills: PrototypeSkillSeed[];
  tools: PrototypeToolSeed[];
  portalContent: PortalContentItem[];
}): PortalMapCard[] {
  const contentCards = input.portalContent
    .filter((i) => i.published !== false)
    .map(fromPortalContent);
  const agentCards = input.agents.filter((a) => a.published).map(fromAgent);
  const skillCards = input.skills.filter((s) => s.published).map(fromSkill);
  const toolCards = input.tools.filter((t) => t.published).map(fromTool);
  const seen = new Set<string>();
  return [...contentCards, ...toolCards, ...skillCards, ...agentCards].filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

export function filterAiMapCards(input: AiMapCatalogInput): PortalMapCard[] {
  const catalog = buildAiMapCatalog(input);
  const q = input.search.trim().toLowerCase();
  const { selection, affiliation, userId, userName, role } = input;

  return catalog.filter((card) => {
    if (!canViewAsset(card, { userId, userName, affiliation, role })) return false;
    if (selection.kind === 'related' && !matchesAffiliation(card, affiliation)) return false;
    if (selection.kind === 'mine' && !isMine(card, userId, userName)) return false;
    if (selection.kind === 'dept') {
      if (card.ownerDeptIds?.length && !card.ownerDeptIds.includes(selection.id)) return false;
    }
    if (selection.kind === 'region') {
      if (card.ownerRegionId && card.ownerRegionId !== selection.id) return false;
      if (!card.ownerRegionId) return false;
    }
    if (selection.kind === 'type' && card.kind !== selection.id) return false;
    if (selection.kind === 'tag') {
      const hay = `${card.meta ?? ''} ${card.title} ${card.desc}`.toLowerCase();
      if (!hay.includes(selection.tag.toLowerCase())) return false;
    }
    if (q) {
      const blob = `${card.title} ${card.desc} ${card.meta ?? ''} ${card.publisher ?? ''} ${card.kindLabel}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

/** 从门户内容提取场景标签树 */
export function collectScenarioTags(portalContent: PortalContentItem[]): string[] {
  const tags = new Set<string>();
  portalContent
    .filter((i) => i.published !== false)
    .forEach((item) => {
      item.scenarioTags?.forEach((t) => tags.add(t));
    });
  return [...tags].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

// —— 场景地图：以业务场景为浏览单元 ——

export interface ScenarioDef {
  id: string;
  label: string;
  desc: string;
  icon: string;
  /** 任一命中即可归入该场景 */
  matchTags: string[];
}

/** 领导演示 / 场景案例固定场景包（与业务场景篮对齐；平台本身不作案例） */
export const FEATURED_SCENARIOS: ScenarioDef[] = [
  {
    id: 'price-offer-monitor',
    label: '商城价格&offer监测',
    desc: '多渠道商城价格与 offer 异动监测 · 区域工具联动',
    icon: 'fa-tags',
    matchTags: ['价格监测', 'offer', '价格', '价盘'],
  },
  {
    id: 'ecommerce-review',
    label: '电渠评论采集与分析',
    desc: '评分采集 → 语种翻译（中英）→ 评论分析三段式专家链路',
    icon: 'fa-comments',
    matchTags: ['评论分析', '评论', '电商'],
  },
  {
    id: 'l10n-translation',
    label: '小语种本地化翻译',
    desc: '小语种内容本地化翻译与质检提效',
    icon: 'fa-language',
    matchTags: ['翻译', '本地化', '小语种'],
  },
  {
    id: 'retail-training',
    label: '门店话术陪练与培训',
    desc: '门店培训内容、卖点陪练与考核反馈',
    icon: 'fa-handshake',
    matchTags: ['培训', '门店', 'Nova', '陪练'],
  },
  {
    id: 'customer-service',
    label: '客诉服务与一线话术',
    desc: '客诉 SOP 检索、话术推荐与满意度运营',
    icon: 'fa-headset',
    matchTags: ['客诉', '服务', '工单'],
  },
  {
    id: 'ops-analytics',
    label: '经营分析与 SO 报表',
    desc: '多源数据分析、代表处 SO/SI 排名与归因',
    icon: 'fa-chart-column',
    matchTags: ['数据分析', 'SO', '代表处', '经营'],
  },
  {
    id: 'fulfillment-settlement',
    label: '综履结算核验验收提效',
    desc: '综合履约结算核验、验收与对账提效',
    icon: 'fa-file-invoice-dollar',
    matchTags: ['综履', '结算', '核验', '验收', '合规'],
  },
  {
    id: 'knowledge-deposit',
    label: '组织及个人知识沉淀',
    desc: '组织与个人知识沉淀 · RAG 检索 · 文档归档',
    icon: 'fa-book-open',
    matchTags: ['知识', '归档', '指南', 'RAG'],
  },
  {
    id: 'hr-interview',
    label: '招聘人岗速评面试分析',
    desc: 'JD 解析 · 人岗匹配 · 面试分析协同',
    icon: 'fa-user-check',
    matchTags: ['招聘', 'HR', '面试', '简历', 'JD'],
  },
];

export interface ScenarioBundle {
  id: string;
  label: string;
  desc: string;
  icon: string;
  matchTags: string[];
  agents: PortalMapCard[];
  tools: PortalMapCard[];
  knowledge: PortalMapCard[];
  cases: PortalMapCard[];
  /** 与当前登录人职能/区域相关 */
  related: boolean;
  /** 四宫格已填充数 0–4 */
  completeness: number;
  ownerDeptIds: DeptId[];
  ownerRegionIds: RegionId[];
}

export type ScenarioListFilter = 'related' | 'all';

export interface OrgCoverageRow {
  axis: 'dept' | 'region';
  id: string;
  label: string;
  scenarioCount: number;
  assetCount: number;
  /** 缺任一象限的场景名 */
  gapLabels: string[];
  strength: 'strong' | 'partial' | 'empty';
}

function tagsHit(sourceTags: string[] | undefined, matchTags: string[]): boolean {
  if (!sourceTags?.length) return false;
  return matchTags.some((t) => sourceTags.includes(t));
}

function uniqCards(cards: PortalMapCard[]): PortalMapCard[] {
  const seen = new Set<string>();
  return cards.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

function collectOwnerAxes(cards: PortalMapCard[]): {
  ownerDeptIds: DeptId[];
  ownerRegionIds: RegionId[];
} {
  const depts = new Set<DeptId>();
  const regions = new Set<RegionId>();
  cards.forEach((c) => {
    c.ownerDeptIds?.forEach((d) => depts.add(d));
    if (c.ownerRegionId) regions.add(c.ownerRegionId);
    c.ownerRegionIds?.forEach((r) => regions.add(r));
  });
  return { ownerDeptIds: [...depts], ownerRegionIds: [...regions] };
}

export interface BuildScenarioBundlesInput {
  agents: PrototypeAgentSeed[];
  skills: PrototypeSkillSeed[];
  tools: PrototypeToolSeed[];
  portalContent: PortalContentItem[];
  affiliation: OrgAffiliation;
  userId: string;
  userName: string;
  role?: PlatformRole;
  filter?: ScenarioListFilter;
  search?: string;
  /** 职能筛选 */
  deptFilter?: DeptId | 'all';
  /** 区域筛选 */
  regionFilter?: RegionId | 'all';
  /** 提效场景：办公 / 管理 / 流程 */
  efficiencyFilter?: 'all' | 'office' | 'manage' | 'process';
}

/** 按场景标签聚合 Agent / Tool·Skill / 知识 / 案例 */
export function buildScenarioBundles(input: BuildScenarioBundlesInput): ScenarioBundle[] {
  const {
    agents,
    skills,
    tools,
    portalContent,
    affiliation,
    userId,
    userName,
    role,
    filter = 'related',
    search = '',
    deptFilter = 'all',
    regionFilter = 'all',
    efficiencyFilter = 'all',
  } = input;

  const publishedContent = portalContent.filter((i) => i.published !== false);
  const publishedAgents = agents.filter((a) => a.published);
  const publishedSkills = skills.filter((s) => s.published);
  const publishedTools = tools.filter((t) => t.published);

  // 仅展示固定业务场景，不再从内容标签自动扩场景
  const defs = FEATURED_SCENARIOS;
  const q = search.trim().toLowerCase();

  const bundles = defs.map((def): ScenarioBundle => {
    const linkedAgentIds = new Set<string>();
    const linkedSkillIds = new Set<string>();
    const linkedToolIds = new Set<string>();

    const matchedContent = publishedContent.filter((item) => {
      if (!tagsHit(item.scenarioTags, def.matchTags)) return false;
      if (item.agentId) linkedAgentIds.add(item.agentId);
      if (item.skillId) linkedSkillIds.add(item.skillId);
      if (item.toolId) linkedToolIds.add(item.toolId);
      return true;
    });

    let agentCards = publishedAgents
      .filter(
        (a) =>
          tagsHit(a.scenarioTags, def.matchTags) || linkedAgentIds.has(a.id),
      )
      .map(fromAgent);

    let skillCards = publishedSkills
      .filter(
        (s) =>
          tagsHit(s.scenarioTags, def.matchTags) ||
          tagsHit(s.tags, def.matchTags) ||
          linkedSkillIds.has(s.id),
      )
      .map(fromSkill);

    let toolCards = publishedTools
      .filter(
        (t) => tagsHit(t.scenarioTags, def.matchTags) || linkedToolIds.has(t.id),
      )
      .map(fromTool);

    if (efficiencyFilter !== 'all') {
      const effAgents = new Set(
        publishedAgents.filter((a) => a.category === efficiencyFilter).map((a) => `agent:${a.id}`),
      );
      const effSkills = new Set(
        publishedSkills.filter((s) => s.category === efficiencyFilter).map((s) => `skill:${s.id}`),
      );
      agentCards = agentCards.filter((c) => effAgents.has(c.id));
      skillCards = skillCards.filter((c) => effSkills.has(c.id));
    }

    const knowledgeFromPortal = matchedContent
      .filter((i) => i.kbDocId)
      .map((i) => ({
        ...fromPortalContent(i),
        kind: 'news' as const,
        kindLabel: '知识',
        action: { type: 'kb' as const, docId: i.kbDocId! },
        id: `kb-scene:${i.id}`,
      }));

    const knowledge = uniqCards(
      visibleCards(knowledgeFromPortal, affiliation, userId, userName, role),
    );
    const casesAll = uniqCards(
      visibleCards(
        matchedContent.map(fromPortalContent),
        affiliation,
        userId,
        userName,
        role,
      ),
    );

    const agentsVisible = uniqCards(
      visibleCards(agentCards, affiliation, userId, userName, role),
    );
    const toolsVisible = uniqCards(
      visibleCards([...toolCards, ...skillCards], affiliation, userId, userName, role),
    );

    const allCards = [...agentsVisible, ...toolsVisible, ...knowledge, ...casesAll];
    const axes = collectOwnerAxes(allCards);
    const related =
      !affiliation.deptIds.length && !affiliation.regionId
        ? true
        : allCards.some((c) => matchesAffiliation(c, affiliation)) ||
          axes.ownerDeptIds.some((d) => affiliation.deptIds.includes(d)) ||
          (!!affiliation.regionId && axes.ownerRegionIds.includes(affiliation.regionId));

    const completeness =
      (agentsVisible.length ? 1 : 0) +
      (toolsVisible.length ? 1 : 0) +
      (knowledge.length ? 1 : 0) +
      (casesAll.length ? 1 : 0);

    return {
      id: def.id,
      label: def.label,
      desc: def.desc,
      icon: def.icon,
      matchTags: def.matchTags,
      agents: agentsVisible,
      tools: toolsVisible,
      knowledge,
      cases: casesAll,
      related,
      completeness,
      ownerDeptIds: axes.ownerDeptIds,
      ownerRegionIds: axes.ownerRegionIds,
    };
  });

  return bundles
    .filter((b) => {
      if (filter === 'related' && !b.related) return false;
      if (deptFilter !== 'all' && b.ownerDeptIds.length > 0 && !b.ownerDeptIds.includes(deptFilter)) {
        return false;
      }
      if (
        regionFilter !== 'all' &&
        b.ownerRegionIds.length > 0 &&
        !b.ownerRegionIds.includes(regionFilter)
      ) {
        return false;
      }
      if (q) {
        const blob = `${b.label} ${b.desc} ${b.matchTags.join(' ')}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const ai = FEATURED_SCENARIOS.findIndex((f) => f.id === a.id);
      const bi = FEATURED_SCENARIOS.findIndex((f) => f.id === b.id);
      if (ai !== bi) return ai - bi;
      return b.completeness - a.completeness || a.label.localeCompare(b.label, 'zh-CN');
    });
}

/** 组织覆盖：机关 / 区域维度看场景包落地强度 */
export function buildOrgCoverage(bundles: ScenarioBundle[]): OrgCoverageRow[] {
  const rows: OrgCoverageRow[] = [];

  for (const d of HQ_DEPTS) {
    const hit = bundles.filter((b) => b.ownerDeptIds.includes(d.id));
    const assetCount = hit.reduce(
      (n, b) => n + b.agents.length + b.tools.length + b.knowledge.length + b.cases.length,
      0,
    );
    const gapLabels = hit.filter((b) => b.completeness < 4).map((b) => b.label);
    const strength: OrgCoverageRow['strength'] =
      hit.length === 0 ? 'empty' : gapLabels.length === 0 && hit.length >= 2 ? 'strong' : 'partial';
    rows.push({
      axis: 'dept',
      id: d.id,
      label: getDeptLabel(d.id),
      scenarioCount: hit.length,
      assetCount,
      gapLabels,
      strength,
    });
  }

  for (const r of REGIONS) {
    const hit = bundles.filter((b) => b.ownerRegionIds.includes(r.id));
    const assetCount = hit.reduce(
      (n, b) => n + b.agents.length + b.tools.length + b.knowledge.length + b.cases.length,
      0,
    );
    const gapLabels = hit.filter((b) => b.completeness < 4).map((b) => b.label);
    const strength: OrgCoverageRow['strength'] =
      hit.length === 0 ? 'empty' : gapLabels.length === 0 ? 'strong' : 'partial';
    rows.push({
      axis: 'region',
      id: r.id,
      label: getRegionLabel(r.id),
      scenarioCount: hit.length,
      assetCount,
      gapLabels,
      strength,
    });
  }

  return rows;
}
