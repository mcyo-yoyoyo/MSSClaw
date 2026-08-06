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
  | 'intel'
  | 'knowledge'
  | 'agent';

export const INTERNAL_OFFICE_SCENE_IDS: InternalOfficeSceneId[] = [
  'capture',
  'read',
  'write',
  'ask',
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
  blurb: '综合知识问答',
  homepageUrl:
    'https://his.huawei.com/csop/index.html#/ToolInfo?samType=his&toolId=1706591788617216002',
  logoUrl: internalToolAssetUrl('employee-assistant.png'),
};

const CLOUD_NOTE: InternalOfficeSceneTool = {
  id: 'tool-hw-cloudnote',
  name: '云笔记',
  blurb: '会议与笔记沉淀',
  homepageUrl: 'https://wenote.huawei.com/wenoteapp',
  logoUrl: internalToolAssetUrl('cloud-note.png'),
};

const W3_SEARCH: InternalOfficeSceneTool = {
  id: 'tool-hw-w3-qa',
  name: 'W3智能搜索',
  blurb: '内部信息检索',
  homepageUrl: 'https://ai.huawei.com/w3Copilot/index.html#/home?lang=zh',
  logoUrl: internalToolAssetUrl('w3-search.png'),
};

const XIAOLUBAN: InternalOfficeSceneTool = {
  id: 'tool-hw-xiaoluban',
  name: '小鲁班',
  blurb: '专项知识服务',
  homepageUrl:
    'https://openx.huawei.com/%E5%B0%8F%E9%B2%81%E7%8F%ADwelink%E6%9C%BA%E5%99%A8%E4%BA%BA/overview',
  logoUrl: internalToolAssetUrl('xiaoluban.jpg'),
};

/** Demo：7 场景 · 4 内部工具（默认字典） */
export const INTERNAL_OFFICE_SCENES: InternalOfficeScene[] = [
  {
    id: 'capture',
    label: '记一下',
    english: 'CAPTURE',
    description: '把会议内容自动变成可回看、可执行、可沉淀的工作记录',
    tools: [CLOUD_NOTE],
    icon: 'fa-pen-to-square',
  },
  {
    id: 'read',
    label: '读一下',
    english: 'READ',
    description: '快速读懂文档与报告，提炼观点、数据、风险和可行动信息',
    tools: [EMPLOYEE_ASSISTANT],
    icon: 'fa-book-open',
  },
  {
    id: 'write',
    label: '写一下',
    english: 'WRITE',
    description: '基于已有信息生成日报、周报、月报与工作总结，并持续润色',
    tools: [EMPLOYEE_ASSISTANT],
    icon: 'fa-file-lines',
  },
  {
    id: 'ask',
    label: '问一下',
    english: 'ASK',
    description: '在组织知识、业务资料与搜索结果中提问，并继续追问来源',
    tools: [EMPLOYEE_ASSISTANT, W3_SEARCH, XIAOLUBAN],
    icon: 'fa-comments',
  },
  {
    id: 'intel',
    label: '情报官',
    english: 'INTELLIGENCE',
    description: '围绕关注主题自动监测、筛选和研判，让信息从“人找”变成“主动送”',
    tools: [EMPLOYEE_ASSISTANT],
    icon: 'fa-binoculars',
  },
  {
    id: 'knowledge',
    label: '知识库',
    english: 'KNOWLEDGE',
    description: '建设个人、团队与组织知识库，通过 AI 问答让沉淀的资料真正被使用',
    tools: [EMPLOYEE_ASSISTANT],
    icon: 'fa-database',
  },
  {
    id: 'agent',
    label: 'Agent',
    english: 'EXECUTE',
    description: '给出目标后，由 AI 拆解任务、调用工具、推进过程并交付完整成果',
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
    visible: true,
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
  'fa-binoculars',
  'fa-database',
  'fa-robot',
  'fa-briefcase',
  'fa-lightbulb',
  'fa-users',
] as const;
