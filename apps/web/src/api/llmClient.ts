import { isLlmConfigComplete, normalizeLlmModelId, type LlmConfig } from '@/domain/llmConfig';
import { useLlmConfigStore } from '@/stores/llmConfigStore';
import type { ActionType } from '@/domain/plan';
import type { ExecutionStep } from '@/domain/chat';
import type { StreamEvent } from '@/domain/stream';

export interface LlmTestResult {
  ok: boolean;
  message: string;
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export function getActiveLlmConfig(): LlmConfig {
  return useLlmConfigStore.getState().config;
}

export function isLlmConfigured(config?: LlmConfig): boolean {
  return isLlmConfigComplete(config ?? getActiveLlmConfig());
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/$/, '');
}

async function chatCompletion(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number; signal?: AbortSignal },
): Promise<string> {
  const config = getActiveLlmConfig();
  const res = await fetch(`${normalizeBaseUrl(config.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: normalizeLlmModelId(config.model),
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
  const config = getActiveLlmConfig();
  const res = await fetch(`${normalizeBaseUrl(config.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: normalizeLlmModelId(config.model),
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

export async function testLlmConnection(
  config: Pick<LlmConfig, 'baseUrl' | 'apiKey' | 'model'>,
): Promise<LlmTestResult> {
  const apiKey = config.apiKey.trim();
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const model = normalizeLlmModelId(config.model);

  if (!apiKey) return { ok: false, message: '请先填写 API Key' };
  if (!baseUrl) return { ok: false, message: '请先填写 Base URL' };
  if (!model) return { ok: false, message: '请先填写模型名称' };

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 8,
      }),
    });

    if (res.ok) {
      return { ok: true, message: '连接成功 · 模型可用' };
    }

    const errText = await res.text();
    return { ok: false, message: `失败 HTTP ${res.status}：${errText.slice(0, 120)}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `连接失败：${msg}` };
  }
}
