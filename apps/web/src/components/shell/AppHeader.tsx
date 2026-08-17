import { MssZhishuMark } from '@/components/brand/MssZhishuMark';
import { useState, useRef, useEffect, useMemo } from 'react';
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

const TOP_SHELF_NAV: { view: AppView; label: string }[] = [
  { view: 'home', label: '首页' },
  { view: MARKET_SHELF_META.external.view, label: MARKET_SHELF_META.external.label },
  { view: MARKET_SHELF_META.internal.view, label: MARKET_SHELF_META.internal.label },
  { view: MARKET_SHELF_META.projects.view, label: MARKET_SHELF_META.projects.label },
  { view: 'ai-brief', label: 'AI快讯' },
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
  const openPalette = useCommandPaletteStore((s) => s.openPalette);
  const isViewEnabled = useNavPresentationStore((s) => s.isViewEnabled);
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
  const user = useSessionStore((s) => s.user);
  const isOpsShell = defaultShellPerspective(user?.platformRole) === 'ops';
  const adminItems = useMemo(
    () => ADMIN_MENU_ITEMS.filter((i) => isViewEnabled(i.view)),
    [isViewEnabled],
  );
  const canOpenAdmin = isOpsShell && adminItems.length > 0;
  const adminActive = isOpsOnlyView(appView);
  const inboxMessages = useInboxStore((s) => s.messages);
  const unreadMessages = useMemo(() => {
    void inboxMessages;
    return useInboxStore.getState().unreadCount(user?.id);
  }, [inboxMessages, user?.id]);
  const [adminOpen, setAdminOpen] = useState(false);
  const adminRef = useRef<HTMLDivElement>(null);
  const adminBtnRef = useRef<HTMLButtonElement>(null);
  const [adminMenuPos, setAdminMenuPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        adminRef.current &&
        !adminRef.current.contains(target) &&
        !(e.target as HTMLElement | null)?.closest?.('[data-admin-menu]')
      ) {
        setAdminOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  useEffect(() => {
    if (!adminOpen) {
      setAdminMenuPos(null);
      return;
    }
    const updatePos = () => {
      const btn = adminBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setAdminMenuPos({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
      });
    };
    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [adminOpen]);

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
        <MssZhishuMark size={32} className="shrink-0" title="MSS AI提效作战平台" />
        <div className="min-w-0 leading-tight max-lg:hidden">
          <p className="truncate text-[14px] font-semibold tracking-tight text-zinc-900">
            MSS AI提效作战平台
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
          {canOpenAdmin ? (
            <div className="relative shrink-0" ref={adminRef}>
              <button
                ref={adminBtnRef}
                type="button"
                aria-expanded={adminOpen}
                aria-haspopup="menu"
                onMouseDown={(e) => {
                  // 避免 document mousedown 先关掉再点开
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setAdminOpen((v) => {
                    const next = !v;
                    if (next && adminBtnRef.current) {
                      const rect = adminBtnRef.current.getBoundingClientRect();
                      setAdminMenuPos({
                        top: rect.bottom + 8,
                        left: rect.left + rect.width / 2,
                      });
                    }
                    return next;
                  });
                }}
                className={navBtn(adminActive || adminOpen)}
              >
                管理后台
                <i
                  className={cn(
                    'fa-solid fa-chevron-down ml-1 text-[9px] opacity-70 transition',
                    adminOpen && 'rotate-180',
                  )}
                />
              </button>
            </div>
          ) : null}
        </div>
      </nav>

      {canOpenAdmin && adminOpen && adminMenuPos ? (
        <div
          data-admin-menu
          role="menu"
          className="fixed z-[80] w-52 -translate-x-1/2 rounded-xl border border-zinc-200/80 bg-white py-1.5 shadow-apple-lg"
          style={{ top: adminMenuPos.top, left: adminMenuPos.left }}
        >
          {adminItems.map((item) => (
            <button
              key={item.view}
              type="button"
              role="menuitem"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                setAdminOpen(false);
                goView(item.view);
              }}
              onMouseEnter={() => ROUTE_PREFETCH[item.view]?.()}
              className={cn(
                'flex w-full px-4 py-2 text-left text-[12px] font-medium hover:bg-zinc-50',
                appView === item.view ? 'text-zinc-900' : 'text-zinc-600',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex shrink-0 items-center justify-self-end gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={openPalette}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          title="Command Palette (⌘K)"
        >
          <i className="fa-solid fa-magnifying-glass text-[13px]" />
        </button>
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
      </div>
    </header>
  );
}
