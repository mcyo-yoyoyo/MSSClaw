import { useEffect, useMemo, type ReactNode } from 'react';
import {
  APP_VIEW_NAV,
  NAV_SECTION_LABELS,
  NAV_SECTIONS,
  type AppView,
  type NavSection,
} from '@/domain/appView';
import { isAppViewSlot, NAV_PRESENTATION_META } from '@/domain/navPresentation';
import { ROLE_LABELS } from '@/domain/rbac';
import { openFindCases, openUseSkills } from '@/domain/openHomeJourney';
import { canExecuteChat } from '@/domain/permissions';
import { SidebarTaskNav } from '@/components/shell/SidebarTaskNav';
import { ROUTE_PREFETCH } from '@/features/lazyPages';
import { cn } from '@/lib/utils';
import { useAppViewStore } from '@/stores/appViewStore';
import { useHomeStore } from '@/stores/homeStore';
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
  const isSlotEnabled = useNavPresentationStore((s) => s.isSlotEnabled);
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

  /** 能力配置：历史 platform + ops 槽位合并展示（全角色同一一级类） */
  const capabilityItems = useMemo(() => {
    const merge = [...itemsBySection.platform, ...itemsBySection.ops];
    return merge.filter((i) => i.id !== 'ai-map' && i.id !== 'home');
  }, [itemsBySection.platform, itemsBySection.ops]);

  const systemNavNodes = useMemo(() => {
    const byId = new Map(itemsBySection.system.map((i) => [i.id, i]));
    const renderItem = (item: (typeof APP_VIEW_NAV)[number]) => (
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
    const nodes: ReactNode[] = [];
    const portal = byId.get('portal-ops');
    if (portal) nodes.push(renderItem(portal));
    for (const id of ['admin', 'presentation', 'workspace-config'] as AppView[]) {
      const item = byId.get(id);
      if (item) nodes.push(renderItem(item));
    }
    // 偏好设置：有系统治理项时一并放在「系统设置」，与底栏入口并存
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
  const showTaskNav = isViewEnabled('task');
  const showWarroomNav = isSlotEnabled('warroom');
  const showHomeNav = isViewEnabled('home');
  const executeAllowed = canExecuteChat(user?.platformRole);
  const homeMode = useHomeStore((s) => s.homeMode);
  const findCasesActive = (appView === 'home' && homeMode === 'portal') || appView === 'ai-map';
  const doTaskActive = appView === 'home' && homeMode === 'assistant';
  const previewPlazaActive =
    (appView === 'home' && homeMode === 'portal') || appView === 'ai-map';

  const hasWorkspaceBody = showHomeNav || showTaskNav || showWarroomNav;
  const hasCapabilityBody = capabilityItems.length > 0;
  const hasSystemBody = systemNavNodes.length > 0;

  const taskAndWarroomNav = (
    <>
      {showTaskNav && (
        <SidebarTaskNav
          kind="agents"
          label="任务记录"
          shortLabel="记录"
          icon="fa-list-check"
          compact={sidebarCollapsed}
        />
      )}
      {showWarroomNav && (
        <SidebarTaskNav
          kind="warrooms"
          label="协作空间"
          icon="fa-comments"
          compact={sidebarCollapsed}
        />
      )}
    </>
  );

  /** 工作平台 · 业务壳二级 */
  const businessWorkspaceNav = (
    <>
      {showHomeNav ? (
        <button
          type="button"
          onClick={() => openFindCases()}
          onMouseEnter={() => ROUTE_PREFETCH.home?.()}
          className={cn('wb-nav-item', findCasesActive && 'active')}
          title={sidebarCollapsed ? '案例' : '找案例 · 进入学 · 找案例'}
        >
          <i className="fa-solid fa-compass w-5 text-center text-[15px]" />
          <span className="nav-label">找案例</span>
        </button>
      ) : null}
      {showHomeNav && executeAllowed ? (
        <button
          type="button"
          onClick={() => openUseSkills({ focusComposer: false })}
          onMouseEnter={() => ROUTE_PREFETCH.home?.()}
          className={cn('wb-nav-item', doTaskActive && 'active')}
          title={sidebarCollapsed ? '做任务' : '做任务 · 进入干 · 做任务（场景技能）'}
        >
          <i className="fa-solid fa-cube w-5 text-center text-[15px]" />
          <span className="nav-label">做任务</span>
        </button>
      ) : null}
      {taskAndWarroomNav}
    </>
  );

  /** 工作平台 · 运营壳二级 */
  const opsWorkspaceNav = (
    <>
      {showHomeNav ? (
        <button
          type="button"
          onClick={() => openFindCases()}
          onMouseEnter={() => ROUTE_PREFETCH.home?.()}
          className={cn('wb-nav-item', previewPlazaActive && 'active')}
          title={sidebarCollapsed ? '预览' : '预览广场 · 以业务视角预览学 · 找案例'}
        >
          <i className="fa-solid fa-store w-5 text-center text-[15px]" />
          <span className="nav-label">预览广场</span>
        </button>
      ) : null}
      {showHomeNav && executeAllowed ? (
        <button
          type="button"
          onClick={() => openUseSkills({ focusComposer: false })}
          onMouseEnter={() => ROUTE_PREFETCH.home?.()}
          className={cn('wb-nav-item', doTaskActive && 'active')}
          title={sidebarCollapsed ? '做任务' : '做任务（业务视角）· 场景技能/专家橱窗'}
        >
          <i className="fa-solid fa-cube w-5 text-center text-[15px]" />
          <span className="nav-label">做任务</span>
        </button>
      ) : null}
      {taskAndWarroomNav}
    </>
  );

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

      <nav className="flex-1 space-y-0.5 overflow-y-auto scroll-hidden px-3 py-3">
        {/* 全角色同一套一级分类：工作平台 → 能力配置 → 系统设置（空类不渲染） */}
        {hasWorkspaceBody && (
          <div
            className={cn(
              'nav-section-group',
              navSectionsCollapsed.workspace && !sidebarCollapsed && 'collapsed',
            )}
          >
            <button
              type="button"
              className="nav-section-header"
              onClick={() => toggleNavSection('workspace')}
            >
              <span>{NAV_SECTION_LABELS.workspace}</span>
              <i className="fa-solid fa-chevron-down nav-section-chevron" />
            </button>
            <div className="nav-section-body">
              {isBusiness ? businessWorkspaceNav : opsWorkspaceNav}
            </div>
          </div>
        )}

        {/* 业务壳只渲染工作平台；能力配置/系统设置仅运营壳 */}
        {!isBusiness && hasCapabilityBody && (
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
        )}

        {!isBusiness && hasSystemBody && (
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
        )}
      </nav>

      <div className="border-t border-black/[0.06] p-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openSettings}
            className="sidebar-footer-user flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-black/[0.04]"
            title="偏好设置"
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
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            title="退出登录"
          >
            <i className="fa-solid fa-right-from-bracket text-[11px]" />
            <span className="sidebar-collapse-label">退出</span>
          </button>
        </div>
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
