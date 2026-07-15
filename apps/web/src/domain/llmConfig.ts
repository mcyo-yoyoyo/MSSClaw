/** 国产先进模型 + 可自定义扩展（id 必须等于厂商 API 的 model 字段） */

export interface LlmModelPreset {
  /** 调用 API 时传入的 model，必须与厂商文档一致 */
  id: string;
  /** UI 展示名 */
  label: string;
  /** OpenAI 兼容 Base URL */
  baseUrl: string;
  providerName: string;
}

/**
 * 默认预设：id = 官方 API model name
 * DeepSeek: deepseek-v4-flash / deepseek-v4-pro
 * 智谱: glm-5.1
 * 通义: qwen3.7-plus
 */
export const DEFAULT_LLM_MODELS: LlmModelPreset[] = [
  {
    id: 'glm-5.1',
    label: 'GLM 5.1',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    providerName: '智谱',
  },
  {
    id: 'deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    baseUrl: 'https://api.deepseek.com/v1',
    providerName: 'DeepSeek',
  },
  {
    id: 'deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    baseUrl: 'https://api.deepseek.com/v1',
    providerName: 'DeepSeek',
  },
  {
    id: 'qwen3.7-plus',
    label: 'Qwen 3.7 Plus',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    providerName: '通义',
  },
];

export interface CustomLlmModel {
  id: string;
  label: string;
  baseUrl: string;
}

export interface LlmConfig {
  /** 当前选用的模型 id（默认或自定义，直接作为 API model） */
  model: string;
  baseUrl: string;
  apiKey: string;
  /** 用户自定义添加的模型 */
  customModels: CustomLlmModel[];
}

export const DEFAULT_LLM_CONFIG: LlmConfig = {
  model: DEFAULT_LLM_MODELS[0].id,
  baseUrl: DEFAULT_LLM_MODELS[0].baseUrl,
  apiKey: '',
  customModels: [],
};

/** 历史展示名 / 旧 id → 当前官方 API model id */
export const LLM_MODEL_ID_ALIASES: Record<string, string> = {
  'GLM-5.1': 'glm-5.1',
  'glm-5': 'glm-5.1',
  'DeepSeek-V4': 'deepseek-v4-flash',
  'DeepSeek V4': 'deepseek-v4-flash',
  'deepseek-chat': 'deepseek-v4-flash',
  'deepseek-reasoner': 'deepseek-v4-flash',
  'Qwen-3.7': 'qwen3.7-plus',
  'Qwen 3.7': 'qwen3.7-plus',
  'qwen-plus': 'qwen3.7-plus',
  'qwen-max': 'qwen3.7-plus',
  'qwen-turbo': 'qwen3.7-plus',
  'gpt-4o': 'glm-5.1',
  'gpt-4o-mini': 'glm-5.1',
  'gpt-4-turbo': 'glm-5.1',
};

export function normalizeLlmModelId(model: string): string {
  const trimmed = model.trim();
  return LLM_MODEL_ID_ALIASES[trimmed] ?? trimmed;
}

export function resolveModelMeta(
  config: Pick<LlmConfig, 'model' | 'customModels'>,
): { id: string; label: string; baseUrl: string; providerName: string; custom: boolean } {
  const model = normalizeLlmModelId(config.model);
  const preset = DEFAULT_LLM_MODELS.find((m) => m.id === model);
  if (preset) {
    return { ...preset, custom: false };
  }
  const custom = config.customModels.find((m) => m.id === model || m.id === config.model);
  if (custom) {
    return {
      id: custom.id,
      label: custom.label || custom.id,
      baseUrl: custom.baseUrl,
      providerName: '自定义',
      custom: true,
    };
  }
  return {
    id: model,
    label: model,
    baseUrl: '',
    providerName: '自定义',
    custom: true,
  };
}

export function isLlmConfigComplete(config: LlmConfig): boolean {
  return Boolean(config.apiKey.trim() && config.baseUrl.trim() && config.model.trim());
}

/** @deprecated 兼容旧引用；新逻辑请用 DEFAULT_LLM_MODELS */
export const LLM_PROVIDERS = {
  zhipu: { name: '智谱', baseUrl: DEFAULT_LLM_MODELS[0].baseUrl, models: ['glm-5.1'] },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  },
  qwen: {
    name: '通义',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen3.7-plus'],
  },
  custom: { name: '自定义', baseUrl: '', models: [] as string[] },
} as const;

export type LlmProviderId = keyof typeof LLM_PROVIDERS;
