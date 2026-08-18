/**
 * 内部办公推荐 · Demo 对齐办公场景（记/读/写/问/…）
 * 默认结构写死；运营可通过 catalog store 覆盖文案 / 可见 / 工具绑定
 * 立即体验 URL / Logo 优先读配置工具（marketplace）主数据
 */

import { internalToolAssetUrl, resolveToolLogoUrl } from '@/domain/toolLogo';
import type { PrototypeToolSeed } from '@/domain/prototype/types';

/** 内置场景 id（随默认字典下发；运营可在其上增删） */
export type InternalOfficeScenePresetId =
  | 'capture'
  | 'read'
  | 'write'
  | 'ask'
  | 'search'
  | 'specialist'
  | 'intel'
  | 'knowledge'
  | 'agent';

/**
 * 场景 id 允许运营自建，因此是开放字符串而非固定联合类型。
 * 早期版本写死 9 个 id，导致新增场景在 hydrate 时被过滤掉。
 */
export type InternalOfficeSceneId = string;

export const INTERNAL_OFFICE_SCENE_PRESET_IDS: InternalOfficeScenePresetId[] = [
  'capture',
  'read',
  'write',
  'ask',
  'search',
  'specialist',
  'intel',
  'knowledge',
  'agent',
];

/** @deprecated 用 INTERNAL_OFFICE_SCENE_PRESET_IDS；保留旧名兼容引用 */
export const INTERNAL_OFFICE_SCENE_IDS = INTERNAL_OFFICE_SCENE_PRESET_IDS;

export function isInternalOfficeScenePresetId(
  id: string,
): id is InternalOfficeScenePresetId {
  return (INTERNAL_OFFICE_SCENE_PRESET_IDS as string[]).includes(id);
}

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
    id: 'capture',
    label: '录音及纪要用云笔记',
    english: 'CAPTURE',
    description: '自动记录会议、转写发言并提炼结论与行动项，让会后跟进立即开始。',
    tools: [CLOUD_NOTE],
    icon: 'fa-pen-to-square',
  },
  {
    id: 'read',
    label: '文档解析用员工助手读一下',
    english: 'READ',
    description: '快速读懂文档与报告，提炼观点、数据、风险和可行动信息。',
    tools: [EMPLOYEE_ASSISTANT],
    icon: 'fa-book-open',
  },
  {
    id: 'write',
    label: '写作及总结用员工助手写一下',
    english: 'WRITE',
    description: '基于已有信息生成日报、周报、月报与工作总结，并持续润色。',
    tools: [EMPLOYEE_ASSISTANT],
    icon: 'fa-file-lines',
  },
  {
    id: 'ask',
    label: '问答与任务处理用员工助手',
    english: 'ASK',
    description: '不仅回答问题，还能执行任务。支持多模型动态适配（DeepSeek-R1、Qwen3等），可调用技能（Skill）完成PPT生成、文档校验、邮件编写、方案输出等。',
    tools: [EMPLOYEE_ASSISTANT],
    icon: 'fa-comments',
  },
  {
    id: 'search',
    label: '信息查找用W3智能搜索',
    english: 'SEARCH',
    description: '专注信息检索与知识获取。将传统搜索从“给链接列表”升级为“直接给答案”，整合W3发文、3MS、iLearning、文档库、社区资源等全量企业知识。',
    tools: [W3_SEARCH],
    icon: 'fa-magnifying-glass',
  },
  {
    id: 'specialist',
    label: '专项问答用小鲁班',
    english: 'SPECIALIST',
    description: '以WeLink对话为入口，提供自定义办公功能 + AI对话。支持私聊、群聊等。',
    tools: [XIAOLUBAN],
    icon: 'fa-screwdriver-wrench',
  },
  {
    id: 'intel',
    label: '资讯信息追踪用员工助手情报官',
    english: 'INTELLIGENCE',
    description: '围绕关注主题自动监测、筛选和研判，让信息从人找变成主动送。',
    tools: [EMPLOYEE_ASSISTANT],
    icon: 'fa-binoculars',
  },
  {
    id: 'knowledge',
    label: '知识库及问答用员工助手',
    english: 'KNOWLEDGE',
    description: '建设个人、团队与组织知识库，通过 AI 问答让沉淀的资料真正被使用。',
    tools: [EMPLOYEE_ASSISTANT],
    icon: 'fa-database',
  },
  {
    id: 'agent',
    label: '任务处理用员工助手',
    english: 'EXECUTE',
    description: '以大语言模型为核心，内置文档处理、数据分析、会议纪要、消息邮件、知识搜索等多Agent技能，通过自然语言即可自动调度多技能协同完成任务。',
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

/**
 * 场景名迁移：仅改写仍停留在旧默认值上的条目。
 * 场景字典可由运营编辑，后端存量会覆盖种子，所以改种子不足以让改名生效；
 * 这里只认「值完全等于旧默认值」的情况，避免踩掉运营手工改过的名字。
 */
const RENAMED_SCENE_LABELS: Record<string, string> = {
  资讯信息追踪用员工助手: '资讯信息追踪用员工助手情报官',
  咨询信息追踪用员工助手情报官: '资讯信息追踪用员工助手情报官',
};

export function migrateInternalOfficeSceneLabel(label: string): string {
  return RENAMED_SCENE_LABELS[label.trim()] ?? label;
}

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

