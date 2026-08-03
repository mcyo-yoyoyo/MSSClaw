import type { BusinessScenarioId } from '@/domain/businessScenarios';
import {
  MARKET_SHELF_META,
  type MarketShelfKind,
} from '@/domain/marketShelf';
import { canExecuteChat, READONLY_EXECUTE_HINT } from '@/domain/permissions';
import { openResourceWithReturn } from '@/domain/openResourceNav';
import { useAppViewStore } from '@/stores/appViewStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useHomeStore } from '@/stores/homeStore';
import { useMarketFilterStore } from '@/stores/marketFilterStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useTaskStore } from '@/stores/taskStore';

export type HomeJourneyOpts = {
  /** 预选业务场景筛选（货架 / 做任务共用） */
  businessId?: BusinessScenarioId | 'all';
  focusComposer?: boolean;
  /** 找案例别名时默认外部工具货架 */
  shelf?: MarketShelfKind;
};

/** 打开货架（外部 / 内部 / AI 项目） */
export function openMarketShelf(kind: MarketShelfKind = 'external', opts?: HomeJourneyOpts) {
  if (opts?.businessId) {
    useMarketFilterStore.getState().setBusinessFilter(opts.businessId);
    useNavigationIntentStore.getState().focusBusinessScenario(opts.businessId);
  }
  useAppViewStore.getState().setAppView(MARKET_SHELF_META[kind].view);
}

/** 找案例 → 外部工具货架（深链别名兼容） */
export function openFindCases(opts?: HomeJourneyOpts) {
  openMarketShelf(opts?.shelf ?? 'external', opts);
}

/** 做任务 → Tab「用 · 做任务」场景技能页；只读用户回落找案例 */
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

/** 打开货架工具详情（深链 #/market-tool?id=） */
export function openMarketToolDetail(toolId: string, returnShelf?: MarketShelfKind) {
  const intent = useNavigationIntentStore.getState();
  intent.focusTool(toolId);
  if (returnShelf) {
    intent.setReturnTarget({ view: MARKET_SHELF_META[returnShelf].view });
  }
  useAppViewStore.getState().setAppView('market-tool');
}
