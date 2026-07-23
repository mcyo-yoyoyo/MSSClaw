import { openUseSkills } from '@/domain/openHomeJourney';

/**
 * 新建 Agent 任务：打开「做任务 / 干 · 做任务」，
 * 由 HomeCommandBox 提交后创建任务会话。
 */
export function openAiAssistantForNewTask() {
  openUseSkills({ focusComposer: true });
}
