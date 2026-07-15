import { create } from 'zustand';
import {
  DEFAULT_LLM_CONFIG,
  DEFAULT_LLM_MODELS,
  isLlmConfigComplete,
  normalizeLlmModelId,
  resolveModelMeta,
  type CustomLlmModel,
  type LlmConfig,
} from '@/domain/llmConfig';

const LS_PREFIX = 'mssclaw_llm_';

function loadCustomModels(): CustomLlmModel[] {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}custom_models`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is CustomLlmModel =>
        !!m && typeof m === 'object' && typeof (m as CustomLlmModel).id === 'string',
    );
  } catch {
    return [];
  }
}

function loadConfig(): LlmConfig {
  const customModels = loadCustomModels();
  const rawModel = localStorage.getItem(`${LS_PREFIX}model`) || DEFAULT_LLM_CONFIG.model;
  const model = normalizeLlmModelId(rawModel);
  const meta = resolveModelMeta({ model, customModels });
  const storedUrl = localStorage.getItem(`${LS_PREFIX}base_url`);
  // 若本地还存着旧展示名，写回官方 API id，避免下次再传错
  if (model !== rawModel) {
    localStorage.setItem(`${LS_PREFIX}model`, model);
  }
  return {
    model,
    baseUrl: storedUrl || meta.baseUrl || DEFAULT_LLM_CONFIG.baseUrl,
    apiKey: localStorage.getItem(`${LS_PREFIX}api_key`) || '',
    customModels,
  };
}

function persistConfig(cfg: Partial<LlmConfig>) {
  if (cfg.baseUrl != null) localStorage.setItem(`${LS_PREFIX}base_url`, cfg.baseUrl);
  if (cfg.apiKey != null) localStorage.setItem(`${LS_PREFIX}api_key`, cfg.apiKey);
  if (cfg.model != null) localStorage.setItem(`${LS_PREFIX}model`, cfg.model);
  if (cfg.customModels != null) {
    localStorage.setItem(`${LS_PREFIX}custom_models`, JSON.stringify(cfg.customModels));
  }
}

export interface ModelOption {
  id: string;
  label: string;
  group: 'default' | 'custom';
}

interface LlmConfigState {
  config: LlmConfig;
  settingsOpen: boolean;
  saveConfig: (patch: Partial<LlmConfig>) => void;
  selectModel: (modelId: string) => void;
  addCustomModel: (model: CustomLlmModel) => void;
  removeCustomModel: (modelId: string) => void;
  openSettings: (opts?: { focusAdd?: boolean }) => void;
  closeSettings: () => void;
  settingsFocusAdd: boolean;
  modelOptions: () => ModelOption[];
  statusLabel: () => { text: string; configured: boolean };
}

export const useLlmConfigStore = create<LlmConfigState>((set, get) => ({
  config: loadConfig(),
  settingsOpen: false,
  settingsFocusAdd: false,

  saveConfig: (patch) => {
    const next = { ...get().config, ...patch };
    persistConfig(patch);
    set({ config: next });
  },

  selectModel: (modelId) => {
    if (modelId === '__configure__') {
      get().openSettings();
      return;
    }
    const { config } = get();
    const id = normalizeLlmModelId(modelId);
    const meta = resolveModelMeta({ model: id, customModels: config.customModels });
    get().saveConfig({
      model: id,
      baseUrl: meta.baseUrl || config.baseUrl,
    });
  },

  addCustomModel: (model) => {
    const id = normalizeLlmModelId(model.id.trim());
    if (!id) return;
    const { config } = get();
    const nextList = [
      ...config.customModels.filter((m) => m.id !== id),
      { id, label: model.label.trim() || id, baseUrl: model.baseUrl.trim() },
    ];
    get().saveConfig({
      customModels: nextList,
      model: id,
      baseUrl: model.baseUrl.trim() || config.baseUrl,
    });
  },

  removeCustomModel: (modelId) => {
    const { config } = get();
    const nextList = config.customModels.filter((m) => m.id !== modelId);
    const nextModel =
      config.model === modelId ? DEFAULT_LLM_MODELS[0].id : config.model;
    const meta = resolveModelMeta({ model: nextModel, customModels: nextList });
    get().saveConfig({
      customModels: nextList,
      model: nextModel,
      baseUrl: meta.baseUrl || config.baseUrl,
    });
  },

  openSettings: (opts) => set({ settingsOpen: true, settingsFocusAdd: Boolean(opts?.focusAdd) }),
  closeSettings: () => set({ settingsOpen: false, settingsFocusAdd: false }),

  modelOptions: () => {
    const { config } = get();
    const defaults: ModelOption[] = DEFAULT_LLM_MODELS.map((m) => ({
      id: m.id,
      label: m.label,
      group: 'default',
    }));
    const customs: ModelOption[] = config.customModels.map((m) => ({
      id: m.id,
      label: m.label || m.id,
      group: 'custom',
    }));
    // 当前模型若不在列表中，补一条
    const known = new Set([...defaults, ...customs].map((m) => m.id));
    const orphan: ModelOption[] =
      config.model && !known.has(config.model)
        ? [{ id: config.model, label: config.model, group: 'custom' }]
        : [];
    return [...defaults, ...customs, ...orphan];
  },

  statusLabel: () => {
    const { config } = get();
    const meta = resolveModelMeta(config);
    if (isLlmConfigComplete(config)) {
      return { text: `${meta.label} · 已接入 Plan/Execute`, configured: true };
    }
    return { text: `${meta.label} · 未配置 API Key · 本地 Mock`, configured: false };
  },
}));
