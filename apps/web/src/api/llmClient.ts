import {
  isLlmConfigComplete,
  normalizeLlmModelId,
  resolveActiveCredentials,
  type LlmConfig,
} from '@/domain/llmConfig';
import { currentWorkspaceId } from '@/api/platformDocsApi';
import { apiAuthHeaders, apiUrl, fetchWithTimeout, isApiEnabled } from '@/api/client';
import { useLlmConfigStore } from '@/stores/llmConfigStore';
import type { ActionType } from '@/domain/plan';
import type { ExecutionStep } from '@/domain/chat';
import type { StreamEvent } from '@/domain/stream';

export interface LlmTestResult {
  ok: boolean;
  message: string;
  /** 服务端返回的可展示错误码；不包含 URL、响应正文或任何凭证。 */
  errorCode?: string;
  /** 服务端探测统计；只接受后端白名单字段，禁止回显原始响应。 */
  diagnostics?: LlmTestDiagnostics;
}

export interface LlmTestDiagnostics {
  phase?: 'config' | 'request' | 'response' | 'stream';
  elapsedMs?: number;
  timeoutMs?: number;
  httpStatus?: number;
  contentType?: string;
  upstreamSummary?: string;
  networkCode?: string;
  networkSummary?: string;
  sseFrames?: number;
  tokenDeltas?: number;
  reasoningDeltas?: number;
  contentChars?: number;
  reasoningChars?: number;
  usageInputTokens?: number | null;
  usageOutputTokens?: number | null;
  sawDoneMarker?: boolean;
  aborted?: boolean;
}

const LLM_TEST_REQUEST_TIMEOUT_MS = 20_000;

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export function getActiveLlmConfig(): LlmConfig {
  return useLlmConfigStore.getState().config;
}

/** 当前选用模型的执行凭证（按模型 Key） */
export function getActiveLlmRuntime(): { model: string; baseUrl: string; apiKey: string } {
  return resolveActiveCredentials(getActiveLlmConfig());
}

export function isLlmConfigured(config?: LlmConfig): boolean {
  return isLlmConfigComplete(config ?? getActiveLlmConfig());
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/$/, '');
}

function normalizeLlmTestErrorCode(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const code = value.trim();
  return /^[a-z0-9][a-z0-9_.:-]{0,63}$/i.test(code) ? code : undefined;
}

function normalizeLlmTestDiagnostics(value: unknown): LlmTestDiagnostics | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const boundedNumber = (input: unknown): number | undefined => {
    const number = typeof input === 'number' ? input : Number(input);
    return Number.isSafeInteger(number) && number >= 0 && number <= 1_000_000_000
      ? number
      : undefined;
  };
  const boundedText = (input: unknown): string | undefined => {
    if (typeof input !== 'string') return undefined;
    const text = input
      .replace(/[\u0000-\u001f\u007f]+/g, ' ')
      .replace(/Bearer\s+[^\s,;)}\]]+/gi, 'Bearer [redacted]')
      .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, 'Basic [redacted]')
      .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi, '$1[redacted]@')
      .replace(/([?&](?:api[-_]?key|access[-_]?token|token|secret|password|key)=)[^&\s]+/gi, '$1[redacted]')
      .replace(
        /((?:api[-_]?key|access[-_]?token|token|secret|password|key)\s*[:=]\s*["']?)[^"',\s}]+/gi,
        '$1[redacted]',
      )
      .replace(/\b(?:sk|rk|sess|access|refresh)-[A-Za-z0-9][A-Za-z0-9._~-]{7,}\b/gi, '[redacted]')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 240);
    return text || undefined;
  };
  const phase = raw.phase;
  const diagnostics: LlmTestDiagnostics = {
    ...(phase === 'config' || phase === 'request' || phase === 'response' || phase === 'stream'
      ? { phase }
      : {}),
    ...(boundedNumber(raw.elapsedMs) !== undefined
      ? { elapsedMs: boundedNumber(raw.elapsedMs) }
      : {}),
    ...(boundedNumber(raw.timeoutMs) !== undefined
      ? { timeoutMs: boundedNumber(raw.timeoutMs) }
      : {}),
    ...(boundedNumber(raw.httpStatus) !== undefined
      ? { httpStatus: boundedNumber(raw.httpStatus) }
      : {}),
    ...(boundedText(raw.contentType) ? { contentType: boundedText(raw.contentType) } : {}),
    ...(boundedText(raw.upstreamSummary)
      ? { upstreamSummary: boundedText(raw.upstreamSummary) }
      : {}),
    ...(boundedText(raw.networkCode) ? { networkCode: boundedText(raw.networkCode) } : {}),
    ...(boundedText(raw.networkSummary)
      ? { networkSummary: boundedText(raw.networkSummary) }
      : {}),
    ...(boundedNumber(raw.sseFrames) !== undefined
      ? { sseFrames: boundedNumber(raw.sseFrames) }
      : {}),
    ...(boundedNumber(raw.tokenDeltas) !== undefined
      ? { tokenDeltas: boundedNumber(raw.tokenDeltas) }
      : {}),
    ...(boundedNumber(raw.reasoningDeltas) !== undefined
      ? { reasoningDeltas: boundedNumber(raw.reasoningDeltas) }
      : {}),
    ...(boundedNumber(raw.contentChars) !== undefined
      ? { contentChars: boundedNumber(raw.contentChars) }
      : {}),
    ...(boundedNumber(raw.reasoningChars) !== undefined
      ? { reasoningChars: boundedNumber(raw.reasoningChars) }
      : {}),
    ...(raw.usageInputTokens === null || boundedNumber(raw.usageInputTokens) !== undefined
      ? { usageInputTokens: raw.usageInputTokens === null ? null : boundedNumber(raw.usageInputTokens) }
      : {}),
    ...(raw.usageOutputTokens === null || boundedNumber(raw.usageOutputTokens) !== undefined
      ? { usageOutputTokens: raw.usageOutputTokens === null ? null : boundedNumber(raw.usageOutputTokens) }
      : {}),
    ...(typeof raw.sawDoneMarker === 'boolean'
      ? { sawDoneMarker: raw.sawDoneMarker }
      : {}),
    ...(typeof raw.aborted === 'boolean' ? { aborted: raw.aborted } : {}),
  };
  return Object.keys(diagnostics).length ? diagnostics : undefined;
}

async function chatCompletion(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number; signal?: AbortSignal },
): Promise<string> {
  const runtime = getActiveLlmRuntime();
  const res = await fetch(`${normalizeBaseUrl(runtime.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${runtime.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: normalizeLlmModelId(runtime.model),
      messages,
      max_tokens: options?.maxTokens ?? 512,
      temperature: options?.temperature ?? 0.3,
      stream: false,
    }),
    signal: options?.signal,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM HTTP ${res.status}: ${errText.slice(0, 160)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

export async function* streamChatCompletion(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number; signal?: AbortSignal },
): AsyncGenerator<string> {
  const runtime = getActiveLlmRuntime();
  const res = await fetch(`${normalizeBaseUrl(runtime.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${runtime.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: normalizeLlmModelId(runtime.model),
      messages,
      max_tokens: options?.maxTokens ?? 1200,
      temperature: options?.temperature ?? 0.5,
      stream: true,
    }),
    signal: options?.signal,
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '');
    throw new Error(`LLM stream HTTP ${res.status}: ${errText.slice(0, 160)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // skip malformed chunk
      }
    }
  }
}

function parsePlanSteps(raw: string, fallback: string[]): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as unknown;
      if (Array.isArray(parsed)) {
        const steps = parsed
          .map((s) => (typeof s === 'string' ? s.trim() : ''))
          .filter(Boolean)
          .slice(0, 8);
        if (steps.length >= 2) return steps;
      }
    } catch {
      // fall through
    }
  }

  const lines = trimmed
    .split('\n')
    .map((line) => line.replace(/^[\d.\-*)\]]+\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 8);
  if (lines.length >= 2) return lines;

  return fallback;
}

export async function generatePlanStepsWithLlm(params: {
  userTask: string;
  actionType: ActionType;
  agentName: string;
  systemPrompt?: string;
  skillNames: string[];
  fallbackSteps: string[];
  signal?: AbortSignal;
}): Promise<string[]> {
  const skills = params.skillNames.length ? params.skillNames.join('、') : '无';
  const persona = params.systemPrompt?.trim()
    ? `\nAgent 角色设定：${params.systemPrompt.trim()}`
    : '';

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        '你是 MSS Claw 企业 AI 任务编排助手。根据用户任务输出 4-6 个简洁、可执行的中文步骤。' +
        '只返回 JSON 字符串数组，不要 markdown 代码块，不要额外解释。' +
        persona,
    },
    {
      role: 'user',
      content:
        `任务类型：${params.actionType === 'knowledge' ? '知识检索/RAG' : '营销数据分析'}\n` +
        `负责 Agent：${params.agentName}\n` +
        `已挂载 Skill：${skills}\n` +
        `用户任务：${params.userTask}\n` +
        `参考模板（可优化但保持业务语义）：${JSON.stringify(params.fallbackSteps)}`,
    },
  ];

  const raw = await chatCompletion(messages, { maxTokens: 400, temperature: 0.2, signal: params.signal });
  return parsePlanSteps(raw, params.fallbackSteps);
}

function buildExecutionMessages(params: {
  userTask: string;
  actionType: ActionType;
  agentName: string;
  systemPrompt?: string;
  planSteps: string[];
  kbContext?: string;
}): ChatMessage[] {
  const persona =
    params.systemPrompt?.trim() ||
    `你是 ${params.agentName}，华为营销服 MSS Claw 平台的专业 AI Agent。`;

  const kbBlock =
    params.actionType === 'knowledge' && params.kbContext?.trim()
      ? `\n\n【知识库检索上下文】\n${params.kbContext}\n\n请在回答中用 [1][2] 形式标注引用编号，并确保结论可溯源。`
      : '';

  const systemContent =
    `${persona}\n\n` +
    `请基于已确认的执行计划完成用户任务，输出结构清晰的中文 markdown 回复。\n` +
    `计划步骤：\n${params.planSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n` +
    `若为知识类任务，请标注引用来源；若为分析类任务，给出结论与建议。` +
    kbBlock;

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: params.userTask },
  ];
}

function planStepsToExecutionSteps(steps: string[]): ExecutionStep[] {
  return steps.map((label, i) => ({
    skill: `PlanStep_${i + 1}`,
    time: `${120 + i * 90}ms`,
    label,
    detail: label,
  }));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function* llmExecutionStream(params: {
  message: string;
  actionType: ActionType;
  agentName: string;
  systemPrompt?: string;
  planSteps: string[];
  kbContext?: string;
  signal?: AbortSignal;
}): AsyncGenerator<StreamEvent> {
  const { signal, planSteps, actionType, agentName, message, systemPrompt, kbContext } = params;
  if (signal?.aborted) return;

  const started = performance.now();
  yield { type: 'execution_start', executionId: `llm_${Date.now()}` };

  for (let i = 0; i < planSteps.length; i++) {
    if (signal?.aborted) return;
    const label = planSteps[i];
    const skill = `PlanStep_${i + 1}`;
    yield { type: 'skill_start', skill, label };
    await sleep(120 + Math.floor(Math.random() * 80));
    if (signal?.aborted) return;
    yield { type: 'skill_end', skill, latency: `${120 + i * 90}ms` };
  }

  const messages = buildExecutionMessages({
    userTask: message,
    actionType,
    agentName,
    systemPrompt,
    planSteps,
    kbContext,
  });

  try {
    for await (const token of streamChatCompletion(messages, { signal, maxTokens: 1200 })) {
      if (signal?.aborted) return;
      yield { type: 'token', content: token };
    }
  } catch (e) {
    yield {
      type: 'error',
      message: e instanceof Error ? e.message : 'LLM 流式响应失败',
    };
    return;
  }

  const elapsed = ((performance.now() - started) / 1000).toFixed(2);
  yield { type: 'artifact', agentType: actionType };
  yield {
    type: 'done',
    totalTime: `${elapsed}s`,
    steps: planStepsToExecutionSteps(planSteps),
    agentName,
  };
}

/** 已配置 LLM 时，把长描述压成短任务名；失败返回空串 */
export async function refineTaskTitleWithLlm(
  description: string,
  opts?: { agentName?: string; signal?: AbortSignal },
): Promise<string> {
  if (!isLlmConfigured()) return '';
  const desc = description.trim().slice(0, 400);
  if (!desc) return '';

  const agentHint = opts?.agentName ? `绑定专家：${opts.agentName}\n` : '';
  const content = await chatCompletion(
    [
      {
        role: 'system',
        content:
          '你是任务标题助手。根据用户任务描述生成简洁中文标题：不超过16个字，不要引号，不要句号，不要「标题：」前缀，只输出标题本身。',
      },
      {
        role: 'user',
        content: `${agentHint}任务描述：\n${desc}`,
      },
    ],
    { maxTokens: 32, temperature: 0.2, signal: opts?.signal },
  );

  return content
    .replace(/^["'「『]|["'」』]$/g, '')
    .replace(/^(标题|任务名)\s*[:：]\s*/u, '')
    .split(/[\r\n]/)[0]
    ?.trim() ?? '';
}

/**
 * Test the same server-side configuration used by chat execution.
 * The API resolves the saved workspace document and consumes a real
 * stream=true completion before returning, so a green result is meaningful
 * for the chat path (unlike the old browser-direct probe).
 */
export async function testWorkspaceLlmConnection(params?: {
  workspaceId?: string;
  model?: string;
  /** Optional unsaved values; the server probes them without persisting. */
  baseUrl?: string;
  apiKey?: string;
}): Promise<LlmTestResult> {
  if (!isApiEnabled()) {
    return {
      ok: false,
      errorCode: 'api_disabled',
      message: '共享 API 未启用，无法测试服务端模型',
    };
  }

  const workspaceId = (params?.workspaceId || currentWorkspaceId()).trim();
  if (!workspaceId) {
    return {
      ok: false,
      errorCode: 'workspace_missing',
      message: '未找到工作区，无法测试服务端模型',
    };
  }

  try {
    const payload: Record<string, string> = {};
    if (params?.model?.trim()) payload.model = normalizeLlmModelId(params.model);
    // Only send a candidate when both values are present. A partially edited
    // form must resolve the persisted workspace model instead of becoming an
    // invalid ephemeral config.
    const baseUrl = params?.baseUrl?.trim() || '';
    const apiKey = params?.apiKey?.trim() || '';
    if (baseUrl && apiKey) {
      payload.baseUrl = baseUrl;
      payload.apiKey = apiKey;
    }

    const res = await fetchWithTimeout(
      apiUrl(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/llm-config/test`),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...apiAuthHeaders(),
        },
        body: JSON.stringify(payload),
      },
      LLM_TEST_REQUEST_TIMEOUT_MS,
    );
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      model?: string;
      message?: string;
      errorCode?: unknown;
      diagnostics?: unknown;
    };
    if (!res.ok || body.ok !== true) {
      const detail = typeof body.message === 'string' ? body.message.trim() : '';
      const errorCode =
        normalizeLlmTestErrorCode(body.errorCode) ||
        (res.status ? `http_${res.status}` : undefined);
      const diagnostics = normalizeLlmTestDiagnostics(body.diagnostics);
      return {
        ok: false,
        ...(errorCode ? { errorCode } : {}),
        ...(diagnostics ? { diagnostics } : {}),
        message: detail
          ? `服务端测试失败：${detail.slice(0, 160)}`
          : `服务端测试失败（HTTP ${res.status || '未知'}）`,
      };
    }
    const diagnostics = normalizeLlmTestDiagnostics(body.diagnostics);
    return {
      ok: true,
      message: `连接成功 · ${(typeof body.model === 'string' ? body.model.trim().slice(0, 200) : '') || '当前模型'} · 服务端流式可用`,
      ...(diagnostics ? { diagnostics } : {}),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const aborted = typeof DOMException !== 'undefined' && e instanceof DOMException && e.name === 'AbortError';
    return {
      ok: false,
      errorCode: aborted ? 'client_request_timeout' : 'client_request_failed',
      message: aborted
        ? `服务端测试请求超时（${LLM_TEST_REQUEST_TIMEOUT_MS}ms）`
        : `服务端测试失败：${msg.slice(0, 160)}`,
      ...(aborted
        ? {
            diagnostics: {
              phase: 'request' as const,
              timeoutMs: LLM_TEST_REQUEST_TIMEOUT_MS,
              aborted: true,
            },
          }
        : {}),
    };
  }
}

/** @deprecated Use testWorkspaceLlmConnection; retained for callers of the old export. */
export function testLlmConnection(
  config: Pick<LlmConfig, 'baseUrl' | 'apiKey' | 'model'>,
): Promise<LlmTestResult> {
  return testWorkspaceLlmConnection(config);
}
