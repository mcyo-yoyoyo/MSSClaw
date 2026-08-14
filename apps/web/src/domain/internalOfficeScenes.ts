/**
 * 公司工具推荐 · Demo 对齐办公场景（记/读/写/问/…）
 * 默认结构写死；运营可通过 catalog store 覆盖文案 / 可见 / 工具绑定
 * 立即体验 URL / Logo 优先读配置工具（marketplace）主数据
 */

import { internalToolAssetUrl, resolveToolLogoUrl } from '@/domain/toolLogo';
import type { PrototypeToolSeed } from '@/domain/prototype/types';

export type InternalOfficeSceneId =
  | 'capture'
  | 'read'
  | 'write'
  | 'ask'
  | 'search'
  | 'specialist'
  | 'intel'
  | 'knowledge'
  | 'agent';

export const INTERNAL_OFFICE_SCENE_IDS: InternalOfficeSceneId[] = [
  'write',
  'capture',
  'search',
  'ask',
  'read',
  'specialist',
  'intel',
  'knowledge',
  'agent',
];

export function isInternalOfficeSceneId(id: string): id is InternalOfficeSceneId {
  return (INTERNAL_OFFICE_SCENE_IDS as string[]).includes(id);
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

const EMPLOYEE_ASSISTANT: InternalOfficeSceneTool = {
  id: 'tool-hw-assistant',
  name: '员工助手',
  blurb: '个人日常 Skill',
  homepageUrl:
    'https://his.huawei.com/csop/index.html#/ToolInfo?samType=his&toolId=1706591788617216002',
  logoUrl: internalToolAssetUrl('employee-assistant.png'),
};

const CLOUD_NOTE: InternalOfficeSceneTool = {
  id: 'tool-hw-cloudnote',
  name: '云笔记',
  blurb: '写报告与会议纪要',
  homepageUrl: 'https://wenote.huawei.com/wenoteapp',
  logoUrl: internalToolAssetUrl('cloud-note.png'),
};

const W3_SEARCH: InternalOfficeSceneTool = {
  id: 'tool-hw-w3-qa',
  name: 'W3智能搜索',
  blurb: '查制度与内部入口',
  homepageUrl: 'https://ai.huawei.com/w3Copilot/index.html#/home?lang=zh',
  logoUrl: internalToolAssetUrl('w3-search.png'),
};

const XIAOLUBAN: InternalOfficeSceneTool = {
  id: 'tool-hw-xiaoluban',
  name: '小鲁班',
  blurb: '专项业务答疑',
  homepageUrl:
    'https://openx.huawei.com/%E5%B0%8F%E9%B2%81%E7%8F%ADwelink%E6%9C%BA%E5%99%A8%E4%BA%BA/overview',
  logoUrl: internalToolAssetUrl('xiaoluban.jpg'),
};

/** 按工作场景推荐：要做什么 → 用哪个工具 */
export const INTERNAL_OFFICE_SCENES: InternalOfficeScene[] = [
  {
    id: 'write',
    label: '写报告用云笔记',
    english: 'WRITE',
    description: '周报、方案、工作总结边写边沉淀，首选云笔记',
    tools: [CLOUD_NOTE],
    icon: 'fa-file-lines',
  },
  {
    id: 'capture',
    label: '开会纪要用云笔记',
    english: 'CAPTURE',
    description: '会后自动成稿，可回看、可执行、可继续改',
    tools: [CLOUD_NOTE],
    icon: 'fa-pen-to-square',
  },
  {
    id: 'search',
    label: '查制度用W3智能搜索',
    english: 'SEARCH',
    description: '制度、入口、内部资料一搜即达，不必在群里问人',
    tools: [W3_SEARCH],
    icon: 'fa-magnifying-glass',
  },
  {
    id: 'ask',
    label: '个人Skill用员工助手',
    english: 'ASK',
    description: '日常提问、总结、润色，当个人助手用就对了',
    tools: [EMPLOYEE_ASSISTANT],
    icon: 'fa-comments',
  },
  {
    id: 'read',
    label: '读材料用员工助手',
    english: 'READ',
    description: '快速读懂文档与报告，提炼观点、数据和风险',
    tools: [EMPLOYEE_ASSISTANT],
    icon: 'fa-book-open',
  },
  {
    id: 'specialist',
    label: '专项答疑用小鲁班',
    english: 'SPECIALIST',
    description: '深入某一业务领域连续追问，比通用问答更贴场景',
    tools: [XIAOLUBAN],
    icon: 'fa-screwdriver-wrench',
  },
  {
    id: 'intel',
    label: '情报监测用员工助手',
    english: 'INTELLIGENCE',
    description: '围绕关注主题筛选研判，让信息从人找变成主动送',
    tools: [EMPLOYEE_ASSISTANT],
    icon: 'fa-binoculars',
  },
  {
    id: 'knowledge',
    label: '建知识库用员工助手',
    english: 'KNOWLEDGE',
    description: '把沉淀资料变成可问答的知识，团队里真正被用起来',
    tools: [EMPLOYEE_ASSISTANT],
    icon: 'fa-database',
  },
  {
    id: 'agent',
    label: '拆任务用员工助手',
    english: 'EXECUTE',
    description: '给出目标后拆解任务、调用工具并推进交付',
    tools: [EMPLOYEE_ASSISTANT],
    icon: 'fa-robot',
  },
];

const DEFAULT_TOOL_BY_ID = (() => {
  const map = new Map<string, InternalOfficeSceneTool>();
  for (const scene of INTERNAL_OFFICE_SCENES) {
    for (const tool of scene.tools) {
      if (!map.has(tool.id)) map.set(tool.id, tool);
    }
  }
  return map;
})();

export function defaultInternalOfficeSceneCatalog(): InternalOfficeSceneCatalogEntry[] {
  return INTERNAL_OFFICE_SCENES.map((s) => ({
    id: s.id,
    label: s.label,
    english: s.english,
    description: s.description,
    icon: s.icon,
    /** 首屏只留高频工作场景；情报 / 知识库 / Agent 默认收起 */
    visible: s.id !== 'agent' && s.id !== 'intel' && s.id !== 'knowledge',
    toolIds: s.tools.map((t) => t.id),
    toolBlurbs: Object.fromEntries(s.tools.map((t) => [t.id, t.blurb])),
  }));
}

let activeCatalog: InternalOfficeSceneCatalogEntry[] | null = null;

export function setInternalOfficeSceneCatalog(
  entries: InternalOfficeSceneCatalogEntry[],
): void {
  activeCatalog = entries;
}

export function getInternalOfficeSceneCatalog(): InternalOfficeSceneCatalogEntry[] {
  return activeCatalog ?? defaultInternalOfficeSceneCatalog();
}

export function getInternalOfficeScene(id: string): InternalOfficeScene | undefined {
  return materializeOfficeScenes(getInternalOfficeSceneCatalog(), []).find(
    (s) => s.id === id,
  );
}

/** 种子默认工具表（不含运营新绑定的配置工具） */
export function listDefaultInternalOfficeTools(): InternalOfficeSceneTool[] {
  return [...DEFAULT_TOOL_BY_ID.values()];
}

function seedToolOrFallback(
  toolId: string,
  blurb: string | undefined,
  catalog?: PrototypeToolSeed | null,
): InternalOfficeSceneTool {
  const seed = DEFAULT_TOOL_BY_ID.get(toolId);
  const base: InternalOfficeSceneTool = seed
    ? { ...seed, blurb: blurb?.trim() || seed.blurb }
    : {
        id: toolId,
        name: catalog?.name?.trim() || toolId,
        blurb: blurb?.trim() || catalog?.desc?.trim() || '内部工具',
        homepageUrl: catalog?.homepageUrl?.trim() || '#',
        logoUrl:
          catalog?.logoUrl?.trim() ||
          resolveToolLogoUrl(
            catalog ?? {
              logoUrl: undefined,
              homepageUrl: undefined,
              sourceType: 'internal',
              tags: ['hw-internal'],
            },
          ) ||
          '',
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

export const INTERNAL_OFFICE_SCENE_ICON_PRESETS = [
  'fa-pen-to-square',
  'fa-book-open',
  'fa-file-lines',
  'fa-comments',
  'fa-magnifying-glass',
  'fa-screwdriver-wrench',
  'fa-binoculars',
  'fa-database',
  'fa-robot',
  'fa-briefcase',
  'fa-lightbulb',
  'fa-users',
] as const;
