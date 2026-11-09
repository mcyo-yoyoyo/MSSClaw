import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { SUPER_ADMIN_ROLE } from './identity-store';

/**
 * 资产表 ↔ 接口 JSON。整份快照（GET/PUT /marketplace、/tools）和目录单条
 * （/catalog/:resource）都走这里：校验字段、按 position 排序、维护 Skill 版本和 Agent 编排。
 *
 * 约定（docs/database-design.sql 通用约定 6）：可选字段为空时读出不输出该键；
 * 请求里出现表里没有列的键直接拒绝保存，不悄悄丢弃。
 */

type Db = PrismaService | Prisma.TransactionClient;
type JsonRecord = Record<string, unknown>;
type FieldType = 'string' | 'int' | 'bool' | 'json';

export type AssetKind = 'tool' | 'skill' | 'agent' | 'automation' | 'kbDoc';

interface AssetSpec {
  model: 'tool' | 'skill' | 'agent' | 'automation' | 'kbDocument';
  required: Record<string, FieldType>;
  optional: Record<string, FieldType>;
  /** 展示型详情，整体存进 detail 列 */
  detailKeys?: readonly string[];
}

/** 资产 JSON 自带的时间字符串；行时间 createdAt / updatedAt 由库维护 */
const SOURCE_TIME: Record<string, string> = { createdAt: 'sourceCreatedAt', updatedAt: 'sourceUpdatedAt' };
/** 非空且有库默认值的列：快照缺省时写默认值 */
const COLUMN_DEFAULTS: Record<string, unknown> = { invokes: 0 };

const OWNERSHIP = {
  publisher: 'string',
  publisherUserId: 'string',
  sourceType: 'string',
  visibility: 'string',
  scenarioTags: 'json',
} as const;

const SPECS: Record<AssetKind, AssetSpec> = {
  tool: {
    model: 'tool',
    required: { id: 'string', name: 'string', desc: 'string', category: 'string', author: 'string', published: 'bool', icon: 'string', tags: 'json' },
    optional: {
      ...OWNERSHIP,
      ownerDeptIds: 'json',
      marketTitle: 'string', cardSummary: 'string', marketShelf: 'string', region: 'string', company: 'string',
      ownerRegionId: 'string', ownerRegionIds: 'json', logoUrl: 'string', homepageUrl: 'string', docsUrl: 'string',
      mediaUrl: 'string', screenshotUrl: 'string', versionLabel: 'string', deliveryForm: 'string', connectorType: 'string',
      toolTypeId: 'string', toolTypeIds: 'json', toolTypeLabels: 'json', externalCategoryRanks: 'json',
      externalSortOrder: 'int', externalSortRank: 'int', bestFor: 'string', productIntro: 'string',
      coreCapabilities: 'json', usageGuide: 'json', businessScenarioIds: 'json', invokes: 'int', featuredInFindCases: 'bool',
    },
  },
  skill: {
    model: 'skill',
    required: {
      id: 'string', name: 'string', desc: 'string', category: 'string', command: 'string', author: 'string',
      version: 'string', connector: 'string', published: 'bool', icon: 'string', tags: 'json',
    },
    optional: {
      ...OWNERSHIP,
      nameZh: 'string', nameEn: 'string', descZh: 'string', descEn: 'string', callable: 'bool',
      featuredInDoTask: 'bool', featuredInMssMarket: 'bool', businessScenarioId: 'string', homepageUrl: 'string', invokes: 'int', iconUrl: 'string', accentColor: 'string',
      executionMode: 'string', searchKeywords: 'json', instructions: 'string', planSteps: 'json', usageNotes: 'string', packageBlob: 'json',
      traceEvaluation: 'json', updatedBy: 'string', createdAt: 'string', updatedAt: 'string',
    },
    detailKeys: ['cases', 'caseAttachments', 'envInfo', 'securityScan', 'hubTags'],
  },
  agent: {
    model: 'agent',
    required: {
      id: 'string', name: 'string', desc: 'string', category: 'string', bizLine: 'string', homeTag: 'string',
      author: 'string', published: 'bool', chatId: 'string', icon: 'string', color: 'string',
    },
    optional: {
      ...OWNERSHIP,
      valueProposition: 'string', maintainer: 'string', featuredInDoTask: 'bool', lifecycleStatus: 'string',
      businessScenarioId: 'string', capabilityTypeIds: 'json', invokes: 'int',
      primarySkillId: 'string', avatarPresetId: 'string', avatarUrl: 'string', systemPrompt: 'string',
      demoPrompt: 'string', demoUrl: 'string', solutionDocUrl: 'string', feedbackUrl: 'string', installCommand: 'string',
      version: 'string', versionSummary: 'string', requiresHumanReview: 'bool', packageBlob: 'json', planSteps: 'json',
      createdAt: 'string', updatedAt: 'string',
    },
    detailKeys: [
      'capabilities', 'targetUsers', 'capabilityBoundaries', 'suitableFor', 'notSuitableFor',
      'inputOutput', 'quickStart', 'cases', 'caseAttachments', 'environment',
    ],
  },
  automation: {
    model: 'automation',
    required: {
      id: 'string', name: 'string', desc: 'string', agentId: 'string', skillIds: 'json',
      schedule: 'string', enabled: 'bool', lastRun: 'string',
    },
    optional: { icon: 'string', published: 'bool' },
  },
  kbDoc: {
    model: 'kbDocument',
    required: {
      id: 'string', title: 'string', desc: 'string', collection: 'string', type: 'string', size: 'string',
      pages: 'int', clearance: 'string', indexed: 'bool', chunks: 'int', author: 'string', tags: 'json', updatedAt: 'string',
    },
    optional: { chunkTexts: 'json', content: 'string', published: 'bool' },
  },
};

const SKILL_VERSION_FIELDS: Record<string, FieldType> = {
  executionMode: 'string', version: 'string', notes: 'string', status: 'string', packageBlob: 'json', publishedAt: 'string',
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function typeMatches(type: FieldType, value: unknown): boolean {
  if (type === 'string') return typeof value === 'string';
  if (type === 'int') return Number.isInteger(value);
  if (type === 'bool') return typeof value === 'boolean';
  return true;
}

function invalid(kind: string, id: string, reason: string): never {
  throw new BadRequestException(`invalid_${kind}:${id || '(无 id)'}:${reason}`);
}

/** 资产 JSON → 行数据（不含 position / 子表）。未知键、类型不符、必填缺失都拒绝。 */
function toColumns(kind: AssetKind, raw: unknown, specials: readonly string[]): { data: JsonRecord; special: JsonRecord } {
  const spec = SPECS[kind];
  if (!isRecord(raw)) invalid(kind, '', 'not_an_object');
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const data: JsonRecord = {};
  const detail: JsonRecord = {};
  const special: JsonRecord = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    const type = spec.required[key] ?? spec.optional[key];
    if (type) {
      if (value === null) {
        if (spec.required[key]) invalid(kind, id, `${key}_required`);
        continue;
      }
      if (!typeMatches(type, value)) invalid(kind, id, `${key}_must_be_${type}`);
      data[SOURCE_TIME[key] ?? key] = key === 'id' ? id : value;
    } else if (spec.detailKeys?.includes(key)) {
      if (value !== null) detail[key] = value;
    } else if (specials.includes(key)) {
      special[key] = value;
    } else {
      invalid(kind, id, `unknown_field_${key}`);
    }
  }
  if (!id) invalid(kind, id, 'id_required');
  for (const key of Object.keys(spec.required)) {
    if (data[SOURCE_TIME[key] ?? key] === undefined) invalid(kind, id, `${key}_required`);
  }
  // 整份替换：快照里没有的可选列一律清空（json 列要用 DbNull），有库默认值的写默认值。
  for (const [key, type] of Object.entries(spec.optional)) {
    const column = SOURCE_TIME[key] ?? key;
    if (data[column] !== undefined) continue;
    data[column] = key in COLUMN_DEFAULTS ? COLUMN_DEFAULTS[key] : type === 'json' ? Prisma.DbNull : null;
  }
  if (spec.detailKeys) data.detail = Object.keys(detail).length ? detail : Prisma.DbNull;
  return { data, special };
}

/** 行 → 资产 JSON：空列不输出。 */
function fromColumns(kind: AssetKind, row: JsonRecord): JsonRecord {
  const spec = SPECS[kind];
  const out: JsonRecord = {};
  for (const key of [...Object.keys(spec.required), ...Object.keys(spec.optional)]) {
    const value = row[SOURCE_TIME[key] ?? key];
    if (value !== null && value !== undefined) out[key] = value;
  }
  if (spec.detailKeys && isRecord(row.detail)) {
    for (const key of spec.detailKeys) if (row.detail[key] !== undefined) out[key] = row.detail[key];
  }
  return out;
}

function skillVersionsFrom(skillId: string, raw: unknown): JsonRecord[] {
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) invalid('skill', skillId, 'versions_must_be_array');
  const seen = new Set<string>();
  return raw.map((item, position) => {
    if (!isRecord(item)) invalid('skill', skillId, 'version_not_an_object');
    const row: JsonRecord = { position };
    for (const [key, value] of Object.entries(item)) {
      if (value === undefined || value === null) continue;
      const type = SKILL_VERSION_FIELDS[key];
      if (!type) invalid('skill', skillId, `unknown_version_field_${key}`);
      if (!typeMatches(type, value)) invalid('skill', skillId, `version_${key}_must_be_${type}`);
      row[key] = value;
    }
    const version = row.version;
    if (typeof version !== 'string') invalid('skill', skillId, 'version_required');
    if (seen.has(version)) invalid('skill', skillId, `duplicate_version_${version}`);
    seen.add(version);
    return row;
  });
}

/** Skill / Agent 的区域、领域标签走关联表；接口仍是 ownerRegionIds / ownerDeptIds（Skill 另有单值 ownerRegionId） */
const ORG_TAG_KEYS: Partial<Record<AssetKind, readonly string[]>> = {
  skill: ['ownerDeptIds', 'ownerRegionIds', 'ownerRegionId'],
  agent: ['ownerDeptIds', 'ownerRegionIds'],
};

function tagList(kind: string, id: string, key: string, raw: unknown): string[] {
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw) || raw.some((tag) => typeof tag !== 'string')) invalid(kind, id, `${key}_must_be_strings`);
  return [...new Set((raw as string[]).map((tag) => tag.trim()).filter(Boolean))];
}

/** 区域：数组非空用数组，否则用单值（与前端 assetRegionIds 一致）；没有区域 = 全部区域 */
function orgTagsFrom(kind: AssetKind, id: string, special: JsonRecord): { regionIds: string[]; domainIds: string[] } {
  const single = special.ownerRegionId;
  if (single !== undefined && single !== null && typeof single !== 'string') invalid(kind, id, 'ownerRegionId_must_be_string');
  const regionIds = tagList(kind, id, 'ownerRegionIds', special.ownerRegionIds);
  if (!regionIds.length && typeof single === 'string' && single.trim()) regionIds.push(single.trim());
  return { regionIds, domainIds: tagList(kind, id, 'ownerDeptIds', special.ownerDeptIds) };
}

function agentSkillIdsFrom(agentId: string, raw: unknown): string[] {
  if (!Array.isArray(raw)) invalid('agent', agentId, 'skillIds_must_be_array');
  if (raw.some((id) => typeof id !== 'string')) invalid('agent', agentId, 'skillIds_must_be_strings');
  return [...new Set(raw as string[])]; // 重复项去重，保留首次出现
}

interface PreparedAsset {
  id: string;
  data: JsonRecord;
  versions?: JsonRecord[];
  skillIds?: string[];
  regionIds?: string[];
  domainIds?: string[];
  /** 规范化后的 JSON，用来判断这一行是否需要重写 */
  canonical: string;
}

function canonicalAsset(kind: AssetKind, data: JsonRecord, position: number, item: Omit<PreparedAsset, 'id' | 'data' | 'canonical'>): string {
  const plain = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, value === Prisma.DbNull ? null : value]),
  );
  const row = {
    ...plain,
    versions: item.versions,
    skills: item.skillIds?.map((skillId) => ({ skillId })),
    regions: item.regionIds?.map((regionId) => ({ regionId })),
    domains: item.domainIds?.map((domainId) => ({ domainId })),
  };
  return JSON.stringify(sortKeys({ asset: assetFromRow(kind, row), position }));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (isRecord(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]));
  }
  return value;
}

function prepareOne(kind: AssetKind, raw: unknown, position: number, seen: Set<string>): PreparedAsset {
  const children = kind === 'skill' ? ['versions'] : kind === 'agent' ? ['skillIds'] : [];
  const { data, special } = toColumns(kind, raw, [...children, ...(ORG_TAG_KEYS[kind] ?? [])]);
  const id = data.id as string;
  if (seen.has(id)) invalid(kind, id, 'duplicate_id');
  seen.add(id);
  data.position = position;
  const item = {
    versions: kind === 'skill' ? skillVersionsFrom(id, special.versions) : undefined,
    skillIds: kind === 'agent' ? agentSkillIdsFrom(id, special.skillIds ?? []) : undefined,
    ...(ORG_TAG_KEYS[kind] ? orgTagsFrom(kind, id, special) : {}),
  };
  return { id, data, ...item, canonical: canonicalAsset(kind, data, position, item) };
}

/** 校验并转换整份列表；任何一条不合法都在写库前抛出。 */
export function prepareAssets(kind: AssetKind, items: unknown[]): PreparedAsset[] {
  const seen = new Set<string>();
  return items.map((raw, position) => prepareOne(kind, raw, position, seen));
}

/** 行（含 versions / skills 子表）→ 接口 JSON */
export function assetFromRow(kind: AssetKind, row: JsonRecord): JsonRecord {
  const out = fromColumns(kind, row);
  if (kind === 'skill' && Array.isArray(row.versions) && row.versions.length) {
    out.versions = (row.versions as JsonRecord[]).map((version) =>
      Object.fromEntries(
        Object.keys(SKILL_VERSION_FIELDS)
          .filter((key) => version[key] !== null && version[key] !== undefined)
          .map((key) => [key, version[key]]),
      ),
    );
  }
  if (kind === 'agent') {
    out.skillIds = Array.isArray(row.skills) ? (row.skills as JsonRecord[]).map((item) => String(item.skillId)) : [];
  }
  if (ORG_TAG_KEYS[kind]) {
    const regionIds = Array.isArray(row.regions) ? (row.regions as JsonRecord[]).map((item) => String(item.regionId)) : [];
    const domainIds = Array.isArray(row.domains) ? (row.domains as JsonRecord[]).map((item) => String(item.domainId)) : [];
    if (regionIds.length) out.ownerRegionIds = regionIds;
    if (kind === 'skill' && regionIds.length) out.ownerRegionId = regionIds[0];
    if (domainIds.length) out.ownerDeptIds = domainIds;
  }
  return out;
}

// Prisma 各模型的 delegate 结构相同，这里只用到下面几个方法。
interface AssetDelegate {
  findMany(args: unknown): Promise<JsonRecord[]>;
  findUnique(args: unknown): Promise<JsonRecord | null>;
  findFirst(args: unknown): Promise<JsonRecord | null>;
  deleteMany(args: unknown): Promise<{ count: number }>;
  updateMany(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<JsonRecord>;
  upsert(args: unknown): Promise<JsonRecord>;
  create(args: unknown): Promise<JsonRecord>;
}

const ORDER = { orderBy: { position: 'asc' } } as const;
const BY_POSITION = { orderBy: { position: 'asc' } } as const;
const INCLUDE: Partial<Record<AssetKind, unknown>> = {
  skill: { versions: BY_POSITION, regions: BY_POSITION, domains: BY_POSITION },
  agent: { skills: BY_POSITION, regions: BY_POSITION, domains: BY_POSITION },
};

function delegate(db: Db, kind: AssetKind): AssetDelegate {
  return (db as unknown as Record<string, AssetDelegate>)[SPECS[kind].model];
}

/** where 只用于 Skill / Agent 的归属过滤（orgScopeWhere） */
export async function readAssets(db: Db, kind: AssetKind, where?: OrgScopeWhere): Promise<JsonRecord[]> {
  const rows = await delegate(db, kind).findMany({
    ...ORDER,
    ...(where ? { where } : {}),
    ...(INCLUDE[kind] ? { include: INCLUDE[kind] } : {}),
  });
  return rows.map((row) => assetFromRow(kind, row));
}

export async function readAsset(db: Db, kind: AssetKind, id: string, where?: OrgScopeWhere): Promise<JsonRecord | null> {
  const row = await delegate(db, kind).findFirst({
    where: { id, ...(where ?? {}) },
    ...(INCLUDE[kind] ? { include: INCLUDE[kind] } : {}),
  });
  return row ? assetFromRow(kind, row) : null;
}

export type OrgScopeWhere = Prisma.SkillWhereInput & Prisma.AgentWhereInput;

/**
 * 按成员归属过滤 Skill / Agent：区域和领域都要命中（AND）。
 * 资产没打区域标签 = 全部区域，不按区域过滤；领域同理。成员自己没有区域时只看不限区域的资产，领域同理。
 * visibility = private 仍只给发布方。发布方总能看到自己发布的。游客传 null，只看不限区域、不限领域的。
 * 超管不过滤，由调用方决定不传。
 */
export function orgScopeWhere(viewer: { id: string; regionId: string | null; domainIds: string[] } | null): OrgScopeWhere {
  const notPrivate: OrgScopeWhere = { OR: [{ visibility: null }, { visibility: { not: 'private' } }] };
  const region: OrgScopeWhere = viewer?.regionId
    ? { OR: [{ regions: { none: {} } }, { regions: { some: { regionId: viewer.regionId } } }] }
    : { regions: { none: {} } };
  const domain: OrgScopeWhere = viewer?.domainIds.length
    ? { OR: [{ domains: { none: {} } }, { domains: { some: { domainId: { in: viewer.domainIds } } } }] }
    : { domains: { none: {} } };
  const scoped: OrgScopeWhere = { AND: [notPrivate, region, domain] };
  return viewer ? { OR: [{ publisherUserId: viewer.id }, scoped] } : scoped;
}

export type CatalogViewer = { id: string; platformRole: string; regionId: string | null; deptIds: string[] } | null;

/** Skill / Agent 按查看人的区域、领域过滤；超管和其他资产类型不过滤 */
export function catalogScope(kind: AssetKind, viewer: CatalogViewer): OrgScopeWhere | undefined {
  if (kind !== 'skill' && kind !== 'agent') return undefined;
  if (viewer?.platformRole === SUPER_ADMIN_ROLE) return undefined;
  return orgScopeWhere(viewer && { id: viewer.id, regionId: viewer.regionId, domainIds: viewer.deptIds });
}

export async function readAssetIds(db: Db, kind: AssetKind): Promise<string[]> {
  const rows = await delegate(db, kind).findMany({ select: { id: true } });
  return rows.map((row) => String(row.id));
}

async function writeChildren(db: Db, kind: AssetKind, row: JsonRecord, item: PreparedAsset): Promise<void> {
  if (kind === 'skill') {
    await db.skillVersion.deleteMany({ where: { skillNo: row.no as bigint } });
    if (item.versions?.length) {
      await db.skillVersion.createMany({
        data: item.versions.map((version) => ({
          ...version,
          skillNo: row.no as bigint,
          packageBlob: version.packageBlob ?? Prisma.DbNull,
        })) as Prisma.SkillVersionCreateManyInput[],
      });
    }
  }
  if (item.regionIds && item.domainIds) await writeOrgTags(db, kind as 'skill' | 'agent', row, item.regionIds, item.domainIds);
  if (kind === 'agent') {
    await db.agentSkill.deleteMany({ where: { agentNo: row.no as bigint } });
    if (item.skillIds?.length) {
      await db.agentSkill.createMany({
        data: item.skillIds.map((skillId, position) => ({ agentNo: row.no as bigint, skillId, position })),
      });
    }
  }
}

async function writeOrgTags(db: Db, kind: 'skill' | 'agent', row: JsonRecord, regionIds: string[], domainIds: string[]) {
  const [regions, domains] = await Promise.all([
    regionIds.length ? db.region.findMany({ where: { id: { in: regionIds } }, select: { id: true } }) : [],
    domainIds.length ? db.domain.findMany({ where: { id: { in: domainIds } }, select: { id: true } }) : [],
  ]);
  const knownRegions = new Set(regions.map((region) => region.id));
  const knownDomains = new Set(domains.map((domain) => domain.id));
  const unknownRegion = regionIds.find((id) => !knownRegions.has(id));
  if (unknownRegion) invalid(kind, String(row.id), `unknown_region_${unknownRegion}`);
  const unknownDomain = domainIds.find((id) => !knownDomains.has(id));
  if (unknownDomain) invalid(kind, String(row.id), `unknown_domain_${unknownDomain}`);

  const no = row.no as bigint;
  if (kind === 'skill') {
    await db.skillRegion.deleteMany({ where: { skillNo: no } });
    await db.skillDomain.deleteMany({ where: { skillNo: no } });
    await db.skillRegion.createMany({ data: regionIds.map((regionId, position) => ({ skillNo: no, regionId, position })) });
    await db.skillDomain.createMany({ data: domainIds.map((domainId, position) => ({ skillNo: no, domainId, position })) });
  } else {
    await db.agentRegion.deleteMany({ where: { agentNo: no } });
    await db.agentDomain.deleteMany({ where: { agentNo: no } });
    await db.agentRegion.createMany({ data: regionIds.map((regionId, position) => ({ agentNo: no, regionId, position })) });
    await db.agentDomain.createMany({ data: domainIds.map((domainId, position) => ({ agentNo: no, domainId, position })) });
  }
}

function rethrowDuplicate(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException('catalog_id_exists');
  }
  throw error;
}

export interface AssetWriteChange {
  action: 'create' | 'update' | 'delete';
  id: string;
  name: string;
}

/** 排序变化不记成修改；只比较去掉 position 之后的内容 */
function contentKey(canonical: string): string {
  const parsed = JSON.parse(canonical) as Record<string, unknown>;
  delete parsed.position;
  return JSON.stringify(parsed);
}

function changeName(canonical: string, id: string): string {
  try {
    const parsed = JSON.parse(canonical) as { asset?: Record<string, unknown> };
    const asset = parsed.asset ?? {};
    for (const key of ['name', 'label', 'title']) {
      const value = asset[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  } catch {
    /* 名称取不到时用 id */
  }
  return id;
}

/**
 * 整份替换某类资产：快照里没有的行删除（子表级联），内容或顺序变化的行重写，其余不动。
 * 返回内容上的增删改（只调整顺序不算）。调用方负责放进事务。
 */
export async function replaceAssets(db: Db, kind: AssetKind, items: unknown[]): Promise<AssetWriteChange[]> {
  const prepared = prepareAssets(kind, items);
  const model = delegate(db, kind);
  const existingRows = await model.findMany(INCLUDE[kind] ? { include: INCLUDE[kind] } : {});
  const existing = new Map(
    existingRows.map((row) => [
      String(row.id),
      JSON.stringify(sortKeys({ asset: assetFromRow(kind, row), position: row.position })),
    ]),
  );
  const nextIds = new Set(prepared.map((item) => item.id));
  const changes: AssetWriteChange[] = [];
  for (const [id, canonical] of existing) {
    if (!nextIds.has(id)) changes.push({ action: 'delete', id, name: changeName(canonical, id) });
  }
  for (const item of prepared) {
    const prev = existing.get(item.id);
    if (!prev) changes.push({ action: 'create', id: item.id, name: changeName(item.canonical, item.id) });
    else if (contentKey(prev) !== contentKey(item.canonical)) {
      changes.push({ action: 'update', id: item.id, name: changeName(item.canonical, item.id) });
    }
  }
  await model.deleteMany({ where: { id: { notIn: [...nextIds] } } });
  for (const item of prepared) {
    if (existing.get(item.id) === item.canonical) continue;
    const row = await model.upsert({ where: { id: item.id }, create: item.data, update: item.data });
    await writeChildren(db, kind, row, item);
  }
  return changes;
}

/** 新建一条并排到最前。id 已存在时 409。调用方负责放进事务。 */
export async function createAsset(db: Db, kind: AssetKind, raw: unknown): Promise<JsonRecord> {
  const prepared = prepareOne(kind, raw, 0, new Set());
  const model = delegate(db, kind);
  if (await model.findUnique({ where: { id: prepared.id } })) throw new ConflictException('catalog_id_exists');
  await model.updateMany({ data: { position: { increment: 1 } } });
  let row: JsonRecord;
  try {
    row = await model.create({ data: prepared.data });
  } catch (error) {
    rethrowDuplicate(error);
  }
  await writeChildren(db, kind, row, prepared);
  return (await readAsset(db, kind, prepared.id)) ?? assetFromRow(kind, row);
}

/**
 * 按 id 整条替换，位置保持不变。地址里的 id 已经写进 raw。
 * 带 expectedUpdatedAt 时，与库里的 updatedAt 不一致就 409，避免后保存的编辑盖掉先保存的。
 */
export async function updateAsset(db: Db, kind: AssetKind, id: string, raw: unknown): Promise<JsonRecord> {
  const model = delegate(db, kind);
  const current = await model.findUnique({ where: { id } });
  if (!current) throw new NotFoundException('catalog_not_found');
  const record = isRecord(raw) ? raw : {};
  const expected = typeof record.expectedUpdatedAt === 'string' ? record.expectedUpdatedAt : undefined;
  const stored = current.sourceUpdatedAt;
  if (expected !== undefined && typeof stored === 'string' && stored !== '' && stored !== expected) {
    throw new ConflictException('catalog_conflict');
  }
  const { expectedUpdatedAt: _expectedUpdatedAt, ...body } = record;
  const prepared = prepareOne(kind, body, current.position as number, new Set());
  let row: JsonRecord;
  try {
    row = await model.update({ where: { id }, data: prepared.data });
  } catch (error) {
    rethrowDuplicate(error);
  }
  await writeChildren(db, kind, row, prepared);
  return (await readAsset(db, kind, id)) ?? assetFromRow(kind, row);
}

/** 删除一行。不存在返回 false。Skill 的版本随外键级联。 */
export async function deleteAsset(db: Db, kind: AssetKind, id: string): Promise<boolean> {
  const result = await delegate(db, kind).deleteMany({ where: { id } });
  return result.count > 0;
}

/** 原 global-tools 单例的目录元数据，存在 app_setting('tool-catalog.meta') */
export interface ToolCatalogMeta {
  externalCatalogVersion?: string;
  internalCatalogVersion?: string;
  initialized?: boolean;
  initializedAt?: string;
  migratedAt?: string;
}

const META_KEY = 'tool-catalog.meta';

export async function readToolCatalogMeta(db: Db): Promise<ToolCatalogMeta | null> {
  const row = await db.appSetting.findUnique({ where: { settingKey: META_KEY } });
  return row ? (row.value as ToolCatalogMeta) : null;
}

export async function writeToolCatalogMeta(db: Db, meta: ToolCatalogMeta): Promise<void> {
  const value = Object.fromEntries(Object.entries(meta).filter(([, v]) => v !== undefined)) as Prisma.InputJsonObject;
  await db.appSetting.upsert({
    where: { settingKey: META_KEY },
    create: { settingKey: META_KEY, value },
    update: { value, revision: { increment: 1 } },
  });
}
