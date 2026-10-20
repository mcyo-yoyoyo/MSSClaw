import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { MssZhishuMark } from '@/components/brand/MssZhishuMark';
import {
  assetDetailUrl,
  readAppRouteFromLocation,
  type AppRouteParams,
  type DetailAssetType,
} from '@/domain/appRoute';
import type { AppView } from '@/domain/appView';
import { setAiBriefContentMode } from '@/domain/aiBriefContentMode';
import { assetShareText, copyText } from '@/domain/assetShare';
import { canViewAsset } from '@/domain/assetVisibility';
import { prepareCaseArticleHtml } from '@/domain/caseArticleHtml';
import { allowsMarketScenarioRun } from '@/domain/marketRunCapability';
import { canExecuteChat } from '@/domain/permissions';
import type { AppViewRouterHandlers } from '@/features/AppViewRouter';
import { CaseHtml } from '@/features/ai-brief/CaseHtml';
import { useCaseInsightArticle } from '@/features/ai-brief/useCaseInsightArticle';
import { CatalogAgentDetailModal } from '@/features/market/CatalogAgentDetailModal';
import { MarketSkillDetailModal } from '@/features/market/MarketSkillDetailModal';
import { MarketToolDetailModal } from '@/features/market/MarketToolDetailModal';
import { useAppViewStore } from '@/stores/appViewStore';
import { useAuthGateStore } from '@/stores/authGateStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useSessionStore } from '@/stores/sessionStore';

const CASEBOOK_BASE = `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}casebook/`;

/** 详情页的地址可能被平台内跳转、前进后退改掉：跟着 history 走，而不是只读一次 */
function useDetailRoute(): AppRouteParams {
  const [route, setRoute] = useState(readAppRouteFromLocation);
  useEffect(() => {
    const sync = () => setRoute(readAppRouteFromLocation());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);
  return route;
}

type Access = 'loading' | 'missing' | 'login' | 'forbidden' | 'ok';

function StatePanel({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
        <i className={`fa-solid ${icon} text-[18px]`} />
      </span>
      <p className="text-[15px] font-semibold text-zinc-800">{title}</p>
      {children}
    </div>
  );
}

/**
 * 资产详情页（分享链接落地页）：#/detail?type=tool|skill|agent|case&id=…
 * 在应用外壳里渲染但不带平台导航；正文复用各类资产原来的详情弹窗，以整页方式呈现。
 */
export function AssetDetailPage({ handlers }: { handlers: AppViewRouterHandlers }) {
  const { type, id } = useDetailRoute();
  const setAppView = useAppViewStore((s) => s.setAppView);
  const requestLogin = useAuthGateStore((s) => s.requestLogin);
  const user = useSessionStore((s) => s.user);
  const isGuest = useSessionStore((s) => s.isGuest);
  const marketReady = useMarketplaceStore((s) => s.ready);
  const tools = useMarketplaceStore((s) => s.tools);
  const skills = useMarketplaceStore((s) => s.skills);
  const agents = useMarketplaceStore((s) => s.agents);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const portalContent = usePortalContentStore((s) => s.items);
  const navPreset = useNavPresentationStore((s) => s.preset);
  const caseState = useCaseInsightArticle(type === 'case' ? id : undefined);

  const viewer = useMemo(
    () => ({
      userId: user?.id,
      userName: user?.name,
      affiliation: { deptIds: user?.deptIds ?? [], regionId: user?.regionId ?? null },
      role: user?.platformRole,
    }),
    [user],
  );

  const tool = type === 'tool' ? tools.find((item) => item.id === id) : undefined;
  const skill = type === 'skill' ? skills.find((item) => item.id === id) : undefined;
  const agent = type === 'agent' ? agents.find((item) => item.id === id) : undefined;
  const asset = tool ?? skill ?? agent;

  let access: Access;
  if (!type || !id) access = 'missing';
  else if (type === 'case') {
    access = caseState.status === 'loading' ? 'loading' : caseState.status === 'ready' ? 'ok' : 'missing';
  } else if (!marketReady) access = 'loading';
  else if (!asset || !asset.published) access = 'missing';
  else if (!canViewAsset(asset, viewer)) access = user ? 'forbidden' : 'login';
  else access = 'ok';

  const title = caseState.status === 'ready' ? caseState.article.title : asset?.name ?? '';
  const summary = caseState.status === 'ready' ? caseState.article.summary : asset?.desc;

  useEffect(() => {
    if (access === 'ok' && title) document.title = `${title} - MSS AI提效平台`;
  }, [access, title]);

  const listView: AppView =
    type === 'case'
      ? 'ai-brief'
      : type === 'tool'
        ? tool?.sourceType === 'internal' || tool?.tags?.includes('hw-internal')
          ? 'market-internal'
          : 'market-external'
        : 'market-projects';

  const goToList = () => {
    if (type === 'case') setAiBriefContentMode('cases');
    setAppView(listView);
  };

  // 平台内点进来的回上一页；直达（分享链接、书签、新标签）回该类列表
  const goBack = () => {
    if ((window.history.state as { fromApp?: boolean } | null)?.fromApp) window.history.back();
    else goToList();
  };

  const share = async () => {
    if (!type || !id) return;
    const copied = await copyText(assetShareText(title, summary, assetDetailUrl(type as DetailAssetType, id)));
    showToast(copied ? '已复制分享内容，可粘贴发送' : '复制失败，请手动复制地址栏链接');
  };

  const allowRun = allowsMarketScenarioRun(navPreset) && (canExecuteChat(user?.platformRole) || isGuest);
  const submittedCases = agent
    ? portalContent.filter(
        (item) =>
          item.type === 'case' && item.published !== false && item.agentId === agent.id && canViewAsset(item, viewer),
      )
    : [];

  let body: ReactNode;
  if (access === 'loading') {
    body = <StatePanel icon="fa-spinner fa-spin" title="正在加载…" />;
  } else if (access === 'missing') {
    body = (
      <StatePanel icon="fa-box-archive" title="该内容已下架">
        <button
          type="button"
          onClick={goToList}
          className="rounded-xl border border-zinc-200 px-4 py-2 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          返回列表
        </button>
      </StatePanel>
    );
  } else if (access === 'login') {
    body = (
      <StatePanel icon="fa-lock" title="登录后查看">
        <button
          type="button"
          onClick={() => requestLogin('account')}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-700"
        >
          登录
        </button>
      </StatePanel>
    );
  } else if (access === 'forbidden') {
    body = <StatePanel icon="fa-ban" title="暂无权限查看" />;
  } else if (tool) {
    body = <MarketToolDetailModal toolId={tool.id} onClose={goBack} asPage />;
  } else if (skill) {
    body = (
      <MarketSkillDetailModal
        skill={skill}
        canRun={allowRun}
        onClose={goBack}
        onRun={handlers.onInvokeSkill}
        onToast={showToast}
        asPage
      />
    );
  } else if (agent) {
    body = (
      <CatalogAgentDetailModal
        agent={agent}
        submittedCases={submittedCases}
        canRun={allowRun}
        onClose={goBack}
        onRun={(item) => handlers.onInvokeAgent(item)}
        onToast={showToast}
        asPage
      />
    );
  } else if (caseState.status === 'ready') {
    body = (
      <div className="mx-auto h-full w-full max-w-6xl overflow-hidden rounded-2xl border border-black/5 bg-white shadow-apple-lg">
        <CaseHtml
          html={prepareCaseArticleHtml(caseState.html, caseState.article.sourceUrl)}
          title={caseState.article.title}
          baseHref={new URL(`${CASEBOOK_BASE}cases/`, window.location.origin).href}
          standalone
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#fbfbfd]">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-black/[0.06] bg-white px-4 md:px-6">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
        >
          <i className="fa-solid fa-arrow-left text-[12px]" />
          返回
        </button>
        <button
          type="button"
          onClick={() => setAppView('home')}
          className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-zinc-100"
          aria-label="回到首页"
        >
          <MssZhishuMark size={26} className="shrink-0" title="MSS AI提效平台" />
          <span className="hidden text-[14px] font-semibold text-zinc-900 sm:inline">MSS AI提效平台</span>
        </button>
        <div className="ml-auto flex items-center gap-2">
          {access === 'ok' ? (
            <button
              type="button"
              onClick={() => void share()}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              <i className="fa-solid fa-share-nodes text-[12px]" />
              分享
            </button>
          ) : null}
          {user ? null : (
            <button
              type="button"
              onClick={() => requestLogin('account')}
              className="rounded-xl bg-zinc-900 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-zinc-700"
            >
              登录
            </button>
          )}
        </div>
      </header>
      <div className="min-h-0 flex-1 p-3 md:p-5">{body}</div>
    </div>
  );
}
