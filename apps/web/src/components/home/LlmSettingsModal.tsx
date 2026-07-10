import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

import { testLlmConnection } from '@/api/llmClient';

import { LLM_PROVIDERS, type LlmProviderId } from '@/domain/llmConfig';

import { useLlmConfigStore } from '@/stores/llmConfigStore';



interface LlmSettingsModalProps {

  open: boolean;

  onClose: () => void;

}



export function LlmSettingsModal({ open, onClose }: LlmSettingsModalProps) {

  const { config, saveConfig } = useLlmConfigStore();

  const [draft, setDraft] = useState(config);

  const [testResult, setTestResult] = useState('');

  const [testing, setTesting] = useState(false);



  useEffect(() => {

    if (open) {

      setDraft(config);

      setTestResult('');

    }

  }, [open, config]);



  if (!open) return null;



  const handleSave = () => {

    saveConfig(draft);

    onClose();

  };



  const handleProviderChange = (provider: LlmProviderId) => {

    const preset = LLM_PROVIDERS[provider] ?? LLM_PROVIDERS.openai;

    setDraft((d) => ({

      ...d,

      provider,

      baseUrl: preset.baseUrl || d.baseUrl,

      model: preset.models[0] || d.model,

    }));

  };



  const handleTest = async () => {

    setTesting(true);

    setTestResult('正在测试连接…');

    const result = await testLlmConnection(draft);

    setTestResult(result.message);

    setTesting(false);

  };



  return (

    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm">

      <div className="w-full max-w-md rounded-2xl border border-black/5 bg-white shadow-apple-lg">

        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">

          <h3 className="text-[15px] font-semibold text-[#1d1d1f]">模型 API 配置</h3>

          <button type="button" onClick={onClose} className="text-[#86868b] hover:text-[#1d1d1f]">

            <i className="fa-solid fa-xmark" />

          </button>

        </div>

        <div className="space-y-3 p-5 text-left">

          <p className="text-[12px] text-[#86868b]">

            配置 OpenAI 兼容接口。保存后将用于生成执行计划与流式回复；未配置时使用本地 Mock。

          </p>

          <div>

            <label className="mb-1 block text-[11px] font-semibold text-[#86868b]">服务商</label>

            <select

              value={draft.provider}

              onChange={(e) => handleProviderChange(e.target.value as LlmProviderId)}

              className="w-full rounded-xl border border-black/8 px-3 py-2 text-[12px]"

            >

              {Object.entries(LLM_PROVIDERS).map(([k, v]) => (

                <option key={k} value={k}>

                  {v.name}

                </option>

              ))}

            </select>

          </div>

          <div>

            <label className="mb-1 block text-[11px] font-semibold text-[#86868b]">Base URL</label>

            <input

              type="text"

              value={draft.baseUrl}

              onChange={(e) => setDraft((d) => ({ ...d, baseUrl: e.target.value }))}

              className="mono w-full rounded-xl border border-black/8 px-3 py-2 text-[12px]"

              placeholder="https://api.openai.com/v1"

            />

          </div>

          <div>

            <label className="mb-1 block text-[11px] font-semibold text-[#86868b]">API Key</label>

            <input

              type="password"

              value={draft.apiKey}

              onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value }))}

              className="mono w-full rounded-xl border border-black/8 px-3 py-2 text-[12px]"

              placeholder="sk-..."

              autoComplete="off"

            />

          </div>

          <div>

            <label className="mb-1 block text-[11px] font-semibold text-[#86868b]">默认模型</label>

            <input

              type="text"

              value={draft.model}

              onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}

              className="w-full rounded-xl border border-black/8 px-3 py-2 text-[12px]"

              placeholder="gpt-4o-mini"

            />

          </div>

          {testResult && (

            <p

              className={cn(

                'text-[11px]',

                testResult.includes('成功') ? 'font-medium text-emerald-600' : 'text-[#86868b]',

              )}

            >

              {testResult}

            </p>

          )}

        </div>

        <div className="flex justify-end gap-2 border-t border-black/[0.06] px-5 py-4">

          <button

            type="button"

            onClick={handleTest}

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


