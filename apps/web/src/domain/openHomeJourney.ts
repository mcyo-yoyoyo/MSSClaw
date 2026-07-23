import type { BusinessScenarioId } from '@/domain/businessScenarios';
import { canExecuteChat, READONLY_EXECUTE_HINT } from '@/domain/permissions';
import { openResourceWithReturn } from '@/domain/openResourceNav';
import { useAppViewStore } from '@/stores/appViewStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useHomeStore } from '@/stores/homeStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useTaskStore } from '@/stores/taskStore';

export type HomeJourneyOpts = {
  /** 预选业务场景筛选（学 · 找案例 / 干 · 做任务共用） */
  businessId?: BusinessScenarioId | 'all';
  focusComposer?: boolean;
};

/** 找案例 → Tab「学 · 找案例」 */
export function openFindCases(opts?: HomeJourneyOpts) {
  if (opts?.businessId) {
    useNavigationIntentStore.getState().focusBusinessScenario(opts.businessId);
  }
  useHomeStore.getState().setHomeMode('portal');
  useAppViewStore.getState().setAppView('home');
}

/** 做任务 → Tab「干 · 做任务」场景技能页；只读用户回落找案例 */
export function openUseSkills(opts?: HomeJourneyOpts) {
  if (opts?.businessId) {
    useNavigationIntentStore.getState().focusBusinessScenario(opts.businessId);
  }
  if (!canExecuteChat()) {
    useConversationStore.setState({ pushToast: READONLY_EXECUTE_HINT });
    openFindCases(
      opts?.businessId ? { businessId: opts.businessId } : undefined,
    );
    return;
  }
  useTaskStore.getState().closeCreateDialog();
  useHomeStore.getState().setHomeMode('assistant');
  if (opts?.focusComposer !== false) {
    useHomeStore.getState().requestComposerFocus();
  }
  useAppViewStore.getState().setAppView('home');
}

/** 案例地图（样板间）— 找案例的「更多」二级入口 */
export function openCaseMap() {
  openResourceWithReturn('ai-map');
}
