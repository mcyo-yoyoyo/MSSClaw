/** 平台模型目录 + 对话选用 + 自定义扩展（OpenAI 兼容） */

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
 * 内置种子：运维可在「模型配置」启停 / 删除 / 按模型填 Key。
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

/** 平台目录条目（运营维护，全员对话可选；凭证按模型） */
export interface PlatformLlmModel {
  id: string;
  label: string;
  baseUrl: string;
  providerName: string;
  /** 该模型自己的 API Key（不与其它模型共享） */
  apiKey: string;
  enabled: boolean;
  /** preset=内置种子；platform=运营新增 */
  source: 'preset' | 'platform';
}

/** 工作区自定义模型（对话侧「我的扩展」，非平台目录） */
export interface CustomLlmModel {
  id: string;
  label: string;
  baseUrl: string;
  apiKey: string;
}

export interface LlmConfig {
  /** 当前对话选用的模型 id */
  model: string;
  /**
   * 当前选用模型的 Base URL / Key 快照（选用时从目录同步，供执行链路读取）
   * 权威凭证在 platformModels[].apiKey / customModels[].apiKey
   */
  baseUrl: string;
  apiKey: string;
  /** 平台模型目录；缺省或非数组时按种子初始化 */
  platformModels: PlatformLlmModel[];
  /** 组织默认模型（新会话 / 回退） */
  defaultModelId: string;
  /** 自定义扩展模型 */
  customModels: CustomLlmModel[];
}

export function seedPlatformModels(): PlatformLlmModel[] {
  return DEFAULT_LLM_MODELS.map((m) => ({
    ...m,
    apiKey: '',
    enabled: true,
    source: 'preset' as const,
  }));
}

export const DEFAULT_LLM_CONFIG: LlmConfig = {
  model: DEFAULT_LLM_MODELS[0].id,
  baseUrl: DEFAULT_LLM_MODELS[0].baseUrl,
  apiKey: '',
  platformModels: seedPlatformModels(),
  defaultModelId: DEFAULT_LLM_MODELS[0].id,
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

export function normalizePlatformModels(raw: unknown): PlatformLlmModel[] {
  // 未初始化：写入种子。已是数组（含空数组）则尊重运营删除结果，不再自动补回。
  if (!Array.isArray(raw)) return seedPlatformModels();

  return raw
    .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
    .map((m) => {
      const id = normalizeLlmModelId(String(m.id || ''));
      if (!id) return null;
      const preset = DEFAULT_LLM_MODELS.find((p) => p.id === id);
      return {
        id,
        label: String(m.label || preset?.label || id),
        baseUrl: String(m.baseUrl || preset?.baseUrl || '').trim(),
        providerName: String(m.providerName || preset?.providerName || '平台'),
        apiKey: typeof m.apiKey === 'string' ? m.apiKey : '',
        enabled: m.enabled !== false,
        source: (m.source === 'platform' || !preset ? 'platform' : 'preset') as
          | 'preset'
          | 'platform',
      } satisfies PlatformLlmModel;
    })
    .filter((m): m is PlatformLlmModel => Boolean(m));
}

export function listEnabledPlatformModels(
  config: Pick<LlmConfig, 'platformModels'>,
): PlatformLlmModel[] {
  const list =
    config.platformModels?.length > 0
      ? config.platformModels
      : seedPlatformModels();
  return list.filter((m) => m.enabled);
}

export function resolveModelMeta(
  config: Pick<LlmConfig, 'model' | 'customModels' | 'platformModels'>,
): {
  id: string;
  label: string;
  baseUrl: string;
  apiKey: string;
  providerName: string;
  custom: boolean;
  platform: boolean;
} {
  const model = normalizeLlmModelId(config.model);
  const platformList = Array.isArray(config.platformModels)
    ? config.platformModels
    : seedPlatformModels();
  const platform = platformList.find((m) => m.id === model);
  if (platform) {
    return {
      id: platform.id,
      label: platform.label,
      baseUrl: platform.baseUrl,
      apiKey: platform.apiKey || '',
      providerName: platform.providerName,
      custom: false,
      platform: true,
    };
  }
  const preset = DEFAULT_LLM_MODELS.find((m) => m.id === model);
  if (preset) {
    return { ...preset, apiKey: '', custom: false, platform: true };
  }
  const custom = config.customModels.find((m) => m.id === model || m.id === config.model);
  if (custom) {
    return {
      id: custom.id,
      label: custom.label || custom.id,
      baseUrl: custom.baseUrl,
      apiKey: custom.apiKey || '',
      providerName: '自定义',
      custom: true,
      platform: false,
    };
  }
  return {
    id: model,
    label: model,
    baseUrl: '',
    apiKey: '',
    providerName: '自定义',
    custom: true,
    platform: false,
  };
}

/** 当前选用模型的执行凭证（按模型 Key，兼容旧顶层 apiKey） */
export function resolveActiveCredentials(config: LlmConfig): {
  model: string;
  baseUrl: string;
  apiKey: string;
} {
  const meta = resolveModelMeta(config);
  const apiKey = (meta.apiKey || config.apiKey || '').trim();
  const baseUrl = (meta.baseUrl || config.baseUrl || '').trim();
  return { model: meta.id, baseUrl, apiKey };
}

export function isLlmConfigComplete(config: LlmConfig): boolean {
  const creds = resolveActiveCredentials(config);
  return Boolean(creds.apiKey && creds.baseUrl && creds.model);
}

/** @deprecated 兼容旧引用；新逻辑请用 platformModels / DEFAULT_LLM_MODELS */
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
