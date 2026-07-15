/** 国产先进模型示意 + 可自定义扩展 */

export interface LlmModelPreset {
  id: string;
  label: string;
  /** OpenAI 兼容 Base URL 示意 */
  baseUrl: string;
  providerName: string;
}

/** 默认示意模型（可直接选用；接真实 Key 后走 OpenAI 兼容协议） */
export const DEFAULT_LLM_MODELS: LlmModelPreset[] = [
  {
    id: 'GLM-5.1',
    label: 'GLM 5.1',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    providerName: '智谱',
  },
  {
    id: 'DeepSeek-V4',
    label: 'DeepSeek V4',
    baseUrl: 'https://api.deepseek.com/v1',
    providerName: 'DeepSeek',
  },
  {
    id: 'Qwen-3.7',
    label: 'Qwen 3.7',
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
  /** 当前选用的模型 id（默认或自定义） */
  model: string;
  baseUrl: string;
  apiKey: string;
  /** 用户自定义添加的模型 */
  customModels: CustomLlmModel[];
}

export const DEFAULT_LLM_CONFIG: LlmConfig = {
  model: 'GLM-5.1',
  baseUrl: DEFAULT_LLM_MODELS[0].baseUrl,
  apiKey: '',
  customModels: [],
};

export function resolveModelMeta(
  config: Pick<LlmConfig, 'model' | 'customModels'>,
): { id: string; label: string; baseUrl: string; providerName: string; custom: boolean } {
  const preset = DEFAULT_LLM_MODELS.find((m) => m.id === config.model);
  if (preset) {
    return { ...preset, custom: false };
  }
  const custom = config.customModels.find((m) => m.id === config.model);
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
    id: config.model,
    label: config.model,
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
  zhipu: { name: '智谱', baseUrl: DEFAULT_LLM_MODELS[0].baseUrl, models: ['GLM-5.1'] },
  deepseek: { name: 'DeepSeek', baseUrl: DEFAULT_LLM_MODELS[1].baseUrl, models: ['DeepSeek-V4'] },
  qwen: { name: '通义', baseUrl: DEFAULT_LLM_MODELS[2].baseUrl, models: ['Qwen-3.7'] },
  custom: { name: '自定义', baseUrl: '', models: [] as string[] },
} as const;

export type LlmProviderId = keyof typeof LLM_PROVIDERS;
