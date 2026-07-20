import { MssZhishuMark } from '@/components/brand/MssZhishuMark';
import { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { writeAppRouteToLocation } from '@/domain/appRoute';
import { ROLE_LABELS } from '@/domain/rbac';
import { formatRolePerspective } from '@/domain/rolePerspective';
import { ROUTE_PREFETCH } from '@/features/lazyPages';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useWorkspaceConfigStore } from '@/stores/workspaceConfigStore';
import { WORKSPACE_LOCALE_LABELS } from '@/domain/workspaceConfig';
import { useAppViewStore } from '@/stores/appViewStore';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useSessionStore } from '@/stores/sessionStore';

interface AppHeaderProps {
  apiConnected: boolean;
  onWorkspaceSwitch?: (workspaceId: string) => void;
}

export function AppHeader({ apiConnected, onWorkspaceSwitch }: AppHeaderProps) {
  const { workspaceId, switchWorkspace, workspaceList } = useWorkspaceStore();
  const appView = useAppViewStore((s) => s.appView);
  const openSettings = useAppViewStore((s) => s.openSettings);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const openPalette = useCommandPaletteStore((s) => s.openPalette);
  const user = useSessionStore((s) => s.user);
  const logout = useSessionStore((s) => s.logout);
  const inboxMessages = useInboxStore((s) => s.messages);
  const unreadMessages = useMemo(() => {
    void inboxMessages;
    return useInboxStore.getState().unreadCount(user?.id);
  }, [inboxMessages, user?.id]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const getLocale = useWorkspaceConfigStore((s) => s.getLocale);

  const perspectiveLabel = useMemo(() => {
    if (!user) return '未登录视角';
    return formatRolePerspective({
      platformRole: user.platformRole,
      deptIds: user.deptIds,
      regionId: user.regionId,
    });
  }, [user]);

  const currentWs = workspaceList.find((w) => w.id === workspaceId) ?? workspaceList[0] ?? {
    id: workspaceId,
    name: '工作区',
    namespace: 'default',
    description: '',
    memberCount: 0,
  };

  const initial = (user?.name?.trim()?.[0] ?? 'U').toUpperCase();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <header className="apple-header z-50 flex h-[52px] shrink-0 items-center justify-between px-6">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <MssZhishuMark size={32} className="shrink-0" title="MSS AI提效作战平台" />
          <div className="flex items-baseline gap-2.5">
            <span className="text-[15px] font-semibold tracking-tight text-zinc-900">MSS AI</span>
            <span className="hidden text-[11px] font-medium text-zinc-400 sm:inline">提效作战平台</span>
          </div>
        </div>

        <div className="hidden h-4 w-px bg-zinc-200 sm:block" />

        <div className="relative hidden sm:block" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            <span className="max-w-[220px] truncate font-medium">{perspectiveLabel}</span>
            <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
              {WORKSPACE_LOCALE_LABELS[getLocale(workspaceId)]}
            </span>
            <i className="fa-solid fa-chevron-down text-[9px] text-zinc-400" />
          </button>
          {menuOpen && (
            <div className="workspace-menu absolute left-0 top-full z-[60] mt-2 w-80 rounded-xl border border-zinc-200/80 bg-white py-1.5 shadow-apple-lg">
              <p className="px-4 py-1.5 text-[10px] font-semibold tracking-wide text-zinc-400">
                组织视角（当前登录角色）
              </p>
              <div className="border-b border-zinc-100 px-4 py-2">
                <p className="text-[13px] font-semibold text-zinc-900">{perspectiveLabel}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {user ? ROLE_LABELS[user.platformRole] : ''} · 数据空间：{currentWs.name}
                </p>
              </div>
              <p className="px-4 py-1.5 text-[10px] font-semibold tracking-wide text-zinc-400">
                切换数据空间
              </p>
              {workspaceList.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (onWorkspaceSwitch) onWorkspaceSwitch(ws.id);
                    else switchWorkspace(ws.id);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-zinc-800 hover:bg-zinc-50"
                >
                  <i
                    className={cn(
                      'fa-solid fa-check text-[10px] text-zinc-900',
                      ws.id !== workspaceId && 'text-transparent',
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{ws.name}</span>
                    <span className="block truncate text-[10px] text-zinc-400">{ws.description}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="mr-1 hidden items-center gap-2 rounded-full border border-zinc-200/80 bg-white px-3 py-1 text-[11px] text-zinc-500 md:flex">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              apiConnected ? 'bg-emerald-500/80' : 'bg-amber-400/90',
            )}
          />
          <span>{apiConnected ? '已连接' : '本地模式'}</span>
        </div>
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
            // 先写 hash 再切视图，避免任务深链同步把页面抢回去
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
            <div className="absolute right-0 top-full z-[60] mt-2 w-56 rounded-xl border border-zinc-200/80 bg-white py-1.5 shadow-apple-lg">
              <div className="border-b border-zinc-100 px-4 py-2.5">
                <p className="truncate text-[13px] font-semibold text-zinc-900">{user.name}</p>
                <p className="truncate text-[11px] text-zinc-500">{user.email}</p>
                <p className="mt-1 text-[10px] text-zinc-400">{ROLE_LABELS[user.platformRole]}</p>
              </div>
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
