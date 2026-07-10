export interface StreamExecutionDto {
  chatId: string;
  message: string;
  workspaceId?: string;
}

export interface ExecutionStep {
  skill: string;
  time: string;
  label: string;
  detail: string;
}

export type AgentType = 'marketing' | 'knowledge';

export type StreamEvent =
  | { type: 'execution_start'; executionId: string }
  | { type: 'skill_start'; skill: string; label: string }
  | { type: 'skill_end'; skill: string; latency: string }
  | { type: 'token'; content: string }
  | { type: 'artifact'; agentType: AgentType }
  | {
      type: 'done';
      totalTime: string;
      steps: ExecutionStep[];
      agentName: string;
      followUp?: {
        role: 'other';
        name: string;
        avatar: string;
        text: string;
      };
    }
  | { type: 'error'; message: string };
