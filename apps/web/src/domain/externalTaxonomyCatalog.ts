/**
 * 外精选分类字典：默认写死在 EXTERNAL_*；运营可改文案 / 可见 / 顺序 / 场景关联类型
 */

import {
  EXTERNAL_TOOL_TYPES,
  EXTERNAL_WORK_SCENES,
  type ExternalToolTypeId,
  type ExternalWorkSceneId,
} from '@/domain/externalToolTaxonomy';

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
