import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import {
  createSession,
  deleteSession,
  ensureMembersSeeded,
  findSession,
  memberToJson,
  normalizedAccountEmail,
  readAuthPolicy,
  readCredentialsDoc,
  readMembersDoc,
  saveOAuthMember,
  writeCredentialsDoc,
  writeMembersDoc,
} from './identity-store';
import { Prisma } from '@prisma/client';
import { ensureWorkspace } from '../workspaces/workspace-setting';
import { readAssets } from './asset-catalog';
import { readSkillReviewsDoc } from './personal-data';
import { PrismaService } from '../prisma/prisma.service';
import {
  SEED_BUSINESS_SCENARIO_CATALOG,
  SEED_EXTERNAL_TAXONOMY,
  SEED_EXTERNAL_TOOL_LAYOUT,
  SEED_INTERNAL_OFFICE_SCENES,
} from '../data/market-doc-seeds';
import { PortalAnalyticsService } from './portal-analytics.service';
import {
  canonicalizeStationAnnouncements,
  syncStationAnnouncementBroadcast,
} from './station-announcement-broadcast';
import { PLATFORM_WORKSPACE_ID } from '../common/platform-workspace';

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
  'home-featured',
  'org-taxonomy',
  'market-featured',
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

/** 首页三栏精选：工具栏存工具 ID；AI工具Hub 栏存 `skill:<id>` / `agent:<id>`。 */
const HOME_FEATURED_CHANNELS = ['external', 'internal', 'projects'] as const;
const HOME_FEATURED_MAX_PER_CHANNEL = 30;
const HOME_FEATURED_TOOL_REF_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const HOME_FEATURED_PROJECT_REF_RE = /^(skill|agent):[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

type HomeFeaturedChannel = (typeof HOME_FEATURED_CHANNELS)[number];
type HomeFeaturedChannels = Record<HomeFeaturedChannel, string[]>;

function homeFeaturedRefPattern(channel: HomeFeaturedChannel): RegExp {
  return channel === 'projects' ? HOME_FEATURED_PROJECT_REF_RE : HOME_FEATURED_TOOL_REF_RE;
}

function invalidHomeFeatured(path: string, reason: string): never {
  throw new BadRequestException(`invalid_home_featured:${path}:${reason}`);
}

function canonicalizeHomeFeaturedInput(payload: unknown): HomeFeaturedChannels {
  if (!isJsonObject(payload)) invalidHomeFeatured('payload', 'object_required');
  const channels = payload.channels;
  if (!isJsonObject(channels)) invalidHomeFeatured('channels', 'object_required');
  const result = {} as HomeFeaturedChannels;
  for (const channel of HOME_FEATURED_CHANNELS) {
    const raw = channels[channel];
    if (!Array.isArray(raw)) invalidHomeFeatured(`channels.${channel}`, 'array_required');
    if (raw.length > HOME_FEATURED_MAX_PER_CHANNEL) {
      invalidHomeFeatured(`channels.${channel}`, `max_items_${HOME_FEATURED_MAX_PER_CHANNEL}`);
    }
    const seen = new Set<string>();
    result[channel] = raw.map((value, index) => {
      const path = `channels.${channel}[${index}]`;
      const ref = typeof value === 'string' ? value.trim() : '';
      if (!homeFeaturedRefPattern(channel).test(ref)) invalidHomeFeatured(path, 'invalid_ref');
      if (seen.has(ref)) invalidHomeFeatured(path, 'duplicate');
      seen.add(ref);
      return ref;
    });
  }
  return result;
}

/** 读取时容错：忽略非法项，保证首页不会因为一条脏数据整栏报错。 */
function homeFeaturedPayloadForRead(payload: unknown): {
  version: number;
  revision: number;
  channels?: HomeFeaturedChannels;
} {
  const revision = docRevision(payload);
  const rawChannels = isJsonObject(payload) ? payload.channels : undefined;
  if (!isJsonObject(rawChannels)) return { version: 1, revision };
  const channels = {} as HomeFeaturedChannels;
  for (const channel of HOME_FEATURED_CHANNELS) {
    const raw = Array.isArray(rawChannels[channel]) ? rawChannels[channel] : [];
    channels[channel] = [
      ...new Set(
        raw.filter(
          (ref): ref is string =>
            typeof ref === 'string' && homeFeaturedRefPattern(channel).test(ref),
        ),
      ),
    ].slice(0, HOME_FEATURED_MAX_PER_CHANNEL);
  }
  return { version: 1, revision, channels };
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

function isDocKind(kind: string): kind is PlatformDocKind {
  return (PLATFORM_DOC_KINDS as readonly string[]).includes(kind);
}

function docId(workspaceId: string, kind: string) {
  return `doc-${kind}-${workspaceId}`;
}

function docRevision(payload: unknown): number {
  if (!isJsonObject(payload)) return 0;
  const revision = payload.revision;
  return typeof revision === 'number' && Number.isSafeInteger(revision) && revision >= 0
    ? revision
    : 0;
}

function sessionUserForMember(member: Record<string, unknown>, workspaceId: string = PLATFORM_WORKSPACE_ID) {
  return {
    id: String(member.id),
    name: String(member.name),
    email: normalizedAccountEmail(member.email),
    platformRole: String(member.role ?? 'business_user'),
    avatar: String(member.avatar ?? 'bg-zinc-600'),
    deptIds: Array.isArray(member.deptIds) ? member.deptIds : [],
    regionId: (member.regionId as string | null) ?? null,
    workspaceId,
    // OAuth 登录带回的上游属性；password 登录时为空，前端按有无渲染
    externalId: member.externalId ? String(member.externalId) : null,
    postName: member.postName ? String(member.postName) : null,
    orgPath: member.orgPath ? String(member.orgPath) : null,
  };
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function hashPassword(password: string, salt: string): string {
  return sha256Hex(`${salt}:${password}`);
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
    if (kind === 'members') {
      await ensureMembersSeeded(this.prisma);
      return { kind, payload: await readMembersDoc(this.prisma) };
    }
    if (kind === 'auth-credentials') return { kind, payload: await readCredentialsDoc(this.prisma) };
    if (kind === 'skill-reviews') return { kind, payload: await readSkillReviewsDoc(this.prisma) };

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
      if (kind === 'home-featured') {
        return { kind, payload: homeFeaturedPayloadForRead(row.payload) };
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
    if (kind === 'auth-credentials') {
      const { doc, skipped } = await writeCredentialsDoc(this.prisma, payload);
      if (skipped.length) {
        this.logger.warn(`密码表里有找不到成员的邮箱，已跳过：${skipped.join(', ')}`);
      }
      return { kind, payload: doc };
    }
    if (kind === 'members') {
      return { kind, payload: await writeMembersDoc(this.prisma, payload) };
    }
    if (kind === 'home-featured') {
      return this.putRevisionedDoc(workspaceId, 'home-featured', payload, (input) => ({
        version: 1,
        channels: canonicalizeHomeFeaturedInput(input),
      }));
    }
    if (kind === 'station-announcements') {
      return this.putStationAnnouncementsDoc(workspaceId, payload);
    }
    const id = docId(workspaceId, kind);
    await this.prisma.centerRecord.upsert({
      where: { id },
      create: {
        id,
        kind: `doc:${kind}`,
        payload: (payload ?? {}) as Prisma.InputJsonValue,
      },
      update: {
        payload: (payload ?? {}) as Prisma.InputJsonValue,
      },
    });
    return { kind, payload };
  }

  /**
   * 公告发布：先规范化落库（带 revision 乐观锁，避免两个运营互相覆盖），
   * 再把变更同步成全员广播消息，首页的「未读」和我的消息的详情都挂在它上面。
   */
  private async putStationAnnouncementsDoc(workspaceId: string, payload: unknown) {
    const existing = await this.prisma.centerRecord.findUnique({
      where: { id: docId(workspaceId, 'station-announcements') },
    });
    const previous = canonicalizeStationAnnouncements(existing?.payload).items;
    const saved = await this.putRevisionedDoc(
      workspaceId,
      'station-announcements',
      payload,
      (input) => canonicalizeStationAnnouncements(input),
    );
    const next = canonicalizeStationAnnouncements(saved.payload).items;
    try {
      await syncStationAnnouncementBroadcast(
        this.prisma,
        previous,
        next,
      );
    } catch (error) {
      // 文档已经写成功；广播失败不能把一次成功的发布判成失败。同步是幂等的，
      // 下一次保存会重新对齐，首页在缺记录时也按未读展示。
      this.logger.warn(
        `station_announcement_broadcast_failed:${workspaceId}:${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
    return saved;
  }

  async listDocs(workspaceId: string) {
    await this.ensureWorkspace(workspaceId);
    const rows = await this.prisma.centerRecord.findMany({
      where: { kind: { startsWith: 'doc:' } },
    });
    const byKind: Record<string, unknown> = {};
    await ensureMembersSeeded(this.prisma);
    byKind.members = await readMembersDoc(this.prisma);
    byKind['auth-credentials'] = await readCredentialsDoc(this.prisma);
    byKind['skill-reviews'] = await readSkillReviewsDoc(this.prisma);
    for (const kind of PLATFORM_DOC_KINDS) {
      if (kind === 'members' || kind === 'auth-credentials' || kind === 'skill-reviews') continue;
      const row = rows.find((r) => r.id === docId(workspaceId, kind));
      if (row && kind === 'external-tool-layout') {
        byKind[kind] = externalToolLayoutPayloadForRead(row.payload);
      } else if (row && kind === 'internal-office-scenes') {
        byKind[kind] = officeScenePayloadForRead(row.payload);
      } else if (row && kind === 'home-featured') {
        byKind[kind] = homeFeaturedPayloadForRead(row.payload);
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

  /**
   * 带 revision 的 compare-and-swap 写入。首页精选 / 站内公告都是「整份覆盖」的文档，
   * 没有版本校验时，两个管理员各自基于陈旧快照提交就会互相抹掉对方的改动。
   */
  private async putRevisionedDoc(
    workspaceId: string,
    kind: 'home-featured' | 'station-announcements',
    payload: unknown,
    canonicalize: (input: unknown) => Record<string, unknown>,
  ) {
    const expectedRevision = docRevision(payload);
    const id = docId(workspaceId, kind);
    const existing = await this.prisma.centerRecord.findUnique({ where: { id } });
    const currentRevision = existing ? docRevision(existing.payload) : 0;

    if (expectedRevision !== currentRevision) {
      throw new ConflictException({
        error: `${kind.replace(/-/g, '_')}_revision_conflict`,
        expectedRevision,
        currentRevision,
      });
    }

    const nextPayload = {
      ...canonicalize(payload),
      revision: currentRevision + 1,
    };

    if (!existing) {
      try {
        await this.prisma.centerRecord.create({
          data: {
            id,
            kind: `doc:${kind}`,
            payload: nextPayload as unknown as Prisma.InputJsonValue,
          },
        });
      } catch (error) {
        const raced = await this.prisma.centerRecord.findUnique({ where: { id } });
        if (raced) {
          throw new ConflictException({
            error: `${kind.replace(/-/g, '_')}_revision_conflict`,
            expectedRevision,
            currentRevision: docRevision(raced.payload),
          });
        }
        throw error;
      }
      return { kind, payload: nextPayload };
    }

    const changed = await this.compareAndSwapPayload(id, JSON.stringify(nextPayload), expectedRevision);

    if (changed !== 1) {
      const raced = await this.prisma.centerRecord.findUnique({ where: { id } });
      throw new ConflictException({
        error: `${kind.replace(/-/g, '_')}_revision_conflict`,
        expectedRevision,
        currentRevision: raced ? docRevision(raced.payload) : 0,
      });
    }

    return { kind, payload: nextPayload };
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

    const changed = await this.compareAndSwapPayload(id, JSON.stringify(nextPayload), expectedRevision);

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

    const changed = await this.compareAndSwapPayload(id, JSON.stringify(nextPayload), expectedRevision);

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
    if (!email || !password) throw new BadRequestException('email_and_password_required');

    await ensureMembersSeeded(this.prisma);
    const member = await this.prisma.member.findUnique({ where: { email }, include: { credential: true } });
    if (!member || member.status === 'suspended') {
      return { ok: false, error: '账号不存在或已停用' };
    }

    // 没设密码的成员只在口令策略放行时可以用演示口令登录
    const cred = member.credential;
    let valid = false;
    if (cred) {
      valid = hashPassword(password, cred.salt) === cred.passwordHash;
    } else if ((await readAuthPolicy(this.prisma)).allowDemoPassword && password === 'mssclaw') {
      valid = true;
    }
    if (!valid) {
      return { ok: false, error: cred ? '密码错误' : '该账号尚未设置密码，请联系平台运营' };
    }

    const user = sessionUserForMember(memberToJson(member));
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await createSession(this.prisma, { token, memberId: member.id, authMethod: cred ? 'password' : 'demo', expiresAt });
    await this.recordLogin(user, body.visitorId);
    return { ok: true, user, token, expiresAt: expiresAt.toISOString() };
  }

  /** 登录统计不可反向阻断认证；数据库暂时不可写时保留服务端日志，登录仍正常返回。 */
  private async recordLogin(user: Record<string, unknown>, visitorId?: string) {
    try {
      await this.portalAnalytics.recordDailyLogin({
        workspaceId: PLATFORM_WORKSPACE_ID,
        userId: String(user.id ?? ''),
        visitorId,
      });
    } catch (error) {
      this.logger.warn(
        `Daily login analytics failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * OAuth(IDaaS) 登录落地：身份已由上游证明，这里只负责「找到/建好平台成员」并签发平台令牌。
   *
   * 返回的 code 会一路透传到前端错误面板，每个 code 在
   * docs/auth-oauth-troubleshooting.md 里都有对应的处置办法。
   */
  async loginWithOAuth(input: {
    workspaceId: string;
    email: string;
    externalId: string;
    name: string;
    postName: string;
    orgPath: string;
    visitorId?: string;
    jitProvision: boolean;
    allowedEmailDomains: string[];
    sessionTtlHours: number;
  }): Promise<
    | { ok: true; user: Record<string, unknown>; token: string; expiresAt: string; provisioned: boolean }
    | { ok: false; code: string; error: string; detail?: string }
  > {
    const workspaceId = PLATFORM_WORKSPACE_ID;
    const email = normalizedAccountEmail(input.email);
    const externalId = input.externalId.trim();

    if (!email && !externalId) {
      return {
        ok: false,
        code: 'oauth_identity_empty',
        error: '统一身份没有返回可用的账号信息',
        detail: 'userinfo 里既没取到邮箱/账号也没取到 uuid，需要用 OAUTH_FIELD_* 校正字段名',
      };
    }

    await ensureMembersSeeded(this.prisma);
    // externalId 优先：账号或邮箱变更后仍能认出同一个人
    let member =
      (externalId ? await this.prisma.member.findUnique({ where: { externalId } }) : null) ??
      (email ? await this.prisma.member.findUnique({ where: { email } }) : null);

    let provisioned = false;
    if (!member) {
      if (!input.jitProvision) {
        return {
          ok: false,
          code: 'oauth_identity_unmapped',
          error: '账号尚未开通平台权限，请联系平台运营',
          detail: `未在工作区 ${workspaceId} 的成员表里找到 email=${email || '(空)'} / externalId=${externalId || '(空)'}`,
        };
      }
      if (!email) {
        return {
          ok: false,
          code: 'oauth_jit_needs_email',
          error: '账号尚未开通平台权限，请联系平台运营',
          detail: '开启了自动建号但上游没给邮箱/账号，无法确定成员主键',
        };
      }
      const domain = email.split('@')[1] ?? '';
      if (input.allowedEmailDomains.length && !input.allowedEmailDomains.includes(domain)) {
        return {
          ok: false,
          code: 'oauth_domain_not_allowed',
          error: '该账号不在允许范围内',
          detail: `邮箱域 ${domain} 不在 OAUTH_ALLOWED_EMAIL_DOMAINS(${input.allowedEmailDomains.join(',')}) 内`,
        };
      }
      provisioned = true;
    } else if (member.status === 'suspended') {
      return {
        ok: false,
        code: 'oauth_member_suspended',
        error: '账号已停用，请联系平台运营',
        detail: `成员 ${member.id} status=suspended`,
      };
    }

    // 上游属性以 IDaaS 为准，每次登录刷新；平台侧不提供编辑入口，避免两份数据打架。
    const refreshed = {
      id: member?.id ?? `u-oauth-${randomBytes(4).toString('hex')}`,
      name: input.name || member?.name || email.split('@')[0],
      email: member ? member.email : email,
      externalId: externalId || member?.externalId || null,
      postName: input.postName || member?.postName || null,
      orgPath: input.orgPath || member?.orgPath || null,
    };
    const changed =
      !member ||
      (['name', 'externalId', 'postName', 'orgPath'] as const).some((key) => refreshed[key] !== member![key]);
    if (changed) {
      try {
        member = await saveOAuthMember(this.prisma, refreshed, provisioned);
      } catch (error) {
        // 新成员建不出来就没法签发会话；已有成员回写属性失败不阻断登录（身份已经证明过了）。
        if (provisioned) throw error;
        this.logger.warn(
          `[oauth] 回写成员属性失败（登录继续）：${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const user = sessionUserForMember({ ...memberToJson(member!), ...(changed ? refreshed : {}) });
    const token = randomBytes(24).toString('hex');
    const ttlMs = Math.max(1, input.sessionTtlHours) * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);
    await createSession(this.prisma, { token, memberId: member!.id, authMethod: 'oauth', expiresAt });
    await this.recordLogin(user, input.visitorId);
    return { ok: true, user, token, expiresAt: expiresAt.toISOString(), provisioned };
  }

  async me(token: string | undefined, _workspaceId = PLATFORM_WORKSPACE_ID) {
    if (!token) return { ok: false as const, error: '未登录' };
    const session = await findSession(this.prisma, token);
    if (!session) return { ok: false as const, error: '会话已失效，请重新登录' };
    if (session.expiresAt.getTime() < Date.now()) {
      await deleteSession(this.prisma, token);
      return { ok: false as const, error: '会话已过期，请重新登录' };
    }
    if (session.member.status === 'suspended') return { ok: false as const, error: '无权访问该工作区' };
    // 运营关掉演示口令后，之前用演示口令登录的会话一并作废
    if (session.authMethod === 'demo' && !(await readAuthPolicy(this.prisma)).allowDemoPassword) {
      return { ok: false as const, error: '会话已失效，请重新登录' };
    }
    return {
      ok: true as const,
      user: sessionUserForMember(memberToJson(session.member)),
      token,
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  async logout(token: string | undefined, _workspaceId = PLATFORM_WORKSPACE_ID) {
    if (token) await deleteSession(this.prisma, token);
    return { ok: true as const };
  }

  /**
   * revision 在 JSON payload 里：用条件更新完成 compare-and-swap，避免两个进程读到同一 revision 后互相覆盖。
   * 没有整数 revision 的旧记录按 0 处理。返回更新行数（0 表示被别人抢先）。
   */
  private compareAndSwapPayload(id: string, payload: string, expectedRevision: number) {
    return this.prisma.$executeRaw`
      UPDATE "center_record"
      SET "payload" = ${payload}::jsonb, "updated_at" = now()
      WHERE "id" = ${id}
        AND CASE
          WHEN jsonb_typeof("payload" -> 'revision') = 'number' AND ("payload" ->> 'revision') ~ '^-?[0-9]+$'
          THEN ("payload" ->> 'revision')::bigint
          ELSE 0
        END = ${expectedRevision}::bigint
    `;
  }

  private async ensureWorkspace(_workspaceId: string) {
    await ensureWorkspace(this.prisma);
  }

  private async initialExternalToolLayoutSeed(workspaceId: string) {
    const [marketFeatured, tools] = await Promise.all([
      this.prisma.centerRecord.findFirst({
        where: { kind: 'doc:market-featured' },
        select: { payload: true },
      }),
      readAssets(this.prisma, 'tool'),
    ]);
    return buildExternalToolLayoutSeed(marketFeatured?.payload, { tools });
  }

  private async seedIfNeeded(workspaceId: string, kind: PlatformDocKind): Promise<unknown> {
    const marketSeed =
      kind === 'external-tool-layout'
        ? await this.initialExternalToolLayoutSeed(workspaceId)
        : initialMarketDoc(kind);
    let payload: unknown = {};
    if (marketSeed !== undefined) {
      payload = marketSeed;
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
    } else if (kind === 'content-engagement') {
      payload = { map: {}, votes: {} };
    } else if (kind === 'ai-news-prefs') {
      payload = { byUser: {} };
    } else if (kind === 'asset-approvals') {
      payload = { items: [], watchedByUserId: {} };
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
        kind: `doc:${kind}`,
        payload: payload as Prisma.InputJsonValue,
      },
      update: {},
    });
    return payload;
  }
}
