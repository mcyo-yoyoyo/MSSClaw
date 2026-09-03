import { MssZhishuMark } from '@/components/brand/MssZhishuMark';
import { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ADMIN_MENU_VIEWS, type AppView } from '@/domain/appView';
import { writeAppRouteToLocation } from '@/domain/appRoute';
import { MARKET_SHELF_META } from '@/domain/marketShelf';
import { NAV_PRESENTATION_META } from '@/domain/navPresentation';
import { defaultShellPerspective, isOpsOnlyView } from '@/domain/shellPerspective';
import { ROUTE_PREFETCH } from '@/features/lazyPages';
import { useAppViewStore } from '@/stores/appViewStore';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useAuthGateStore } from '@/stores/authGateStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const TOP_SHELF_NAV: { view: AppView; label: string }[] = [
  { view: 'home', label: '首页' },
  { view: 'ai-brief', label: 'AI快讯' },
  { view: MARKET_SHELF_META.external.view, label: MARKET_SHELF_META.external.label },
  { view: MARKET_SHELF_META.internal.view, label: MARKET_SHELF_META.internal.label },
  { view: MARKET_SHELF_META.projects.view, label: MARKET_SHELF_META.projects.label },
];

const ADMIN_MENU_ITEMS: { view: AppView; label: string }[] = ADMIN_MENU_VIEWS.map((view) => ({
  view,
  label: NAV_PRESENTATION_META.find((m) => m.id === view)?.label ?? view,
}));

interface AppHeaderProps {
  apiConnected: boolean;
  onWorkspaceSwitch?: (workspaceId: string) => void;
}

export function AppHeader({ apiConnected: _apiConnected, onWorkspaceSwitch: _onWorkspaceSwitch }: AppHeaderProps) {
  void _apiConnected;
  void _onWorkspaceSwitch;
  const appView = useAppViewStore((s) => s.appView);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const expandAdminNav = useAppViewStore((s) => s.expandAdminNav);
  const openPalette = useCommandPaletteStore((s) => s.openPalette);
  const isViewEnabled = useNavPresentationStore((s) => s.isViewEnabled);
  const roleEnabled = useNavPresentationStore((s) => s.roleEnabled);
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const pendingToolId = useNavigationIntentStore((s) => s.pendingToolId);
  const returnTarget = useNavigationIntentStore((s) => s.returnTarget);
  const tools = useMarketplaceStore((s) => s.tools);
  const marketToolShelfHighlight = useMemo((): AppView | null => {
    if (appView !== 'market-tool') return null;
    if (
      returnTarget?.view === 'market-external' ||
      returnTarget?.view === 'market-internal' ||
      returnTarget?.view === 'market-projects'
    ) {
      return returnTarget.view;
    }
    const tool = tools.find((t) => t.id === pendingToolId);
    if (!tool) return 'market-external';
    return tool.sourceType === 'internal' || tool.tags?.includes('hw-internal')
      ? 'market-internal'
      : 'market-external';
  }, [appView, returnTarget, tools, pendingToolId]);
  const activeNavRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeNavRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [appView, marketToolShelfHighlight]);
  const user = useSessionStore((s) => s.user);
  const isGuest = useSessionStore((s) => s.isGuest);
  const requestLogin = useAuthGateStore((s) => s.requestLogin);
  const isOpsShell = defaultShellPerspective(user?.platformRole) === 'ops';
  const adminItems = useMemo(
    () => ADMIN_MENU_ITEMS.filter((i) => isViewEnabled(i.view)),
    [isViewEnabled, roleEnabled, user?.platformRole, workspaceId],
  );
  const canOpenAdmin = isOpsShell && adminItems.length > 0;
  const adminActive = isOpsOnlyView(appView);
  /** 顶栏「管理后台」直达首个可用后台页；页间切换走侧栏 */
  const adminEntryView = adminItems[0]?.view;
  const inboxMessages = useInboxStore((s) => s.messages);
  const unreadMessages = useMemo(() => {
    void inboxMessages;
    return useInboxStore.getState().unreadCount(user?.id);
  }, [inboxMessages, user?.id]);

  const goView = (view: AppView) => {
    writeAppRouteToLocation({ view });
    setAppView(view);
  };

  const navBtn = (active: boolean) =>
    cn(
      'relative shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[12px] font-medium tracking-tight transition xl:px-3.5 xl:text-[13px]',
      active
        ? 'bg-zinc-900 text-white shadow-[0_6px_16px_-8px_rgba(24,24,27,0.55)]'
        : 'text-zinc-600 hover:bg-zinc-100/90 hover:text-zinc-900',
    );

  return (
    <header className="apple-header z-50 grid h-[52px] shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 sm:px-4 md:px-6">
      <div className="flex min-w-0 items-center justify-self-start gap-2 sm:gap-3">
        <MssZhishuMark size={32} className="shrink-0" title="MSS AI提效平台" />
        <div className="min-w-0 leading-tight max-lg:hidden">
          <p className="truncate text-[14px] font-semibold tracking-tight text-zinc-900">
            MSS AI提效平台
          </p>
        </div>
      </div>

      <nav
        className="flex max-w-[min(100vw-8rem,760px)] items-center justify-center justify-self-center"
        aria-label="平台导航"
      >
        <div className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-zinc-200/80 bg-zinc-50/80 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <div className="flex min-w-0 max-w-full items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TOP_SHELF_NAV.filter((item) => isViewEnabled(item.view)).map((item) => (
              <button
                key={item.view}
                ref={
                  appView === item.view || marketToolShelfHighlight === item.view
                    ? activeNavRef
                    : undefined
                }
                type="button"
                onClick={() => goView(item.view)}
                onMouseEnter={() => ROUTE_PREFETCH[item.view]?.()}
                className={navBtn(
                  appView === item.view ||
                    marketToolShelfHighlight === item.view ||
                    (item.view === 'me' && appView === 'ai-tasks'),
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          {canOpenAdmin && adminEntryView ? (
            <button
              type="button"
              onClick={() => {
                expandAdminNav();
                goView(adminEntryView);
              }}
              onMouseEnter={() => ROUTE_PREFETCH[adminEntryView]?.()}
              className={navBtn(adminActive)}
            >
              管理后台
            </button>
          ) : null}
        </div>
      </nav>

      <div className="flex shrink-0 items-center justify-self-end gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={openPalette}
          className="hidden h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 sm:flex"
          title="Command Palette (⌘K)"
        >
          <i className="fa-solid fa-magnifying-glass text-[13px]" />
        </button>
        {isGuest ? null : (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            writeAppRouteToLocation({ view: 'messages' });
            setAppView('messages');
          }}
          onMouseEnter={() => ROUTE_PREFETCH.messages?.()}
          className={cn(
            'relative flex h-9 w-9 items-center justify-center rounded-lg transition',
            appView === 'messages'
              ? 'bg-zinc-100 text-zinc-900'
              : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900',
          )}
          title="我的消息"
          aria-label={unreadMessages > 0 ? `我的消息，${unreadMessages} 条未读` : '我的消息'}
        >
          <i className="fa-solid fa-bell text-[15px]" />
          {unreadMessages > 0 ? (
            <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#e0122f] px-1 text-[9px] font-semibold leading-none text-white">
              {unreadMessages > 99 ? '99+' : unreadMessages}
            </span>
          ) : null}
        </button>
        )}
        {isGuest ? (
          /* 游客：消息与个人中心收起，只给一个明确的登录入口 */
          <button
            type="button"
            onClick={() => requestLogin('account')}
            className="flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#e0122f] text-[12px] font-semibold text-white transition hover:bg-[#c01028] sm:w-auto sm:px-3"
            title="登录"
            aria-label="登录"
          >
            <i className="fa-solid fa-arrow-right-to-bracket text-[12px]" />
            <span className="hidden sm:inline">登录</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => goView('me')}
            onMouseEnter={() => ROUTE_PREFETCH.me?.()}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg transition',
              appView === 'me' || appView === 'ai-tasks'
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900',
            )}
            title="个人中心"
            aria-label="个人中心"
          >
            <i className="fa-solid fa-circle-user text-[16px]" />
          </button>
        )}
      </div>
    </header>
  );
}
