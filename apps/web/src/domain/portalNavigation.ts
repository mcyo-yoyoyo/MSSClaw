import type { AppView } from '@/domain/appView';
import type { PortalMapCard } from '@/domain/portalMap';
import type {
  PrototypeAgentSeed,
  PrototypeKbDocument,
  PrototypeSkillSeed,
  PrototypeToolSeed,
} from '@/domain/prototype/types';
import { getNavMetaLabel } from '@/domain/navPresentation';
import { useAppViewStore } from '@/stores/appViewStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';

export interface PortalNavHandlers {
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
  onAskKbDocument?: (doc: PrototypeKbDocument) => void;
  showToast?: (msg: string) => void;
}

/** 业界 SaaS：点卡片开官网；内部/区域自建：进 Tool 中心详情 */
export function isAiSaasTool(tool: Pick<PrototypeToolSeed, 'category' | 'tags' | 'scenarioTags'>): boolean {
  if (tool.category === 'platform') return true;
  if (tool.tags?.includes('ai-saas')) return true;
  return (tool.scenarioTags ?? []).some((t) =>
    ['编码助手', '通用对话', '长文研究', '企业协作'].includes(t),
  );
}

function goOrWarn(view: AppView, toast: (msg: string) => void): boolean {
  if (!useNavPresentationStore.getState().isViewEnabled(view)) {
    toast(`「${getNavMetaLabel(view)}」未在当前展示方案中启用`);
    return false;
  }
  useAppViewStore.getState().setAppView(view);
  return true;
}

export function openPortalCard(card: PortalMapCard, handlers: PortalNavHandlers): void {
  const { action } = card;
  const toast = handlers.showToast ?? useMarketplaceStore.getState().showToast;
  const market = useMarketplaceStore.getState();
  const intent = useNavigationIntentStore.getState();

  if (action.type === 'external') {
    window.open(action.url, '_blank', 'noopener,noreferrer');
    toast(`已打开：${card.title}`);
    return;
  }

  if (action.type === 'agent') {
    const agent = market.agents.find((a) => a.id === action.agentId);
    if (agent) handlers.onInvokeAgent(agent);
    else toast('未找到对应 Agent');
    return;
  }

  if (action.type === 'skill') {
    const skill = market.skills.find((s) => s.id === action.skillId);
    if (skill) handlers.onInvokeSkill(skill);
    else toast('未找到对应 Skill');
    return;
  }

  if (action.type === 'tool') {
    market.bumpToolInvokes(action.toolId);
    const tool = market.tools.find((t) => t.id === action.toolId);
    if (tool && isAiSaasTool(tool) && tool.homepageUrl) {
      window.open(tool.homepageUrl, '_blank', 'noopener,noreferrer');
      toast(`已打开：${tool.name}`);
      return;
    }
    if (!goOrWarn('tools', toast)) return;
    intent.focusTool(action.toolId);
    toast(`Tool 中心：${card.title}`);
    return;
  }

  if (action.type === 'kb') {
    if (!goOrWarn('kb', toast)) return;
    intent.focusKbDoc(action.docId);
    const doc = market.kbDocs.find((d) => d.id === action.docId);
    toast(doc ? `知识库：${doc.title}` : '已打开知识库');
    return;
  }

  if (action.type === 'case') {
    if (!goOrWarn('ai-map', toast)) return;
    intent.focusCase(action.caseId);
    toast(`场景地图 · 样板案例：${card.title}`);
    return;
  }

  if (action.type === 'navigate') {
    const target = action.view === 'cases' ? 'ai-map' : action.view;
    goOrWarn(target, toast);
  }
}
