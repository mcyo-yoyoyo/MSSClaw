import { MssZhishuMark } from '@/components/brand/MssZhishuMark';
import { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ADMIN_MENU_VIEWS, type AppView } from '@/domain/appView';
import { writeAppRouteToLocation } from '@/domain/appRoute';
import { MARKET_SHELF_META } from '@/domain/marketShelf';
import { NAV_PRESENTATION_META } from '@/domain/navPresentation';
import { canExecuteChat } from '@/domain/permissions';
import { ROLE_LABELS } from '@/domain/rbac';
import { formatRolePerspective } from '@/domain/rolePerspective';
import { defaultShellPerspective, isOpsOnlyView } from '@/domain/shellPerspective';
import { ROUTE_PREFETCH } from '@/features/lazyPages';
import { useAppViewStore } from '@/stores/appViewStore';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';
import { useHomeStore } from '@/stores/homeStore';
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
  const openSettings = useAppViewStore((s) => s.openSettings);
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
  const logout = useSessionStore((s) => s.logout);
  const isOpsShell = defaultShellPerspective(user?.platformRole) === 'ops';
  const executeAllowed = canExecuteChat(user?.platformRole);
  const showTaskEntry = executeAllowed && isViewEnabled('task');
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const adminRef = useRef<HTMLDivElement>(null);

  const perspectiveLabel = useMemo(() => {
    if (!user) return '未登录';
    return formatRolePerspective({
      platformRole: user.platformRole,
      deptIds: user.deptIds,
      regionId: user.regionId,
    });
  }, [user]);

  const initial = (user?.name?.trim()?.[0] ?? 'U').toUpperCase();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
      if (adminRef.current && !adminRef.current.contains(e.target as Node)) setAdminOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const goView = (view: AppView) => {
    if (view === 'home') {
      useHomeStore.getState().setHomeMode('portal');
    }
    writeAppRouteToLocation({ view });
    setAppView(view);
  };

  const navBtn = (active: boolean) =>
    cn(
      'relative truncate rounded-full px-3.5 py-1.5 text-[13px] font-medium tracking-tight transition',
      active
        ? 'bg-zinc-900 text-white shadow-[0_6px_16px_-8px_rgba(24,24,27,0.55)]'
        : 'text-zinc-600 hover:bg-zinc-100/90 hover:text-zinc-900',
    );

  return (
    <header className="apple-header z-50 flex h-[52px] shrink-0 items-center justify-between px-6">
      <div className="flex min-w-0 items-center gap-3">
        <MssZhishuMark size={32} className="shrink-0" title="MSS AI提效作战平台" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[14px] font-semibold tracking-tight text-zinc-900">
            MSS AI提效作战平台
          </p>
        </div>
      </div>

      <nav
        className="mx-3 hidden min-w-0 flex-1 items-center justify-center lg:flex"
        aria-label="平台导航"
      >
        <div className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-zinc-200/80 bg-zinc-50/80 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          {TOP_SHELF_NAV.filter((item) => isViewEnabled(item.view)).map((item) => (
            <button
              key={item.view}
              type="button"
              onClick={() => goView(item.view)}
              onMouseEnter={() => ROUTE_PREFETCH[item.view]?.()}
              className={navBtn(appView === item.view || marketToolShelfHighlight === item.view)}
            >
              {item.label}
            </button>
          ))}
          {canOpenAdmin ? (
            <div className="relative" ref={adminRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAdminOpen((v) => !v);
                }}
                className={navBtn(adminActive)}
              >
                管理后台
                <i className="fa-solid fa-chevron-down ml-1 text-[9px] opacity-70" />
              </button>
              {adminOpen ? (
                <div className="absolute left-1/2 top-full z-[60] mt-2 w-52 -translate-x-1/2 rounded-xl border border-zinc-200/80 bg-white py-1.5 shadow-apple-lg">
                  {adminItems.map((item) => (
                    <button
                      key={item.view}
                      type="button"
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
            </div>
          ) : null}
        </div>
      </nav>

      <div className="flex items-center gap-1.5">
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
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setUserMenuOpen((v) => !v);
            }}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-semibold text-white transition hover:opacity-90',
              user?.avatar || 'bg-zinc-900',
            )}
            title={user?.name ?? '用户'}
          >
            {initial}
          </button>
          {userMenuOpen && user && (
            <div className="absolute right-0 top-full z-[60] mt-2 w-64 rounded-xl border border-zinc-200/80 bg-white py-1.5 shadow-apple-lg">
              <div className="border-b border-zinc-100 px-4 py-2.5">
                <p className="truncate text-[13px] font-semibold text-zinc-900">{user.name}</p>
                <p className="truncate text-[11px] text-zinc-500">{user.email}</p>
                <p className="mt-1.5 text-[11px] font-medium leading-snug text-zinc-700">
                  {perspectiveLabel}
                </p>
                <p className="mt-0.5 text-[10px] text-zinc-400">{ROLE_LABELS[user.platformRole]}</p>
              </div>
              {showTaskEntry ? (
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    goView('task');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-zinc-700 hover:bg-zinc-50"
                >
                  <i className="fa-solid fa-list-check w-4 text-center text-[11px] text-zinc-400" />
                  任务记录
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  openSettings();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-zinc-700 hover:bg-zinc-50"
              >
                <i className="fa-solid fa-gear w-4 text-center text-[11px] text-zinc-400" />
                偏好设置
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
              >
                <i className="fa-solid fa-right-from-bracket w-4 text-center text-[11px]" />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
