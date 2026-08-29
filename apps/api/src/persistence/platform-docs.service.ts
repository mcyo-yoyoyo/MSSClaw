import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildCatalogPayload, WORKSPACE_CATALOGS } from '../data/workspace-catalogs';
import {
  SEED_BUSINESS_SCENARIO_CATALOG,
  SEED_EXTERNAL_TAXONOMY,
  SEED_EXTERNAL_TOOL_LAYOUT,
  SEED_INTERNAL_OFFICE_SCENES,
} from '../data/market-doc-seeds';
import { PortalAnalyticsService } from './portal-analytics.service';

/** 允许持久化的平台文档 kind（对应原前端 localStorage 配置） */
export const PLATFORM_DOC_KINDS = [
  'members',
  'auth-credentials',
  'nav-presentation',
  'workspace-config',
  'ai-news',
  'ai-brief-email-copy',
  'station-announcements',
  'plaza-howto',
  'mss-build-stats',
  'business-scenario-catalog',
  'external-taxonomy',
  'external-tool-layout',
  'internal-office-scenes',
  'org-taxonomy',
  'market-featured',
  'market-favorites',
  'market-recent',
  'market-hidden',
  'content-engagement',
  'audit-log',
  'ai-news-prefs',
  'asset-approvals',
  'skill-reviews',
  'llm-config',
  'inbox',
  'warroom-webhook',
  'security-policy',
  'demo-content',
] as const;

export type PlatformDocKind = (typeof PLATFORM_DOC_KINDS)[number];

const OFFICE_SCENE_LIMITS = {
  entries: 100,
  id: 48,
  label: 120,
  english: 80,
  description: 4_000,
  icon: 100,
  toolId: 128,
  toolBlurb: 500,
} as const;

const OFFICE_SCENE_ID_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;
const OFFICE_SCENE_TOOL_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const OFFICE_SCENE_ICON_RE = /^[A-Za-z0-9_-]+(?:\s+[A-Za-z0-9_-]+)*$/;

const EXTERNAL_TOOL_LAYOUT_LIMITS = {
  categories: 100,
  idsPerList: 500,
  categoryId: 48,
  toolId: 128,
} as const;

const EXTERNAL_TOOL_LAYOUT_CATEGORY_ID_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;
const EXTERNAL_TOOL_LAYOUT_TOOL_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const EXTERNAL_TOOL_LAYOUT_UNSAFE_CATEGORY_IDS = new Set([
  '__proto__',
  'prototype',
  'constructor',
]);

type JsonObject = Record<string, unknown>;

interface CanonicalOfficeSceneEntry {
  id: string;
  label: string;
  english: string;
  description: string;
  icon: string;
  visible: boolean;
  toolIds: string[];
  toolBlurbs: Record<string, string>;
}

interface CanonicalOfficeSceneInput {
  expectedRevision: number;
  entries: CanonicalOfficeSceneEntry[];
}

interface CanonicalExternalToolLayoutAll {
  overseasFeaturedIds: string[];
  domesticFeaturedIds: string[];
  overseasMoreOrderIds: string[];
  domesticMoreOrderIds: string[];
}

interface CanonicalExternalToolLayoutCategory {
  overseasFeaturedIds: string[];
  domesticFeaturedIds: string[];
  overseasMoreOrderIds: string[];
  domesticMoreOrderIds: string[];
}

type ExternalToolLayoutCategoryListKey = keyof CanonicalExternalToolLayoutCategory;

export interface CanonicalExternalToolLayoutInput {
  expectedRevision: number;
  all: CanonicalExternalToolLayoutAll;
  categories: Record<string, CanonicalExternalToolLayoutCategory>;
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function invalidOfficeScenes(path: string, reason: string): never {
  throw new BadRequestException(`invalid_internal_office_scenes:${path}:${reason}`);
}

function invalidExternalToolLayout(path: string, reason: string): never {
  throw new BadRequestException(`invalid_external_tool_layout:${path}:${reason}`);
}

function canonicalExternalToolId(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    invalidExternalToolLayout(path, 'string_required');
  }
  const id = value.trim();
  if (!id) invalidExternalToolLayout(path, 'required');
  if (id.length > EXTERNAL_TOOL_LAYOUT_LIMITS.toolId) {
    invalidExternalToolLayout(path, `max_length_${EXTERNAL_TOOL_LAYOUT_LIMITS.toolId}`);
  }
  if (!EXTERNAL_TOOL_LAYOUT_TOOL_ID_RE.test(id)) {
    invalidExternalToolLayout(path, 'invalid_id');
  }
  return id;
}

/** Trim IDs and keep their first occurrence so repeated drag events cannot persist duplicates. */
function canonicalExternalToolIdList(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) invalidExternalToolLayout(path, 'array_required');
  if (value.length > EXTERNAL_TOOL_LAYOUT_LIMITS.idsPerList) {
    invalidExternalToolLayout(
      path,
      `max_items_${EXTERNAL_TOOL_LAYOUT_LIMITS.idsPerList}`,
    );
  }

  const seen = new Set<string>();
  const ids: string[] = [];
  value.forEach((rawId, index) => {
    const id = canonicalExternalToolId(rawId, `${path}[${index}]`);
    if (seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  });
  return ids;
}

/**
 * Canonical write contract for the external tool operations shelf.
 * Unknown fields, including client-supplied version/revision, are intentionally discarded.
 */
export function canonicalizeExternalToolLayoutInput(
  payload: unknown,
): CanonicalExternalToolLayoutInput {
  if (!isJsonObject(payload)) invalidExternalToolLayout('payload', 'object_required');

  const expectedRevision = payload.expectedRevision;
  if (
    typeof expectedRevision !== 'number' ||
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0
  ) {
    invalidExternalToolLayout('expectedRevision', 'non_negative_integer_required');
  }

  if (!isJsonObject(payload.all)) invalidExternalToolLayout('all', 'object_required');
  const claimedAllListIds = new Set<string>();
  const keepFirstAllListOccurrence = (ids: string[]): string[] =>
    ids.filter((id) => {
      if (claimedAllListIds.has(id)) return false;
      claimedAllListIds.add(id);
      return true;
    });
  const overseasFeaturedIds = keepFirstAllListOccurrence(
    canonicalExternalToolIdList(
      payload.all.overseasFeaturedIds,
      'all.overseasFeaturedIds',
    ),
  );
  const domesticFeaturedIds = keepFirstAllListOccurrence(
    canonicalExternalToolIdList(
      payload.all.domesticFeaturedIds,
      'all.domesticFeaturedIds',
    ),
  );
  const overseasMoreOrderIds = keepFirstAllListOccurrence(
    canonicalExternalToolIdList(
      payload.all.overseasMoreOrderIds,
      'all.overseasMoreOrderIds',
    ),
  );
  const domesticMoreOrderIds = keepFirstAllListOccurrence(
    canonicalExternalToolIdList(
      payload.all.domesticMoreOrderIds,
      'all.domesticMoreOrderIds',
    ),
  );

  if (!isJsonObject(payload.categories)) {
    invalidExternalToolLayout('categories', 'object_required');
  }
  const rawCategories = Object.entries(payload.categories);
  if (rawCategories.length > EXTERNAL_TOOL_LAYOUT_LIMITS.categories) {
    invalidExternalToolLayout(
      'categories',
      `max_items_${EXTERNAL_TOOL_LAYOUT_LIMITS.categories}`,
    );
  }

  const categories: Record<string, CanonicalExternalToolLayoutCategory> = {};
  for (const [rawCategoryId, rawCategory] of rawCategories) {
    const categoryId = rawCategoryId.trim().toLowerCase();
    const path = `categories.${rawCategoryId}`;
    if (!categoryId) invalidExternalToolLayout(path, 'required');
    if (categoryId.length > EXTERNAL_TOOL_LAYOUT_LIMITS.categoryId) {
      invalidExternalToolLayout(
        path,
        `max_length_${EXTERNAL_TOOL_LAYOUT_LIMITS.categoryId}`,
      );
    }
    if (!EXTERNAL_TOOL_LAYOUT_CATEGORY_ID_RE.test(categoryId)) {
      invalidExternalToolLayout(path, 'invalid_id');
    }
    if (EXTERNAL_TOOL_LAYOUT_UNSAFE_CATEGORY_IDS.has(categoryId)) {
      invalidExternalToolLayout(path, 'unsafe_id');
    }
    if (Object.prototype.hasOwnProperty.call(categories, categoryId)) {
      invalidExternalToolLayout(path, 'duplicate_normalized_id');
    }
    if (!isJsonObject(rawCategory)) invalidExternalToolLayout(path, 'object_required');
    const claimedCategoryIds = new Set<string>();
    const keepFirstCategoryListOccurrence = (ids: string[]): string[] =>
      ids.filter((id) => {
        if (claimedCategoryIds.has(id)) return false;
        claimedCategoryIds.add(id);
        return true;
      });
    const categoryList = (
      key: ExternalToolLayoutCategoryListKey,
      options: { allowMissing?: boolean } = {},
    ): string[] => {
      const hasField = Object.prototype.hasOwnProperty.call(rawCategory, key);
      if (!hasField && !options.allowMissing) {
        invalidExternalToolLayout(`${path}.${key}`, 'array_required');
      }
      return keepFirstCategoryListOccurrence(
        canonicalExternalToolIdList(hasField ? rawCategory[key] : [], `${path}.${key}`),
      );
    };

    // Featured lists claim a tool before either More list. Additive category fields may
    // be absent only for old clients; any supplied value still follows strict validation.
    const overseasFeaturedIds = categoryList('overseasFeaturedIds');
    const domesticFeaturedIds = categoryList('domesticFeaturedIds', {
      allowMissing: true,
    });
    const overseasMoreOrderIds = categoryList('overseasMoreOrderIds', {
      allowMissing: true,
    });
    const domesticMoreOrderIds = categoryList('domesticMoreOrderIds', {
      allowMissing: true,
    });
    categories[categoryId] = {
      overseasFeaturedIds,
      domesticFeaturedIds,
      overseasMoreOrderIds,
      domesticMoreOrderIds,
    };
  }

  return {
    expectedRevision,
    all: {
      overseasFeaturedIds,
      domesticFeaturedIds,
      overseasMoreOrderIds,
      domesticMoreOrderIds,
    },
    categories,
  };
}

function categoryIdsMissingList(
  payload: unknown,
  key: ExternalToolLayoutCategoryListKey,
): Set<string> {
  if (!isJsonObject(payload) || !isJsonObject(payload.categories)) return new Set();
  return new Set(
    Object.entries(payload.categories)
      .filter(
        ([, rawCategory]) =>
          isJsonObject(rawCategory) &&
          !Object.prototype.hasOwnProperty.call(rawCategory, key),
      )
      .map(([rawCategoryId]) => rawCategoryId.trim().toLowerCase()),
  );
}

function storedCategoryListIds(
  payload: unknown,
  categoryId: string,
  key: ExternalToolLayoutCategoryListKey,
): string[] {
  if (!isJsonObject(payload) || !isJsonObject(payload.categories)) return [];
  const storedCategoryEntry = Object.entries(payload.categories).find(
    ([rawCategoryId]) => rawCategoryId.trim().toLowerCase() === categoryId,
  );
  const rawCategory = storedCategoryEntry?.[1];
  if (!isJsonObject(rawCategory) || rawCategory[key] === undefined) {
    return [];
  }
  return canonicalExternalToolIdList(
    rawCategory[key],
    `stored.categories.${categoryId}.${key}`,
  );
}

function dedupeExternalToolCategoryLists(
  category: CanonicalExternalToolLayoutCategory,
): CanonicalExternalToolLayoutCategory {
  const claimedIds = new Set<string>();
  const keepFirstOccurrence = (ids: string[]): string[] =>
    ids.filter((id) => {
      if (claimedIds.has(id)) return false;
      claimedIds.add(id);
      return true;
    });
  return {
    overseasFeaturedIds: keepFirstOccurrence(category.overseasFeaturedIds),
    domesticFeaturedIds: keepFirstOccurrence(category.domesticFeaturedIds),
    overseasMoreOrderIds: keepFirstOccurrence(category.overseasMoreOrderIds),
    domesticMoreOrderIds: keepFirstOccurrence(category.domesticMoreOrderIds),
  };
}

function defaultExternalToolLayoutSeed() {
  return {
    version: SEED_EXTERNAL_TOOL_LAYOUT.version,
    revision: SEED_EXTERNAL_TOOL_LAYOUT.revision,
    all: {
      overseasFeaturedIds: [...SEED_EXTERNAL_TOOL_LAYOUT.all.overseasFeaturedIds],
      domesticFeaturedIds: [...SEED_EXTERNAL_TOOL_LAYOUT.all.domesticFeaturedIds],
      overseasMoreOrderIds: [] as string[],
      domesticMoreOrderIds: [] as string[],
    },
    categories: {} as Record<string, CanonicalExternalToolLayoutCategory>,
  };
}

/**
 * Migrate the one historical `pins.external` list into the two regional shelves.
 * Invalid, duplicate, missing, or regionless IDs are ignored; marketplace order never
 * replaces the legacy pin order. A completely unusable old list falls back to the static seed.
 */
export function buildExternalToolLayoutSeed(
  marketFeaturedPayload: unknown,
  marketplacePayload: unknown,
) {
  if (!isJsonObject(marketFeaturedPayload) || !isJsonObject(marketFeaturedPayload.pins)) {
    return defaultExternalToolLayoutSeed();
  }
  const rawPins = marketFeaturedPayload.pins.external;
  if (!Array.isArray(rawPins) || !isJsonObject(marketplacePayload)) {
    return defaultExternalToolLayoutSeed();
  }
  const rawTools = marketplacePayload.tools;
  if (!Array.isArray(rawTools)) return defaultExternalToolLayoutSeed();

  const regionById = new Map<string, 'overseas' | 'domestic'>();
  for (const rawTool of rawTools) {
    if (!isJsonObject(rawTool) || typeof rawTool.id !== 'string') continue;
    const id = rawTool.id.trim();
    if (
      !id ||
      id.length > EXTERNAL_TOOL_LAYOUT_LIMITS.toolId ||
      !EXTERNAL_TOOL_LAYOUT_TOOL_ID_RE.test(id) ||
      regionById.has(id)
    ) {
      continue;
    }
    const region =
      typeof rawTool.region === 'string' ? rawTool.region.trim().toLowerCase() : '';
    if (region === 'overseas' || region === 'domestic') regionById.set(id, region);
  }

  const seen = new Set<string>();
  const overseasFeaturedIds: string[] = [];
  const domesticFeaturedIds: string[] = [];
  for (const rawPin of rawPins) {
    if (typeof rawPin !== 'string') continue;
    const id = rawPin.trim();
    if (
      !id ||
      id.length > EXTERNAL_TOOL_LAYOUT_LIMITS.toolId ||
      !EXTERNAL_TOOL_LAYOUT_TOOL_ID_RE.test(id) ||
      seen.has(id)
    ) {
      continue;
    }
    seen.add(id);
    const region = regionById.get(id);
    if (region === 'overseas') overseasFeaturedIds.push(id);
    if (region === 'domestic') domesticFeaturedIds.push(id);
    if (
      overseasFeaturedIds.length + domesticFeaturedIds.length >=
      EXTERNAL_TOOL_LAYOUT_LIMITS.idsPerList
    ) {
      break;
    }
  }

  if (!overseasFeaturedIds.length && !domesticFeaturedIds.length) {
    return defaultExternalToolLayoutSeed();
  }

  return {
    version: SEED_EXTERNAL_TOOL_LAYOUT.version,
    revision: 0,
    all: {
      overseasFeaturedIds,
      domesticFeaturedIds,
      overseasMoreOrderIds: [] as string[],
      domesticMoreOrderIds: [] as string[],
    },
    categories: {} as Record<string, CanonicalExternalToolLayoutCategory>,
  };
}

function boundedString(
  value: unknown,
  path: string,
  maxLength: number,
  options: { allowEmpty?: boolean } = {},
): string {
  if (typeof value !== 'string') invalidOfficeScenes(path, 'string_required');
  const normalized = value.trim();
  if (!options.allowEmpty && !normalized) invalidOfficeScenes(path, 'required');
  if (normalized.length > maxLength) invalidOfficeScenes(path, `max_length_${maxLength}`);
  return normalized;
}

function canonicalToolId(value: unknown, path: string): string {
  const id = boundedString(value, path, OFFICE_SCENE_LIMITS.toolId);
  if (!OFFICE_SCENE_TOOL_ID_RE.test(id)) invalidOfficeScenes(path, 'invalid_id');
  return id;
}

/**
 * `internal-office-scenes` 是管理后台可写配置，不能把任意 JSON 原样放进数据库。
 * 这里同时做运行时校验和白名单化，未知字段（包括客户端传来的 revision）不会落库。
 */
function canonicalizeOfficeSceneInput(payload: unknown): CanonicalOfficeSceneInput {
  if (!isJsonObject(payload)) invalidOfficeScenes('payload', 'object_required');

  const expectedRevision = payload.expectedRevision;
  if (
    typeof expectedRevision !== 'number' ||
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0
  ) {
    invalidOfficeScenes('expectedRevision', 'non_negative_integer_required');
  }

  if (!Array.isArray(payload.entries)) invalidOfficeScenes('entries', 'array_required');
  if (payload.entries.length > OFFICE_SCENE_LIMITS.entries) {
    invalidOfficeScenes('entries', `max_items_${OFFICE_SCENE_LIMITS.entries}`);
  }

  const seenIds = new Set<string>();
  const entries = payload.entries.map((rawEntry, index): CanonicalOfficeSceneEntry => {
    const path = `entries[${index}]`;
    if (!isJsonObject(rawEntry)) invalidOfficeScenes(path, 'object_required');

    const id = boundedString(rawEntry.id, `${path}.id`, OFFICE_SCENE_LIMITS.id).toLowerCase();
    if (!OFFICE_SCENE_ID_RE.test(id)) invalidOfficeScenes(`${path}.id`, 'invalid_id');
    if (seenIds.has(id)) invalidOfficeScenes(`${path}.id`, 'duplicate');
    seenIds.add(id);

    const label = boundedString(rawEntry.label, `${path}.label`, OFFICE_SCENE_LIMITS.label);
    const english = boundedString(
      rawEntry.english,
      `${path}.english`,
      OFFICE_SCENE_LIMITS.english,
      { allowEmpty: true },
    );
    const description = boundedString(
      rawEntry.description,
      `${path}.description`,
      OFFICE_SCENE_LIMITS.description,
      { allowEmpty: true },
    );
    const icon = boundedString(rawEntry.icon, `${path}.icon`, OFFICE_SCENE_LIMITS.icon, {
      allowEmpty: true,
    }) || 'fa-cube';
    if (!OFFICE_SCENE_ICON_RE.test(icon)) invalidOfficeScenes(`${path}.icon`, 'invalid_icon');
    if (typeof rawEntry.visible !== 'boolean') {
      invalidOfficeScenes(`${path}.visible`, 'boolean_required');
    }

    if (!Array.isArray(rawEntry.toolIds)) {
      invalidOfficeScenes(`${path}.toolIds`, 'array_required');
    }
    if (rawEntry.toolIds.length > 1) {
      invalidOfficeScenes(`${path}.toolIds`, 'max_items_1');
    }
    const toolIds = rawEntry.toolIds.map((toolId, toolIndex) =>
      canonicalToolId(toolId, `${path}.toolIds[${toolIndex}]`),
    );
    if (new Set(toolIds).size !== toolIds.length) {
      invalidOfficeScenes(`${path}.toolIds`, 'duplicate');
    }

    const rawToolBlurbs = rawEntry.toolBlurbs === undefined ? {} : rawEntry.toolBlurbs;
    if (!isJsonObject(rawToolBlurbs)) {
      invalidOfficeScenes(`${path}.toolBlurbs`, 'object_required');
    }
    const toolBlurbs: Record<string, string> = {};
    for (const [rawToolId, rawBlurb] of Object.entries(rawToolBlurbs)) {
      const toolId = canonicalToolId(rawToolId, `${path}.toolBlurbs.key`);
      if (Object.prototype.hasOwnProperty.call(toolBlurbs, toolId)) {
        invalidOfficeScenes(`${path}.toolBlurbs.${toolId}`, 'duplicate');
      }
      if (!toolIds.includes(toolId)) {
        invalidOfficeScenes(`${path}.toolBlurbs.${toolId}`, 'tool_not_bound');
      }
      toolBlurbs[toolId] = boundedString(
        rawBlurb,
        `${path}.toolBlurbs.${toolId}`,
        OFFICE_SCENE_LIMITS.toolBlurb,
        { allowEmpty: true },
      );
    }

    return {
      id,
      label,
      english,
      description,
      icon,
      visible: rawEntry.visible,
      toolIds,
      toolBlurbs,
    };
  });

  return { expectedRevision, entries };
}

/** 旧数据没有 revision 时按 0 处理；不在 GET 时回写或替换其业务内容。 */
function storedOfficeSceneRevision(payload: unknown): number {
  if (!isJsonObject(payload)) return 0;
  const revision = payload.revision;
  return typeof revision === 'number' && Number.isSafeInteger(revision) && revision >= 0
    ? revision
    : 0;
}

function officeScenePayloadForRead(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return { version: 1, revision: 0, entries: payload };
  }
  if (!isJsonObject(payload)) return payload;
  const { expectedRevision: _discarded, ...stored } = payload;
  return { ...stored, revision: storedOfficeSceneRevision(payload) };
}

/** Missing/legacy revisions are revision zero until the first successful CAS write. */
export function storedExternalToolLayoutRevision(payload: unknown): number {
  if (!isJsonObject(payload)) return 0;
  const revision = payload.revision;
  return typeof revision === 'number' && Number.isSafeInteger(revision) && revision >= 0
    ? revision
    : 0;
}

function externalToolLayoutPayloadForRead(payload: unknown): unknown {
  if (!isJsonObject(payload)) return payload;
  const {
    expectedRevision: _discardedExpectedRevision,
    revision: _discardedRevision,
    version,
    ...stored
  } = payload;
  const readableVersion =
    typeof version === 'number' && Number.isSafeInteger(version) && version > 0
      ? version
      : SEED_EXTERNAL_TOOL_LAYOUT.version;
  const readableCategories = isJsonObject(stored.categories)
    ? Object.fromEntries(
        Object.entries(stored.categories).map(([categoryId, rawCategory]) => {
          if (!isJsonObject(rawCategory)) return [categoryId, rawCategory];
          return [
            categoryId,
            {
              ...rawCategory,
              // GET is a non-persisting compatibility view: old category records keep
              // every operational field and gain only the absent regional list. A present
              // but malformed value must remain visible to strict clients as bad data.
              domesticFeaturedIds: Object.prototype.hasOwnProperty.call(
                rawCategory,
                'domesticFeaturedIds',
              )
                ? rawCategory.domesticFeaturedIds
                : [],
              overseasMoreOrderIds: Object.prototype.hasOwnProperty.call(
                rawCategory,
                'overseasMoreOrderIds',
              )
                ? rawCategory.overseasMoreOrderIds
                : [],
              domesticMoreOrderIds: Object.prototype.hasOwnProperty.call(
                rawCategory,
                'domesticMoreOrderIds',
              )
                ? rawCategory.domesticMoreOrderIds
                : [],
            },
          ];
        }),
      )
    : stored.categories;
  return {
    version: readableVersion,
    revision: storedExternalToolLayoutRevision(payload),
    ...stored,
    categories: readableCategories,
  };
}

const SEED_MEMBERS = [
  {
    id: 'u-mcyo',
    name: 'Mcyo',
    email: 'mcyo@huawei.com',
    role: 'super_admin',
    avatar: 'bg-indigo-600',
    lastActive: '刚刚',
    status: 'active',
    deptIds: ['quality'],
    regionId: null,
  },
  {
    id: 'u-jacky',
    name: 'Jacky',
    email: 'jacky@huawei.com',
    role: 'capability_ops',
    avatar: 'bg-teal-600',
    lastActive: '1 小时前',
    status: 'active',
    deptIds: ['quality'],
    regionId: null,
  },
  {
    id: 'u-dickson',
    name: 'Dickson',
    email: 'dickson@huawei.com',
    role: 'business_user',
    avatar: 'bg-amber-500',
    lastActive: '今天',
    status: 'active',
    deptIds: ['mkt'],
    regionId: null,
  },
];

function isDocKind(kind: string): kind is PlatformDocKind {
  return (PLATFORM_DOC_KINDS as readonly string[]).includes(kind);
}

function docId(workspaceId: string, kind: string) {
  return `doc-${kind}-${workspaceId}`;
}

function normalizedAccountEmail(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/@company\.com$/i, '@huawei.com');
}

function membersFromPayload(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray((payload as { members?: unknown } | null)?.members)) {
    return (payload as { members: unknown[] }).members.filter(isJsonObject);
  }
  return Array.isArray(payload) ? payload.filter(isJsonObject) : [];
}

interface StoredSessionEntry {
  user: Record<string, unknown>;
  expiresAt: string;
}

function authSessionsFromPayload(payload: unknown): Record<string, StoredSessionEntry> {
  if (!isJsonObject(payload) || !isJsonObject(payload.sessions)) return {};
  return Object.fromEntries(
    Object.entries(payload.sessions).filter((entry): entry is [string, StoredSessionEntry] => {
      const value = entry[1];
      return (
        isJsonObject(value) &&
        isJsonObject(value.user) &&
        typeof value.expiresAt === 'string' &&
        Number.isFinite(Date.parse(value.expiresAt))
      );
    }),
  );
}

function authSessionsRevision(payload: unknown): number {
  if (!isJsonObject(payload)) return 0;
  const revision = payload.revision;
  return typeof revision === 'number' && Number.isSafeInteger(revision) && revision >= 0
    ? revision
    : 0;
}

function sessionUserForMember(member: Record<string, unknown>, workspaceId: string) {
  return {
    id: String(member.id),
    name: String(member.name),
    email: normalizedAccountEmail(member.email),
    platformRole: String(member.role ?? 'business_user'),
    avatar: String(member.avatar ?? 'bg-zinc-600'),
    deptIds: Array.isArray(member.deptIds) ? member.deptIds : [],
    regionId: (member.regionId as string | null) ?? null,
    workspaceId,
  };
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function hashPassword(password: string, salt: string): string {
  return sha256Hex(`${salt}:${password}`);
}

function randomSalt(): string {
  return randomBytes(16).toString('hex');
}

function initialMarketDoc(kind: PlatformDocKind): unknown | undefined {
  if (kind === 'business-scenario-catalog') return SEED_BUSINESS_SCENARIO_CATALOG;
  if (kind === 'external-taxonomy') return SEED_EXTERNAL_TAXONOMY;
  if (kind === 'external-tool-layout') return SEED_EXTERNAL_TOOL_LAYOUT;
  if (kind === 'internal-office-scenes') return SEED_INTERNAL_OFFICE_SCENES;
  return undefined;
}

function shouldUpgradeMarketDoc(kind: PlatformDocKind, payload: unknown): boolean {
  if (initialMarketDoc(kind) === undefined) return false;
  // 可写运营配置一旦存在即以数据库为准。版本迁移必须显式完成，GET 绝不能用种子覆盖运营数据。
  if (kind === 'internal-office-scenes' || kind === 'external-tool-layout') return false;
  if (
    kind === 'external-taxonomy' &&
    (!payload ||
      typeof payload !== 'object' ||
      Number((payload as { version?: unknown }).version) !== SEED_EXTERNAL_TAXONOMY.version)
  ) {
    return true;
  }
  return Boolean(
    payload &&
      !Array.isArray(payload) &&
      typeof payload === 'object' &&
      Object.keys(payload as Record<string, unknown>).length === 0,
  );
}

@Injectable()
export class PlatformDocsService {
  private readonly logger = new Logger(PlatformDocsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly portalAnalytics: PortalAnalyticsService,
  ) {}

  async getDoc(workspaceId: string, kind: string): Promise<{ kind: string; payload: unknown }> {
    if (!isDocKind(kind)) throw new BadRequestException(`unsupported_doc_kind:${kind}`);
    await this.ensureWorkspace(workspaceId);

    const row = await this.prisma.centerRecord.findUnique({
      where: { id: docId(workspaceId, kind) },
    });
    if (row) {
      if (kind === 'external-tool-layout') {
        return { kind, payload: externalToolLayoutPayloadForRead(row.payload) };
      }
      if (kind === 'internal-office-scenes') {
        return { kind, payload: officeScenePayloadForRead(row.payload) };
      }
      if (shouldUpgradeMarketDoc(kind, row.payload)) {
        const payload = initialMarketDoc(kind)!;
        await this.prisma.centerRecord.update({
          where: { id: row.id },
          data: { payload: payload as Prisma.InputJsonValue },
        });
        return { kind, payload };
      }
      return { kind, payload: row.payload };
    }

    const seeded = await this.seedIfNeeded(workspaceId, kind);
    return { kind, payload: seeded };
  }

  async putDoc(
    workspaceId: string,
    kind: string,
    payload: unknown,
  ): Promise<{ kind: string; payload: unknown }> {
    if (!isDocKind(kind)) throw new BadRequestException(`unsupported_doc_kind:${kind}`);
    await this.ensureWorkspace(workspaceId);
    if (kind === 'external-tool-layout') {
      return this.putExternalToolLayoutDoc(workspaceId, payload);
    }
    if (kind === 'internal-office-scenes') {
      return this.putInternalOfficeScenesDoc(workspaceId, payload);
    }
    const id = docId(workspaceId, kind);
    await this.prisma.centerRecord.upsert({
      where: { id },
      create: {
        id,
        workspaceId,
        kind: `doc:${kind}`,
        payload: (payload ?? {}) as Prisma.InputJsonValue,
      },
      update: {
        payload: (payload ?? {}) as Prisma.InputJsonValue,
      },
    });
    return { kind, payload };
  }

  async listDocs(workspaceId: string) {
    await this.ensureWorkspace(workspaceId);
    const rows = await this.prisma.centerRecord.findMany({
      where: { workspaceId, kind: { startsWith: 'doc:' } },
    });
    const byKind: Record<string, unknown> = {};
    for (const kind of PLATFORM_DOC_KINDS) {
      const row = rows.find((r) => r.id === docId(workspaceId, kind));
      if (row && kind === 'external-tool-layout') {
        byKind[kind] = externalToolLayoutPayloadForRead(row.payload);
      } else if (row && kind === 'internal-office-scenes') {
        byKind[kind] = officeScenePayloadForRead(row.payload);
      } else if (row && shouldUpgradeMarketDoc(kind, row.payload)) {
        const payload = initialMarketDoc(kind)!;
        await this.prisma.centerRecord.update({
          where: { id: row.id },
          data: { payload: payload as Prisma.InputJsonValue },
        });
        byKind[kind] = payload;
      } else {
        byKind[kind] = row ? row.payload : await this.seedIfNeeded(workspaceId, kind);
      }
    }
    return { docs: byKind };
  }

  private async putExternalToolLayoutDoc(workspaceId: string, payload: unknown) {
    const missingDomesticFeaturedCategoryIds = categoryIdsMissingList(
      payload,
      'domesticFeaturedIds',
    );
    const missingOverseasMoreCategoryIds = categoryIdsMissingList(
      payload,
      'overseasMoreOrderIds',
    );
    const missingDomesticMoreCategoryIds = categoryIdsMissingList(
      payload,
      'domesticMoreOrderIds',
    );
    const { expectedRevision, all, categories } = canonicalizeExternalToolLayoutInput(payload);
    const id = docId(workspaceId, 'external-tool-layout');
    const existing = await this.prisma.centerRecord.findUnique({ where: { id } });
    const currentRevision = existing
      ? storedExternalToolLayoutRevision(existing.payload)
      : 0;

    if (expectedRevision !== currentRevision) {
      throw new ConflictException({
        error: 'external_tool_layout_revision_conflict',
        expectedRevision,
        currentRevision,
      });
    }

    // An old browser does not know additive category fields. Preserve current values for
    // categories it still submits, while genuinely new categories start empty. Re-run the
    // four-list de-duplication after merging so newly featured tools always win over More.
    if (existing) {
      for (const [categoryId, category] of Object.entries(categories)) {
        if (missingDomesticFeaturedCategoryIds.has(categoryId)) {
          category.domesticFeaturedIds = storedCategoryListIds(
            existing.payload,
            categoryId,
            'domesticFeaturedIds',
          );
        }
        if (missingOverseasMoreCategoryIds.has(categoryId)) {
          category.overseasMoreOrderIds = storedCategoryListIds(
            existing.payload,
            categoryId,
            'overseasMoreOrderIds',
          );
        }
        if (missingDomesticMoreCategoryIds.has(categoryId)) {
          category.domesticMoreOrderIds = storedCategoryListIds(
            existing.payload,
            categoryId,
            'domesticMoreOrderIds',
          );
        }
        categories[categoryId] = dedupeExternalToolCategoryLists(category);
      }
    }

    const nextPayload = {
      version: SEED_EXTERNAL_TOOL_LAYOUT.version,
      revision: currentRevision + 1,
      all,
      categories,
    };

    if (!existing) {
      try {
        await this.prisma.centerRecord.create({
          data: {
            id,
            workspaceId,
            kind: 'doc:external-tool-layout',
            payload: nextPayload as unknown as Prisma.InputJsonValue,
          },
        });
      } catch (error) {
        // Concurrent first writers race on the deterministic CenterRecord ID.
        const raced = await this.prisma.centerRecord.findUnique({ where: { id } });
        if (raced) {
          throw new ConflictException({
            error: 'external_tool_layout_revision_conflict',
            expectedRevision,
            currentRevision: storedExternalToolLayoutRevision(raced.payload),
          });
        }
        throw error;
      }
      return { kind: 'external-tool-layout', payload: nextPayload };
    }

    const changed = await this.prisma.$executeRaw`
      UPDATE "CenterRecord"
      SET "payload" = ${JSON.stringify(nextPayload)}, "updatedAt" = ${Date.now()}
      WHERE "id" = ${id}
        AND CASE
          WHEN json_type("payload", '$.revision') = 'integer'
          THEN json_extract("payload", '$.revision')
          ELSE 0
        END = ${expectedRevision}
    `;

    if (changed !== 1) {
      const raced = await this.prisma.centerRecord.findUnique({ where: { id } });
      throw new ConflictException({
        error: 'external_tool_layout_revision_conflict',
        expectedRevision,
        currentRevision: raced ? storedExternalToolLayoutRevision(raced.payload) : 0,
      });
    }

    return { kind: 'external-tool-layout', payload: nextPayload };
  }

  private async putInternalOfficeScenesDoc(workspaceId: string, payload: unknown) {
    const { expectedRevision, entries } = canonicalizeOfficeSceneInput(payload);
    const id = docId(workspaceId, 'internal-office-scenes');
    const existing = await this.prisma.centerRecord.findUnique({ where: { id } });
    const currentRevision = existing ? storedOfficeSceneRevision(existing.payload) : 0;

    if (expectedRevision !== currentRevision) {
      throw new ConflictException({
        error: 'internal_office_scenes_revision_conflict',
        expectedRevision,
        currentRevision,
      });
    }

    const nextPayload = {
      version: SEED_INTERNAL_OFFICE_SCENES.version,
      revision: currentRevision + 1,
      entries,
    };

    if (!existing) {
      try {
        await this.prisma.centerRecord.create({
          data: {
            id,
            workspaceId,
            kind: 'doc:internal-office-scenes',
            payload: nextPayload as unknown as Prisma.InputJsonValue,
          },
        });
      } catch (error) {
        // 两个首次写请求并发时，唯一键失败的一方必须表现为 revision 冲突。
        const raced = await this.prisma.centerRecord.findUnique({ where: { id } });
        if (raced) {
          throw new ConflictException({
            error: 'internal_office_scenes_revision_conflict',
            expectedRevision,
            currentRevision: storedOfficeSceneRevision(raced.payload),
          });
        }
        throw error;
      }
      return { kind: 'internal-office-scenes', payload: nextPayload };
    }

    // revision 位于 JSON payload 内。用数据库条件更新完成 compare-and-swap，避免两个进程
    // 同时读到相同 revision 后彼此覆盖；无 revision 的旧记录在 SQL 中按 0 处理。
    const changed = await this.prisma.$executeRaw`
      UPDATE "CenterRecord"
      SET "payload" = ${JSON.stringify(nextPayload)}, "updatedAt" = ${Date.now()}
      WHERE "id" = ${id}
        AND CASE
          WHEN json_type("payload", '$.revision') = 'integer'
          THEN json_extract("payload", '$.revision')
          ELSE 0
        END = ${expectedRevision}
    `;

    if (changed !== 1) {
      const raced = await this.prisma.centerRecord.findUnique({ where: { id } });
      throw new ConflictException({
        error: 'internal_office_scenes_revision_conflict',
        expectedRevision,
        currentRevision: raced ? storedOfficeSceneRevision(raced.payload) : 0,
      });
    }

    return { kind: 'internal-office-scenes', payload: nextPayload };
  }

  async login(body: {
    email?: string;
    password?: string;
    workspaceId?: string;
    visitorId?: string;
  }) {
    const email = normalizedAccountEmail(body.email);
    const password = body.password ?? '';
    const workspaceId = body.workspaceId || 'ws-mss-ai';
    if (!email || !password) throw new BadRequestException('email_and_password_required');

    const membersDoc = await this.getDoc(workspaceId, 'members');
    const members = membersFromPayload(membersDoc.payload);

    const member = members.find((m) => normalizedAccountEmail(m.email) === email);
    if (!member || member.status === 'suspended') {
      return { ok: false, error: '账号不存在或已停用' };
    }

    const credsDoc = await this.getDoc(workspaceId, 'auth-credentials');
    const credPayload = (credsDoc.payload ?? {}) as {
      policy?: { allowDemoPassword?: boolean };
      credentials?: Record<string, { salt: string; hash: string; updatedAt: string }>;
    };
    const allowDemo = credPayload.policy?.allowDemoPassword !== false;
    const cred = credPayload.credentials?.[email];

    let valid = false;
    if (cred?.salt && cred?.hash) {
      valid = hashPassword(password, cred.salt) === cred.hash;
    } else if (allowDemo && password === 'mssclaw') {
      valid = true;
    }

    if (!valid) {
      return { ok: false, error: cred ? '密码错误' : '该账号尚未设置密码，请联系平台运营' };
    }

    const user = sessionUserForMember(member, workspaceId);

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await this.putSession(workspaceId, token, { user, expiresAt });

    // 登录统计不可反向阻断认证；数据库暂时不可写时保留服务端日志，登录仍正常返回。
    try {
      await this.portalAnalytics.recordDailyLogin({
        workspaceId,
        userId: String(user.id ?? ''),
        visitorId: body.visitorId,
      });
    } catch (error) {
      this.logger.warn(
        `Daily login analytics failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return { ok: true, user, token, expiresAt };
  }

  async me(token: string | undefined, workspaceId = 'ws-mss-ai') {
    if (!token) return { ok: false as const, error: '未登录' };
    const resolved = await this.findSession(workspaceId, token);
    if (!resolved) return { ok: false as const, error: '会话已失效，请重新登录' };
    if (new Date(resolved.session.expiresAt).getTime() < Date.now()) {
      await this.deleteSession(resolved.workspaceId, token);
      return { ok: false as const, error: '会话已过期，请重新登录' };
    }
    const user = await this.authorizeSessionForWorkspace(workspaceId, resolved.session.user);
    if (!user) return { ok: false as const, error: '无权访问该工作区' };
    return {
      ok: true as const,
      user,
      token,
      expiresAt: resolved.session.expiresAt,
    };
  }

  async logout(token: string | undefined, workspaceId = 'ws-mss-ai') {
    if (token) {
      const resolved = await this.findSession(workspaceId, token);
      if (resolved) await this.deleteSession(resolved.workspaceId, token);
    }
    return { ok: true as const };
  }

  /**
   * 登录令牌属于平台账号而不是当前 UI 工作区。优先查当前工作区，再回查其它工作区，
   * 使切换租户后无需保存或重放用户密码。me() 会再按目标工作区成员表重建身份与角色，
   * 不会把令牌签发工作区的权限带到目标工作区。
   */
  private async findSession(
    preferredWorkspaceId: string,
    token: string,
  ): Promise<{
    workspaceId: string;
    session: { user: Record<string, unknown>; expiresAt: string };
  } | null> {
    const preferred = await this.getSession(preferredWorkspaceId, token);
    if (preferred) return { workspaceId: preferredWorkspaceId, session: preferred };

    const rows = await this.prisma.centerRecord.findMany({
      where: {
        kind: 'doc:auth-sessions',
        workspaceId: { not: preferredWorkspaceId },
      },
      select: { workspaceId: true, payload: true },
    });
    for (const row of rows) {
      const sessions = authSessionsFromPayload(row.payload);
      const session = sessions[token];
      if (session) return { workspaceId: row.workspaceId, session };
    }
    return null;
  }

  private async getSession(
    workspaceId: string,
    token: string,
  ): Promise<StoredSessionEntry | null> {
    const doc = await this.prisma.centerRecord.findUnique({
      where: { id: docId(workspaceId, 'auth-sessions') },
      select: { payload: true },
    });
    if (!doc) return null;
    const sessions = authSessionsFromPayload(doc.payload);
    return sessions[token] ?? null;
  }

  private async authorizeSessionForWorkspace(
    workspaceId: string,
    sourceUser: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    // 鉴权读取不能沿用 getDoc() 的“缺失即自动创建工作区”行为，否则任意 workspaceId
    // 都可能被请求侧创建。只有已存在工作区才能承接一个跨工作区会话。
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });
    if (!workspace) return null;

    const membersRow = await this.prisma.centerRecord.findUnique({
      where: { id: docId(workspaceId, 'members') },
      select: { payload: true },
    });
    // 内置目录工作区在首次切换时允许初始化默认成员；其它（含自动创建的自定义工作区）
    // 必须已有明确成员表，不能在一次鉴权请求里凭空获得默认成员。
    let membersPayload: unknown = membersRow?.payload;
    if (!membersPayload && WORKSPACE_CATALOGS.some((catalog) => catalog.workspace.id === workspaceId)) {
      membersPayload = await this.seedIfNeeded(workspaceId, 'members');
    }
    if (!membersPayload) return null;
    const members = membersFromPayload(membersPayload);
    const sourceEmail = normalizedAccountEmail(sourceUser.email);
    const sourceId = String(sourceUser.id ?? '').trim();
    const member = members.find((candidate) => {
      const candidateEmail = normalizedAccountEmail(candidate.email);
      if (sourceEmail && candidateEmail) return candidateEmail === sourceEmail;
      return Boolean(sourceId) && String(candidate.id ?? '').trim() === sourceId;
    });
    if (!member || member.status === 'suspended') return null;
    return sessionUserForMember(member, workspaceId);
  }

  private async putSession(
    workspaceId: string,
    token: string,
    entry: StoredSessionEntry,
  ) {
    await this.mutateSessions(workspaceId, (sessions) => {
      const now = Date.now();
      for (const [key, value] of Object.entries(sessions)) {
        if (new Date(value.expiresAt).getTime() < now) delete sessions[key];
      }
      sessions[token] = entry;
    });
  }

  private async deleteSession(workspaceId: string, token: string) {
    await this.mutateSessions(workspaceId, (sessions) => {
      delete sessions[token];
    });
  }

  private async mutateSessions(
    workspaceId: string,
    mutate: (sessions: Record<string, StoredSessionEntry>) => void,
  ): Promise<void> {
    await this.ensureWorkspace(workspaceId);
    const id = docId(workspaceId, 'auth-sessions');

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const row = await this.prisma.centerRecord.findUnique({ where: { id } });
      if (!row) {
        const sessions: Record<string, StoredSessionEntry> = {};
        mutate(sessions);
        try {
          await this.prisma.centerRecord.create({
            data: {
              id,
              workspaceId,
              kind: 'doc:auth-sessions',
              payload: { revision: 1, sessions } as unknown as Prisma.InputJsonValue,
            },
          });
          return;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            continue;
          }
          throw error;
        }
      }

      const expectedRevision = authSessionsRevision(row.payload);
      const sessions = { ...authSessionsFromPayload(row.payload) };
      mutate(sessions);
      const nextPayload = JSON.stringify({ revision: expectedRevision + 1, sessions });
      const changed = await this.prisma.$executeRaw`
        UPDATE "CenterRecord"
        SET "payload" = ${nextPayload}, "updatedAt" = ${Date.now()}
        WHERE "id" = ${id}
          AND CASE
            WHEN json_type("payload", '$.revision') = 'integer'
            THEN json_extract("payload", '$.revision')
            ELSE 0
          END = ${expectedRevision}
      `;
      if (changed === 1) return;
    }

    throw new ConflictException('auth_sessions_revision_conflict');
  }

  private async ensureWorkspace(workspaceId: string) {
    const row = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (row) return;

    // 本地/首次启动：缺少工作区时自动补齐，避免 login/docs 直接 404
    const catalog = WORKSPACE_CATALOGS.find((c) => c.workspace.id === workspaceId);
    if (catalog) {
      await this.prisma.workspace.create({
        data: {
          id: catalog.workspace.id,
          name: catalog.workspace.name,
          namespace: catalog.workspace.namespace,
          description: catalog.workspace.description,
          memberCount: catalog.workspace.memberCount,
          defaultChatId: catalog.defaultChatId,
          catalogJson: buildCatalogPayload(catalog) as Prisma.InputJsonValue,
        },
      });
      return;
    }

    await this.prisma.workspace.create({
      data: {
        id: workspaceId,
        name: workspaceId,
        namespace: workspaceId,
        description: 'Auto-provisioned workspace',
        memberCount: 0,
        defaultChatId: 'default',
        catalogJson: {} as Prisma.InputJsonValue,
      },
    });
  }

  private async initialExternalToolLayoutSeed(workspaceId: string) {
    const [marketFeatured, marketplace] = await Promise.all([
      this.prisma.centerRecord.findFirst({
        where: { workspaceId, kind: 'doc:market-featured' },
        select: { payload: true },
      }),
      this.prisma.centerRecord.findFirst({
        where: { workspaceId, kind: 'marketplace' },
        select: { payload: true },
      }),
    ]);
    return buildExternalToolLayoutSeed(marketFeatured?.payload, marketplace?.payload);
  }

  private async seedIfNeeded(workspaceId: string, kind: PlatformDocKind): Promise<unknown> {
    const marketSeed =
      kind === 'external-tool-layout'
        ? await this.initialExternalToolLayoutSeed(workspaceId)
        : initialMarketDoc(kind);
    let payload: unknown = {};
    if (marketSeed !== undefined) {
      payload = marketSeed;
    } else if (kind === 'members') {
      payload = { members: SEED_MEMBERS };
    } else if (kind === 'auth-credentials') {
      const credentials: Record<string, { salt: string; hash: string; updatedAt: string }> = {};
      const now = new Date().toISOString();
      for (const m of SEED_MEMBERS) {
        const salt = randomSalt();
        credentials[m.email] = {
          salt,
          hash: hashPassword('mssclaw', salt),
          updatedAt: now,
        };
      }
      payload = {
        policy: { allowDemoPassword: true },
        credentials,
      };
    } else if (kind === 'ai-news') {
      payload = { items: [] };
    } else if (kind === 'station-announcements') {
      payload = { items: [] };
    } else if (kind === 'plaza-howto') {
      payload = { records: [] };
    } else if (kind === 'audit-log') {
      payload = { logs: [] };
    } else if (kind === 'market-featured') {
      payload = { pins: [] };
    } else if (kind === 'market-favorites') {
      payload = { items: [] };
    } else if (kind === 'market-recent') {
      payload = { items: [] };
    } else if (kind === 'market-hidden') {
      payload = { byUserId: {} };
    } else if (kind === 'content-engagement') {
      payload = { map: {}, votes: {} };
    } else if (kind === 'ai-news-prefs') {
      payload = { byUser: {} };
    } else if (kind === 'asset-approvals') {
      payload = { items: [], watchedByUserId: {} };
    } else if (kind === 'skill-reviews') {
      payload = { bySkillId: {} };
    } else if (kind === 'llm-config') {
      // 与前端 DEFAULT_LLM_CONFIG / seedPlatformModels 对齐，权威在 DB
      payload = {
        model: 'glm-5.1',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        apiKey: '',
        defaultModelId: 'glm-5.1',
        platformModels: [
          {
            id: 'glm-5.1',
            label: 'GLM 5.1',
            baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
            providerName: '智谱',
            apiKey: '',
            enabled: true,
            source: 'preset',
          },
          {
            id: 'deepseek-v4-flash',
            label: 'DeepSeek V4 Flash',
            baseUrl: 'https://api.deepseek.com/v1',
            providerName: 'DeepSeek',
            apiKey: '',
            enabled: true,
            source: 'preset',
          },
          {
            id: 'deepseek-v4-pro',
            label: 'DeepSeek V4 Pro',
            baseUrl: 'https://api.deepseek.com/v1',
            providerName: 'DeepSeek',
            apiKey: '',
            enabled: true,
            source: 'preset',
          },
          {
            id: 'qwen3.7-plus',
            label: 'Qwen 3.7 Plus',
            baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            providerName: '通义',
            apiKey: '',
            enabled: true,
            source: 'preset',
          },
        ],
        customModels: [],
      };
    } else if (kind === 'demo-content') {
      payload = { demoContentOff: false };
    } else {
      payload = {};
    }

    const id = docId(workspaceId, kind);
    await this.prisma.centerRecord.upsert({
      where: { id },
      create: {
        id,
        workspaceId,
        kind: `doc:${kind}`,
        payload: payload as Prisma.InputJsonValue,
      },
      update: {},
    });
    return payload;
  }
}
