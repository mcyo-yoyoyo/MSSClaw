import type { BusinessScenarioId } from '@/domain/businessScenarios';
import {
  MARKET_SHELF_META,
  type MarketShelfKind,
} from '@/domain/marketShelf';
import { isMvpCapabilityPreset } from '@/domain/marketRunCapability';
import { emptyOrgPerspectiveSelection } from '@/domain/orgAxisTags';
import type { DeptId, RegionId } from '@/domain/orgTaxonomy';
import { canExecuteChat, READONLY_EXECUTE_HINT } from '@/domain/permissions';
import { openResourceWithReturn } from '@/domain/openResourceNav';
import { useAppViewStore } from '@/stores/appViewStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useMarketFilterStore } from '@/stores/marketFilterStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useTaskStore } from '@/stores/taskStore';

export type HomeJourneyOpts = {
  /** 预选业务场景筛选（货架 / 做任务共用） */
  businessId?: BusinessScenarioId | 'all';
  focusComposer?: boolean;
  /** 找案例别名时默认外部工具货架 */
  shelf?: MarketShelfKind;
};

/** 打开个人中心（收藏 / 最近 / 任务） */
export function openMeCenter() {
  useAppViewStore.getState().setAppView('me');
}

/** 打开货架（外部 / 内部 / AI工具Hub） */
export function openMarketShelf(kind: MarketShelfKind = 'external', opts?: HomeJourneyOpts) {
  if (opts?.businessId) {
    useMarketFilterStore.getState().setBusinessFilter(opts.businessId);
    useNavigationIntentStore.getState().focusBusinessScenario(opts.businessId);
  }
  useAppViewStore.getState().setAppView(MARKET_SHELF_META[kind].view);
}

/**
 * 从首页 / 外部精选 / 公司推荐点击左栏领域或区域：
 * 跳转 AI工具Hub，并带上组织轴筛选（场景回到全部分类卡）。
 */
export function openMssMarketHub(opts?: {
  deptId?: DeptId | null;
  regionId?: RegionId | null;
  clearOrg?: boolean;
}) {
  const store = useMarketFilterStore.getState();
  store.setBusinessFilter('all');
  if (opts?.clearOrg) {
    store.setOrgSelection(emptyOrgPerspectiveSelection());
  } else {
    const next = emptyOrgPerspectiveSelection();
    if (opts?.deptId) next.dept = [opts.deptId];
    if (opts?.regionId) next.region = [opts.regionId];
    store.setOrgSelection(next);
  }
  useAppViewStore.getState().setAppView(MARKET_SHELF_META.projects.view);
}

/** 找案例 → 外部工具货架（深链别名兼容） */
export function openFindCases(opts?: HomeJourneyOpts) {
  openMarketShelf(opts?.shelf ?? 'external', opts);
}

/** 做任务 → 个人中心 AI 任务；只读用户回落找案例；MVP 业务引导货架下载 */
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

  const preset = useNavPresentationStore.getState().preset;
  const role = useSessionStore.getState().user?.platformRole;
  if (
    isMvpCapabilityPreset(preset) &&
    (role === 'business_user' || role === 'viewer')
  ) {
    useConversationStore.setState({
      pushToast:
        'MVP 业务侧以货架下载学习为主；在线执行请使用标准/完整方案，或联系运营账号演示。',
    });
    openMarketShelf('projects', opts?.businessId ? { businessId: opts.businessId } : undefined);
    return;
  }

  useTaskStore.getState().closeCreateDialog();

  // 完整产品已开放 AI 任务：落到个人中心内嵌的 AI 任务 Tab
  if (useNavPresentationStore.getState().isViewEnabled('ai-tasks')) {
    useAppViewStore.getState().setAppView('ai-tasks');
    useNavigationIntentStore.getState().requestAiTaskCompose();
    return;
  }

  useAppViewStore.getState().setAppView('me');
}

/** 案例地图（样板间）— 找案例的「更多」二级入口 */
export function openCaseMap() {
  openResourceWithReturn('ai-map');
}

/** 打开货架工具详情弹窗（停留当前页；深链 #/market-tool?id= 仍兼容） */
export function openMarketToolDetail(
  toolId: string,
  returnShelf?: MarketShelfKind,
  opts?: { tab?: 'overview' | 'howto' | 'resources' },
) {
  const intent = useNavigationIntentStore.getState();
  intent.focusTool(toolId, opts?.tab ? { tab: opts.tab } : undefined);
  if (returnShelf) {
    intent.setReturnTarget({ view: MARKET_SHELF_META[returnShelf].view });
  }
}

/** 关闭工具详情弹窗 */
export function closeMarketToolDetail() {
  useNavigationIntentStore.getState().clearTool();
}
