import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { testLlmConnection } from '@/api/llmClient';
import {
  listEnabledPlatformModels,
  normalizeLlmModelId,
  resolveModelMeta,
  type CustomLlmModel,
} from '@/domain/llmConfig';
import { useLlmConfigStore } from '@/stores/llmConfigStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { isSystemAdmin } from '@/domain/currentUser';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

interface LlmSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 用户侧：选用模型 + 当前模型凭证 + 个人扩展。
 * 平台目录维护请去运营「模型配置」页（与对话选择器职责分离）。
 */
export function LlmSettingsModal({ open, onClose }: LlmSettingsModalProps) {
  const {
    config,
    saveConfig,
    addCustomModel,
    removeCustomModel,
    upsertPlatformModel,
    settingsFocusAdd,
    hydrate,
    syncing,
  } = useLlmConfigStore();
  const setAppView = useAppViewStore((s) => s.setAppView);
  const role = useSessionStore((s) => s.user?.platformRole);
  const isAdmin = isSystemAdmin(role);
  const apiConnected = useWorkspaceStore((s) => s.apiConnected);

  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [modelId, setModelId] = useState(config.model);
  const [showAdd, setShowAdd] = useState(false);
  const [customDraft, setCustomDraft] = useState<CustomLlmModel>({
    id: '',
    label: '',
    baseUrl: '',
    apiKey: '',
  });
  const [testResult, setTestResult] = useState('');
  const [testing, setTesting] = useState(false);

  const platformModels = listEnabledPlatformModels(config);

  const syncFieldsForModel = (id: string) => {
    const next = resolveModelMeta({
      model: id,
      customModels: config.customModels,
      platformModels: config.platformModels,
    });
    setBaseUrl(next.baseUrl || '');
    setApiKey(next.apiKey || '');
  };

  useEffect(() => {
    if (!open) return;
    void hydrate({ fresh: true });
    setModelId(config.model);
    syncFieldsForModel(config.model);
    setShowAdd(settingsFocusAdd);
    setTestResult('');
    setCustomDraft({ id: '', label: '', baseUrl: '', apiKey: '' });
  }, [open, settingsFocusAdd, hydrate]);

  useEffect(() => {
    if (!open) return;
    setModelId(config.model);
    syncFieldsForModel(config.model);
  }, [open, config.model, config.platformModels, config.customModels]);

  if (!open) return null;

  const meta = resolveModelMeta({
    model: modelId,
    customModels: config.customModels,
    platformModels: config.platformModels,
  });

  const handleSelect = (id: string) => {
    const nextId = normalizeLlmModelId(id);
    setModelId(nextId);
    syncFieldsForModel(nextId);
  };

  const showToast = useMarketplaceStore((s) => s.showToast);

  const handleSave = async () => {
    if (!apiConnected) {
      setTestResult('共享 API 未连接，无法写入数据库');
      return;
    }
    const id = normalizeLlmModelId(modelId);
    try {
      const platform = config.platformModels.find((m) => m.id === id);
      if (platform) {
        await upsertPlatformModel({
          ...platform,
          baseUrl: baseUrl.trim() || platform.baseUrl,
          apiKey: apiKey.trim(),
        });
        await saveConfig({
          model: id,
          baseUrl: baseUrl.trim() || platform.baseUrl,
          apiKey: apiKey.trim(),
        });
      } else {
        const custom = config.customModels.find((m) => m.id === id);
        await addCustomModel({
          id,
          label: custom?.label || id,
          baseUrl: baseUrl.trim() || custom?.baseUrl || '',
          apiKey: apiKey.trim(),
        });
      }
      showToast('已保存到数据库（按当前模型）');
      onClose();
    } catch {
      setTestResult(useLlmConfigStore.getState().lastError || '保存失败');
    }
  };

  const handleAddCustom = async () => {
    const id = normalizeLlmModelId(customDraft.id);
    if (!id) {
      setTestResult('请填写模型 ID（须与厂商 API 文档一致）');
      return;
    }
    if (!apiConnected) {
      setTestResult('共享 API 未连接，无法写入数据库');
      return;
    }
    try {
      await addCustomModel({
        id,
        label: customDraft.label.trim() || id,
        baseUrl: customDraft.baseUrl.trim() || baseUrl.trim(),
        apiKey: customDraft.apiKey.trim() || apiKey.trim(),
      });
      setModelId(id);
      if (customDraft.baseUrl.trim()) setBaseUrl(customDraft.baseUrl.trim());
      if (customDraft.apiKey.trim()) setApiKey(customDraft.apiKey.trim());
      setShowAdd(false);
      setCustomDraft({ id: '', label: '', baseUrl: '', apiKey: '' });
      setTestResult(`已写入数据库：${id}`);
      showToast('扩展模型已同步数据库');
    } catch {
      setTestResult(useLlmConfigStore.getState().lastError || '保存失败');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult('正在测试连接…');
    const result = await testLlmConnection({
      model: normalizeLlmModelId(modelId),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
    });
    setTestResult(result.message);
    setTesting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-black/5 bg-white shadow-apple-lg">
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-[#1d1d1f]">对话模型与凭证</h3>
            <p className="mt-0.5 text-[11px] text-zinc-400">选用 · 按模型 API Key · 扩展</p>
          </div>
          <button type="button" onClick={onClose} className="text-[#86868b] hover:text-[#1d1d1f]">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5 text-left">
          <section>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="text-[11px] font-semibold text-[#86868b]">1. 选用模型</label>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setAppView('model-ops');
                  }}
                  className="text-[11px] font-medium text-claw-600 hover:underline"
                >
                  管理平台目录 →
                </button>
              ) : null}
            </div>
            <p className="mb-2 text-[10px] leading-relaxed text-zinc-400">
              平台模型由运营写入数据库「模型配置」；打开本弹窗会从后端刷新目录。
            </p>
            {!apiConnected ? (
              <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-900">
                共享 API 未连接：无法从数据库加载/保存，请先连接后端。
              </p>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              {platformModels.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelect(m.id)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-semibold transition',
                    modelId === m.id
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300',
                  )}
                >
                  <span>
                    {m.label}
                    <span className="ml-1 font-normal opacity-70">{m.providerName}</span>
                  </span>
                  <span className="mt-0.5 block font-mono text-[9px] font-normal opacity-60">
                    {m.id}
                    {m.apiKey?.trim() ? '' : ' · 无 Key'}
                  </span>
                </button>
              ))}
              {config.customModels.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelect(m.id)}
                  className={cn(
                    'group relative rounded-lg border border-dashed px-2.5 py-1.5 text-[11px] font-semibold transition',
                    modelId === m.id
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-amber-200 bg-amber-50/50 text-zinc-700 hover:border-amber-300',
                  )}
                >
                  {m.label || m.id}
                  <span className="ml-1 text-[9px] font-normal opacity-70">扩展</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeCustomModel(m.id).then(() => {
                        if (modelId === m.id) {
                          const fallback = platformModels[0]?.id || config.defaultModelId;
                          handleSelect(fallback);
                        }
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        removeCustomModel(m.id);
                      }
                    }}
                    className="ml-1.5 text-[9px] opacity-60 hover:opacity-100"
                    title="移除扩展"
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-zinc-400">
              当前：{meta.providerName} · {meta.label}
              {meta.custom ? '（扩展）' : '（平台）'} · `{meta.id}`
            </p>
          </section>

          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[11px] font-semibold text-[#86868b]">2. 当前模型凭证</label>
            </div>
            <p className="mb-2 rounded-lg border border-sky-100 bg-sky-50 px-2.5 py-2 text-[11px] leading-relaxed text-sky-900">
              Key 绑定到「{meta.label}」，切换模型后编辑的是另一套凭证。多人环境仍建议优先配置服务端
              LLM_*。
            </p>
            <label className="mb-2 block text-[11px] font-semibold text-[#86868b]">
              Base URL
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="mono mt-1 w-full rounded-xl border border-black/8 px-3 py-2 text-[12px]"
                placeholder="https://api.example.com/v1"
              />
            </label>
            <label className="block text-[11px] font-semibold text-[#86868b]">
              API Key
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mono mt-1 w-full rounded-xl border border-black/8 px-3 py-2 text-[12px]"
                placeholder="sk-..."
                autoComplete="off"
              />
            </label>
          </section>

          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[11px] font-semibold text-[#86868b]">3. 扩展模型（可选）</label>
              <button
                type="button"
                onClick={() => setShowAdd((v) => !v)}
                className="text-[11px] font-medium text-claw-600 hover:underline"
              >
                {showAdd ? '收起' : '+ 添加扩展'}
              </button>
            </div>
            <p className="mb-2 text-[10px] text-zinc-400">
              仅本工作区临时对接；若需全员可选，请运营写入「模型配置」目录。
            </p>
            {showAdd ? (
              <div className="space-y-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 p-3">
                <input
                  value={customDraft.id}
                  onChange={(e) => setCustomDraft((d) => ({ ...d, id: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px]"
                  placeholder="模型 ID（API 名）"
                />
                <input
                  value={customDraft.label}
                  onChange={(e) => setCustomDraft((d) => ({ ...d, label: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px]"
                  placeholder="显示名称（可选）"
                />
                <input
                  value={customDraft.baseUrl}
                  onChange={(e) => setCustomDraft((d) => ({ ...d, baseUrl: e.target.value }))}
                  className="mono w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px]"
                  placeholder="Base URL（OpenAI 兼容）"
                />
                <input
                  type="password"
                  value={customDraft.apiKey}
                  onChange={(e) => setCustomDraft((d) => ({ ...d, apiKey: e.target.value }))}
                  className="mono w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px]"
                  placeholder="API Key（该扩展专用）"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={handleAddCustom}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white"
                >
                  添加并选用
                </button>
              </div>
            ) : null}
          </section>

          {testResult ? (
            <p
              className={cn(
                'text-[11px]',
                testResult.includes('成功') ? 'font-medium text-emerald-600' : 'text-[#86868b]',
              )}
            >
              {testResult}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-black/[0.06] px-5 py-4">
          <button
            type="button"
            onClick={() => void handleTest()}
            disabled={testing}
            className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium hover:bg-black/[0.03] disabled:opacity-50"
          >
            {testing ? '测试中…' : '测试连接'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium hover:bg-black/[0.03]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={syncing || !apiConnected}
            className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            {syncing ? '写入中…' : '保存到数据库'}
          </button>
        </div>
      </div>
    </div>
  );
}
