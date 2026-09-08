import { Agent } from '@mastra/core/agent';
import { RequestContext } from '@mastra/core/request-context';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { AgentType, ExecutionStep, ExecutionUsage, StreamEvent } from './dto/stream-execution.dto';
import type { NestLlmRuntimeConfig } from './llm.client';
import { WebToolsService } from './web-tools.service';

const WEB_CONTEXT_TOOL_SCHEMA = z.object({
  message: z.string().min(1),
  systemPrompt: z.string().optional(),
  planSteps: z.array(z.string()).optional(),
});

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
    '如果任务需要联网最新信息或指定网页，请优先使用 web_context 工具。',
    '如果已经提供了足够的上下文，请直接基于现有信息回答，不要重复抓取。',
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

function createWebContextTool(webTools: WebToolsService, signal?: AbortSignal) {
  return createTool({
    id: 'web_context',
    description: '抓取指定网页、搜索结果或联网上下文，用于提供最新事实、网页引用和外部资料。',
    inputSchema: WEB_CONTEXT_TOOL_SCHEMA,
    execute: async (input, context) => {
      const result = await webTools.collectContext({
        message: input.message,
        systemPrompt: input.systemPrompt,
        planSteps: input.planSteps,
        signal,
      });
      return result;
    },
  });
}

function resolveModel(config: NestLlmRuntimeConfig) {
  return {
    providerId: 'openai',
    modelId: config.model,
    url: config.baseUrl,
    apiKey: config.apiKey,
  } as const;
}

async function readTextStream(stream: { getReader: () => { read: () => Promise<{ done: boolean; value?: string }>; releaseLock: () => void } }): Promise<string[]> {
  const reader = stream.getReader();
  const chunks: string[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (typeof value === 'string' && value.length > 0) chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return chunks;
}

export async function runMastraTextCompletion(params: {
  agentId: string;
  agentName: string;
  instructions: string;
  message: string;
  config: NestLlmRuntimeConfig;
  signal?: AbortSignal;
}): Promise<{ text: string; usage?: ExecutionUsage }> {
  const agent = new Agent({
    id: params.agentId,
    name: params.agentName,
    instructions: params.instructions,
    model: resolveModel(params.config),
    maxRetries: 1,
  });
  const stream = await agent.stream(params.message, {
    instructions: params.instructions,
    maxSteps: 2,
    toolChoice: 'none',
    abortSignal: params.signal,
    requestContext: new RequestContext(),
  });
  const full = await stream.getFullOutput();
  const usage = normalizeUsage(full.usage);
  return {
    text: full.text,
    ...(usage ? { usage } : {}),
  };
}

export async function* runMastraExecutionStream(params: {
  executionId: string;
  message: string;
  actionType: AgentType;
  agentName: string;
  systemPrompt?: string;
  planSteps: string[];
  kbContext?: string;
  config: NestLlmRuntimeConfig;
  signal?: AbortSignal;
  webTools: WebToolsService;
}): AsyncGenerator<StreamEvent> {
  const startedAt = Date.now();
  let kbContext = params.kbContext?.trim() ?? '';
  let webStep: ExecutionStep | null = null;
  const planSteps = params.planSteps.length ? params.planSteps : ['理解任务', '分析与检索', '给出结论与建议'];

  yield { type: 'execution_start', executionId: params.executionId, source: 'llm' };

  try {
    if (params.webTools.isNeeded(params.message, params.systemPrompt, planSteps)) {
      const tool = createWebContextTool(params.webTools, params.signal);
      const webStarted = Date.now();
      yield { type: 'skill_start', skill: 'Web_Context', label: '联网抓取执行上下文' };
      try {
        const webContext = await tool.execute?.(
          {
            message: params.message,
            systemPrompt: params.systemPrompt,
            planSteps,
          },
          {
            requestContext: new RequestContext(),
            observe: {
              span: async (_name, fn) => fn(),
              log: () => undefined,
            },
          },
        );
        const result = webContext && typeof webContext === 'object' ? (webContext as Record<string, unknown>) : undefined;
        const contextText = typeof result?.context === 'string' ? result.context : '';
        const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
        kbContext = [kbContext, contextText].filter(Boolean).join('\n\n---\n\n');
        webStep = {
          skill: 'Web_Context',
          time: `${Date.now() - webStarted}ms`,
          label: '联网抓取执行上下文',
          detail: `已抓取 ${Array.isArray(result?.items) ? result.items.length : 0} 个网页${warnings.length ? `，警告 ${warnings.length} 条` : ''}`,
        };
      } catch (error) {
        if (params.signal?.aborted || (error instanceof Error && /aborted|abort/i.test(error.message))) {
          return;
        }
        const message = error instanceof Error ? error.message : 'web_context_failed';
        const detail = error instanceof Error ? error.stack ?? error.message : undefined;
        yield buildExecutionError(message, detail, 'web_context_failed', 'Web_Context');
        return;
      } finally {
        if (webStep) {
          yield { type: 'skill_end', skill: webStep.skill, latency: webStep.time };
        }
      }
    }

    const steps = planStepsToExecutionSteps(planSteps);
    for (const step of steps) {
      yield { type: 'skill_start', skill: step.skill, label: step.label };
      yield { type: 'skill_end', skill: step.skill, latency: step.time };
    }

    const webContextTool = createWebContextTool(params.webTools, params.signal);
    const agent = new Agent({
      id: `skill-execution-${params.actionType}`,
      name: params.agentName,
      instructions: buildExecutionInstructions({
        agentName: params.agentName,
        actionType: params.actionType,
        planSteps,
        kbContext,
        systemPrompt: params.systemPrompt,
      }),
      model: resolveModel(params.config),
      tools: { web_context: webContextTool },
      maxRetries: 1,
    });

    const stream = await agent.stream(params.message, {
      instructions: buildExecutionInstructions({
        agentName: params.agentName,
        actionType: params.actionType,
        planSteps,
        kbContext,
        systemPrompt: params.systemPrompt,
      }),
      maxSteps: Math.max(4, planSteps.length + 3),
      toolChoice: 'auto',
      abortSignal: params.signal,
      onError: (event) => {
        // Keep the stream surface lean; the outer catch/reader handles emission.
        void event;
      },
    });

    const tokenChunks = await readTextStream(stream.textStream);
    for (const token of tokenChunks) {
      if (params.signal?.aborted) {
        return;
      }
      yield { type: 'token', content: token };
    }

    const full = await stream.getFullOutput();
    const totalTime = `${((Date.now() - startedAt) / 1000).toFixed(2)}s`;
    const usage = normalizeUsage(full.usage);

    yield { type: 'artifact', agentType: params.actionType };
    yield {
      type: 'done',
      totalTime,
      steps: [...(webStep ? [webStep] : []), ...steps],
      agentName: params.agentName,
      source: 'llm',
      ...(usage ? { usage } : {}),
    };
  } catch (error) {
    if (params.signal?.aborted || (error instanceof Error && /aborted|abort/i.test(error.message))) {
      return;
    }
    const message = error instanceof Error ? error.message : 'execution_failed';
    const detail = error instanceof Error ? error.stack ?? error.message : undefined;
    yield buildExecutionError(message, detail, 'mastra_stream_error');
  }
}
