/**
 * 外部工具精选 · Demo 对齐分类（按工作场景 / 按工具类型）+ 目录条目类型
 */

export type ToolRegion = 'overseas' | 'domestic';

/** CSV「工具类型」短 id（与 Demo「按工具类型」芯片一致） */
export type ExternalToolTypeId =
  | 'general'
  | 'search'
  | 'knowledge'
  | 'writing'
  | 'ppt'
  | 'image'
  | 'video'
  | 'audio'
  | 'meeting'
  | 'data'
  | 'code'
  | 'agent';

/** Demo「按工作场景」芯片（不含「全部」——由 UI 单独渲染） */
export type ExternalWorkSceneId =
  | 'office'
  | 'search'
  | 'knowledge'
  | 'writing'
  | 'ppt'
  | 'media'
  | 'meeting'
  | 'data'
  | 'code'
  | 'agent';

export type ExternalFilterMode = 'scene' | 'type';

export const EXTERNAL_TOOL_TYPES: {
  id: ExternalToolTypeId;
  label: string;
  csvLabel: string;
  icon: string;
}[] = [
  { id: 'general', label: '通用助手', csvLabel: '通用AI助手', icon: 'fa-comments' },
  { id: 'search', label: '搜索研究', csvLabel: 'AI搜索与研究', icon: 'fa-magnifying-glass' },
  { id: 'knowledge', label: '知识学习', csvLabel: '知识管理与学习', icon: 'fa-book' },
  { id: 'writing', label: '写作翻译', csvLabel: '写作与翻译', icon: 'fa-pen' },
  { id: 'ppt', label: 'PPT制作', csvLabel: '演示与文档', icon: 'fa-file-powerpoint' },
  { id: 'image', label: '图像设计', csvLabel: '图像与设计', icon: 'fa-image' },
  { id: 'video', label: '视频数字人', csvLabel: '视频与数字人', icon: 'fa-video' },
  { id: 'audio', label: '音频语音', csvLabel: '音频与语音', icon: 'fa-microphone' },
  { id: 'meeting', label: '会议协作', csvLabel: '会议与协作', icon: 'fa-users' },
  { id: 'data', label: '数据分析', csvLabel: '数据分析', icon: 'fa-chart-line' },
  { id: 'code', label: '编程开发', csvLabel: '编程开发', icon: 'fa-code' },
  { id: 'agent', label: '自动化智能体', csvLabel: '自动化与智能体', icon: 'fa-robot' },
];

export const EXTERNAL_WORK_SCENES: {
  id: ExternalWorkSceneId;
  label: string;
  icon: string;
  /** 关联工具类型 */
  typeIds?: ExternalToolTypeId[];
}[] = [
  { id: 'office', label: '日常办公', icon: 'fa-briefcase', typeIds: ['general', 'ppt', 'meeting', 'writing'] },
  { id: 'search', label: '搜索研究', icon: 'fa-magnifying-glass', typeIds: ['search'] },
  { id: 'knowledge', label: '知识学习', icon: 'fa-book', typeIds: ['knowledge'] },
  { id: 'writing', label: '写作翻译', icon: 'fa-pen', typeIds: ['writing'] },
  { id: 'ppt', label: 'PPT制作', icon: 'fa-file-powerpoint', typeIds: ['ppt'] },
  { id: 'media', label: '图片·视频·音频', icon: 'fa-photo-film', typeIds: ['image', 'video', 'audio'] },
  { id: 'meeting', label: '会议协作', icon: 'fa-users', typeIds: ['meeting'] },
  { id: 'data', label: '数据分析', icon: 'fa-chart-line', typeIds: ['data'] },
  { id: 'code', label: '编程开发', icon: 'fa-code', typeIds: ['code'] },
  { id: 'agent', label: 'Agent 执行', icon: 'fa-robot', typeIds: ['agent'] },
];

export const EXTERNAL_FILTER_MODES: { id: ExternalFilterMode; label: string }[] = [
  { id: 'scene', label: '按工作场景' },
  { id: 'type', label: '按工具类型' },
];

/** 货架去重后保留的 Top 80（近重复 / 弱替代不进前台） */
export const EXTERNAL_TOOL_SHELF_EXCLUDE_IDS = [
  'tool-ext-google-ai-mode',
  'tool-ext-you-com',
  'tool-ext-writer',
  'tool-ext-beautiful-ai',
  'tool-ext-udio',
  'tool-ext-plus-ai',
  'tool-ext-pitch',
  'tool-saas-chatgpt-2',
  'tool-ext-nano-banana-2',
  'tool-saas-jasper',
  'tool-saas-copyai',
  'tool-ext-wordtune',
  'tool-ext-mem',
  'tool-ext-tl-dv',
  'tool-ext-make-ai-agents',
  'tool-ext-consensus',
  'tool-saas-luma',
  'tool-saas-pika',
  'tool-ext-hermes-agent',
  'tool-ext-genspark',
] as const;

const EXTERNAL_TOOL_SHELF_EXCLUDE = new Set<string>(EXTERNAL_TOOL_SHELF_EXCLUDE_IDS);

export function isExternalToolOnShelf(id: string): boolean {
  return !EXTERNAL_TOOL_SHELF_EXCLUDE.has(id);
}

/** 首屏精选：海外 4 + 国内 4（一排 2 个、共两排） */
export const DEFAULT_EXTERNAL_FEATURED_OVERSEAS = [
  'tool-saas-chatgpt',
  'tool-saas-claude',
  'tool-saas-gemini',
  'tool-saas-perplexity',
] as const;

export const DEFAULT_EXTERNAL_FEATURED_DOMESTIC = [
  'tool-saas-doubao',
  'tool-saas-deepseek',
  'tool-saas-kimi',
  'tool-saas-tongyi',
] as const;

/** 旧默认 12 钉，hydrate 时迁到新 8 钉 */
export const LEGACY_EXTERNAL_FEATURED_PINS = [
  'tool-saas-chatgpt',
  'tool-saas-gemini',
  'tool-ext-codex',
  'tool-saas-claude',
  'tool-saas-perplexity',
  'tool-saas-gamma',
  'tool-saas-workbuddy',
  'tool-saas-doubao',
  'tool-saas-deepseek',
  'tool-saas-kimi',
  'tool-saas-tongyi',
  'tool-ext-wps-ai',
] as const;

export const DEFAULT_EXTERNAL_FEATURED_PINS = [
  ...DEFAULT_EXTERNAL_FEATURED_OVERSEAS,
  ...DEFAULT_EXTERNAL_FEATURED_DOMESTIC,
] as const;

export interface ExternalToolCatalogEntry {
  id: string;
  name: string;
  desc: string;
  company: string;
  toolTypeId: ExternalToolTypeId;
  region: ToolRegion;
  cardSummary: string;
  productIntro?: string;
  bestFor?: string;
  coreFeatures?: string[];
  version?: string;
  homepageUrl: string;
  docsUrl?: string;
  mediaUrl?: string;
  screenshotUrl?: string;
  icon: string;
  tags: string[];
  guideBody?: string;
}

export function getExternalToolTypeMeta(id: ExternalToolTypeId | string | undefined) {
  return EXTERNAL_TOOL_TYPES.find((t) => t.id === id);
}

export function getExternalWorkSceneMeta(id: ExternalWorkSceneId | string | undefined) {
  return EXTERNAL_WORK_SCENES.find((s) => s.id === id);
}

export function toolMatchesExternalType(
  toolTypeId: string | undefined,
  filter: ExternalToolTypeId | 'all',
): boolean {
  if (filter === 'all') return true;
  return toolTypeId === filter;
}

export function toolMatchesExternalScene(
  tool: { id: string; toolTypeId?: string },
  scene: ExternalWorkSceneId | 'all',
  _featuredIds?: ReadonlySet<string>,
): boolean {
  if (scene === 'all') return true;
  const meta = getExternalWorkSceneMeta(scene);
  // 与 toolMatchesExternalSceneCatalog 一致：空 typeIds 不匹配任何工具
  if (!meta?.typeIds?.length) return false;
  return Boolean(tool.toolTypeId && meta.typeIds.includes(tool.toolTypeId as ExternalToolTypeId));
}
