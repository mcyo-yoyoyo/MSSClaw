export const PROMPT_LIFECYCLE_FLOW = ['draft', 'testing', 'approved', 'released', 'deprecated'] as const;
export const WORKFLOW_STATUS_FLOW = ['draft', 'testing', 'published', 'online'] as const;

export type PromptLifecycle = (typeof PROMPT_LIFECYCLE_FLOW)[number];

export function getNextPromptLifecycle(current: string): string | null {
  const idx = PROMPT_LIFECYCLE_FLOW.indexOf(current as PromptLifecycle);
  if (idx < 0 || idx >= PROMPT_LIFECYCLE_FLOW.length - 1) return null;
  return PROMPT_LIFECYCLE_FLOW[idx + 1];
}

export function getNextWorkflowStatus(current: string): string | null {
  const idx = WORKFLOW_STATUS_FLOW.indexOf(current as (typeof WORKFLOW_STATUS_FLOW)[number]);
  if (idx < 0 || idx >= WORKFLOW_STATUS_FLOW.length - 1) return null;
  return WORKFLOW_STATUS_FLOW[idx + 1];
}

export type CenterKind = 'prompt' | 'agent' | 'skill' | 'workflow' | 'knowledge' | 'tool' | 'memory';

export const CENTER_KINDS: CenterKind[] = [
  'prompt',
  'agent',
  'skill',
  'workflow',
  'knowledge',
  'tool',
  'memory',
];
