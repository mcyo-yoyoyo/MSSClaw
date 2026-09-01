import type {
  AgentType,
  ExecutionStep,
  ExecutionUsage,
  StreamEvent,
} from './dto/stream-execution.dto';

export type LlmChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type NestLlmRuntimeConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  source: 'env' | 'workspace-doc' | 'request';
};

/**
 * Safe, provider-agnostic information collected by the connection probe.
 * Never include the request URL (it may contain credentials) or an upstream
 * response body here; summaries are redacted and bounded below.
 */
export type LlmStreamDiagnostics = {
  phase: 'config' | 'request' | 'response' | 'stream';
  elapsedMs: number;
  timeoutMs?: number;
  httpStatus?: number;
  contentType?: string;
  upstreamSummary?: string;
  networkCode?: string;
  networkSummary?: string;
  sseFrames: number;
  tokenDeltas: number;
  reasoningDeltas: number;
  contentChars: number;
  reasoningChars: number;
  usageInputTokens: number | null;
  usageOutputTokens: number | null;
  sawDoneMarker: boolean;
  aborted?: boolean;
};

const MAX_DIAGNOSTIC_TEXT = 240;
const MAX_UPSTREAM_ERROR_BODY = 4096;

function safeDiagnosticText(value: unknown, secret?: string): string {
  if (typeof value !== 'string') return '';
  const trimmedSecret = typeof secret === 'string' ? secret.trim() : '';
  const exactSecret =
    trimmedSecret.length >= 6
      ? value.split(trimmedSecret).join('[redacted]')
      : value;
  const encodedSecret =
    trimmedSecret.length >= 6
      ? exactSecret.split(encodeURIComponent(trimmedSecret)).join('[redacted]')
      : exactSecret;
  return encodedSecret
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/Bearer\s+[^\s,;)}\]]+/gi, 'Bearer [redacted]')
    .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, 'Basic [redacted]')
    .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi, '$1[redacted]@')
    .replace(/([?&](?:api[-_]?key|access[-_]?token|token|secret|password|key)=)[^&\s]+/gi, '$1[redacted]')
    .replace(
      /((?:api[-_]?key|access[-_]?token|token|secret|password|key)\s*[:=]\s*["']?)[^"',\s}]+/gi,
      '$1[redacted]',
    )
    // Redact obvious credential-shaped values, while preserving useful error
    // codes such as `invalid_api_key` and ordinary phrases such as `token limit`.
    .replace(/\b[\w.-]{8,}(?:secret|password)[\w.-]*\b/gi, '[redacted]')
    .replace(/\b(?:sk|rk|sess|access|refresh)-[A-Za-z0-9][A-Za-z0-9._~-]{7,}\b/gi, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DIAGNOSTIC_TEXT);
}

/** Extract only conventional error fields; arbitrary upstream bodies stay hidden. */
async function safeUpstreamSummary(response: Response, secret?: string): Promise<string | undefined> {
  let body = '';
  try {
    body = (await response.text()).slice(0, MAX_UPSTREAM_ERROR_BODY);
  } catch {
    return undefined;
  }
  if (!body.trim()) return undefined;

  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const error = parsed.error;
    const errorObject =
      error && typeof error === 'object' && !Array.isArray(error)
        ? (error as Record<string, unknown>)
        : undefined;
    const pieces = [
      typeof error === 'string' ? error : undefined,
      typeof errorObject?.message === 'string' ? errorObject.message : undefined,
      typeof errorObject?.type === 'string' ? errorObject.type : undefined,
      typeof errorObject?.code === 'string' ? errorObject.code : undefined,
      typeof parsed.message === 'string' ? parsed.message : undefined,
      typeof parsed.detail === 'string' ? parsed.detail : undefined,
      typeof parsed.code === 'string' ? parsed.code : undefined,
    ]
      .map((piece) => safeDiagnosticText(piece, secret))
      .filter(Boolean);
    return pieces.length
      ? [...new Set(pieces)].join(' · ').slice(0, MAX_DIAGNOSTIC_TEXT)
      : '上游返回 JSON 错误（未提供错误摘要）';
  } catch {
    // Do not echo arbitrary HTML/plaintext: it can contain credentials or a
    // reverse-proxy diagnostic page with internal topology.
    return '上游返回非 JSON 错误（响应体已隐藏）';
  }
}

type ErrorChainNode = { message?: unknown; code?: unknown };

/** Bounded, cycle-safe walk over `cause` chains and AggregateError members. */
function flattenErrorChain(error: unknown, maxDepth = 6): ErrorChainNode[] {
  const seen = new Set<object>();
  const chain: ErrorChainNode[] = [];
  const visit = (node: unknown, depth: number) => {
    if (depth > maxDepth || !node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    const current = node as ErrorChainNode & { cause?: unknown; errors?: unknown };
    chain.push(current);
    // Multi-address connects (Happy Eyeballs) fail as an AggregateError whose
    // real codes live in `errors`, not in `cause`.
    if (Array.isArray(current.errors)) {
      for (const nested of current.errors.slice(0, 3)) visit(nested, depth + 1);
    }
    visit(current.cause, depth + 1);
  };
  visit(error, 0);
  return chain;
}

function networkErrorDetails(error: unknown, secret?: string): {
  code?: string;
  summary: string;
} {
  if (!error || typeof error !== 'object') return { summary: '网络请求失败' };
  // undici hides the actionable failure behind wrappers: `TypeError: fetch
  // failed`, and — when the connection is torn down rather than aborted — a
  // `DOMException: Request was cancelled.` in between. The code that tells an
  // operator what to fix (ENOTFOUND / ECONNREFUSED / UND_ERR_SOCKET / a TLS
  // error) can sit two or more levels down `cause`.
  const chain = flattenErrorChain(error);

  // DOMException carries a numeric `code`, so only string codes qualify. Later
  // nodes are closer to the socket, so the deepest match is the most specific.
  let code: string | undefined;
  for (const node of chain) {
    const value = node.code;
    if (typeof value === 'string' && /^[A-Za-z0-9_.:-]{2,64}$/.test(value)) code = value;
  }

  const messages = [...new Set(chain.map((node) => safeDiagnosticText(node.message, secret)).filter(Boolean))];
  // `fetch failed` carries no information once a concrete cause is present.
  const meaningful = messages.length > 1 ? messages.filter((m) => !/^fetch failed$/i.test(m)) : messages;
  const summary =
    (meaningful.length ? meaningful : messages).join(' ← ').slice(0, MAX_DIAGNOSTIC_TEXT) || '网络请求失败';

  return { ...(code ? { code } : {}), summary };
}

function responseContentType(response: Response, secret?: string): string | undefined {
  const safe = safeDiagnosticText(response.headers.get('content-type'), secret);
  return safe ? safe.slice(0, 120) : undefined;
}

function normalizeBaseUrl(baseUrl: string) {
  const value = baseUrl.trim().replace(/\/$/, '');
  if (!value || value.length > 2048) return '';
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? value : '';
  } catch {
    return '';
  }
}

function normalizeModelId(value: unknown): string {
  if (typeof value !== 'string') return '';
  const model = value.trim();
  if (!model || model.length > 200 || /[\u0000-\u001f\u007f]/.test(model)) return '';
  return model;
}

function hasModelDirectory(payload: Record<string, unknown>): boolean {
  // `platformModels` was added with the per-model credential format. Older
  // payloads may contain `customModels: []` while still using the shared
  // top-level key, so that field alone is not a directory marker.
  return Array.isArray(payload.platformModels);
}

function firstEnabledModelId(payload: Record<string, unknown>): string {
  for (const list of [payload.platformModels, payload.customModels]) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const model = item as Record<string, unknown>;
      if (model.enabled === false) continue;
      const id = normalizeModelId(model.id);
      if (id) return id;
    }
  }
  return '';
}

/** 服务端环境变量 LLM_*（部署级优先） */
export function nestLlmConfigFromEnv(): NestLlmRuntimeConfig | null {
  const baseUrl = normalizeBaseUrl(process.env.LLM_BASE_URL ?? '');
  const apiKey = (process.env.LLM_API_KEY ?? '').trim();
  if (!baseUrl || !apiKey) return null;
  return {
    baseUrl,
    apiKey,
    model: (process.env.LLM_MODEL ?? 'gpt-4o-mini').trim() || 'gpt-4o-mini',
    maxTokens: Number(process.env.LLM_MAX_TOKENS || 1200) || 1200,
    source: 'env',
  };
}

function pickModelCreds(
  payload: Record<string, unknown>,
  modelId: string,
): { baseUrl: string; apiKey: string; enabled: boolean } {
  const legacyKey = typeof payload.apiKey === 'string' ? payload.apiKey.trim() : '';
  const legacyBase = normalizeBaseUrl(typeof payload.baseUrl === 'string' ? payload.baseUrl : '');
  const lists = [payload.platformModels, payload.customModels];
  const hasModelDirectory = Array.isArray(payload.platformModels);
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const m = item as Record<string, unknown>;
      const id = typeof m.id === 'string' ? m.id.trim() : '';
      if (id !== modelId) continue;
      const entryBase = normalizeBaseUrl(typeof m.baseUrl === 'string' ? m.baseUrl : '');
      const entryKey = typeof m.apiKey === 'string' ? m.apiKey.trim() : '';
      return {
        // A model directory is authoritative. In the old format, a custom
        // entry could still rely on the shared top-level URL/key.
        baseUrl: entryBase || (hasModelDirectory ? '' : legacyBase),
        apiKey: entryKey || (hasModelDirectory ? '' : legacyKey),
        enabled: m.enabled !== false,
      };
    }
  }
  // A requested model must not silently inherit the top-level snapshot when a
  // model directory exists: that snapshot may belong to a different model.
  if (hasModelDirectory) {
    return { baseUrl: '', apiKey: '', enabled: false };
  }
  return { baseUrl: legacyBase, apiKey: legacyKey, enabled: true };
}

/** 工作区平台文档 llm-config（与前端对齐：按模型 Key，兼容旧顶层 apiKey） */
export function nestLlmConfigFromDoc(
  payload: unknown,
  requestedModel?: string,
): NestLlmRuntimeConfig | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  const requested = normalizeModelId(requestedModel);
  const modelDirectory = hasModelDirectory(p);
  const declared = normalizeModelId(p.model) || normalizeModelId(p.defaultModelId);
  const model =
    requested ||
    declared ||
    (modelDirectory && firstEnabledModelId(p)) ||
    normalizeModelId(process.env.LLM_MODEL) ||
    'gpt-4o-mini';
  const creds = pickModelCreds(p, model);
  if (!creds.enabled || !creds.baseUrl || !creds.apiKey) return null;
  return {
    baseUrl: creds.baseUrl,
    apiKey: creds.apiKey,
    model,
    maxTokens: Number(process.env.LLM_MAX_TOKENS || 1200) || 1200,
    source: 'workspace-doc',
  };
}

/** 临时连接探测配置；只用于本次请求，不写入工作区文档。 */
export function nestLlmConfigFromCandidate(payload: unknown): NestLlmRuntimeConfig | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  const baseUrl = normalizeBaseUrl(typeof p.baseUrl === 'string' ? p.baseUrl : '');
  const apiKey = typeof p.apiKey === 'string' ? p.apiKey.trim() : '';
  const model = normalizeModelId(p.model);
  if (
    !baseUrl ||
    !apiKey ||
    apiKey.length > 4096 ||
    /[\u0000-\u001f\u007f]/.test(apiKey) ||
    !model
  ) {
    return null;
  }
  return {
    baseUrl,
    apiKey,
    model,
    maxTokens: Number(process.env.LLM_MAX_TOKENS || 1200) || 1200,
    source: 'request',
  };
}

export function isNestLlmEnvConfigured(): boolean {
  return nestLlmConfigFromEnv() != null;
}

/** @deprecated 使用 isNestLlmEnvConfigured / resolve 运行时配置 */
export function isNestLlmConfigured(): boolean {
  return isNestLlmEnvConfigured();
}

function buildExecutionMessages(params: {
  userTask: string;
  actionType: AgentType;
  agentName: string;
  systemPrompt?: string;
  planSteps: string[];
  kbContext?: string;
}): LlmChatMessage[] {
  const persona =
    params.systemPrompt?.trim() ||
    `你是 ${params.agentName}，华为营销服 MSS Claw 平台的专业 AI Agent。`;

  const kbBlock =
    params.actionType === 'knowledge' && params.kbContext?.trim()
      ? `\n\n【知识库检索上下文】\n${params.kbContext}\n\n请在回答中用 [1][2] 形式标注引用编号，并确保结论可溯源。`
      : '';

  const steps = params.planSteps.length
    ? params.planSteps
    : ['理解任务', '分析与检索', '给出结论与建议'];

  const systemContent =
    `${persona}\n\n` +
    `请基于已确认的执行计划完成用户任务，输出结构清晰的中文 markdown 回复。\n` +
    `计划步骤：\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n` +
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

function tokenCount(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

/** OpenAI-compatible providers use prompt/completion_tokens; Anthropic-style
 * gateways commonly expose input/output_tokens. Keep missing halves null. */
function usageFromChunk(value: unknown): ExecutionUsage | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const inputTokens =
    tokenCount(raw.prompt_tokens) ??
    tokenCount(raw.input_tokens) ??
    tokenCount(raw.promptTokens) ??
    tokenCount(raw.inputTokens);
  const outputTokens =
    tokenCount(raw.completion_tokens) ??
    tokenCount(raw.output_tokens) ??
    tokenCount(raw.completionTokens) ??
    tokenCount(raw.outputTokens);
  if (inputTokens === null && outputTokens === null) return undefined;
  return { inputTokens, outputTokens };
}

function mergeUsage(
  previous: ExecutionUsage | undefined,
  next: ExecutionUsage | undefined,
): ExecutionUsage | undefined {
  if (!next) return previous;
  return {
    inputTokens: next.inputTokens ?? previous?.inputTokens ?? null,
    outputTokens: next.outputTokens ?? previous?.outputTokens ?? null,
  };
}

/** OpenAI-compatible SSE chat completions → StreamEvent */
export async function* nestLlmExecutionStream(params: {
  message: string;
  actionType: AgentType;
  agentName: string;
  systemPrompt?: string;
  planSteps?: string[];
  kbContext?: string;
  signal?: AbortSignal;
  config: NestLlmRuntimeConfig;
  /** Internal hook used by the model-config probe; normal chat leaves it unset. */
  onDiagnostics?: (diagnostics: LlmStreamDiagnostics) => void;
}): AsyncGenerator<StreamEvent> {
  const { signal, config: cfg, onDiagnostics } = params;
  const started = Date.now();
  let sseFrames = 0;
  let tokenDeltas = 0;
  let reasoningDeltas = 0;
  let contentChars = 0;
  let reasoningChars = 0;
  let usage: ExecutionUsage | undefined;
  let sawDoneMarker = false;

  const emitDiagnostics = (
    phase: LlmStreamDiagnostics['phase'],
    extra: Partial<LlmStreamDiagnostics> = {},
  ) => {
    if (!onDiagnostics) return;
    try {
      onDiagnostics({
        phase,
        elapsedMs: Math.max(0, Date.now() - started),
        sseFrames,
        tokenDeltas,
        reasoningDeltas,
        contentChars,
        reasoningChars,
        usageInputTokens: usage?.inputTokens ?? null,
        usageOutputTokens: usage?.outputTokens ?? null,
        sawDoneMarker,
        ...extra,
      });
    } catch {
      // Diagnostics must never change the execution result.
    }
  };

  if (signal?.aborted) {
    emitDiagnostics('request', { aborted: true });
    return;
  }

  const planSteps =
    params.planSteps?.filter((s) => s.trim()).length
      ? params.planSteps.filter((s) => s.trim())
      : ['理解任务', '分析与检索', '给出结论与建议'];

  const executionId = `llm_${Date.now()}`;
  yield { type: 'execution_start', executionId, source: 'llm' };

  for (let i = 0; i < planSteps.length; i++) {
    if (signal?.aborted) {
      emitDiagnostics('request', { aborted: true });
      return;
    }
    const label = planSteps[i];
    const skill = `PlanStep_${i + 1}`;
    yield { type: 'skill_start', skill, label };
    await sleep(80);
    if (signal?.aborted) {
      emitDiagnostics('request', { aborted: true });
      return;
    }
    yield { type: 'skill_end', skill, latency: `${120 + i * 90}ms` };
  }

  const messages = buildExecutionMessages({
    userTask: params.message,
    actionType: params.actionType,
    agentName: params.agentName,
    systemPrompt: params.systemPrompt,
    planSteps,
    kbContext: params.kbContext,
  });

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        max_tokens: cfg.maxTokens,
        temperature: 0.5,
        stream: true,
        // OpenAI-compatible gateways that support usage append it to the final
        // SSE chunk. Unsupported gateways simply omit the field.
        stream_options: { include_usage: true },
      }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      emitDiagnostics('request', { aborted: true });
      return;
    }
    const detail = networkErrorDetails(error, cfg.apiKey);
    emitDiagnostics('request', {
      ...(detail.code ? { networkCode: detail.code } : {}),
      networkSummary: detail.summary,
    });
    yield {
      type: 'error',
      message: onDiagnostics
        ? 'LLM stream connection failed'
        : `LLM stream connection failed: ${detail.summary.slice(0, 160)}`,
    };
    return;
  }

  if (!res.ok || !res.body) {
    const upstreamSummary = !res.ok
      ? await safeUpstreamSummary(res, cfg.apiKey)
      : '模型接口未返回可读取的 SSE 响应体';
    emitDiagnostics('response', {
      httpStatus: res.status,
      contentType: responseContentType(res, cfg.apiKey),
      ...(upstreamSummary ? { upstreamSummary } : {}),
    });
    yield { type: 'error', message: !res.ok ? `LLM stream HTTP ${res.status}` : 'LLM stream response body missing' };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const parseLine = (line: string): string | undefined => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return undefined;
    const payload = trimmed.slice(5).trim();
    if (!payload) return undefined;
    if (payload === '[DONE]') {
      sawDoneMarker = true;
      emitDiagnostics('stream', {
        httpStatus: res.status,
        contentType: responseContentType(res, cfg.apiKey),
      });
      return undefined;
    }
    sseFrames += 1;
    try {
      const json = JSON.parse(payload) as {
        choices?: {
          delta?: {
            content?: string;
            reasoning_content?: string;
            reasoning?: string;
            thinking?: string;
          };
        }[];
        usage?: unknown;
      };
      usage = mergeUsage(usage, usageFromChunk(json.usage));
      const delta = json.choices?.[0]?.delta;
      const content = typeof delta?.content === 'string' ? delta.content : '';
      const reasoning =
        typeof delta?.reasoning_content === 'string'
          ? delta.reasoning_content
          : typeof delta?.reasoning === 'string'
            ? delta.reasoning
            : typeof delta?.thinking === 'string'
              ? delta.thinking
              : '';
      if (content) {
        tokenDeltas += 1;
        contentChars += content.length;
      }
      if (reasoning) {
        reasoningDeltas += 1;
        reasoningChars += reasoning.length;
      }
      emitDiagnostics('stream', {
        httpStatus: res.status,
        contentType: responseContentType(res, cfg.apiKey),
      });
      return content || undefined;
    } catch {
      emitDiagnostics('stream', {
        httpStatus: res.status,
        contentType: responseContentType(res, cfg.apiKey),
      });
      return undefined;
    }
  };

  try {
    while (true) {
      if (signal?.aborted) {
        emitDiagnostics('stream', { aborted: true });
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const delta = parseLine(line);
        if (delta) yield { type: 'token', content: delta };
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) {
      const delta = parseLine(buffer);
      if (delta) yield { type: 'token', content: delta };
    }
  } catch (error) {
    if (signal?.aborted) {
      emitDiagnostics('stream', { aborted: true });
      return;
    }
    const detail = networkErrorDetails(error, cfg.apiKey);
    emitDiagnostics('stream', {
      httpStatus: res.status,
      contentType: responseContentType(res, cfg.apiKey),
      ...(detail.code ? { networkCode: detail.code } : {}),
      networkSummary: detail.summary,
    });
    yield {
      type: 'error',
      message: onDiagnostics
        ? 'LLM stream read failed'
        : `LLM stream read failed: ${detail.summary.slice(0, 160)}`,
      ...(usage ? { usage } : {}),
    };
    return;
  }

  emitDiagnostics('stream', {
    httpStatus: res.status,
    contentType: responseContentType(res, cfg.apiKey),
  });
  const elapsed = ((Date.now() - started) / 1000).toFixed(2);
  yield { type: 'artifact', agentType: params.actionType };
  yield {
    type: 'done',
    totalTime: `${elapsed}s`,
    steps: planStepsToExecutionSteps(planSteps),
    agentName: params.agentName,
    source: 'llm',
    ...(usage ? { usage } : {}),
  };
}
