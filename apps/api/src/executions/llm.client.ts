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
}): AsyncGenerator<StreamEvent> {
  const { signal, config: cfg } = params;
  if (signal?.aborted) return;

  const planSteps =
    params.planSteps?.filter((s) => s.trim()).length
      ? params.planSteps.filter((s) => s.trim())
      : ['理解任务', '分析与检索', '给出结论与建议'];

  const started = Date.now();
  const executionId = `llm_${Date.now()}`;
  yield { type: 'execution_start', executionId, source: 'llm' };

  for (let i = 0; i < planSteps.length; i++) {
    if (signal?.aborted) return;
    const label = planSteps[i];
    const skill = `PlanStep_${i + 1}`;
    yield { type: 'skill_start', skill, label };
    await sleep(80);
    if (signal?.aborted) return;
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
    if (signal?.aborted) return;
    const detail = error instanceof Error ? error.message : 'network_error';
    yield { type: 'error', message: `LLM stream connection failed: ${detail.slice(0, 160)}` };
    return;
  }

  if (!res.ok || !res.body) {
    yield {
      type: 'error',
      // Keep upstream bodies (which may echo auth material) out of SSE and
      // execution history. The status is enough for the UI test result.
      message: `LLM stream HTTP ${res.status}`,
    };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let usage: ExecutionUsage | undefined;

  const parseLine = (line: string): string | undefined => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return undefined;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === '[DONE]') return undefined;
    try {
      const json = JSON.parse(payload) as {
        choices?: { delta?: { content?: string } }[];
        usage?: unknown;
      };
      usage = mergeUsage(usage, usageFromChunk(json.usage));
      return json.choices?.[0]?.delta?.content;
    } catch {
      return undefined;
    }
  };

  try {
    while (true) {
      if (signal?.aborted) return;
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
    if (signal?.aborted) return;
    const message = error instanceof Error ? error.message : 'llm_stream_read_failed';
    yield { type: 'error', message, ...(usage ? { usage } : {}) };
    return;
  }

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
