import { z } from 'zod';
import { ChatMessageSchema, ExecutionStepSchema } from '@/domain/chat';

export const StreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('execution_start'), executionId: z.string() }),
  z.object({
    type: z.literal('skill_start'),
    skill: z.string(),
    label: z.string(),
  }),
  z.object({
    type: z.literal('skill_end'),
    skill: z.string(),
    latency: z.string(),
  }),
  z.object({ type: z.literal('token'), content: z.string() }),
  z.object({
    type: z.literal('artifact'),
    agentType: z.enum(['marketing', 'knowledge']),
  }),
  z.object({
    type: z.literal('done'),
    totalTime: z.string(),
    steps: z.array(ExecutionStepSchema),
    agentName: z.string(),
    followUp: ChatMessageSchema.optional(),
  }),
  z.object({ type: z.literal('error'), message: z.string() }),
]);
export type StreamEvent = z.infer<typeof StreamEventSchema>;

export function parseSSELine(line: string): StreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return null;
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === '[DONE]') return null;
  try {
    const parsed = StreamEventSchema.parse(JSON.parse(payload));
    return parsed;
  } catch {
    return null;
  }
}

export async function* parseSSEStream(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const event = parseSSELine(line);
      if (event) yield event;
    }
  }

  if (buffer.trim()) {
    const event = parseSSELine(buffer);
    if (event) yield event;
  }
}
