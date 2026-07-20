import type { ExecutionStep } from '@/domain/chat';

/** 对话可运行的演示 Skill 包（注入正文 + 计划 + 演示提示词 + Mock 报告） */
export interface RunnableSkillPack {
  id: string;
  instructions: string;
  planSteps: string[];
  /** 技能页「调用」时自动发送的演示任务 */
  demoPrompt: string;
  /** 确认执行后 mock 流式输出的 Markdown 报告 */
  mockReport: string;
  /** 可选：执行轨迹步骤；缺省则用 planSteps 生成 */
  execSteps?: ExecutionStep[];
  /** 交付物沙盒类型倾向 */
  agentType?: 'marketing' | 'knowledge';
}

export function planStepsToExecSteps(planSteps: string[], prefix = 'Skill'): ExecutionStep[] {
  const times = ['120ms', '280ms', '450ms', '360ms', '520ms', '300ms'];
  return planSteps.map((label, i) => ({
    skill: `${prefix}_${i + 1}`,
    time: times[i % times.length]!,
    label,
    detail: `执行：${label}`,
  }));
}
