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
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
} from '@/api/platformDocsApi';
import { useWorkspaceStore } from '@/stores/workspaceStore';

function defaultConfig(): LlmConfig {
  return {
    ...DEFAULT_LLM_CONFIG,
    customModels: [],
    apiKey: '',
  };
}

function normalizeConfig(raw: Partial<LlmConfig> | null | undefined): LlmConfig {
  const customModels = Array.isArray(raw?.customModels)
    ? raw!.customModels.filter(
        (m): m is CustomLlmModel =>
          !!m && typeof m === 'object' && typeof m.id === 'string',
      )
    : [];
  const model = normalizeLlmModelId(raw?.model || DEFAULT_LLM_CONFIG.model);
  const meta = resolveModelMeta({ model, customModels });
  return {
    model,
    baseUrl: (raw?.baseUrl || meta.baseUrl || DEFAULT_LLM_CONFIG.baseUrl).trim(),
    apiKey: typeof raw?.apiKey === 'string' ? raw.apiKey : '',
    customModels,
  };
}

function persist(cfg: LlmConfig) {
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(currentWorkspaceId(), 'llm-config', cfg);
}

export interface ModelOption {
  id: string;
  label: string;
  group: 'default' | 'custom';
}

interface LlmConfigState {
  config: LlmConfig;
  settingsOpen: boolean;
  hydrate: () => void;
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
  config: defaultConfig(),
  settingsOpen: false,
  settingsFocusAdd: false,

  hydrate: () => {
    void (async () => {
      if (!canUsePlatformDocsApi()) {
        set({ config: defaultConfig() });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<Partial<LlmConfig>>(
          currentWorkspaceId(),
          'llm-config',
        );
        set({ config: normalizeConfig(remote) });
      } catch {
        set({ config: defaultConfig() });
      }
    })();
  },

  saveConfig: (patch) => {
    const next = normalizeConfig({ ...get().config, ...patch });
    persist(next);
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
    const { apiConnected, nestLlmEnvConfigured } = useWorkspaceStore.getState();

    if (isLlmConfigComplete(config)) {
      if (apiConnected) {
        return {
          text: nestLlmEnvConfigured
            ? `${meta.label} ? ????????????? LLM_*?`
            : `${meta.label} ? ?????????????`,
          configured: true,
        };
      }
      return { text: `${meta.label} ? ??????? Plan/???`, configured: true };
    }
    if (apiConnected && nestLlmEnvConfigured) {
      return { text: `${meta.label} ? ????? LLM_*`, configured: true };
    }
    return { text: `${meta.label} ? ??? API Key`, configured: false };
  },
}));
