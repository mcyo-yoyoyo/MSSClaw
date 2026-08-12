import type { NavPresetId } from '@/domain/navPresentation';

/** 是否为 MVP 演示档（customer） */
export function isMvpCapabilityPreset(preset: NavPresetId): boolean {
  return preset === 'customer';
}

/**
 * 标准能力 / 完整产品（及自定义）才开放的执行面：
 * - 货架场景案例「去打样」/ 技能「去执行」
 * - 首页「最近任务」
 * - 账号菜单 / 侧栏「任务记录」
 */
export function allowsTaskExecutionSurfaces(preset: NavPresetId): boolean {
  return preset === 'standard' || preset === 'full' || preset === 'custom';
}

/** 完整产品（及自定义）才开放 AI任务顶栏入口 */
export function allowsAiTasksSurface(preset: NavPresetId): boolean {
  return preset === 'full' || preset === 'custom';
}

/** @deprecated 请用 allowsTaskExecutionSurfaces；语义相同 */
export function allowsMarketScenarioRun(preset: NavPresetId): boolean {
  return allowsTaskExecutionSurfaces(preset);
}
