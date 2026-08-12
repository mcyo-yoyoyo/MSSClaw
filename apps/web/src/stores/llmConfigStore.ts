import { create } from 'zustand';
import {
  DEFAULT_LLM_CONFIG,
  isLlmConfigComplete,
  listEnabledPlatformModels,
  normalizeLlmModelId,
  normalizePlatformModels,
  resolveActiveCredentials,
  resolveModelMeta,
  seedPlatformModels,
  type CustomLlmModel,
  type LlmConfig,
  type PlatformLlmModel,
} from '@/domain/llmConfig';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  savePlatformDoc,
} from '@/api/platformDocsApi';
import { useWorkspaceStore } from '@/stores/workspaceStore';

function defaultConfig(): LlmConfig {
  return {
    ...DEFAULT_LLM_CONFIG,
    platformModels: seedPlatformModels(),
    customModels: [],
    apiKey: '',
  };
}

function normalizeCustomModels(raw: unknown, legacySharedKey: string): CustomLlmModel[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
    .map((m) => {
      const id = normalizeLlmModelId(String(m.id || ''));
      if (!id) return null;
      return {
        id,
        label: String(m.label || id),
        baseUrl: String(m.baseUrl || '').trim(),
        apiKey: typeof m.apiKey === 'string' && m.apiKey ? m.apiKey : legacySharedKey,
      } satisfies CustomLlmModel;
    })
    .filter((m): m is CustomLlmModel => Boolean(m));
}

export function normalizeLlmConfig(raw: Partial<LlmConfig> | null | undefined): LlmConfig {
  const legacySharedKey = typeof raw?.apiKey === 'string' ? raw.apiKey : '';
  let platformModels = normalizePlatformModels(raw?.platformModels);
  if (legacySharedKey) {
    platformModels = platformModels.map((m) => (m.apiKey ? m : { ...m, apiKey: legacySharedKey }));
  }
  const customModels = normalizeCustomModels(raw?.customModels, legacySharedKey);
  const defaultModelId = normalizeLlmModelId(
    raw?.defaultModelId ||
      platformModels.find((m) => m.enabled)?.id ||
      customModels[0]?.id ||
      DEFAULT_LLM_CONFIG.defaultModelId,
  );
  let model = normalizeLlmModelId(raw?.model || defaultModelId);
  const enabledIds = new Set([
    ...listEnabledPlatformModels({ platformModels }).map((m) => m.id),
    ...customModels.map((m) => m.id),
  ]);
  if (enabledIds.size && !enabledIds.has(model)) {
    model = enabledIds.has(defaultModelId)
      ? defaultModelId
      : [...enabledIds][0] || DEFAULT_LLM_CONFIG.model;
  }
  const creds = resolveActiveCredentials({
    model,
    baseUrl: '',
    apiKey: '',
    platformModels,
    defaultModelId,
    customModels,
  });
  return {
    model,
    baseUrl: creds.baseUrl || (raw?.baseUrl || '').trim() || DEFAULT_LLM_CONFIG.baseUrl,
    apiKey: creds.apiKey,
    platformModels,
    defaultModelId,
    customModels,
  };
}

async function persistToDb(cfg: LlmConfig): Promise<void> {
  if (!canUsePlatformDocsApi()) {
    throw new Error('shared_api_required');
  }
  await savePlatformDoc(currentWorkspaceId(), 'llm-config', cfg);
}

export interface ModelOption {
  id: string;
  label: string;
  providerName?: string;
  group: 'platform' | 'custom';
}

function syncSnapshotFromSelection(
  model: string,
  platformModels: PlatformLlmModel[],
  customModels: CustomLlmModel[],
  defaultModelId: string,
): Pick<LlmConfig, 'model' | 'baseUrl' | 'apiKey'> {
  const creds = resolveActiveCredentials({
    model,
    baseUrl: '',
    apiKey: '',
    platformModels,
    defaultModelId,
    customModels,
  });
  return { model: creds.model, baseUrl: creds.baseUrl, apiKey: creds.apiKey };
}

interface LlmConfigState {
  config: LlmConfig;
  settingsOpen: boolean;
  syncing: boolean;
  lastError: string | null;
  hydrate: (opts?: { fresh?: boolean }) => Promise<void>;
  saveConfig: (patch: Partial<LlmConfig>) => Promise<void>;
  selectModel: (modelId: string) => Promise<void>;
  addCustomModel: (model: CustomLlmModel) => Promise<void>;
  removeCustomModel: (modelId: string) => Promise<void>;
  upsertPlatformModel: (model: PlatformLlmModel) => Promise<void>;
  setPlatformModelApiKey: (modelId: string, apiKey: string) => Promise<void>;
  removePlatformModel: (modelId: string) => Promise<void>;
  setPlatformModelEnabled: (modelId: string, enabled: boolean) => Promise<void>;
  setDefaultModelId: (modelId: string) => Promise<void>;
  openSettings: (opts?: { focusAdd?: boolean }) => void;
  closeSettings: () => void;
  settingsFocusAdd: boolean;
  modelOptions: () => ModelOption[];
  statusLabel: () => { text: string; configured: boolean };
  requiresSharedApi: () => boolean;
}

export const useLlmConfigStore = create<LlmConfigState>((set, get) => ({
  config: defaultConfig(),
  settingsOpen: false,
  settingsFocusAdd: false,
  syncing: false,
  lastError: null,

  hydrate: async (opts) => {
    if (!canUsePlatformDocsApi()) {
      set({
        config: defaultConfig(),
        lastError: '共享 API 未连接，模型配置无法从数据库加载',
      });
      return;
    }
    set({ syncing: true, lastError: null });
    try {
      const remote = await fetchPlatformDoc<Partial<LlmConfig>>(
        currentWorkspaceId(),
        'llm-config',
        { fresh: opts?.fresh !== false },
      );
      set({
        config: normalizeLlmConfig(remote),
        syncing: false,
        lastError: null,
      });
    } catch (e) {
      set({
        syncing: false,
        lastError: e instanceof Error ? e.message : '加载模型配置失败',
      });
    }
  },

  saveConfig: async (patch) => {
    if (!canUsePlatformDocsApi()) {
      const msg = '共享 API 未连接，无法写入数据库。请先连接后端再配置模型。';
      set({ lastError: msg });
      throw new Error('shared_api_required');
    }
    const next = normalizeLlmConfig({ ...get().config, ...patch });
    set({ syncing: true, lastError: null });
    try {
      await persistToDb(next);
      const remote = await fetchPlatformDoc<Partial<LlmConfig>>(
        currentWorkspaceId(),
        'llm-config',
        { fresh: true },
      );
      set({
        config: normalizeLlmConfig(remote ?? next),
        syncing: false,
        lastError: null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '保存模型配置失败';
      set({ syncing: false, lastError: msg });
      throw e;
    }
  },

  selectModel: async (modelId) => {
    if (modelId === '__configure__' || modelId === '__credentials__' || modelId === '__extend__') {
      get().openSettings({ focusAdd: modelId === '__extend__' });
      return;
    }
    const { config } = get();
    const id = normalizeLlmModelId(modelId);
    await get().saveConfig(
      syncSnapshotFromSelection(
        id,
        config.platformModels,
        config.customModels,
        config.defaultModelId,
      ),
    );
  },

  addCustomModel: async (model) => {
    const id = normalizeLlmModelId(model.id.trim());
    if (!id) return;
    const { config } = get();
    const nextList = [
      ...config.customModels.filter((m) => m.id !== id),
      {
        id,
        label: model.label.trim() || id,
        baseUrl: model.baseUrl.trim(),
        apiKey: model.apiKey?.trim() || '',
      },
    ];
    await get().saveConfig({
      customModels: nextList,
      ...syncSnapshotFromSelection(
        id,
        config.platformModels,
        nextList,
        config.defaultModelId,
      ),
    });
  },

  removeCustomModel: async (modelId) => {
    const { config } = get();
    const nextList = config.customModels.filter((m) => m.id !== modelId);
    const nextModel =
      config.model === modelId
        ? config.defaultModelId ||
          nextList[0]?.id ||
          config.platformModels.find((m) => m.enabled)?.id ||
          DEFAULT_LLM_CONFIG.model
        : config.model;
    await get().saveConfig({
      customModels: nextList,
      ...syncSnapshotFromSelection(
        nextModel,
        config.platformModels,
        nextList,
        config.defaultModelId,
      ),
    });
  },

  upsertPlatformModel: async (model) => {
    const id = normalizeLlmModelId(model.id.trim());
    if (!id) return;
    const { config } = get();
    const prev = config.platformModels.find((m) => m.id === id);
    const entry: PlatformLlmModel = {
      id,
      label: model.label.trim() || id,
      baseUrl: model.baseUrl.trim(),
      providerName: model.providerName.trim() || '平台',
      apiKey: model.apiKey?.trim() ?? prev?.apiKey ?? '',
      enabled: model.enabled !== false,
      source: 'platform',
    };
    if (prev?.source === 'preset' || model.source === 'preset') {
      entry.source = 'preset';
    }
    if (!prev) entry.source = model.source === 'preset' ? 'preset' : 'platform';
    const nextList = [...config.platformModels.filter((m) => m.id !== id), entry];
    const snap =
      config.model === id
        ? syncSnapshotFromSelection(id, nextList, config.customModels, config.defaultModelId)
        : {};
    await get().saveConfig({ platformModels: nextList, ...snap });
  },

  setPlatformModelApiKey: async (modelId, apiKey) => {
    const { config } = get();
    const nextList = config.platformModels.map((m) =>
      m.id === modelId ? { ...m, apiKey } : m,
    );
    const snap =
      config.model === modelId
        ? syncSnapshotFromSelection(
            modelId,
            nextList,
            config.customModels,
            config.defaultModelId,
          )
        : {};
    await get().saveConfig({ platformModels: nextList, ...snap });
  },

  removePlatformModel: async (modelId) => {
    const { config } = get();
    const nextList = config.platformModels.filter((m) => m.id !== modelId);
    const patch: Partial<LlmConfig> = { platformModels: nextList };
    if (config.defaultModelId === modelId) {
      patch.defaultModelId =
        nextList.find((m) => m.enabled)?.id ||
        config.customModels[0]?.id ||
        DEFAULT_LLM_CONFIG.defaultModelId;
    }
    const nextModel =
      config.model === modelId
        ? patch.defaultModelId || config.defaultModelId
        : config.model;
    Object.assign(
      patch,
      syncSnapshotFromSelection(
        nextModel,
        nextList,
        config.customModels,
        patch.defaultModelId || config.defaultModelId,
      ),
    );
    await get().saveConfig(patch);
  },

  setPlatformModelEnabled: async (modelId, enabled) => {
    const { config } = get();
    const nextList = config.platformModels.map((m) =>
      m.id === modelId ? { ...m, enabled } : m,
    );
    const patch: Partial<LlmConfig> = { platformModels: nextList };
    if (!enabled && config.model === modelId) {
      const fallback =
        nextList.find((m) => m.enabled)?.id ||
        config.customModels[0]?.id ||
        DEFAULT_LLM_CONFIG.model;
      Object.assign(
        patch,
        syncSnapshotFromSelection(
          fallback,
          nextList,
          config.customModels,
          config.defaultModelId,
        ),
      );
    }
    if (!enabled && config.defaultModelId === modelId) {
      patch.defaultModelId =
        nextList.find((m) => m.enabled)?.id ||
        config.customModels[0]?.id ||
        DEFAULT_LLM_CONFIG.defaultModelId;
    }
    await get().saveConfig(patch);
  },

  setDefaultModelId: async (modelId) => {
    await get().saveConfig({ defaultModelId: normalizeLlmModelId(modelId) });
  },

  openSettings: (opts) => set({ settingsOpen: true, settingsFocusAdd: Boolean(opts?.focusAdd) }),
  closeSettings: () => set({ settingsOpen: false, settingsFocusAdd: false }),

  requiresSharedApi: () => canUsePlatformDocsApi(),

  modelOptions: () => {
    const { config } = get();
    const platform: ModelOption[] = listEnabledPlatformModels(config).map((m) => ({
      id: m.id,
      label: m.label,
      providerName: m.providerName,
      group: 'platform',
    }));
    const customs: ModelOption[] = config.customModels.map((m) => ({
      id: m.id,
      label: m.label || m.id,
      providerName: '自定义',
      group: 'custom',
    }));
    const known = new Set([...platform, ...customs].map((m) => m.id));
    const orphan: ModelOption[] =
      config.model && !known.has(config.model)
        ? [{ id: config.model, label: config.model, group: 'custom', providerName: '自定义' }]
        : [];
    return [...platform, ...customs, ...orphan];
  },

  statusLabel: () => {
    const { config } = get();
    const meta = resolveModelMeta(config);
    const { apiConnected, nestLlmEnvConfigured } = useWorkspaceStore.getState();

    if (!apiConnected) {
      return { text: `${meta.label} · 共享 API 未连接（无法读写库）`, configured: false };
    }
    if (isLlmConfigComplete(config)) {
      return {
        text: nestLlmEnvConfigured
          ? `${meta.label} · 模型 Key 已配 · 亦可走服务端 LLM_*`
          : `${meta.label} · 模型 Key 已配`,
        configured: true,
      };
    }
    if (nestLlmEnvConfigured) {
      return { text: `${meta.label} · 服务端 LLM_* 可用`, configured: true };
    }
    return { text: `${meta.label} · 当前模型未配置 API Key`, configured: false };
  },
}));
