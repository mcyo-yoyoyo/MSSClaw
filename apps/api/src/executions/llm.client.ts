import type { AgentType, ExecutionStep, StreamEvent } from './dto/stream-execution.dto';

export type LlmChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type NestLlmRuntimeConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  source: 'env' | 'workspace-doc';
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/$/, '');
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

/** 工作区平台文档 llm-config（与前端共享配置对齐） */
export function nestLlmConfigFromDoc(payload: unknown): NestLlmRuntimeConfig | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  const baseUrl = normalizeBaseUrl(typeof p.baseUrl === 'string' ? p.baseUrl : '');
  const apiKey = typeof p.apiKey === 'string' ? p.apiKey.trim() : '';
  if (!baseUrl || !apiKey) return null;
  const model =
    (typeof p.model === 'string' && p.model.trim()) ||
    (process.env.LLM_MODEL ?? 'gpt-4o-mini').trim() ||
    'gpt-4o-mini';
  return {
    baseUrl,
    apiKey,
    model,
    maxTokens: Number(process.env.LLM_MAX_TOKENS || 1200) || 1200,
    source: 'workspace-doc',
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

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
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
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '');
    yield {
      type: 'error',
      message: `LLM stream HTTP ${res.status}: ${errText.slice(0, 160)}`,
    };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    if (signal?.aborted) return;
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
        if (delta) yield { type: 'token', content: delta };
      } catch {
        /* skip */
      }
    }
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(2);
  yield { type: 'artifact', agentType: params.actionType };
  yield {
    type: 'done',
    totalTime: `${elapsed}s`,
    steps: planStepsToExecutionSteps(planSteps),
    agentName: params.agentName,
    source: 'llm',
  };
}
