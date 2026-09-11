import type { AgentType, ExecutionStep, ExecutionUsage, StreamEvent } from './dto/stream-execution.dto';
import { nestLlmStreamedText, type NestLlmRuntimeConfig } from './llm.client';

function planStepsToExecutionSteps(steps: string[]): ExecutionStep[] {
  return steps.map((label, i) => ({
    skill: `PlanStep_${i + 1}`,
    time: `${120 + i * 90}ms`,
    label,
    detail: label,
  }));
}

function normalizeUsage(usage: unknown): ExecutionUsage | undefined {
  if (!usage || typeof usage !== 'object' || Array.isArray(usage)) return undefined;
  const raw = usage as Record<string, unknown>;
  const inputTokens =
    typeof raw.inputTokens === 'number'
      ? raw.inputTokens
      : typeof raw.input_tokens === 'number'
        ? raw.input_tokens
        : typeof raw.promptTokens === 'number'
          ? raw.promptTokens
          : typeof raw.prompt_tokens === 'number'
            ? raw.prompt_tokens
            : null;
  const outputTokens =
    typeof raw.outputTokens === 'number'
      ? raw.outputTokens
      : typeof raw.output_tokens === 'number'
        ? raw.output_tokens
        : typeof raw.completionTokens === 'number'
          ? raw.completionTokens
          : typeof raw.completion_tokens === 'number'
            ? raw.completion_tokens
            : null;
  if (inputTokens == null && outputTokens == null) return undefined;
  return { inputTokens, outputTokens };
}

function buildExecutionInstructions(params: {
  agentName: string;
  actionType: AgentType;
  planSteps: string[];
  kbContext?: string;
  systemPrompt?: string;
}): string {
  const intro = params.systemPrompt?.trim() || `你是 ${params.agentName}，华为营销服 MSS Claw 平台的专业 AI Agent。`;
  const planBlock = params.planSteps.length
    ? `\n\n执行计划：\n${params.planSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`
    : '';
  const kbBlock = params.actionType === 'knowledge' && params.kbContext?.trim()
    ? `\n\n知识库/联网上下文：\n${params.kbContext}\n\n如果需要引用，请使用 [1][2] 形式标注来源编号。`
    : '';
  const toolBlock = [
    '输出必须为中文 markdown，结构清晰，避免空话。',
  ].join('\n');
  return `${intro}\n\n${toolBlock}${planBlock}${kbBlock}`;
}

function buildExecutionError(
  message: string,
  detail?: string,
  code?: string,
  step?: string,
): { type: 'error'; message: string; detail?: string; step?: string; code?: string } {
  return {
    type: 'error',
    message,
    ...(detail ? { detail } : {}),
    ...(code ? { code } : {}),
    ...(step ? { step } : {}),
  };
}


/**
 * 一次普通补全，和「模型配置」测试按钮发的请求同形。
 *
 * 这里刻意不使用任何 Agent 框架、不注册工具、不做多轮循环：内网网关常常只
 * 注册了流式无工具的路由，多带一个字段就会「测试能通、实际 404」。
 * 传输层用 stream=true（与测试按钮一致），但结果一次性交付，不做增量输出。
 */
async function completeOnce(params: {
  instructions: string;
  message: string;
  config: NestLlmRuntimeConfig;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<string> {
  return nestLlmStreamedText({
    config: params.config,
    signal: params.signal,
    maxTokens: params.maxTokens,
    messages: [
      { role: 'system', content: params.instructions },
      { role: 'user', content: params.message },
    ],
  });
}

export async function runLlmTextCompletion(params: {
  agentId: string;
  agentName: string;
  instructions: string;
  message: string;
  config: NestLlmRuntimeConfig;
  signal?: AbortSignal;
}): Promise<{ text: string; usage?: ExecutionUsage }> {
  const text = await completeOnce({
    instructions: params.instructions,
    message: params.message,
    config: params.config,
    signal: params.signal,
  });
  return { text };
}

export async function* runLlmExecutionStream(params: {
  executionId: string;
  message: string;
  actionType: AgentType;
  agentName: string;
  systemPrompt?: string;
  planSteps: string[];
  kbContext?: string;
  config: NestLlmRuntimeConfig;
  signal?: AbortSignal;
}): AsyncGenerator<StreamEvent> {
  const startedAt = Date.now();
  const planSteps = params.planSteps.length ? params.planSteps : ['理解任务', '分析与检索', '给出结论与建议'];

  yield { type: 'execution_start', executionId: params.executionId, source: 'llm' };

  try {
    const steps = planStepsToExecutionSteps(planSteps);
    for (const step of steps) {
      yield { type: 'skill_start', skill: step.skill, label: step.label };
      yield { type: 'skill_end', skill: step.skill, latency: step.time };
    }

    const text = await completeOnce({
      instructions: buildExecutionInstructions({
        agentName: params.agentName,
        actionType: params.actionType,
        planSteps,
        kbContext: params.kbContext?.trim() ?? '',
        systemPrompt: params.systemPrompt,
      }),
      message: params.message,
      config: params.config,
      signal: params.signal,
    });

    if (params.signal?.aborted) return;
    // 不做增量输出：整段答案作为一个 token 事件交付，前端的 SSE 协议不变。
    if (text) yield { type: 'token', content: text };

    yield { type: 'artifact', agentType: params.actionType };
    yield {
      type: 'done',
      totalTime: `${((Date.now() - startedAt) / 1000).toFixed(2)}s`,
      steps,
      agentName: params.agentName,
      source: 'llm',
    };
  } catch (error) {
    if (params.signal?.aborted || (error instanceof Error && /aborted|abort/i.test(error.message))) {
      return;
    }
    const message = error instanceof Error ? error.message : 'execution_failed';
    const detail = error instanceof Error ? error.stack ?? error.message : undefined;
    yield buildExecutionError(message, detail, 'llm_stream_error');
  }
}
