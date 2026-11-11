import { BadRequestException } from '@nestjs/common';
export type ExecutionMode = 'prompt' | 'script' | 'agent';
export const EXECUTORS = { prompt: 'completion', script: 'queue', agent: 'not_supported' } as const;
export function executionRoute(mode: string = 'prompt') {
  if (!(mode in EXECUTORS)) throw new BadRequestException('invalid_execution_mode');
  if (mode === 'agent') throw new BadRequestException('not_supported:agent');
  const fallback = mode === 'script' && process.env.SKILL_SCRIPT_EXECUTION_ENABLED !== 'true';
  return { mode: fallback ? 'prompt' : mode as ExecutionMode, fallback };
}
