import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { CenterModal, CenterPageHeader, StatCardGrid } from '@/components/center/CenterShell';
import {
  normalizeLlmModelId,
  type PlatformLlmModel,
} from '@/domain/llmConfig';
import { useLlmConfigStore } from '@/stores/llmConfigStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSessionStore } from '@/stores/sessionStore';
import { testWorkspaceLlmConnection, type LlmTestResult } from '@/api/llmClient';

/**
 * 平台运营 · 模型配置
 * 读写一律走后端 workspace docs（llm-config → DB），与对话选用同源联动。
 * API Key / Base URL 按模型独立配置，不共享。
 */
function emptyPlatformModelDraft() {
  return {
    id: '',
    label: '',
    providerName: '',
    baseUrl: '',
    apiKey: '',
  };
}

interface ModelTestDiagnostic {
  workspaceId: string;
  modelId: string;
  label: string;
  result: LlmTestResult;
  testedAt: number;
  usedSavedConfig: boolean;
  hadUnsavedKey: boolean;
}

export function ModelCatalogOpsPage() {
  const config = useLlmConfigStore((s) => s.config);
  const syncing = useLlmConfigStore((s) => s.syncing);
  const lastError = useLlmConfigStore((s) => s.lastError);
  const hydrate = useLlmConfigStore((s) => s.hydrate);
  const upsertPlatformModel = useLlmConfigStore((s) => s.upsertPlatformModel);
  const setPlatformModelApiKey = useLlmConfigStore((s) => s.setPlatformModelApiKey);
  const removePlatformModel = useLlmConfigStore((s) => s.removePlatformModel);
  const setPlatformModelEnabled = useLlmConfigStore((s) => s.setPlatformModelEnabled);
  const setDefaultModelId = useLlmConfigStore((s) => s.setDefaultModelId);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const apiConnected = useWorkspaceStore((s) => s.apiConnected);
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);

  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState(emptyPlatformModelDraft);
  const [addOpen, setAddOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testingDraft, setTestingDraft] = useState(false);
  const [draftTestResult, setDraftTestResult] = useState<LlmTestResult | null>(null);
  const [lastModelTest, setLastModelTest] = useState<ModelTestDiagnostic | null>(null);

  useEffect(() => {
    setLastModelTest(null);
    if (!isAuthenticated) return;
    void hydrate({ fresh: true });
  }, [hydrate, apiConnected, workspaceId, isAuthenticated]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const m of config.platformModels) {
      next[m.id] = m.apiKey || '';
    }
    setKeyDrafts(next);
  }, [config.platformModels]);

  const enabledCount = useMemo(
    () => config.platformModels.filter((m) => m.enabled).length,
    [config.platformModels],
  );
  const keyedCount = useMemo(
    () => config.platformModels.filter((m) => Boolean(m.apiKey?.trim())).length,
    [config.platformModels],
  );

  const runDb = async (label: string, fn: () => Promise<void>): Promise<boolean> => {
    if (!apiConnected) {
      showToast('共享 API 未连接，无法写入数据库');
      return false;
    }
    try {
      await fn();
      setLastModelTest(null);
      showToast(`${label}（已同步数据库）`);
      return true;
    } catch {
      showToast(`失败：${useLlmConfigStore.getState().lastError || '无法写入数据库'}`);
      return false;
    }
  };

  const handleSaveKey = (modelId: string) => {
    const value = (keyDrafts[modelId] ?? '').trim();
    void runDb(`已保存 ${modelId} 的 API Key`, () =>
      setPlatformModelApiKey(modelId, value),
    );
  };

  const updateDraft = (patch: Partial<typeof draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setDraftTestResult(null);
  };

  const openAddModel = () => {
    setDraft(emptyPlatformModelDraft());
    setDraftTestResult(null);
    setAddOpen(true);
  };

  const closeAddModel = () => {
    if (syncing || testingDraft) return;
    setAddOpen(false);
    setDraftTestResult(null);
  };

  const handleAdd = async () => {
    const id = normalizeLlmModelId(draft.id);
    if (!id) {
      showToast('请填写模型 ID（须与厂商 API 一致）');
      return;
    }
    if (!draft.baseUrl.trim()) {
      showToast('请填写 OpenAI 兼容 Base URL');
      return;
    }
    const saved = await runDb(`已加入平台目录：${id}`, () =>
      upsertPlatformModel({
        id,
        label: draft.label.trim() || id,
        baseUrl: draft.baseUrl.trim(),
        providerName: draft.providerName.trim() || '平台',
        apiKey: draft.apiKey.trim(),
        enabled: true,
        source: 'platform',
      }),
    );
    if (saved) {
      setDraft(emptyPlatformModelDraft());
      setDraftTestResult(null);
      setAddOpen(false);
    }
  };

  const handleTestDraft = async () => {
    const modelId = normalizeLlmModelId(draft.id);
    if (!modelId || !draft.baseUrl.trim() || !draft.apiKey.trim()) {
      const result = {
        ok: false,
        message: '请先填写模型 ID、Base URL 和 API Key',
      } satisfies LlmTestResult;
      setDraftTestResult(result);
      showToast(result.message);
      return;
    }
    setTestingDraft(true);
    const result = await testWorkspaceLlmConnection({
      workspaceId,
      model: modelId,
      baseUrl: draft.baseUrl,
      apiKey: draft.apiKey,
    });
    if (result.ok) {
      result.message += '；请点击“保存模型”后聊天才会使用此配置';
    }
    setDraftTestResult(result);
    showToast(result.message);
    setTestingDraft(false);
  };

  const handleDelete = (m: PlatformLlmModel) => {
    const tip =
      m.source === 'preset'
        ? `确认删除内置模型「${m.label}」？删除后不会自动恢复，需手动重新添加。`
        : `确认删除「${m.label}」？`;
    if (!window.confirm(tip)) return;
    void runDb(`已删除 ${m.id}`, () => removePlatformModel(m.id));
  };

  const handleTest = async (model: PlatformLlmModel) => {
    setTestingId(model.id);
    const testWorkspaceId = workspaceId;
    const hadUnsavedKey = (keyDrafts[model.id] ?? '') !== (model.apiKey || '');
    try {
      // Existing-row tests intentionally resolve the saved DB record. Unsaved
      // key edits become effective only after clicking that row's 保存 button.
      const result = await testWorkspaceLlmConnection({
        workspaceId: testWorkspaceId,
        model: model.id,
      });
      if (useWorkspaceStore.getState().workspaceId === testWorkspaceId) {
        setLastModelTest({
          workspaceId: testWorkspaceId,
          modelId: model.id,
          label: model.label,
          result,
          testedAt: Date.now(),
          usedSavedConfig: true,
          hadUnsavedKey,
        });
        showToast(result.message);
      }
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4 md:p-6">
      <CenterPageHeader
        title="模型配置"
        subtitle="平台目录 · 组织默认 · 按模型独立 API Key（后端 llm-config / 数据库）"
        tip="启停、删除与 Key 均写入工作区 docs；对话页拉取同一份配置。各模型 Key 互不共享。"
        actions={
          <>
            <button
              type="button"
              data-testid="model-add-button"
              disabled={!apiConnected || syncing}
              onClick={openAddModel}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              <i className="fa-solid fa-plus mr-1 text-[10px]" />添加模型
            </button>
            <button
              type="button"
              disabled={!apiConnected || syncing}
              onClick={() => {
                setLastModelTest(null);
                void hydrate({ fresh: true }).then(() => showToast('已从数据库刷新'));
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {syncing ? '同步中…' : '从数据库刷新'}
            </button>
          </>
        }
      />

      {!apiConnected ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
          共享 API 未连接：无法读写模型配置数据库。请先启动后端并保持在线后再编辑。
        </div>
      ) : null}
      {lastError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-800">
          {lastError}
        </div>
      ) : null}
      {lastModelTest ? (
        <section
          data-testid="model-test-diagnostic"
          role={lastModelTest.result.ok ? 'status' : 'alert'}
          aria-live="polite"
          className={cn(
            'rounded-xl border px-4 py-3 text-[12px] leading-relaxed',
            lastModelTest.result.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              {lastModelTest.result.ok ? '模型测试成功' : '模型测试失败'} · {lastModelTest.label}
              <span className="ml-1 font-mono text-[10px] font-normal opacity-70">
                ({lastModelTest.modelId})
              </span>
            </p>
            <time className="text-[10px] opacity-60">
              {new Date(lastModelTest.testedAt).toLocaleTimeString()}
            </time>
          </div>
          <p className="mt-1 break-words">
            {lastModelTest.result.message}
            {lastModelTest.result.errorCode ? (
              <code className="ml-1 font-mono text-[10px] opacity-75">
                [{lastModelTest.result.errorCode}]
              </code>
            ) : null}
          </p>
          <p className="mt-1 text-[10px] opacity-70">
            工作区：{lastModelTest.workspaceId} ·{' '}
            {lastModelTest.usedSavedConfig ? '本次使用数据库中已保存的 Base URL 和 API Key。' : '本次使用临时测试配置。'}
            {lastModelTest.hadUnsavedKey
              ? '当前输入框有未保存 Key，请先点击该行“保存”后再测试。'
              : ''}
          </p>
          {lastModelTest.result.diagnostics ? (
            <details className="mt-2 text-[10px]" open={!lastModelTest.result.ok}>
              <summary className="cursor-pointer select-none font-semibold">查看诊断详情</summary>
              <dl className="mt-1 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
                {lastModelTest.result.diagnostics.phase ? (
                  <div><dt className="inline opacity-60">阶段：</dt> <dd className="inline">{lastModelTest.result.diagnostics.phase}</dd></div>
                ) : null}
                {lastModelTest.result.diagnostics.httpStatus !== undefined ? (
                  <div><dt className="inline opacity-60">HTTP：</dt> <dd className="inline">{lastModelTest.result.diagnostics.httpStatus}</dd></div>
                ) : null}
                {lastModelTest.result.diagnostics.contentType ? (
                  <div><dt className="inline opacity-60">响应类型：</dt> <dd className="inline break-all">{lastModelTest.result.diagnostics.contentType}</dd></div>
                ) : null}
                {lastModelTest.result.diagnostics.networkCode ? (
                  <div><dt className="inline opacity-60">网络码：</dt> <dd className="inline">{lastModelTest.result.diagnostics.networkCode}</dd></div>
                ) : null}
                {lastModelTest.result.diagnostics.networkSummary ? (
                  <div className="sm:col-span-2"><dt className="inline opacity-60">网络摘要：</dt> <dd className="inline break-words">{lastModelTest.result.diagnostics.networkSummary}</dd></div>
                ) : null}
                {lastModelTest.result.diagnostics.upstreamSummary ? (
                  <div className="sm:col-span-2"><dt className="inline opacity-60">上游摘要：</dt> <dd className="inline break-words">{lastModelTest.result.diagnostics.upstreamSummary}</dd></div>
                ) : null}
                {lastModelTest.result.diagnostics.elapsedMs !== undefined ? (
                  <div><dt className="inline opacity-60">耗时：</dt> <dd className="inline">{lastModelTest.result.diagnostics.elapsedMs}ms</dd></div>
                ) : null}
                {lastModelTest.result.diagnostics.timeoutMs !== undefined ? (
                  <div><dt className="inline opacity-60">超时阈值：</dt> <dd className="inline">{lastModelTest.result.diagnostics.timeoutMs}ms</dd></div>
                ) : null}
                {lastModelTest.result.diagnostics.sseFrames !== undefined ? (
                  <div><dt className="inline opacity-60">SSE 帧：</dt> <dd className="inline">{lastModelTest.result.diagnostics.sseFrames}</dd></div>
                ) : null}
                {lastModelTest.result.diagnostics.tokenDeltas !== undefined ? (
                  <div><dt className="inline opacity-60">正文片段：</dt> <dd className="inline">{lastModelTest.result.diagnostics.tokenDeltas}</dd></div>
                ) : null}
                {lastModelTest.result.diagnostics.reasoningDeltas !== undefined ? (
                  <div><dt className="inline opacity-60">推理片段：</dt> <dd className="inline">{lastModelTest.result.diagnostics.reasoningDeltas}</dd></div>
                ) : null}
                {lastModelTest.result.diagnostics.contentChars !== undefined ? (
                  <div><dt className="inline opacity-60">正文字符：</dt> <dd className="inline">{lastModelTest.result.diagnostics.contentChars}</dd></div>
                ) : null}
                {lastModelTest.result.diagnostics.reasoningChars !== undefined ? (
                  <div><dt className="inline opacity-60">推理字符：</dt> <dd className="inline">{lastModelTest.result.diagnostics.reasoningChars}</dd></div>
                ) : null}
                {lastModelTest.result.diagnostics.usageOutputTokens !== undefined ? (
                  <div><dt className="inline opacity-60">输出 Token：</dt> <dd className="inline">{lastModelTest.result.diagnostics.usageOutputTokens ?? '—'}</dd></div>
                ) : null}
                {lastModelTest.result.diagnostics.sawDoneMarker !== undefined ? (
                  <div><dt className="inline opacity-60">SSE 完成标记：</dt> <dd className="inline">{lastModelTest.result.diagnostics.sawDoneMarker ? '是' : '否'}</dd></div>
                ) : null}
              </dl>
            </details>
          ) : null}
        </section>
      ) : null}

      <StatCardGrid
        items={[
          ['目录模型', config.platformModels.length],
          ['已启用', enabledCount],
          ['已配 Key', keyedCount],
          ['API', apiConnected ? (syncing ? '同步中' : '已连接') : '离线'],
        ]}
      />

      <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 md:p-5">
        <div className="mb-3">
          <h3 className="text-[14px] font-semibold text-zinc-900">平台模型目录</h3>
          <p className="mt-0.5 text-[12px] text-zinc-500">
            每个模型单独填写 API Key；启用后出现在对话「平台模型」列表。
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] text-zinc-400">
                <th className="px-2 py-2 font-semibold">模型</th>
                <th className="px-2 py-2 font-semibold">厂商</th>
                <th className="px-2 py-2 font-semibold">Base URL</th>
                <th className="px-2 py-2 font-semibold">API Key</th>
                <th className="px-2 py-2 font-semibold">状态</th>
                <th className="px-2 py-2 font-semibold">默认</th>
                <th className="px-2 py-2 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {config.platformModels.map((m) => {
                const draftKey = keyDrafts[m.id] ?? '';
                const dirty = draftKey !== (m.apiKey || '');
                return (
                  <tr key={m.id} className="border-b border-zinc-50 align-top">
                    <td className="px-2 py-2.5">
                      <p className="font-semibold text-zinc-800">{m.label}</p>
                      <p className="font-mono text-[10px] text-zinc-400">{m.id}</p>
                    </td>
                    <td className="px-2 py-2.5 text-zinc-600">
                      {m.providerName}
                      <span className="ml-1 text-[10px] text-zinc-400">
                        {m.source === 'preset' ? '内置' : '运营'}
                      </span>
                    </td>
                    <td
                      className="max-w-[180px] truncate px-2 py-2.5 font-mono text-[10px] text-zinc-500"
                      title={m.baseUrl}
                    >
                      {m.baseUrl || '—'}
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex min-w-[200px] items-center gap-1.5">
                        <input
                          type="password"
                          value={draftKey}
                          disabled={!apiConnected || syncing}
                          onChange={(e) =>
                            setKeyDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                          placeholder={m.apiKey ? '••••••••' : 'sk-…'}
                          className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 font-mono text-[11px] outline-none focus:border-zinc-400 disabled:bg-zinc-50"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          disabled={!apiConnected || syncing || !dirty}
                          onClick={() => handleSaveKey(m.id)}
                          className="shrink-0 rounded-md bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-40"
                        >
                          保存
                        </button>
                      </div>
                      <p className="mt-0.5 text-[10px] text-zinc-400">
                        {m.apiKey?.trim() ? '已配置' : '未配置'}
                        {dirty ? ' · 未保存' : ''}
                      </p>
                    </td>
                    <td className="px-2 py-2.5">
                      <button
                        type="button"
                        disabled={!apiConnected || syncing}
                        onClick={() =>
                          void runDb(m.enabled ? `已停用 ${m.label}` : `已启用 ${m.label}`, () =>
                            setPlatformModelEnabled(m.id, !m.enabled),
                          )
                        }
                        className={cn(
                          'rounded-md px-2 py-0.5 text-[10px] font-semibold disabled:opacity-50',
                          m.enabled
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-zinc-100 text-zinc-500',
                        )}
                      >
                        {m.enabled ? '已启用' : '已停用'}
                      </button>
                    </td>
                    <td className="px-2 py-2.5">
                      <input
                        type="radio"
                        name="default-model"
                        checked={config.defaultModelId === m.id}
                        disabled={!m.enabled || !apiConnected || syncing}
                        onChange={() =>
                          void runDb(`默认模型 → ${m.label}`, () => setDefaultModelId(m.id))
                        }
                        title="设为组织默认"
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          disabled={!apiConnected || syncing || testingId === m.id || !m.enabled || !m.baseUrl}
                          onClick={() => void handleTest(m)}
                          className="text-[11px] font-semibold text-sky-700 hover:underline disabled:opacity-40"
                        >
                          {testingId === m.id ? '测试中…' : m.enabled ? '测试' : '已停用'}
                        </button>
                        <button
                          type="button"
                          disabled={!apiConnected || syncing}
                          onClick={() => handleDelete(m)}
                          className="text-[11px] font-semibold text-rose-600 hover:underline disabled:opacity-40"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {config.customModels.length ? (
        <section className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 p-4">
          <h3 className="text-[13px] font-semibold text-zinc-800">工作区扩展模型（库内只读）</h3>
          <p className="mt-1 text-[11px] text-zinc-500">
            用户在偏好中添加的扩展，同存于 llm-config。若需全员目录化，请上方「加入目录」。
          </p>
          <ul className="mt-2 space-y-1">
            {config.customModels.map((m) => (
              <li key={m.id} className="text-[12px] text-zinc-600">
                <span className="font-medium">{m.label || m.id}</span>
                <span className="ml-2 font-mono text-[10px] text-zinc-400">{m.id}</span>
                <span className="ml-2 text-[10px] text-zinc-400">
                  {m.apiKey?.trim() ? '已配 Key' : '未配 Key'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <CenterModal
        open={addOpen}
        title="添加平台模型"
        onClose={closeAddModel}
        size="lg"
        fitContent
        actions={
          <>
            <button
              type="button"
              onClick={closeAddModel}
              disabled={syncing || testingDraft}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-[12px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={!apiConnected || syncing || !draft.id.trim() || !draft.baseUrl.trim()}
              className="rounded-lg bg-zinc-900 px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {syncing ? '保存中…' : '保存模型'}
            </button>
          </>
        }
      >
        <div data-testid="model-add-modal" className="space-y-4">
          <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-3.5 py-3 text-[11px] leading-relaxed text-sky-900">
            <p className="font-semibold">默认连接协议：OpenAI 兼容格式</p>
            <p className="mt-1">认证方式：Bearer token</p>
            <code className="mt-2 block rounded-lg bg-white/80 px-2.5 py-2 font-mono text-[10px] text-sky-950">
              {'Authorization: Bearer <your-api-key>'}
            </code>
            <p className="mt-2 text-sky-800/75">
              测试由内网 API 发送到 Base URL 的 <code>/chat/completions</code>，与聊天执行使用同一服务端链路；仅临时探测，不写入配置。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-semibold text-zinc-500">
              模型 ID <span className="text-rose-500">*</span>
              <input
                value={draft.id}
                disabled={!apiConnected || syncing}
                onChange={(e) => updateDraft({ id: e.target.value })}
                placeholder="例如 glm-5.1"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-zinc-400 disabled:bg-zinc-50"
                autoComplete="off"
              />
            </label>
            <label className="text-[11px] font-semibold text-zinc-500">
              展示名
              <input
                value={draft.label}
                disabled={!apiConnected || syncing}
                onChange={(e) => updateDraft({ label: e.target.value })}
                placeholder="默认使用模型 ID"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[12px] outline-none focus:border-zinc-400 disabled:bg-zinc-50"
              />
            </label>
            <label className="text-[11px] font-semibold text-zinc-500">
              厂商 / 提供方
              <input
                value={draft.providerName}
                disabled={!apiConnected || syncing}
                onChange={(e) => updateDraft({ providerName: e.target.value })}
                placeholder="例如 OpenAI / 自建网关"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[12px] outline-none focus:border-zinc-400 disabled:bg-zinc-50"
              />
            </label>
            <label className="text-[11px] font-semibold text-zinc-500">
              Base URL <span className="text-rose-500">*</span>
              <input
                type="url"
                value={draft.baseUrl}
                disabled={!apiConnected || syncing}
                onChange={(e) => updateDraft({ baseUrl: e.target.value })}
                placeholder="https://api.example.com/v1"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-zinc-400 disabled:bg-zinc-50"
                autoComplete="url"
              />
            </label>
            <label className="text-[11px] font-semibold text-zinc-500 sm:col-span-2">
              API Key
              <span className="ml-1 font-normal text-zinc-400">可稍后在目录中补填</span>
              <input
                type="password"
                value={draft.apiKey}
                disabled={!apiConnected || syncing}
                onChange={(e) => updateDraft({ apiKey: e.target.value })}
                placeholder="输入供应商 API Key"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-zinc-400 disabled:bg-zinc-50"
                autoComplete="new-password"
              />
            </label>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[12px] font-semibold text-zinc-800">连接调试</p>
                <p className="mt-0.5 text-[10px] text-zinc-500">
                  使用当前填写的模型 ID、Base URL 和 API Key 发起一次最小请求。
                </p>
              </div>
              <button
                type="button"
                data-testid="model-add-test-button"
                onClick={() => void handleTestDraft()}
                disabled={!apiConnected || syncing || testingDraft}
                className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-sky-800 hover:bg-sky-50 disabled:opacity-50"
              >
                {testingDraft ? '调试中…' : '调试连接'}
              </button>
            </div>
            {draftTestResult ? (
              <div
                data-testid="model-add-test-result"
                role={draftTestResult.ok ? 'status' : 'alert'}
                className={cn(
                  'mt-3 rounded-lg px-3 py-2 text-[11px] leading-relaxed',
                  draftTestResult.ok
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-rose-50 text-rose-800',
                )}
              >
                <i
                  className={cn(
                    'mr-1.5',
                    draftTestResult.ok
                      ? 'fa-solid fa-circle-check'
                      : 'fa-solid fa-circle-exclamation',
                  )}
                />
                {draftTestResult.ok ? draftTestResult.message : `调试失败：${draftTestResult.message}`}
              </div>
            ) : null}
          </div>
        </div>
      </CenterModal>
    </div>
  );
}
