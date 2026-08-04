import { useEffect, useMemo, type ReactNode } from 'react';
import {
  APP_VIEW_NAV,
  NAV_SECTION_LABELS,
  NAV_SECTIONS,
  sortByAdminMenuOrder,
  type AppView,
  type NavSection,
} from '@/domain/appView';
import { isAppViewSlot, NAV_PRESENTATION_META } from '@/domain/navPresentation';
import { ROLE_LABELS } from '@/domain/rbac';
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

      <div className="border-t border-black/[0.06] p-1.5">
        <button
          type="button"
          onClick={openSettings}
          className="sidebar-footer-user flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-black/[0.04]"
          title="偏好设置"
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
            <p className="truncate text-[10px] leading-snug text-zinc-500">{roleLabel}</p>
          </div>
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
