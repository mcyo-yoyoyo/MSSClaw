import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { testLlmConnection } from '@/api/llmClient';
import {
  DEFAULT_LLM_MODELS,
  resolveModelMeta,
  type CustomLlmModel,
} from '@/domain/llmConfig';
import { useLlmConfigStore } from '@/stores/llmConfigStore';

interface LlmSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function LlmSettingsModal({ open, onClose }: LlmSettingsModalProps) {
  const { config, saveConfig, addCustomModel, removeCustomModel, settingsFocusAdd } =
    useLlmConfigStore();
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [modelId, setModelId] = useState(config.model);
  const [showAdd, setShowAdd] = useState(false);
  const [customDraft, setCustomDraft] = useState<CustomLlmModel>({
    id: '',
    label: '',
    baseUrl: '',
  });
  const [testResult, setTestResult] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setApiKey(config.apiKey);
    setBaseUrl(config.baseUrl);
    setModelId(config.model);
    setShowAdd(settingsFocusAdd);
    setTestResult('');
    setCustomDraft({ id: '', label: '', baseUrl: '' });
  }, [open, config, settingsFocusAdd]);

  if (!open) return null;

  const meta = resolveModelMeta({ model: modelId, customModels: config.customModels });

  const handleSelectPreset = (id: string) => {
    setModelId(id);
    const next = resolveModelMeta({ model: id, customModels: config.customModels });
    if (next.baseUrl) setBaseUrl(next.baseUrl);
  };

  const handleSave = () => {
    saveConfig({
      model: modelId,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
    });
    onClose();
  };

  const handleAddCustom = () => {
    const id = customDraft.id.trim();
    if (!id) {
      setTestResult('请填写模型 ID');
      return;
    }
    addCustomModel({
      id,
      label: customDraft.label.trim() || id,
      baseUrl: customDraft.baseUrl.trim() || baseUrl.trim(),
    });
    setModelId(id);
    if (customDraft.baseUrl.trim()) setBaseUrl(customDraft.baseUrl.trim());
    setShowAdd(false);
    setCustomDraft({ id: '', label: '', baseUrl: '' });
    setTestResult(`已添加自定义模型：${id}`);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult('正在测试连接…');
    const result = await testLlmConnection({
      model: modelId,
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
          <h3 className="text-[15px] font-semibold text-[#1d1d1f]">模型与 API</h3>
          <button type="button" onClick={onClose} className="text-[#86868b] hover:text-[#1d1d1f]">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="space-y-3 p-5 text-left">
          <p className="text-[12px] text-[#86868b]">
            选用默认国产模型，或自定义添加 OpenAI 兼容模型。保存 API Key 后用于 Plan / 流式回复；未配置时走本地 Mock。
          </p>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[11px] font-semibold text-[#86868b]">默认模型</label>
              <button
                type="button"
                onClick={() => setShowAdd((v) => !v)}
                className="text-[11px] font-medium text-claw-600 hover:underline"
              >
                {showAdd ? '收起' : '+ 自定义添加'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_LLM_MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectPreset(m.id)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition',
                    modelId === m.id
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300',
                  )}
                >
                  {m.label}
                  <span className="ml-1 font-normal opacity-70">{m.providerName}</span>
                </button>
              ))}
              {config.customModels.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectPreset(m.id)}
                  className={cn(
                    'group relative rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition',
                    modelId === m.id
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300',
                  )}
                >
                  {m.label || m.id}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCustomModel(m.id);
                      if (modelId === m.id) handleSelectPreset(DEFAULT_LLM_MODELS[0].id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        removeCustomModel(m.id);
                      }
                    }}
                    className="ml-1.5 text-[9px] opacity-60 hover:opacity-100"
                    title="移除"
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-zinc-400">
              当前：{meta.providerName} · {meta.label}
            </p>
          </div>

          {showAdd ? (
            <div className="space-y-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 p-3">
              <p className="text-[11px] font-semibold text-zinc-600">添加自定义模型</p>
              <input
                value={customDraft.id}
                onChange={(e) => setCustomDraft((d) => ({ ...d, id: e.target.value }))}
                className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px]"
                placeholder="模型 ID，如 glm-4-plus"
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
              <button
                type="button"
                onClick={handleAddCustom}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white"
              >
                添加并选用
              </button>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-[#86868b]">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="mono w-full rounded-xl border border-black/8 px-3 py-2 text-[12px]"
              placeholder="https://api.example.com/v1"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-[#86868b]">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mono w-full rounded-xl border border-black/8 px-3 py-2 text-[12px]"
              placeholder="sk-..."
              autoComplete="off"
            />
          </div>

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
            onClick={handleSave}
            className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
