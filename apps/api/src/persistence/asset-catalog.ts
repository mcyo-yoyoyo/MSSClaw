import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * 第 3 期资产表 ↔ 接口 JSON。接口仍收发整份快照（GET/PUT /marketplace、/tools），
 * 这里负责把快照数组拆成逐行写入、再按 position 拼回原样。
 *
 * 约定（docs/database-design.sql 通用约定 6）：可选字段为空时读出不输出该键；
 * 快照里出现表里没有列的键直接拒绝保存，不悄悄丢弃。
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
  ownerDeptIds: 'json',
  scenarioTags: 'json',
} as const;

const SPECS: Record<AssetKind, AssetSpec> = {
  tool: {
    model: 'tool',
    required: { id: 'string', name: 'string', desc: 'string', category: 'string', author: 'string', published: 'bool', icon: 'string', tags: 'json' },
    optional: {
      ...OWNERSHIP,
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
      featuredInDoTask: 'bool', featuredInMssMarket: 'bool', businessScenarioId: 'string', ownerRegionId: 'string',
      ownerRegionIds: 'json', homepageUrl: 'string', invokes: 'int', iconUrl: 'string', accentColor: 'string',
      searchKeywords: 'json', instructions: 'string', planSteps: 'json', usageNotes: 'string', packageBlob: 'json',
      traceEvaluation: 'json', updatedBy: 'string', createdAt: 'string', updatedAt: 'string',
    },
    detailKeys: ['cases', 'caseAttachments', 'envInfo', 'securityScan'],
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
      businessScenarioId: 'string', ownerRegionIds: 'json', capabilityTypeIds: 'json', invokes: 'int',
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
  version: 'string', notes: 'string', status: 'string', packageBlob: 'json', publishedAt: 'string',
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
  /** 规范化后的 JSON，用来判断这一行是否需要重写 */
  canonical: string;
}

function canonicalAsset(kind: AssetKind, data: JsonRecord, position: number, versions?: JsonRecord[], skillIds?: string[]): string {
  const plain = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, value === Prisma.DbNull ? null : value]),
  );
  return JSON.stringify(sortKeys({ asset: assetFromRow(kind, { ...plain, versions, skills: skillIds?.map((skillId) => ({ skillId })) }), position }));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (isRecord(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]));
  }
  return value;
}

/** 校验并转换整份列表；任何一条不合法都在写库前抛出。 */
export function prepareAssets(kind: AssetKind, items: unknown[]): PreparedAsset[] {
  const specials = kind === 'skill' ? ['versions'] : kind === 'agent' ? ['skillIds'] : [];
  const seen = new Set<string>();
  return items.map((raw, position) => {
    const { data, special } = toColumns(kind, raw, specials);
    const id = data.id as string;
    if (seen.has(id)) invalid(kind, id, 'duplicate_id');
    seen.add(id);
    data.position = position;
    const versions = kind === 'skill' ? skillVersionsFrom(id, special.versions) : undefined;
    const skillIds = kind === 'agent' ? agentSkillIdsFrom(id, special.skillIds ?? []) : undefined;
    return { id, data, versions, skillIds, canonical: canonicalAsset(kind, data, position, versions, skillIds) };
  });
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
  return out;
}

// Prisma 各模型的 delegate 结构相同，这里只用到下面几个方法。
interface AssetDelegate {
  findMany(args: unknown): Promise<JsonRecord[]>;
  deleteMany(args: unknown): Promise<unknown>;
  upsert(args: unknown): Promise<JsonRecord>;
}

const ORDER = { orderBy: { position: 'asc' } } as const;
const INCLUDE: Partial<Record<AssetKind, unknown>> = {
  skill: { versions: { orderBy: { position: 'asc' } } },
  agent: { skills: { orderBy: { position: 'asc' } } },
};

function delegate(db: Db, kind: AssetKind): AssetDelegate {
  return (db as unknown as Record<string, AssetDelegate>)[SPECS[kind].model];
}

export async function readAssets(db: Db, kind: AssetKind): Promise<JsonRecord[]> {
  const rows = await delegate(db, kind).findMany({ ...ORDER, ...(INCLUDE[kind] ? { include: INCLUDE[kind] } : {}) });
  return rows.map((row) => assetFromRow(kind, row));
}

export async function readAssetIds(db: Db, kind: AssetKind): Promise<string[]> {
  const rows = await delegate(db, kind).findMany({ select: { id: true } });
  return rows.map((row) => String(row.id));
}

/**
 * 整份替换某类资产：快照里没有的行删除（子表级联），内容或顺序变化的行重写，其余不动。
 * 调用方负责放进事务。
 */
export async function replaceAssets(db: Db, kind: AssetKind, items: unknown[]): Promise<void> {
  const prepared = prepareAssets(kind, items);
  const model = delegate(db, kind);
  const existingRows = await model.findMany(INCLUDE[kind] ? { include: INCLUDE[kind] } : {});
  const existing = new Map(
    existingRows.map((row) => [
      String(row.id),
      JSON.stringify(sortKeys({ asset: assetFromRow(kind, row), position: row.position })),
    ]),
  );
  const nextIds = prepared.map((item) => item.id);
  await model.deleteMany({ where: { id: { notIn: nextIds } } });
  for (const item of prepared) {
    if (existing.get(item.id) === item.canonical) continue;
    const row = await model.upsert({ where: { id: item.id }, create: item.data, update: item.data });
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
    if (kind === 'agent') {
      await db.agentSkill.deleteMany({ where: { agentNo: row.no as bigint } });
      if (item.skillIds?.length) {
        await db.agentSkill.createMany({
          data: item.skillIds.map((skillId, position) => ({ agentNo: row.no as bigint, skillId, position })),
        });
      }
    }
  }
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
