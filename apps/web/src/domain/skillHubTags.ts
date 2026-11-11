/**
 * SkillHub 标签体系 V5。
 * 主标签、次标签都只从受控词表选取。本地识别只接受明确命中；对不上就标待复核，不猜测。
 * 四字聚类只用于分组展示和筛选，不写入检索词。
 */

export const SKILL_HUB_TAG_VERSION = 5 as const;

export type SkillHubTagStatus = 'ok' | 'needs_review' | 'needs_role' | 'unspecified';

export interface SkillHubTagAudit {
  at: string;
  by: string;
  summary: string;
}

export interface SkillHubTags {
  version: typeof SKILL_HUB_TAG_VERSION;
  roles: string[];
  roleStatus: SkillHubTagStatus;
  capabilities: string[];
  capabilityStatus: SkillHubTagStatus;
  purposes: string[];
  purposeStatus: SkillHubTagStatus;
  formats: string[];
  formatStatus: SkillHubTagStatus;
  entities: string[];
  regions: string[];
  source: 'auto' | 'human';
  audits: SkillHubTagAudit[];
}

export interface SkillHubTermGroup {
  group: string;
  terms: readonly string[];
}

export const SKILL_ROLE_GROUPS: readonly SkillHubTermGroup[] = [
  { group: 'GTM', terms: ['GTM专员', 'GTM策略', '上市经理'] },
  { group: 'MKT', terms: ['品牌专员', '营销策划', '媒介专员', '市场研究员', 'AI产品经理'] },
  { group: '电商', terms: ['电商运营', '品类运营', '直播运营'] },
  { group: '服务', terms: ['客户成功', '售后专员', '服务运营'] },
  { group: '渠道', terms: ['渠道经理', '渠道运营'] },
  { group: '零售', terms: ['零售运营', '门店运营'] },
  { group: 'HR', terms: ['HRBP', 'COE专员', '招聘专员', '培训专员', '人才发展', '组织发展'] },
  { group: '质量运营', terms: ['质检专员', '质量工程师', '质量运营', 'PMO'] },
];

export const SKILL_CAPABILITY_GROUPS: readonly SkillHubTermGroup[] = [
  { group: '分析研判', terms: ['趋势研判', '竞品对比', '参数比对', '舆情挖掘', '价格分析'] },
  { group: '数据处理', terms: ['数据清洗', '数据校验', '指标计算', '信息汇总', '文本提取'] },
  { group: '洞察挖掘', terms: ['用户画像', '需求挖掘', '客户分群', '趋势分析'] },
  { group: '测算统计', terms: ['市场测算', '指标报表', '价格矩阵'] },
  { group: '内容生成', terms: ['卖点拆解', '内容生成'] },
  { group: '清单整理', terms: ['参数清单', '需求盘点', '舆情汇总'] },
  { group: '对标解析', terms: ['竞品分析'] },
];

export const SKILL_PURPOSE_GROUPS: readonly SkillHubTermGroup[] = [
  { group: '市场洞察', terms: ['产品洞察', '国别洞察', '市场测算', '趋势分析'] },
  { group: '竞品研判', terms: ['竞品对比', '竞品分析', '参数比对'] },
  { group: '用户研究', terms: ['用户画像', '用户洞察', '需求挖掘', '客户分群'] },
  { group: '价格分析', terms: ['价格矩阵', '价格分析'] },
  { group: '舆情调研', terms: ['舆情汇总', '舆情挖掘'] },
  { group: '需求管理', terms: ['需求盘点'] },
  { group: '输出报表', terms: ['指标报表', '参数清单', '卖点拆解'] },
];

export const SKILL_FORMATS = ['xlsx', 'docx', 'pdf', 'PPT', 'markdown', '图表', '文本', 'json'] as const;

export const SKILL_ENTITIES = ['手机', '耳机', '智能穿戴', '家电'] as const;

export const SKILL_REGIONS = ['中国', '东南亚', '欧洲', '印度'] as const;

export const SKILL_HUB_STATUS_LABEL: Record<Exclude<SkillHubTagStatus, 'ok'>, string> = {
  needs_review: '待人工复核',
  needs_role: '待人工补标',
  unspecified: '未指定',
};

export type SkillHubTagField =
  | 'roles'
  | 'capabilities'
  | 'purposes'
  | 'formats'
  | 'entities'
  | 'regions';

const FIELD_LABEL: Record<SkillHubTagField, string> = {
  roles: '岗位职能',
  capabilities: '核心能力',
  purposes: '产出用途',
  formats: '产出格式',
  entities: '细分实体/品类',
  regions: '覆盖地域',
};

const ROLE_TERMS = new Set(SKILL_ROLE_GROUPS.flatMap((group) => group.terms));
const CAPABILITY_TERMS = new Set(SKILL_CAPABILITY_GROUPS.flatMap((group) => group.terms));
const PURPOSE_TERMS = new Set(SKILL_PURPOSE_GROUPS.flatMap((group) => group.terms));
const FORMAT_TERMS = new Set<string>(SKILL_FORMATS);
const ENTITY_TERMS = new Set<string>(SKILL_ENTITIES);
const REGION_TERMS = new Set<string>(SKILL_REGIONS);

const VOCAB: Record<SkillHubTagField, Set<string>> = {
  roles: ROLE_TERMS,
  capabilities: CAPABILITY_TERMS,
  purposes: PURPOSE_TERMS,
  formats: FORMAT_TERMS,
  entities: ENTITY_TERMS,
  regions: REGION_TERMS,
};

const DEPT_ONLY = [
  /\bGTM\b/i,
  /\bMKT\b/i,
  /\bHR\b(?!BP)/i,
  /质量运营部|质量部/,
  /电商部|电商部门|电商团队/,
  /服务部|服务部门|服务团队/,
  /渠道部|渠道部门|渠道团队/,
  /零售部|零售部门|零售团队/,
  /市场部|营销部/,
];

const PHRASES: {
  pattern: RegExp;
  capability?: readonly string[];
  purpose?: readonly string[];
  format?: readonly string[];
  entity?: readonly string[];
  region?: readonly string[];
}[] = [
  { pattern: /价格测算/, capability: ['市场测算'], purpose: ['市场测算'] },
  {
    pattern: /竞品参数比对|竞品比对/,
    capability: ['竞品对比', '参数比对'],
    purpose: ['竞品对比', '参数比对'],
  },
  { pattern: /竞品对比/, capability: ['竞品对比'], purpose: ['竞品对比'] },
  { pattern: /竞品洞察/, purpose: ['竞品分析'] },
  { pattern: /国别[^，。；\n]{0,12}洞察/, purpose: ['国别洞察'] },
  { pattern: /产品洞察|(?:手机|产品)[^，。；\n]{0,16}洞察/, purpose: ['产品洞察'] },
  {
    pattern: /内容生成|(?:生成|撰写|编写)[^，。；\n]{0,12}(?:课件|文案|卖点|内容)/,
    capability: ['内容生成'],
  },
  {
    pattern: /课件文本|纯文本|输出文本|文本输出|(?:生成|输出)[^，。；\n]{0,8}文本/,
    format: ['文本'],
  },
  { pattern: /可穿戴/, entity: ['智能穿戴'] },
  { pattern: /\bexcel\b/i, format: ['xlsx'] },
];

export interface SkillHubTagInput {
  nameZh?: string;
  nameEn?: string;
  descZh?: string;
  descEn?: string;
  instructions?: string;
}

export function emptySkillHubTags(): SkillHubTags {
  return {
    version: SKILL_HUB_TAG_VERSION,
    roles: [],
    roleStatus: 'needs_review',
    capabilities: [],
    capabilityStatus: 'needs_review',
    purposes: [],
    purposeStatus: 'needs_review',
    formats: [],
    formatStatus: 'unspecified',
    entities: [],
    regions: [],
    source: 'auto',
    audits: [],
  };
}

export function skillHubGroupsFor(
  groups: readonly SkillHubTermGroup[],
  labels: readonly string[],
): string[] {
  const selected = new Set(labels);
  return groups.filter((group) => group.terms.some((term) => selected.has(term))).map((group) => group.group);
}

/** 检索只用细词条。聚类名和复核状态不进搜索。 */
export function skillHubSearchTerms(tags: SkillHubTags | undefined): string[] {
  if (!tags) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const lists = [tags.roles, tags.capabilities, tags.purposes, tags.formats, tags.entities, tags.regions];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const label of list) {
      if (typeof label !== 'string' || seen.has(label)) continue;
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

export function hasSkillHubSecondaryTags(tags: SkillHubTags | undefined): boolean {
  return Boolean(tags && (tags.entities.length > 0 || tags.regions.length > 0));
}

export function recognizeSkillHubTags(input: SkillHubTagInput, previous?: SkillHubTags): SkillHubTags {
  const text = [input.nameZh, input.nameEn, input.descZh, input.descEn, input.instructions]
    .filter((part) => part?.trim())
    .join('\n');

  const roles = matchGroupTerms(text, SKILL_ROLE_GROUPS);
  const capabilities = matchGroupTerms(text, SKILL_CAPABILITY_GROUPS);
  const purposes = matchGroupTerms(text, SKILL_PURPOSE_GROUPS);
  const formats = matchList(text, SKILL_FORMATS);
  const entities = matchList(text, SKILL_ENTITIES);
  const regions = matchList(text, SKILL_REGIONS);

  for (const phrase of PHRASES) {
    if (!phrase.pattern.test(text)) continue;
    pushLabels(capabilities, phrase.capability, CAPABILITY_TERMS, SKILL_CAPABILITY_GROUPS);
    pushLabels(purposes, phrase.purpose, PURPOSE_TERMS, SKILL_PURPOSE_GROUPS);
    pushLabels(formats, phrase.format, FORMAT_TERMS, SKILL_FORMATS);
    pushLabels(entities, phrase.entity, ENTITY_TERMS, SKILL_ENTITIES);
    pushLabels(regions, phrase.region, REGION_TERMS, SKILL_REGIONS);
  }

  const roleStatus: SkillHubTagStatus = roles.length
    ? 'ok'
    : DEPT_ONLY.some((pattern) => pattern.test(text))
      ? 'needs_role'
      : 'needs_review';

  const recognized: SkillHubTags = {
    version: SKILL_HUB_TAG_VERSION,
    roles,
    roleStatus,
    capabilities,
    capabilityStatus: capabilities.length ? 'ok' : 'needs_review',
    purposes,
    purposeStatus: purposes.length ? 'ok' : 'needs_review',
    formats,
    formatStatus: formats.length ? 'ok' : 'unspecified',
    entities,
    regions,
    source: 'auto',
    audits: [],
  };
  return appendAudit(
    recognized,
    previous?.audits ?? [],
    '词表识别',
    '按名称、描述和正文重新识别',
  );
}

/**
 * 把模型返回的词条收成受控标签。
 * 字符串视为已经过服务端置信度过滤；对象必须带不低于 0.7 的置信度。
 */
export function skillHubTagsFromModel(payload: unknown, previous?: SkillHubTags): SkillHubTags | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const raw = payload as Record<string, unknown>;
  const roles = modelLabels('roles', raw.roles);
  const capabilities = modelLabels('capabilities', raw.capabilities);
  const purposes = modelLabels('purposes', raw.purposes);
  const formats = modelLabels('formats', raw.formats);
  const entities = modelLabels('entities', raw.entities);
  const regions = modelLabels('regions', raw.regions);
  const recognized: SkillHubTags = {
    version: SKILL_HUB_TAG_VERSION,
    roles,
    roleStatus: roles.length ? 'ok' : raw.roleStatus === 'needs_role' ? 'needs_role' : 'needs_review',
    capabilities,
    capabilityStatus: capabilities.length ? 'ok' : 'needs_review',
    purposes,
    purposeStatus: purposes.length ? 'ok' : 'needs_review',
    formats,
    formatStatus: formats.length ? 'ok' : 'unspecified',
    entities,
    regions,
    source: 'auto',
    audits: [],
  };
  return appendAudit(
    recognized,
    previous?.audits ?? [],
    '模型识别',
    '根据 Skill.md 提炼词条',
  );
}

export function toggleSkillHubTag(
  current: SkillHubTags | undefined,
  field: SkillHubTagField,
  label: string,
  actor: string,
): SkillHubTags {
  const base = current ?? emptySkillHubTags();
  label = label.trim();
  if (!label || label.length > 50) return base;
  const selected = new Set(base[field]);
  const adding = !selected.has(label);
  if (adding) selected.add(label);
  else selected.delete(label);
  const nextLabels = ordered(field, selected);
  const next = applyField(base, field, nextLabels);
  const verb = adding ? '增加' : '删除';
  return appendAudit(
    { ...next, source: 'human' },
    next.audits,
    actor.trim() || '创建人',
    `${verb}了${FIELD_LABEL[field]}「${label}」`,
  );
}

export function readSkillHubTags(value: unknown): SkillHubTags | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Partial<SkillHubTags>;
  const tags = emptySkillHubTags();
  tags.roles = keepKnown('roles', raw.roles);
  tags.capabilities = keepKnown('capabilities', raw.capabilities);
  tags.purposes = keepKnown('purposes', raw.purposes);
  tags.formats = keepKnown('formats', raw.formats);
  tags.entities = keepKnown('entities', raw.entities);
  tags.regions = keepKnown('regions', raw.regions);
  tags.roleStatus = tags.roles.length ? 'ok' : validStatus(raw.roleStatus, 'needs_review');
  tags.capabilityStatus = tags.capabilities.length ? 'ok' : validStatus(raw.capabilityStatus, 'needs_review');
  tags.purposeStatus = tags.purposes.length ? 'ok' : validStatus(raw.purposeStatus, 'needs_review');
  tags.formatStatus = tags.formats.length ? 'ok' : validStatus(raw.formatStatus, 'unspecified');
  tags.source = raw.source === 'human' ? 'human' : 'auto';
  tags.audits = Array.isArray(raw.audits)
    ? raw.audits
        .filter(
          (item): item is SkillHubTagAudit =>
            Boolean(item) &&
            typeof item.at === 'string' &&
            typeof item.by === 'string' &&
            typeof item.summary === 'string',
        )
        .slice(-8)
    : [];
  const hasContent =
    tags.roles.length +
      tags.capabilities.length +
      tags.purposes.length +
      tags.formats.length +
      tags.entities.length +
      tags.regions.length +
      tags.audits.length >
    0;
  return hasContent ? tags : undefined;
}

function modelLabels(field: SkillHubTagField, value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const selected = new Set<string>();
  for (const item of value) {
    if (typeof item === 'string') {
      if (VOCAB[field].has(item)) selected.add(item);
      continue;
    }
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const label = (item as { label?: unknown }).label;
    const confidence = Number((item as { confidence?: unknown }).confidence);
    if (typeof label !== 'string' || !VOCAB[field].has(label)) continue;
    if (!Number.isFinite(confidence) || confidence < 0.7) continue;
    selected.add(label);
  }
  return ordered(field, selected);
}

function applyField(tags: SkillHubTags, field: SkillHubTagField, labels: string[]): SkillHubTags {
  const next = { ...tags, [field]: labels };
  if (field === 'roles') next.roleStatus = labels.length ? 'ok' : 'needs_review';
  if (field === 'capabilities') next.capabilityStatus = labels.length ? 'ok' : 'needs_review';
  if (field === 'purposes') next.purposeStatus = labels.length ? 'ok' : 'needs_review';
  if (field === 'formats') next.formatStatus = labels.length ? 'ok' : 'unspecified';
  return next;
}

function keepKnown(field: SkillHubTagField, value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return ordered(
    field,
    new Set(value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(item => item.length > 0 && item.length <= 50)),
  );
}

function validStatus(value: unknown, fallback: SkillHubTagStatus): SkillHubTagStatus {
  return value === 'ok' || value === 'needs_review' || value === 'needs_role' || value === 'unspecified'
    ? value
    : fallback;
}

function ordered(field: SkillHubTagField, selected: Set<string>): string[] {
  const vocab =
    field === 'roles'
      ? SKILL_ROLE_GROUPS.flatMap((group) => group.terms)
      : field === 'capabilities'
        ? SKILL_CAPABILITY_GROUPS.flatMap((group) => group.terms)
        : field === 'purposes'
          ? SKILL_PURPOSE_GROUPS.flatMap((group) => group.terms)
          : field === 'formats'
            ? SKILL_FORMATS
            : field === 'entities'
              ? SKILL_ENTITIES
              : SKILL_REGIONS;
  return [...vocab.filter((term) => selected.has(term)), ...[...selected].filter(term => !VOCAB[field].has(term))];
}

function matchGroupTerms(text: string, groups: readonly SkillHubTermGroup[]): string[] {
  return groups.flatMap((group) => group.terms).filter((term) => mentions(text, term));
}

function matchList(text: string, terms: readonly string[]): string[] {
  return terms.filter((term) => term !== '文本' && mentions(text, term));
}

function mentions(text: string, term: string): boolean {
  if (!text) return false;
  if (term === '中国') return /中国(?!人)/.test(text);
  if (term === '印度') return /印度(?!尼)/.test(text);
  if (term === '质量运营') return /质量运营(?!部)/.test(text);
  if (term === 'PMO') return /\bPMO\b/i.test(text);
  if (term === 'HRBP') return /\bHRBP\b/i.test(text);
  if (FORMAT_TERMS.has(term) && /^[A-Za-z]+$/.test(term)) {
    if (term === 'PPT') return /\bpptx?\b/i.test(text);
    if (term === 'markdown') return /\bmarkdown\b|\.md\b/i.test(text);
    return new RegExp(`\\b${term}\\b`, 'i').test(text);
  }
  return text.includes(term);
}

function pushLabels(
  target: string[],
  labels: readonly string[] | undefined,
  allowed: Set<string>,
  orderSource: readonly SkillHubTermGroup[] | readonly string[],
) {
  if (!labels?.length) return;
  const selected = new Set(target);
  for (const label of labels) {
    if (allowed.has(label)) selected.add(label);
  }
  const order = Array.isArray(orderSource)
    ? orderSource.flatMap((item) => (typeof item === 'string' ? [item] : [...item.terms]))
    : [];
  target.splice(0, target.length, ...order.filter((term) => selected.has(term)));
}

function appendAudit(
  tags: SkillHubTags,
  previous: SkillHubTagAudit[],
  by: string,
  summary: string,
): SkillHubTags {
  return {
    ...tags,
    audits: [...previous, { at: new Date().toISOString(), by, summary }].slice(-8),
  };
}
