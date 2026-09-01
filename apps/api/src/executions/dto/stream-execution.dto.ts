export interface StreamExecutionDto {
  chatId: string;
  message: string;
  workspaceId?: string;
  planSteps?: string[];
  systemPrompt?: string;
  agentName?: string;
  actionType?: AgentType;
  kbContext?: string;
  /** 由前端选择的可执行资产；用户身份由控制器会话解析，不接受 body userId。 */
  assetId?: string;
  assetType?: ExecutionAssetType;
}

export type ExecutionAssetType = 'tool' | 'skill' | 'agent' | 'unknown';

/** Controller-resolved context kept out of the public request body. */
export type StreamExecutionRequest = StreamExecutionDto & {
  userId?: string;
};

export interface ExecutionUsage {
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface ExecutionStep {
  skill: string;
  time: string;
  label: string;
  detail: string;
}

export type AgentType = 'marketing' | 'knowledge';

export type ExecutionSource = 'llm' | 'scripted';

export type StreamEvent =
  | { type: 'execution_start'; executionId: string; source?: ExecutionSource }
  | { type: 'skill_start'; skill: string; label: string }
  | { type: 'skill_end'; skill: string; latency: string }
  | { type: 'token'; content: string }
  | { type: 'artifact'; agentType: AgentType }
  | {
      type: 'done';
      totalTime: string;
      steps: ExecutionStep[];
      agentName: string;
      source?: ExecutionSource;
      usage?: ExecutionUsage;
      followUp?: {
        role: 'other';
        name: string;
        avatar: string;
        text: string;
      };
    }
  | { type: 'error'; message: string; usage?: ExecutionUsage };
