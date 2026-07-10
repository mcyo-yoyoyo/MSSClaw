import { create } from 'zustand';
import {
  DEFAULT_LLM_CONFIG,
  isLlmConfigComplete,
  LLM_PROVIDERS,
  type LlmConfig,
  type LlmProviderId,
} from '@/domain/llmConfig';

const LS_PREFIX = 'mssclaw_llm_';

function loadConfig(): LlmConfig {
  const provider = (localStorage.getItem(`${LS_PREFIX}provider`) || DEFAULT_LLM_CONFIG.provider) as LlmProviderId;
  const preset = LLM_PROVIDERS[provider] ?? LLM_PROVIDERS.openai;
  return {
    provider,
    baseUrl: localStorage.getItem(`${LS_PREFIX}base_url`) || preset.baseUrl || DEFAULT_LLM_CONFIG.baseUrl,
    apiKey: localStorage.getItem(`${LS_PREFIX}api_key`) || '',
    model: localStorage.getItem(`${LS_PREFIX}model`) || preset.models[0] || DEFAULT_LLM_CONFIG.model,
  };
}

function persistConfig(cfg: Partial<LlmConfig>) {
  if (cfg.provider != null) localStorage.setItem(`${LS_PREFIX}provider`, cfg.provider);
  if (cfg.baseUrl != null) localStorage.setItem(`${LS_PREFIX}base_url`, cfg.baseUrl);
  if (cfg.apiKey != null) localStorage.setItem(`${LS_PREFIX}api_key`, cfg.apiKey);
  if (cfg.model != null) localStorage.setItem(`${LS_PREFIX}model`, cfg.model);
}

interface LlmConfigState {
  config: LlmConfig;
  settingsOpen: boolean;
  saveConfig: (patch: Partial<LlmConfig>) => void;
  setProvider: (provider: LlmProviderId) => void;
  openSettings: () => void;
  closeSettings: () => void;
  modelOptions: () => string[];
  statusLabel: () => { text: string; configured: boolean };
}

export const useLlmConfigStore = create<LlmConfigState>((set, get) => ({
  config: loadConfig(),
  settingsOpen: false,

  saveConfig: (patch) => {
    const next = { ...get().config, ...patch };
    persistConfig(patch);
    set({ config: next });
  },

  setProvider: (provider) => {
    const preset = LLM_PROVIDERS[provider] ?? LLM_PROVIDERS.openai;
    get().saveConfig({
      provider,
      baseUrl: preset.baseUrl || get().config.baseUrl,
      model: preset.models[0] || get().config.model,
    });
  },

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),

  modelOptions: () => {
    const { config } = get();
    const preset = LLM_PROVIDERS[config.provider] ?? LLM_PROVIDERS.openai;
    const models = preset.models.length ? [...preset.models] : [config.model];
    return models.includes(config.model) ? models : [config.model, ...models];
  },

  statusLabel: () => {
    const { config } = get();
    const providerName = LLM_PROVIDERS[config.provider]?.name || config.provider;
    if (isLlmConfigComplete(config)) {
      return { text: `${providerName} · ${config.model} · 已接入 Plan/Execute`, configured: true };
    }
    return { text: `${providerName} · 未配置 API Key · 本地 Mock`, configured: false };
  },
}));
