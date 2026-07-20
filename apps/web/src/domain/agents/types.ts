/** 对话可运行的演示专家包 */
export interface RunnableAgentPack {
  id: string;
  /** Persona / systemPrompt */
  systemPrompt: string;
  /** 专家中心「调用」自动发送 */
  demoPrompt: string;
  /** 主 Skill（调用时优先挂载） */
  primarySkillId: string;
  /** 编排用计划（可覆盖单 Skill 计划） */
  planSteps: string[];
  /** 无 Skill mock 或编排完成后的专家级报告 */
  mockReport: string;
  agentType?: 'marketing' | 'knowledge';
}
