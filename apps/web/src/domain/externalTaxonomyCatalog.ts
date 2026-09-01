/**
 * 外精选分类字典：默认写死在 EXTERNAL_*；运营可改文案 / 可见 / 顺序 / 场景关联类型
 */

import {
  EXTERNAL_TOOL_TYPES,
  EXTERNAL_WORK_SCENES,
  type ExternalToolTypeId,
  type ExternalWorkSceneId,
} from './externalToolTaxonomy.ts';

export interface ExternalToolTypeCatalogEntry {
  id: ExternalToolTypeId;
  label: string;
  csvLabel: string;
  icon: string;
  visible: boolean;
  filterTypeIds: ExternalToolTypeId[];
}

export interface ExternalWorkSceneCatalogEntry {
  id: ExternalWorkSceneId;
  label: string;
  icon: string;
  visible: boolean;
  typeIds: ExternalToolTypeId[];
}

export interface ExternalTaxonomyCatalog {
  version: number;
  types: ExternalToolTypeCatalogEntry[];
  scenes: ExternalWorkSceneCatalogEntry[];
}

export function defaultExternalTaxonomyCatalog(): ExternalTaxonomyCatalog {
  return {
    version: 2,
    types: EXTERNAL_TOOL_TYPES.map((t) => ({
      id: t.id,
      label: t.label,
      csvLabel: t.csvLabel,
      icon: t.icon,
      visible: t.visible !== false,
      filterTypeIds: [...(t.filterTypeIds ?? [t.id])],
    })),
    scenes: EXTERNAL_WORK_SCENES.map((s) => ({
      id: s.id,
      label: s.label,
      icon: s.icon,
      visible: true,
      typeIds: [...(s.typeIds ?? [])],
    })),
  };
}

let active: ExternalTaxonomyCatalog | null = null;

export function setExternalTaxonomyCatalog(catalog: ExternalTaxonomyCatalog): void {
  active = catalog;
}

export function getExternalTaxonomyCatalog(): ExternalTaxonomyCatalog {
  return active ?? defaultExternalTaxonomyCatalog();
}

export function listVisibleExternalToolTypes(
  catalog: ExternalTaxonomyCatalog = getExternalTaxonomyCatalog(),
): ExternalToolTypeCatalogEntry[] {
  return catalog.types.filter((t) => t.visible !== false);
}

export function listVisibleExternalWorkScenes(
  catalog: ExternalTaxonomyCatalog = getExternalTaxonomyCatalog(),
): ExternalWorkSceneCatalogEntry[] {
  return catalog.scenes.filter((s) => s.visible !== false);
}

export interface ExternalToolTypeSelectionValue {
  toolTypeId?: string;
  toolTypeIds?: readonly string[];
}

/** 多分类字段优先；兼容旧数据仅保存的单一 toolTypeId。 */
export function resolveExternalToolTypeSelection(
  value: ExternalToolTypeSelectionValue,
): string[] {
  const source = value.toolTypeIds?.length
    ? value.toolTypeIds
    : value.toolTypeId
      ? [value.toolTypeId]
      : [];
  return [...new Set(source.map((id) => String(id).trim()).filter(Boolean))];
}

function acceptedTypeIds(entry: ExternalToolTypeCatalogEntry): ExternalToolTypeId[] {
  return entry.filterTypeIds?.length ? entry.filterTypeIds : [entry.id];
}

/** 可见聚合分类（如 knowledge）也能回显其隐藏底层类型（如 writing）。 */
export function externalToolTypeEntryIsSelected(
  selectedIds: readonly string[],
  entry: ExternalToolTypeCatalogEntry,
): boolean {
  const selected = new Set(selectedIds);
  return acceptedTypeIds(entry).some((id) => selected.has(id));
}

/**
 * 切换一个用户页分类：选中时写分类自身的稳定 ID；取消时同时移除该分类覆盖的
 * 隐藏底层 ID。未知旧 ID 保留，避免编辑其它字段时静默丢数据。
 */
export function toggleExternalToolTypeSelection(
  selectedIds: readonly string[],
  entry: ExternalToolTypeCatalogEntry,
  catalog: ExternalTaxonomyCatalog = getExternalTaxonomyCatalog(),
): string[] {
  const next = new Set(selectedIds.map((id) => String(id).trim()).filter(Boolean));
  const accepted = acceptedTypeIds(entry);
  if (accepted.some((id) => next.has(id))) {
    accepted.forEach((id) => next.delete(id));
    next.delete(entry.id);
  } else {
    next.add(entry.id);
  }

  const positions = new Map(catalog.types.map((type, index) => [type.id, index]));
  return [...next].sort(
    (left, right) =>
      (positions.get(left as ExternalToolTypeId) ?? Number.MAX_SAFE_INTEGER) -
      (positions.get(right as ExternalToolTypeId) ?? Number.MAX_SAFE_INTEGER),
  );
}

/** 当前用户页会展示的分类文案；隐藏且未被聚合覆盖的旧分类继续可见。 */
export function externalToolTypeSelectionLabels(
  selectedIds: readonly string[],
  catalog: ExternalTaxonomyCatalog = getExternalTaxonomyCatalog(),
): string[] {
  const selected = new Set(selectedIds);
  const visibleSelected = listVisibleExternalToolTypes(catalog).filter((entry) =>
    externalToolTypeEntryIsSelected(selectedIds, entry),
  );
  const coveredIds = new Set(visibleSelected.flatMap((entry) => acceptedTypeIds(entry)));
  const labels = visibleSelected.map((entry) => entry.label);

  catalog.types.forEach((entry) => {
    if (entry.visible !== false || !selected.has(entry.id) || coveredIds.has(entry.id)) return;
    labels.push(entry.label);
  });
  selectedIds.forEach((id) => {
    if (!catalog.types.some((entry) => entry.id === id)) labels.push(id);
  });
  return [...new Set(labels)];
}

export function resolveExternalToolTypeMeta(
  id: ExternalToolTypeId | string | undefined,
  catalog: ExternalTaxonomyCatalog = getExternalTaxonomyCatalog(),
): ExternalToolTypeCatalogEntry | undefined {
  return catalog.types.find((t) => t.id === id);
}

export function toolMatchesExternalTypeCatalog(
  toolTypeId: string | readonly string[] | undefined,
  filter: ExternalToolTypeId | 'all',
  catalog: ExternalTaxonomyCatalog = getExternalTaxonomyCatalog(),
): boolean {
  if (filter === 'all') return true;
  const meta = catalog.types.find((t) => t.id === filter);
  const values = (Array.isArray(toolTypeId) ? toolTypeId : [toolTypeId]).filter(Boolean);
  const accepted = meta?.filterTypeIds?.length ? meta.filterTypeIds : [filter];
  return values.some((value) => accepted.includes(value as ExternalToolTypeId));
}

export function toolMatchesExternalSceneCatalog(
  tool: { id: string; toolTypeId?: string },
  scene: ExternalWorkSceneId | 'all',
  catalog: ExternalTaxonomyCatalog = getExternalTaxonomyCatalog(),
): boolean {
  if (scene === 'all') return true;
  const meta = catalog.scenes.find((s) => s.id === scene);
  // 未配置或显式清空关联类型 → 无工具命中（避免「空关联 = 全部」）
  if (!meta?.typeIds?.length) return false;
  return Boolean(
    tool.toolTypeId && meta.typeIds.includes(tool.toolTypeId as ExternalToolTypeId),
  );
}

export const EXTERNAL_TYPE_ICON_PRESETS = [
  'fa-comments',
  'fa-magnifying-glass',
  'fa-book',
  'fa-pen',
  'fa-file-powerpoint',
  'fa-image',
  'fa-video',
  'fa-microphone',
  'fa-users',
  'fa-chart-line',
  'fa-code',
  'fa-robot',
] as const;
