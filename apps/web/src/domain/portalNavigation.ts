import type { AppView } from '@/domain/appView';
import type { PortalMapCard } from '@/domain/portalMap';
import type {
  PrototypeAgentSeed,
  PrototypeKbDocument,
  PrototypeSkillSeed,
  PrototypeToolSeed,
} from '@/domain/prototype/types';
import { getNavMetaLabel } from '@/domain/navPresentation';
import { defaultShellPerspective } from '@/domain/shellPerspective';
import { useAppViewStore } from '@/stores/appViewStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { useSessionStore } from '@/stores/sessionStore';

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
    const win = window.open(action.url, '_blank', 'noopener,noreferrer');
    if (!win) {
      toast('浏览器拦截了弹窗，请允许本站弹窗后重试');
      return;
    }
    toast(`已打开：${card.title}`);
    return;
  }

  if (action.type === 'agent') {
    const agent = market.agents.find((a) => a.id === action.agentId);
    if (agent) {
      handlers.onInvokeAgent(agent);
      toast(`单独调用专家：${agent.name}`);
    } else toast('未找到对应专家');
    return;
  }

  if (action.type === 'skill') {
    const skill = market.skills.find((s) => s.id === action.skillId);
    if (skill) {
      handlers.onInvokeSkill(skill);
      toast(`已调用技能：${skill.name}（${skill.command}）`);
    } else toast('未找到对应技能');
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
    // 配置工具为运营壳；业务侧不跳转，避免 AccessDenied 死链
    const role = useSessionStore.getState().user?.platformRole;
    if (defaultShellPerspective(role) === 'ops') {
      if (!goOrWarn('tools', toast)) return;
      intent.focusTool(action.toolId);
      toast(`配置工具：${card.title}`);
      return;
    }
    if (tool?.homepageUrl) {
      window.open(tool.homepageUrl, '_blank', 'noopener,noreferrer');
      toast(`已打开：${tool.name}`);
      return;
    }
    toast(
      tool
        ? `「${tool.name}」已上架；业务侧由技能/专家调用，或使用找案例中带外链的精选工具`
        : '该工具暂不支持在业务侧直接打开',
    );
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
    toast(`打开场景案例：${card.title}`);
    return;
  }

  if (action.type === 'navigate') {
    const target = action.view === 'cases' ? 'ai-map' : action.view;
    goOrWarn(target, toast);
  }
}
