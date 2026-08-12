import { openUseSkills } from '@/domain/openHomeJourney';

/**
 * 新建 Agent 任务：完整产品落到 AI 任务页内对话壳；
 * 否则回落「做任务」旧链路。
 */
export function openAiAssistantForNewTask() {
  openUseSkills({ focusComposer: true });
}
