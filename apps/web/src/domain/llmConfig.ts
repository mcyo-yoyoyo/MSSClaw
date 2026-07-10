export const LLM_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  qwen: {
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-plus', 'qwen-max', 'qwen-turbo'],
  },
  moonshot: {
    name: 'Moonshot',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k'],
  },
  custom: { name: '自定义 OpenAI 兼容', baseUrl: '', models: [] as string[] },
} as const;

export type LlmProviderId = keyof typeof LLM_PROVIDERS;

export interface LlmConfig {
  provider: LlmProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export const DEFAULT_LLM_CONFIG: LlmConfig = {
  provider: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
};

export function isLlmConfigComplete(config: LlmConfig): boolean {
  return Boolean(config.apiKey.trim() && config.baseUrl.trim() && config.model.trim());
}
