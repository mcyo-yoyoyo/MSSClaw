/**
 * 外部工具货架的人工运营布局。
 *
 * 工具主数据中的 externalSortOrder / externalCategoryRanks 仍是目录基线；
 * 本文档只记录运营人员显式调整过的 ID 顺序。消费者遇到未列出的工具时，
 * 应继续按工具主数据中的 rank 追加，而不是在这里补写推导结果。
 */

export const EXTERNAL_TOOL_LAYOUT_VERSION = 1;

export type ExternalToolLayoutAllListKey =
  | 'overseasFeaturedIds'
  | 'domesticFeaturedIds'
  | 'overseasMoreOrderIds'
  | 'domesticMoreOrderIds';

export interface ExternalToolLayoutAll {
  overseasFeaturedIds: string[];
  domesticFeaturedIds: string[];
  overseasMoreOrderIds: string[];
  domesticMoreOrderIds: string[];
}

export interface ExternalToolCategoryLayout {
  overseasFeaturedIds: string[];
  domesticFeaturedIds: string[];
  overseasMoreOrderIds: string[];
  domesticMoreOrderIds: string[];
}

export type ExternalToolCategoryFeaturedListKey =
  | 'overseasFeaturedIds'
  | 'domesticFeaturedIds';

export type ExternalToolCategoryMoreListKey =
  | 'overseasMoreOrderIds'
  | 'domesticMoreOrderIds';

export type ExternalToolCategoryListKey =
  | ExternalToolCategoryFeaturedListKey
  | ExternalToolCategoryMoreListKey;

export interface ExternalToolLayoutDocument {
  version: typeof EXTERNAL_TOOL_LAYOUT_VERSION;
  revision: number;
  all: ExternalToolLayoutAll;
  categories: Record<string, ExternalToolCategoryLayout>;
}

export interface ExternalToolLayoutSavePayload extends ExternalToolLayoutDocument {
  expectedRevision: number;
}

export const EXTERNAL_TOOL_LAYOUT_ALL_LIST_KEYS: readonly ExternalToolLayoutAllListKey[] = [
  'overseasFeaturedIds',
  'domesticFeaturedIds',
  'overseasMoreOrderIds',
  'domesticMoreOrderIds',
];

export const EXTERNAL_TOOL_CATEGORY_FEATURED_LIST_KEYS: readonly ExternalToolCategoryFeaturedListKey[] = [
  'overseasFeaturedIds',
  'domesticFeaturedIds',
];

export const EXTERNAL_TOOL_CATEGORY_LIST_KEYS: readonly ExternalToolCategoryListKey[] = [
  ...EXTERNAL_TOOL_CATEGORY_FEATURED_LIST_KEYS,
  'overseasMoreOrderIds',
  'domesticMoreOrderIds',
];

const UNSAFE_CATEGORY_IDS = new Set(['__proto__', 'prototype', 'constructor']);
const CATEGORY_ID_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;
const TOOL_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MAX_CATEGORIES = 100;
const MAX_IDS_PER_LIST = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseRevision(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('invalid_external_tool_layout:revision');
  }
  return value;
}

function normalizeIdList(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new Error(`invalid_external_tool_layout:${path}`);
  if (value.length > MAX_IDS_PER_LIST) {
    throw new Error(`invalid_external_tool_layout:${path}`);
  }
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== 'string' || !TOOL_ID_RE.test(raw.trim())) {
      throw new Error(`invalid_external_tool_layout:${path}`);
    }
    const id = raw.trim();
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function dedupeExternalToolLayoutAllLists(
  all: ExternalToolLayoutAll,
  priority: readonly ExternalToolLayoutAllListKey[] = EXTERNAL_TOOL_LAYOUT_ALL_LIST_KEYS,
): ExternalToolLayoutAll {
  const next = {} as ExternalToolLayoutAll;
  const seen = new Set<string>();
  for (const key of priority) {
    next[key] = all[key].filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
  return next;
}

function dedupeExternalToolCategoryLists(
  layout: ExternalToolCategoryLayout,
  priority: readonly ExternalToolCategoryListKey[] = EXTERNAL_TOOL_CATEGORY_LIST_KEYS,
): ExternalToolCategoryLayout {
  const next = {} as ExternalToolCategoryLayout;
  const seen = new Set<string>();
  for (const key of priority) {
    next[key] = layout[key].filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
  return next;
}

function normalizeCategoryId(value: string): string {
  const id = value.trim().toLowerCase();
  if (!CATEGORY_ID_RE.test(id) || UNSAFE_CATEGORY_IDS.has(id)) {
    throw new Error('invalid_external_tool_layout:category_id');
  }
  return id;
}

export function createEmptyExternalToolLayoutDocument(
  revision = 0,
): ExternalToolLayoutDocument {
  return {
    version: EXTERNAL_TOOL_LAYOUT_VERSION,
    revision: parseRevision(revision),
    all: {
      overseasFeaturedIds: [],
      domesticFeaturedIds: [],
      overseasMoreOrderIds: [],
      domesticMoreOrderIds: [],
    },
    categories: {},
  };
}

/** 严格解析服务端正式快照；坏数据不能用空默认值伪装成数据库真值。 */
export function parseExternalToolLayoutDocument(value: unknown): ExternalToolLayoutDocument {
  if (!isRecord(value)) throw new Error('invalid_external_tool_layout:document');
  if (value.version !== EXTERNAL_TOOL_LAYOUT_VERSION) {
    throw new Error('invalid_external_tool_layout:version');
  }
  if (!isRecord(value.all)) throw new Error('invalid_external_tool_layout:all');
  if (!isRecord(value.categories)) {
    throw new Error('invalid_external_tool_layout:categories');
  }
  if (Object.keys(value.categories).length > MAX_CATEGORIES) {
    throw new Error('invalid_external_tool_layout:categories');
  }

  const normalizedAll = {} as ExternalToolLayoutAll;
  for (const key of EXTERNAL_TOOL_LAYOUT_ALL_LIST_KEYS) {
    normalizedAll[key] = normalizeIdList(value.all[key], `all.${key}`);
  }
  const all = dedupeExternalToolLayoutAllLists(normalizedAll);

  const categories: Record<string, ExternalToolCategoryLayout> = {};
  for (const [rawCategoryId, rawLayout] of Object.entries(value.categories)) {
    const categoryId = normalizeCategoryId(rawCategoryId);
    if (Object.prototype.hasOwnProperty.call(categories, categoryId)) {
      throw new Error(`invalid_external_tool_layout:categories.${categoryId}`);
    }
    if (!isRecord(rawLayout)) {
      throw new Error(`invalid_external_tool_layout:categories.${categoryId}`);
    }
    const normalizedCategory: ExternalToolCategoryLayout = {
      overseasFeaturedIds: normalizeIdList(
        rawLayout.overseasFeaturedIds,
        `categories.${categoryId}.overseasFeaturedIds`,
      ),
      // Version 1 originally persisted only the overseas list. Accept those
      // snapshots during the additive rollout, while every newly serialized
      // document below writes both lists explicitly.
      domesticFeaturedIds:
        rawLayout.domesticFeaturedIds === undefined
          ? []
            : normalizeIdList(
              rawLayout.domesticFeaturedIds,
              `categories.${categoryId}.domesticFeaturedIds`,
            ),
      // 分类 More 排序是 version 1 的增量字段。旧快照未包含时以 Excel
      // 分类排名作为回退；新保存的文档会显式写出两个列表。
      overseasMoreOrderIds:
        rawLayout.overseasMoreOrderIds === undefined
          ? []
          : normalizeIdList(
              rawLayout.overseasMoreOrderIds,
              `categories.${categoryId}.overseasMoreOrderIds`,
            ),
      domesticMoreOrderIds:
        rawLayout.domesticMoreOrderIds === undefined
          ? []
          : normalizeIdList(
              rawLayout.domesticMoreOrderIds,
              `categories.${categoryId}.domesticMoreOrderIds`,
            ),
    };
    categories[categoryId] = dedupeExternalToolCategoryLists(normalizedCategory);
  }

  return {
    version: EXTERNAL_TOOL_LAYOUT_VERSION,
    revision: parseRevision(value.revision),
    all,
    categories,
  };
}

export function cloneExternalToolLayoutDocument(
  document: ExternalToolLayoutDocument,
): ExternalToolLayoutDocument {
  return {
    version: EXTERNAL_TOOL_LAYOUT_VERSION,
    revision: document.revision,
    all: {
      overseasFeaturedIds: [...document.all.overseasFeaturedIds],
      domesticFeaturedIds: [...document.all.domesticFeaturedIds],
      overseasMoreOrderIds: [...document.all.overseasMoreOrderIds],
      domesticMoreOrderIds: [...document.all.domesticMoreOrderIds],
    },
    categories: Object.fromEntries(
      Object.entries(document.categories).map(([categoryId, layout]) => [
        categoryId,
        {
          overseasFeaturedIds: [...layout.overseasFeaturedIds],
          domesticFeaturedIds: [...layout.domesticFeaturedIds],
          overseasMoreOrderIds: [...layout.overseasMoreOrderIds],
          domesticMoreOrderIds: [...layout.domesticMoreOrderIds],
        },
      ]),
    ),
  };
}

export function externalToolLayoutsEqual(
  left: ExternalToolLayoutDocument,
  right: ExternalToolLayoutDocument,
): boolean {
  if (left.revision !== right.revision) return false;
  for (const key of EXTERNAL_TOOL_LAYOUT_ALL_LIST_KEYS) {
    const a = left.all[key];
    const b = right.all[key];
    if (a.length !== b.length || a.some((id, index) => id !== b[index])) return false;
  }
  const leftCategories = Object.keys(left.categories).sort();
  const rightCategories = Object.keys(right.categories).sort();
  if (
    leftCategories.length !== rightCategories.length ||
    leftCategories.some((id, index) => id !== rightCategories[index])
  ) {
    return false;
  }
  return leftCategories.every((categoryId) => {
    const leftLayout = left.categories[categoryId]!;
    const rightLayout = right.categories[categoryId]!;
    return EXTERNAL_TOOL_CATEGORY_LIST_KEYS.every((key) => {
      const a = leftLayout[key];
      const b = rightLayout[key];
      return a.length === b.length && a.every((id, index) => id === b[index]);
    });
  });
}

export function toExternalToolLayoutSavePayload(
  draft: ExternalToolLayoutDocument,
  expectedRevision: number,
): ExternalToolLayoutSavePayload {
  const revision = parseRevision(expectedRevision);
  const canonical = parseExternalToolLayoutDocument({
    ...cloneExternalToolLayoutDocument(draft),
    revision,
  });
  return {
    ...canonical,
    expectedRevision: revision,
  };
}

export function setExternalToolLayoutAllList(
  document: ExternalToolLayoutDocument,
  key: ExternalToolLayoutAllListKey,
  ids: readonly string[],
): ExternalToolLayoutDocument {
  if (!EXTERNAL_TOOL_LAYOUT_ALL_LIST_KEYS.includes(key)) {
    throw new Error('invalid_external_tool_layout:all_list_key');
  }
  const normalizedIds = normalizeIdList([...ids], `all.${key}`);
  const targetIds = new Set(normalizedIds);
  const nextAll: ExternalToolLayoutAll = {
    overseasFeaturedIds: [...document.all.overseasFeaturedIds],
    domesticFeaturedIds: [...document.all.domesticFeaturedIds],
    overseasMoreOrderIds: [...document.all.overseasMoreOrderIds],
    domesticMoreOrderIds: [...document.all.domesticMoreOrderIds],
    [key]: normalizedIds,
  };

  for (const otherKey of EXTERNAL_TOOL_LAYOUT_ALL_LIST_KEYS) {
    if (otherKey === key) continue;
    nextAll[otherKey] = nextAll[otherKey].filter((id) => !targetIds.has(id));
  }

  const all = dedupeExternalToolLayoutAllLists(nextAll, [
    key,
    ...EXTERNAL_TOOL_LAYOUT_ALL_LIST_KEYS.filter((candidate) => candidate !== key),
  ]);
  return {
    ...document,
    all,
  };
}

export function setExternalToolCategoryFeatured(
  document: ExternalToolLayoutDocument,
  categoryId: string,
  ids: readonly string[],
  key: ExternalToolCategoryFeaturedListKey = 'overseasFeaturedIds',
): ExternalToolLayoutDocument {
  return setExternalToolCategoryList(document, categoryId, ids, key);
}

export function setExternalToolCategoryList(
  document: ExternalToolLayoutDocument,
  categoryId: string,
  ids: readonly string[],
  key: ExternalToolCategoryListKey,
): ExternalToolLayoutDocument {
  const normalizedCategoryId = normalizeCategoryId(categoryId);
  if (!EXTERNAL_TOOL_CATEGORY_LIST_KEYS.includes(key)) {
    throw new Error('invalid_external_tool_layout:category_list_key');
  }
  const previous = document.categories[normalizedCategoryId] ?? {
    overseasFeaturedIds: [],
    domesticFeaturedIds: [],
    overseasMoreOrderIds: [],
    domesticMoreOrderIds: [],
  };
  const normalizedIds = normalizeIdList(
    [...ids],
    `categories.${normalizedCategoryId}.${key}`,
  );
  const targetIds = new Set(normalizedIds);
  const nextLayout = {
    ...previous,
    [key]: normalizedIds,
  };
  for (const otherKey of EXTERNAL_TOOL_CATEGORY_LIST_KEYS) {
    if (otherKey === key) continue;
    nextLayout[otherKey] = nextLayout[otherKey].filter((id) => !targetIds.has(id));
  }
  const canonicalLayout = dedupeExternalToolCategoryLists(nextLayout, [
    key,
    ...EXTERNAL_TOOL_CATEGORY_LIST_KEYS.filter((candidate) => candidate !== key),
  ]);
  const categories = { ...document.categories };
  if (EXTERNAL_TOOL_CATEGORY_LIST_KEYS.every((listKey) => canonicalLayout[listKey].length === 0)) {
    delete categories[normalizedCategoryId];
  } else {
    categories[normalizedCategoryId] = canonicalLayout;
  }
  return {
    ...document,
    categories,
  };
}

export function reorderExternalToolIds(
  ids: readonly string[],
  activeId: string,
  overId: string | null,
): string[] {
  const normalized = normalizeIdList([...ids], 'reorder');
  const sourceIndex = normalized.indexOf(activeId);
  if (sourceIndex < 0) return normalized;
  if (overId === activeId) return normalized;

  const targetIndex = overId === null ? normalized.length - 1 : normalized.indexOf(overId);
  if (targetIndex < 0) return normalized;

  const next = [...normalized];
  const [moved] = next.splice(sourceIndex, 1);
  if (!moved) return normalized;
  next.splice(targetIndex, 0, moved);
  return next;
}

/** Move or insert one tool immediately before the hovered tool. */
export function insertExternalToolIdBefore(
  ids: readonly string[],
  id: string,
  beforeId: string | null,
): string[] {
  const normalized = normalizeIdList([...ids], 'insert_before');
  const [normalizedId] = normalizeIdList([id], 'insert_before.id');
  if (!normalizedId || normalizedId === beforeId) return normalized;
  const next = normalized.filter((candidate) => candidate !== normalizedId);
  const index = beforeId === null ? next.length : next.indexOf(beforeId);
  next.splice(index < 0 ? next.length : index, 0, normalizedId);
  return next;
}

/**
 * 将显式运营顺序投影到已按目录 rank 排好的卡片上。
 * 未出现在 layout 中的新工具保持输入顺序并追加，避免保存时复制推导出来的 rank。
 */
export function orderExternalToolsByLayoutIds<T extends { id: string }>(
  itemsInFallbackOrder: readonly T[],
  explicitIds: readonly string[],
): T[] {
  const byId = new Map(itemsInFallbackOrder.map((item) => [item.id, item]));
  const ordered: T[] = [];
  const used = new Set<string>();
  for (const id of explicitIds) {
    const item = byId.get(id);
    if (!item || used.has(id)) continue;
    used.add(id);
    ordered.push(item);
  }
  for (const item of itemsInFallbackOrder) {
    if (used.has(item.id)) continue;
    used.add(item.id);
    ordered.push(item);
  }
  return ordered;
}

/**
 * 将可见卡片的新顺序写回配置时，把暂时不可用的 parked ID 放回原有槽位。
 *
 * 槽位以仍留在 visibleIds 中的旧配置项为锚点计数；因此可见项可以自由重排，
 * parked ID 仍会保留在开头、中间或末尾，而不是被统一追加到列表末端。
 */
export function mergeExternalToolLayoutVisibleAndParkedIds(
  visibleIds: readonly string[],
  configuredIds: readonly string[],
  availableIds: ReadonlySet<string>,
): string[] {
  const visible = normalizeIdList([...visibleIds], 'merge.visibleIds');
  const configured = normalizeIdList([...configuredIds], 'merge.configuredIds');
  const visibleSet = new Set(visible);
  const survivingAnchors = new Set(
    configured.filter((id) => visibleSet.has(id)),
  );
  const parkedBySlot: string[][] = [];
  let slot = 0;

  for (const id of configured) {
    if (survivingAnchors.has(id)) {
      slot += 1;
      continue;
    }
    if (availableIds.has(id)) continue;
    (parkedBySlot[slot] ??= []).push(id);
  }

  const merged: string[] = [];
  const emitParked = (index: number) => {
    const parked = parkedBySlot[index];
    if (parked) merged.push(...parked);
  };

  emitParked(0);
  let passedAnchors = 0;
  for (const id of visible) {
    merged.push(id);
    if (!survivingAnchors.has(id)) continue;
    passedAnchors += 1;
    emitParked(passedAnchors);
  }
  return merged;
}

export function reorderExternalToolLayoutAllList(
  document: ExternalToolLayoutDocument,
  key: ExternalToolLayoutAllListKey,
  activeId: string,
  overId: string | null,
): ExternalToolLayoutDocument {
  return setExternalToolLayoutAllList(
    document,
    key,
    reorderExternalToolIds(document.all[key], activeId, overId),
  );
}

export function reorderExternalToolCategoryFeatured(
  document: ExternalToolLayoutDocument,
  categoryId: string,
  activeId: string,
  overId: string | null,
  key: ExternalToolCategoryFeaturedListKey = 'overseasFeaturedIds',
): ExternalToolLayoutDocument {
  return reorderExternalToolCategoryList(
    document,
    categoryId,
    activeId,
    overId,
    key,
  );
}

export function reorderExternalToolCategoryList(
  document: ExternalToolLayoutDocument,
  categoryId: string,
  activeId: string,
  overId: string | null,
  key: ExternalToolCategoryListKey,
): ExternalToolLayoutDocument {
  const ids = document.categories[categoryId]?.[key] ?? [];
  return setExternalToolCategoryList(
    document,
    categoryId,
    reorderExternalToolIds(ids, activeId, overId),
    key,
  );
}

export function addExternalToolCategoryFeatured(
  document: ExternalToolLayoutDocument,
  categoryId: string,
  toolId: string,
  beforeId: string | null = null,
  key: ExternalToolCategoryFeaturedListKey = 'overseasFeaturedIds',
): ExternalToolLayoutDocument {
  const id = toolId.trim();
  if (!id) throw new Error('invalid_external_tool_layout:tool_id');
  const current = document.categories[categoryId]?.[key] ?? [];
  const withoutTool = current.filter((candidate) => candidate !== id);
  const targetIndex = beforeId === null ? withoutTool.length : withoutTool.indexOf(beforeId);
  if (targetIndex < 0) {
    return setExternalToolCategoryFeatured(document, categoryId, current, key);
  }
  const next = [...withoutTool];
  next.splice(targetIndex, 0, id);
  return setExternalToolCategoryFeatured(document, categoryId, next, key);
}

export function removeExternalToolCategoryFeatured(
  document: ExternalToolLayoutDocument,
  categoryId: string,
  toolId: string,
  key: ExternalToolCategoryFeaturedListKey = 'overseasFeaturedIds',
): ExternalToolLayoutDocument {
  const current = document.categories[categoryId]?.[key] ?? [];
  return setExternalToolCategoryFeatured(
    document,
    categoryId,
    current.filter((id) => id !== toolId),
    key,
  );
}
