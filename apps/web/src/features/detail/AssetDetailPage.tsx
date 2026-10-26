import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MssZhishuMark } from '@/components/brand/MssZhishuMark';
import { ToolLogo } from '@/components/brand/ToolLogo';
import {
  assetDetailUrl,
  openAssetDetail,
  readAppRouteFromLocation,
  type AppRouteParams,
  type DetailAssetType,
} from '@/domain/appRoute';
import type { AppView } from '@/domain/appView';
import { setAiBriefContentMode } from '@/domain/aiBriefContentMode';
import { copyText } from '@/domain/assetShare';
import { canViewAsset } from '@/domain/assetVisibility';
import { takeDetailAction } from '@/domain/directEntry';
import { allowsMarketScenarioRun } from '@/domain/marketRunCapability';
import { canExecuteChat } from '@/domain/permissions';
import type { PrototypeToolSeed } from '@/domain/prototype/types';
import { relatedTools } from '@/domain/relatedTools';
import { resolveToolLogoUrl } from '@/domain/toolLogo';
import type { AppViewRouterHandlers } from '@/features/AppViewRouter';
import { CaseInsightBody } from '@/features/ai-brief/CaseInsightBody';
import { useCaseInsightArticle } from '@/features/ai-brief/useCaseInsightArticle';
import { CatalogAgentDetailModal } from '@/features/market/CatalogAgentDetailModal';
import { MarketSkillDetailModal } from '@/features/market/MarketSkillDetailModal';
import { MarketToolDetailModal } from '@/features/market/MarketToolDetailModal';
import { useAppViewStore } from '@/stores/appViewStore';
import { useAuthGateStore } from '@/stores/authGateStore';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useSessionStore } from '@/stores/sessionStore';

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

/** 工具详情右栏：同货架的相关工具，点开在当前页进入详情（计站内点击） */
function RelatedToolsPanel({ tools }: { tools: PrototypeToolSeed[] }) {
  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-apple-lg lg:max-h-full lg:w-[30%] lg:min-w-[280px] lg:max-w-[360px] lg:self-start">
      <h2 className="shrink-0 border-b border-zinc-100 px-5 py-4 text-[14px] font-semibold text-zinc-900">相关推荐</h2>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {tools.map((tool) => (
          <li key={tool.id}>
            <button
              type="button"
              onClick={() => openAssetDetail('tool', tool.id)}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-zinc-50 active:scale-[0.98]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-zinc-100">
                <ToolLogo name={tool.name} logoUrl={resolveToolLogoUrl(tool)} icon={tool.icon} size={32} className="rounded-md" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold text-zinc-900">{tool.name}</span>
                <span className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-zinc-500">
                  {tool.cardSummary || tool.desc}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

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
  const bumpDetail = useContentEngagementStore((s) => s.bumpDetail);
  const trackedRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (access === 'ok' && title) document.title = `${title} - MSS AI提效平台`;
  }, [access, title]);

  // 每打开一个资产记一次详情浏览；页面新打开就落在这里的记直达（看板「分享浏览数」）
  useEffect(() => {
    if (access !== 'ok' || !type || !id) return;
    const key = `${type}:${id}`;
    if (trackedRef.current === key) return;
    trackedRef.current = key;
    bumpDetail(id, type, takeDetailAction(type, id));
  }, [access, bumpDetail, id, type]);

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
    const copied = await copyText(assetDetailUrl(type as DetailAssetType, id));
    showToast(copied ? '已复制链接' : '复制失败，请手动复制地址栏链接');
  };

  const allowRun = allowsMarketScenarioRun(navPreset) && (canExecuteChat(user?.platformRole) || isGuest);
  const submittedCases = agent
    ? portalContent.filter(
        (item) =>
          item.type === 'case' && item.published !== false && item.agentId === agent.id && canViewAsset(item, viewer),
      )
    : [];

  // 分享放在详情卡片标题区右上角，紧挨着内容
  const shareButton = (
    <button
      type="button"
      onClick={() => void share()}
      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.97]"
    >
      <i className="fa-solid fa-share-nodes text-[12px]" />
      分享
    </button>
  );

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
    const related = relatedTools(tool, tools, (item) => canViewAsset(item, viewer));
    const detail = <MarketToolDetailModal toolId={tool.id} onClose={goBack} asPage pageHeaderAction={shareButton} />;
    // 左详情、右推荐（右栏窄一些）；窄屏时推荐排到详情下方，整页滚动；没有可推荐的工具时只显示详情
    body = related.length ? (
      <div className="mx-auto flex h-full max-w-6xl flex-col gap-4 overflow-y-auto lg:flex-row lg:overflow-visible">
        <div className="h-full min-w-0 shrink-0 lg:flex-1 lg:shrink">{detail}</div>
        <RelatedToolsPanel tools={related} />
      </div>
    ) : (
      detail
    );
  } else if (skill) {
    body = (
      <MarketSkillDetailModal
        skill={skill}
        canRun={allowRun}
        onClose={goBack}
        onRun={handlers.onInvokeSkill}
        onToast={showToast}
        asPage
        pageHeaderAction={shareButton}
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
        pageHeaderAction={shareButton}
      />
    );
  } else if (caseState.status === 'ready') {
    body = (
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-apple-lg">
        <div className="flex shrink-0 justify-end border-b border-zinc-100 px-4 py-2.5">{shareButton}</div>
        <div className="min-h-0 flex-1">
          <CaseInsightBody key={caseState.article.id} html={caseState.html} article={caseState.article} />
        </div>
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
