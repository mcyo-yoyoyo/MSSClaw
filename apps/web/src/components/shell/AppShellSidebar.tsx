import { useMemo } from 'react';
import {
  APP_VIEW_NAV,
  NAV_SECTION_LABELS,
  NAV_SECTIONS,
  type AppView,
  type NavSection,
} from '@/domain/appView';
import { NAV_PRESENTATION_META } from '@/domain/navPresentation';
import { ROLE_LABELS } from '@/domain/rbac';
import { ROUTE_PREFETCH } from '@/features/lazyPages';
import { cn } from '@/lib/utils';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { useSessionStore } from '@/stores/sessionStore';

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

  const itemsBySection = useMemo(() => {
    const sidebarIds = new Set(APP_VIEW_NAV.map((i) => i.id));
    const acc = Object.fromEntries(NAV_SECTIONS.map((s) => [s, [] as typeof APP_VIEW_NAV])) as Record<
      NavSection,
      typeof APP_VIEW_NAV
    >;

    APP_VIEW_NAV.forEach((item) => {
      if (isViewEnabled(item.id)) acc[item.section].push(item);
    });

    NAV_PRESENTATION_META.filter((m) => !sidebarIds.has(m.id) && isViewEnabled(m.id)).forEach((meta) => {
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

  const initial = (user?.name?.trim()?.[0] ?? 'U').toUpperCase();
  const roleLabel = user ? ROLE_LABELS[user.platformRole] : '';

  return (
    <aside
      className={cn(
        'app-sidebar z-40 flex shrink-0 flex-col border-r border-zinc-200/80 bg-white/80 backdrop-blur-2xl',
        sidebarCollapsed && 'sidebar-collapsed',
      )}
    >
      <nav className="flex-1 space-y-0.5 overflow-y-auto scroll-hidden px-3 py-3">
        {(['workspace', 'platform', 'ops'] as NavSection[]).map((section) =>
          itemsBySection[section].length > 0 ? (
            <NavSectionGroup
              key={section}
              section={section}
              label={NAV_SECTION_LABELS[section]}
              collapsed={navSectionsCollapsed[section]}
              onToggle={() => toggleNavSection(section)}
              items={itemsBySection[section]}
              activeView={appView}
              onSelect={setAppView}
              sidebarCollapsed={sidebarCollapsed}
            />
          ) : null,
        )}

        <div className={cn('nav-section-group mt-1', navSectionsCollapsed.system && 'collapsed')}>
          <button type="button" className="nav-section-header" onClick={() => toggleNavSection('system')}>
            <span>{NAV_SECTION_LABELS.system}</span>
            <i className="fa-solid fa-chevron-down nav-section-chevron" />
          </button>
          <div className="nav-section-body">
            <button type="button" onClick={openSettings} className="wb-nav-item" title="系统设置">
              <i className="fa-solid fa-gear w-5 text-center text-[15px]" />
              <span className="nav-label">系统设置</span>
            </button>
            {itemsBySection.system.map((item) => (
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
            ))}
          </div>
        </div>
      </nav>

      <div className="space-y-1 border-t border-black/[0.06] p-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="sidebar-collapse-btn flex w-full items-center justify-center gap-2 rounded-xl px-2 py-2 text-[11px] text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
        >
          <i className={cn('fa-solid text-xs', sidebarCollapsed ? 'fa-angles-right' : 'fa-angles-left')} />
          <span className="sidebar-collapse-label">收起侧栏</span>
        </button>
        <button
          type="button"
          onClick={openSettings}
          className="sidebar-footer-user flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-black/[0.04]"
        >
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white',
              user?.avatar || 'bg-zinc-900',
            )}
          >
            {initial}
          </div>
          <div className="sidebar-footer-user-text min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{user?.name ?? '未登录'}</p>
            <p className="truncate text-[10px] text-zinc-500">{roleLabel}</p>
          </div>
        </button>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-2 py-1.5 text-[11px] text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
          title="退出登录"
        >
          <i className="fa-solid fa-right-from-bracket text-[10px]" />
          <span className="sidebar-collapse-label">退出登录</span>
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
