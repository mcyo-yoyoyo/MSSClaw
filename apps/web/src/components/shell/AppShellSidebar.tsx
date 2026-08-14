import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  APP_VIEW_NAV,
  NAV_SECTION_LABELS,
  NAV_SECTIONS,
  sortByAdminMenuOrder,
  type AppView,
  type NavSection,
} from '@/domain/appView';
import { writeAppRouteToLocation } from '@/domain/appRoute';
import { isAppViewSlot, NAV_PRESENTATION_META } from '@/domain/navPresentation';
import { ROLE_LABELS } from '@/domain/rbac';
import { formatRolePerspective } from '@/domain/rolePerspective';
import { isOpsOnlyView } from '@/domain/shellPerspective';
import { SidebarMarketFilters } from '@/components/shell/SidebarMarketFilters';
import { ROUTE_PREFETCH } from '@/features/lazyPages';
import { cn } from '@/lib/utils';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useShellPerspectiveStore } from '@/stores/shellPerspectiveStore';

export function AppShellSidebar() {
  const {
    appView,
    sidebarCollapsed,
    navSectionsCollapsed,
    setAppView,
    toggleSidebar,
    toggleNavSection,
    openSettings,
  } = useAppViewStore();
  const isViewEnabled = useNavPresentationStore((s) => s.isViewEnabled);
  const user = useSessionStore((s) => s.user);
  const logout = useSessionStore((s) => s.logout);
  const perspective = useShellPerspectiveStore((s) => s.perspective);
  const hydrate = useShellPerspectiveStore((s) => s.hydrate);

  useEffect(() => {
    hydrate(user?.platformRole);
  }, [hydrate, user?.platformRole, user?.id]);

  const itemsBySection = useMemo(() => {
    const sidebarIds = new Set(APP_VIEW_NAV.map((i) => i.id));
    const acc = Object.fromEntries(NAV_SECTIONS.map((s) => [s, [] as typeof APP_VIEW_NAV])) as Record<
      NavSection,
      typeof APP_VIEW_NAV
    >;

    APP_VIEW_NAV.forEach((item) => {
      if (isViewEnabled(item.id)) acc[item.section].push(item);
    });

    NAV_PRESENTATION_META.filter(
      (m) =>
        isAppViewSlot(m.id) &&
        !sidebarIds.has(m.id) &&
        isViewEnabled(m.id) &&
        !m.hiddenFromSidebar,
    ).forEach((meta) => {
      if (!isAppViewSlot(meta.id)) return;
      acc[meta.section].push({
        id: meta.id,
        label: meta.label,
        subtitle: meta.subtitle,
        icon: meta.icon,
        section: meta.section,
      });
    });

    return acc;
  }, [isViewEnabled]);

  const capabilityItems = useMemo(() => {
    const merge = [...itemsBySection.platform, ...itemsBySection.ops];
    return sortByAdminMenuOrder(
      merge.filter((i) => i.id !== 'ai-map' && i.id !== 'home'),
    );
  }, [itemsBySection.platform, itemsBySection.ops]);

  const systemNavNodes = useMemo(() => {
    const sorted = sortByAdminMenuOrder(itemsBySection.system);
    const renderItem = (item: { id: AppView; label: string; icon: string }) => (
      <button
        key={item.id}
        type="button"
        onClick={() => setAppView(item.id)}
        onMouseEnter={() => ROUTE_PREFETCH[item.id]?.()}
        className={cn('wb-nav-item', appView === item.id && 'active')}
        title={item.label}
      >
        <i className={cn('fa-solid w-5 text-center text-[15px]', item.icon)} />
        <span className="nav-label">{item.label}</span>
      </button>
    );
    const nodes: ReactNode[] = sorted.map((item) => renderItem(item));
    if (nodes.length > 0) {
      nodes.push(
        <button
          key="quick-settings"
          type="button"
          onClick={openSettings}
          className="wb-nav-item"
          title="偏好设置"
        >
          <i className="fa-solid fa-gear w-5 text-center text-[15px]" />
          <span className="nav-label">偏好设置</span>
        </button>,
      );
    }
    return nodes;
  }, [itemsBySection.system, appView, setAppView, openSettings]);

  const initial = (user?.name?.trim()?.[0] ?? 'U').toUpperCase();
  const roleLabel = user ? ROLE_LABELS[user.platformRole] : '';
  const perspectiveLabel = user
    ? formatRolePerspective({
        platformRole: user.platformRole,
        deptIds: user.deptIds,
        regionId: user.regionId,
      })
    : '未登录';
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;
    const onDocDown = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [accountOpen]);

  const goView = (view: AppView) => {
    writeAppRouteToLocation({ view });
    setAppView(view);
  };

  const isBusiness = perspective === 'business';
  const hasCapabilityBody = capabilityItems.length > 0;
  const hasSystemBody = systemNavNodes.length > 0;

  /** 运营壳 + 配置页 → 能力/系统导航；其余（含业务壳全部）→ 三维筛选 */
  const showOpsConfigNav =
    !isBusiness && isOpsOnlyView(appView) && (hasCapabilityBody || hasSystemBody);

  return (
    <aside
      className={cn(
        'app-sidebar z-40 flex shrink-0 flex-col border-r border-zinc-200/80 bg-white/80 backdrop-blur-2xl',
        sidebarCollapsed && 'sidebar-collapsed',
        isBusiness ? 'shell-business' : 'shell-ops',
      )}
    >
      <div className="flex items-center justify-end border-b border-black/[0.06] px-2 py-1.5">
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          title={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
          aria-label={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
        >
          <i
            className={cn(
              'fa-solid text-[13px]',
              sidebarCollapsed ? 'fa-angles-right' : 'fa-angles-left',
            )}
          />
        </button>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-hidden px-1.5 py-1.5">
        {showOpsConfigNav ? (
          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto scroll-hidden">
            {!sidebarCollapsed ? (
              <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                配置与治理
              </p>
            ) : null}
            {hasCapabilityBody ? (
              <NavSectionGroup
                section="platform"
                label={NAV_SECTION_LABELS.platform}
                collapsed={navSectionsCollapsed.platform}
                onToggle={() => toggleNavSection('platform')}
                items={capabilityItems}
                activeView={appView}
                onSelect={setAppView}
                sidebarCollapsed={sidebarCollapsed}
              />
            ) : null}
            {hasSystemBody ? (
              <div
                className={cn(
                  'nav-section-group mt-1',
                  navSectionsCollapsed.system && !sidebarCollapsed && 'collapsed',
                )}
              >
                <button
                  type="button"
                  className="nav-section-header"
                  onClick={() => toggleNavSection('system')}
                >
                  <span>{NAV_SECTION_LABELS.system}</span>
                  <i className="fa-solid fa-chevron-down nav-section-chevron" />
                </button>
                <div className="nav-section-body">{systemNavNodes}</div>
              </div>
            ) : null}
          </div>
        ) : (
          <SidebarMarketFilters collapsed={sidebarCollapsed} />
        )}
      </nav>

      <div className="relative border-t border-black/[0.06] p-1.5" ref={accountRef}>
        {accountOpen ? (
          <div
            className={cn(
              'absolute z-[70] overflow-hidden rounded-xl border border-zinc-200/80 bg-white py-1.5 shadow-apple-lg',
              sidebarCollapsed
                ? 'bottom-full left-full mb-1 ml-1 w-64'
                : 'bottom-full left-1.5 right-1.5 mb-1',
            )}
          >
            <div className="border-b border-zinc-100 px-3.5 py-2.5">
              <p className="truncate text-[13px] font-semibold text-zinc-900">
                {user?.name ?? '未登录'}
              </p>
              {user?.email ? (
                <p className="truncate text-[11px] text-zinc-500">{user.email}</p>
              ) : null}
              <p className="mt-1.5 text-[11px] font-medium leading-snug text-zinc-700">
                {perspectiveLabel}
              </p>
              {roleLabel ? (
                <p className="mt-0.5 text-[10px] text-zinc-400">{roleLabel}</p>
              ) : null}
            </div>
            {isViewEnabled('me') ? (
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  goView('me');
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-zinc-700 hover:bg-zinc-50"
              >
                <i className="fa-solid fa-user w-4 text-center text-[11px] text-zinc-400" />
                个人中心
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setAccountOpen(false);
                openSettings();
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-zinc-700 hover:bg-zinc-50"
            >
              <i className="fa-solid fa-gear w-4 text-center text-[11px] text-zinc-400" />
              偏好设置
            </button>
            <button
              type="button"
              onClick={() => {
                setAccountOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
            >
              <i className="fa-solid fa-right-from-bracket w-4 text-center text-[11px]" />
              退出登录
            </button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setAccountOpen((v) => !v)}
          className={cn(
            'sidebar-footer-user flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-black/[0.04]',
            accountOpen && 'bg-black/[0.04]',
          )}
          title={user?.name ?? '账号'}
          aria-expanded={accountOpen}
          aria-haspopup="menu"
        >
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white',
              user?.avatar || 'bg-zinc-900',
            )}
          >
            {initial}
          </div>
          <div className="sidebar-footer-user-text min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold leading-snug">{user?.name ?? '未登录'}</p>
            <p className="truncate text-[10px] leading-snug text-zinc-500">{roleLabel || '账号与设置'}</p>
          </div>
          {!sidebarCollapsed ? (
            <i className="fa-solid fa-chevron-up text-[9px] text-zinc-400" />
          ) : null}
        </button>
      </div>
    </aside>
  );
}

function NavSectionGroup({
  section: _section,
  label,
  collapsed,
  onToggle,
  items,
  activeView,
  onSelect,
  sidebarCollapsed,
}: {
  section: NavSection;
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  items: typeof APP_VIEW_NAV;
  activeView: AppView;
  onSelect: (view: AppView) => void;
  sidebarCollapsed: boolean;
}) {
  return (
    <div className={cn('nav-section-group', collapsed && !sidebarCollapsed && 'collapsed')}>
      <button type="button" className="nav-section-header" onClick={onToggle}>
        <span>{label}</span>
        <i className="fa-solid fa-chevron-down nav-section-chevron" />
      </button>
      <div className="nav-section-body">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            onMouseEnter={() => ROUTE_PREFETCH[item.id]?.()}
            className={cn('wb-nav-item', activeView === item.id && 'active')}
            title={item.label}
          >
            <i className={cn('fa-solid w-5 text-center text-[15px]', item.icon)} />
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
