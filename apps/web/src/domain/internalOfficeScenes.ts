/**
 * 内部办公推荐场景模型。
 * 场景字典由数据库文档提供，工具信息由 marketplace 数据库快照提供。
 */

import { resolveToolLogoUrl } from '@/domain/toolLogo';
import type { PrototypeToolSeed } from '@/domain/prototype/types';

/**
 * 场景 id 允许运营自建，因此是开放字符串而非固定联合类型。
 * 早期版本写死 9 个 id，导致新增场景在 hydrate 时被过滤掉。
 */
export type InternalOfficeSceneId = string;

/** 只校验形态：非空、限定字符集，避免脏 id 进入持久化 */
export function isInternalOfficeSceneId(id: string): id is InternalOfficeSceneId {
  return /^[a-z0-9][a-z0-9-]{0,47}$/i.test(id.trim());
}

/** 生成不与现有条目冲突的自建场景 id */
export function createOfficeSceneId(existingIds: string[]): string {
  const taken = new Set(existingIds);
  for (let i = 1; i < 1000; i += 1) {
    const candidate = `scene-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `scene-${Date.now()}`;
}

export interface InternalOfficeSceneTool {
  id: string;
  name: string;
  blurb: string;
  homepageUrl: string;
  logoUrl: string;
}

export interface InternalOfficeScene {
  id: InternalOfficeSceneId;
  label: string;
  english: string;
  description: string;
  /** 场景下产品；多个时先弹层再选 */
  tools: InternalOfficeSceneTool[];
  icon: string;
}

/** 运营可持久化的场景字典条目 */
export interface InternalOfficeSceneCatalogEntry {
  id: InternalOfficeSceneId;
  label: string;
  english: string;
  description: string;
  icon: string;
  visible: boolean;
  /** 绑定工具 id（配置工具 / 默认种子） */
  toolIds: string[];
  /** 场景内工具一句说明 */
  toolBlurbs: Record<string, string>;
}

let activeCatalog: InternalOfficeSceneCatalogEntry[] | null = null;

export function setInternalOfficeSceneCatalog(
  entries: InternalOfficeSceneCatalogEntry[],
): void {
  activeCatalog = entries;
}

export function getInternalOfficeSceneCatalog(): InternalOfficeSceneCatalogEntry[] {
  return activeCatalog ?? [];
}

export function getInternalOfficeScene(id: string): InternalOfficeScene | undefined {
  return materializeOfficeScenes(getInternalOfficeSceneCatalog(), []).find(
    (s) => s.id === id,
  );
}

function seedToolOrFallback(
  toolId: string,
  blurb: string | undefined,
  catalog?: PrototypeToolSeed | null,
): InternalOfficeSceneTool {
  const base: InternalOfficeSceneTool = {
    id: toolId,
    name: catalog?.name?.trim() || toolId,
    blurb: blurb?.trim() || catalog?.desc?.trim() || '内部工具',
    homepageUrl: catalog?.homepageUrl?.trim() || '#',
    logoUrl: catalog ? catalog.logoUrl?.trim() || resolveToolLogoUrl(catalog) || '' : '',
  };
  return resolveOfficeToolWithCatalog(base, catalog);
}

/** 配置工具主数据是否可用于前台办公场景（已发布且存在） */
export function isOfficeCatalogToolEligible(
  catalog?: PrototypeToolSeed | null,
): boolean {
  return Boolean(catalog && catalog.published !== false);
}

/** 场景引用的去重工具（稳定顺序；含运营绑定；仅已发布主数据） */
export function listInternalOfficeCatalogTools(
  entries: InternalOfficeSceneCatalogEntry[] = getInternalOfficeSceneCatalog(),
  catalogTools: PrototypeToolSeed[] = [],
): InternalOfficeSceneTool[] {
  const byId = new Map(catalogTools.map((t) => [t.id, t]));
  const map = new Map<string, InternalOfficeSceneTool>();
  for (const entry of entries.filter((e) => e.visible !== false)) {
    for (const toolId of entry.toolIds) {
      if (map.has(toolId)) continue;
      const catalog = byId.get(toolId);
      if (!isOfficeCatalogToolEligible(catalog)) continue;
      map.set(
        toolId,
        seedToolOrFallback(toolId, entry.toolBlurbs?.[toolId], catalog),
      );
    }
  }
  return [...map.values()];
}

/** 配置工具主数据优先：链接 / 名称 / Logo */
export function resolveOfficeToolWithCatalog(
  sceneTool: InternalOfficeSceneTool,
  catalog?: PrototypeToolSeed | null,
): InternalOfficeSceneTool {
  if (!catalog) return sceneTool;
  const home = catalog.homepageUrl?.trim();
  const logo = catalog.logoUrl?.trim();
  return {
    ...sceneTool,
    name: catalog.name?.trim() || sceneTool.name,
    homepageUrl: home && home !== '#' ? home : sceneTool.homepageUrl,
    logoUrl: logo || sceneTool.logoUrl,
  };
}

export function materializeOfficeScenes(
  entries: InternalOfficeSceneCatalogEntry[],
  catalogTools: PrototypeToolSeed[],
  opts?: { includeHidden?: boolean },
): InternalOfficeScene[] {
  const byId = new Map(catalogTools.map((t) => [t.id, t]));
  return entries
    .filter((e) => opts?.includeHidden || e.visible !== false)
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      english: entry.english,
      description: entry.description,
      icon: entry.icon,
      tools: entry.toolIds.flatMap((toolId) => {
        const catalog = byId.get(toolId);
        if (!isOfficeCatalogToolEligible(catalog)) return [];
        return [
          seedToolOrFallback(toolId, entry.toolBlurbs?.[toolId], catalog),
        ];
      }),
    }));
}

export function resolveOfficeScenesWithCatalog(
  catalogTools: PrototypeToolSeed[],
  entries: InternalOfficeSceneCatalogEntry[] = getInternalOfficeSceneCatalog(),
): InternalOfficeScene[] {
  return materializeOfficeScenes(entries, catalogTools);
}
