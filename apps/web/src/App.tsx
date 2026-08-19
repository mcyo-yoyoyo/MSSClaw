import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppHeader } from '@/components/shell/AppHeader';
import { AppShellSidebar } from '@/components/shell/AppShellSidebar';
import { GlobalToastHost } from '@/components/common/GlobalToastHost';
import { AssetApprovalModal } from '@/components/center/AssetApprovalModal';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { registerShareSyncToast } from '@/domain/shareSync';
import { MssZhishuMark } from '@/components/brand/MssZhishuMark';
import { HomeToTaskTransit } from '@/components/home/HomeToTaskTransit';
import { useConversationStore } from '@/stores/conversationStore';
import { useHomeStore } from '@/stores/homeStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { usePlazaToolGuideStore } from '@/stores/plazaToolGuideStore';
import { useInboxStore } from '@/stores/inboxStore';
import { getAgentById } from '@/domain/plan';
import {
  buildSkillDemoPrompt,
  hasSkillExecutionBody,
  isSkillCallable,
  isSkillRunnable,
} from '@/domain/skillRuntime';
import { buildAgentDemoPrompt } from '@/domain/agents/runtime';
import { enterTaskChatFocusMode } from '@/domain/taskFocusMode';
import { PROTOTYPE_AGENTS } from '@/domain/prototype/agents';
import type { PrototypeAgentSeed, PrototypeKbDocument, PrototypeSkillSeed } from '@/domain/prototype/types';
import type { ScenarioDemoPlan } from '@/domain/scenarioPipeline';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useTaskStore } from '@/stores/taskStore';
import type { AppCommandHandlers } from '@/domain/commands';
import { useAppRouting } from '@/hooks/useAppRouting';
import { useTaskRouteSync, navigateToTaskChat } from '@/hooks/useTaskRouteSync';
import { writeAppRouteToLocation } from '@/domain/appRoute';
import { isWarRoom } from '@/domain/chat';
import { usePlatformStoreLoader } from '@/hooks/usePlatformStoreLoader';
import { loadSessions } from '@/domain/persistence/storage';
import { AppViewRouter } from '@/features/AppViewRouter';
import { LoginPage } from '@/features/auth/LoginPage';
import {
  LazyCommandPalette,
  LazyExportModal,
  LazySettingsDrawer,
} from '@/features/lazyPages';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { useWorkspaceConfigStore } from '@/stores/workspaceConfigStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { getNavMetaLabel } from '@/domain/navPresentation';
import { roleNavDisabledToast } from '@/domain/permissions';
import { useShellPerspectiveStore } from '@/stores/shellPerspectiveStore';
import { useSessionStore } from '@/stores/sessionStore';
import { TaskGlobalModals } from '@/components/task/TaskGlobalModals';
import { openAiAssistantForNewTask } from '@/domain/openNewTask';
import { canExecuteChat, READONLY_EXECUTE_HINT } from '@/domain/permissions';
import { AccessDeniedPanel } from '@/components/shell/AccessDeniedPanel';
import { AppErrorBoundary } from '@/components/common/AppErrorBoundary';
import { isApiEnabled } from '@/api/client';
import { fetchApiHealthInfo } from '@/api/persistenceApi';
import { cn } from '@/lib/utils';

export function App() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const sessionBootstrapped = useSessionStore((s) => s.bootstrapped);
  const hydrateFromServer = useSessionStore((s) => s.hydrateFromServer);
  const shellPerspective = useShellPerspectiveStore((s) => s.perspective);
  const switchWorkspace = useWorkspaceStore((s) => s.switchWorkspace);
  const bootstrap = useWorkspaceStore((s) => s.bootstrap);
  const catalogReady = useWorkspaceStore((s) => s.catalogReady);
  const catalogLoading = useWorkspaceStore((s) => s.catalogLoading);
  const apiConnected = useWorkspaceStore((s) => s.apiConnected);
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const workspaceList = useWorkspaceStore((s) => s.workspaceList);

  const appView = useAppViewStore((s) => s.appView);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const blockedOpsView = useAppViewStore((s) => s.blockedOpsView);
  const clearBlockedOpsView = useAppViewStore((s) => s.clearBlockedOpsView);
  const closeSettings = useAppViewStore((s) => s.closeSettings);
  const settingsOpen = useAppViewStore((s) => s.settingsOpen);
  const openSettings = useAppViewStore((s) => s.openSettings);
  const paletteOpen = useCommandPaletteStore((s) => s.open);

  const loadWorkspace = useConversationStore((s) => s.loadWorkspace);
  const exportOpen = useConversationStore((s) => s.exportOpen);
  const closeExport = useConversationStore((s) => s.closeExport);
  const exportResult = useConversationStore((s) => s.exportResult);
  const createAgentTaskSession = useConversationStore((s) => s.createAgentTaskSession);
  const startExpertTeamRelay = useConversationStore((s) => s.startExpertTeamRelay);
  const findOrCreateAgentSession = useConversationStore((s) => s.findOrCreateAgentSession);
  const switchChat = useConversationStore((s) => s.switchChat);
  const openExport = useConversationStore((s) => s.openExport);
  const pushToGroup = useConversationStore((s) => s.pushToGroup);

  const workspace = useMemo(
    () => workspaceList.find((w) => w.id === workspaceId) ?? workspaceList[0] ?? {
      id: workspaceId,
      name: '工作区',
      namespace: 'default',
      description: '',
      memberCount: 0,
    },
    [workspaceId, workspaceList],
  );
  const hydratedRef = useRef(false);
  const transitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [workspaceHydrating, setWorkspaceHydrating] = useState(false);
  const [sessionsReady, setSessionsReady] = useState(false);
  const [transit, setTransit] = useState<{ open: boolean; summary: string }>({
    open: false,
    summary: '',
  });

  const goToTaskWithTransit = useCallback((summary: string, chatId?: string) => {
    const nav = useNavPresentationStore.getState();
    const targetChat = chatId ? useConversationStore.getState().chats[chatId] : undefined;
    const targetView =
      targetChat && isWarRoom(targetChat)
        ? 'task'
        : nav.isViewEnabled('ai-tasks')
          ? 'ai-tasks'
          : 'task';
    if (!nav.isViewEnabled(targetView)) {
      const fallback = nav.getFallbackView();
      useConversationStore.setState({
        pushToast: roleNavDisabledToast(getNavMetaLabel(targetView), getNavMetaLabel(fallback)),
      });
      return;
    }
    if (transitTimerRef.current) clearTimeout(transitTimerRef.current);
    const preview = summary.trim().length > 48 ? `${summary.trim().slice(0, 48)}…` : summary.trim();
    useTaskStore.getState().setTaskLanding('tasks');
    setTransit({ open: true, summary: preview });
    enterTaskChatFocusMode();
    transitTimerRef.current = setTimeout(() => {
      if (chatId) navigateToTaskChat(chatId);
      else {
        writeAppRouteToLocation({ view: targetView });
        setAppView(targetView);
      }
      setTransit({ open: false, summary: '' });
      transitTimerRef.current = null;
    }, 720);
  }, [setAppView]);

  useEffect(
    () => () => {
      if (transitTimerRef.current) clearTimeout(transitTimerRef.current);
    },
    [],
  );

  useAppRouting();
  useTaskRouteSync(appView);
  usePlatformStoreLoader(appView);

  useEffect(() => {
    registerShareSyncToast((msg) => useMarketplaceStore.getState().showToast(msg));
  }, []);

  useEffect(() => {
    void hydrateFromServer();
  }, [hydrateFromServer]);

  useEffect(() => {
    void (async () => {
      if (!isApiEnabled()) {
        useWorkspaceStore.setState({
          apiConnected: false,
          apiStatus: 'local-demo',
        });
        return;
      }
      const health = await fetchApiHealthInfo();
      if (!health.ok) {
        useWorkspaceStore.setState({
          apiConnected: false,
          apiStatus: 'unreachable',
        });
        return;
      }
      useWorkspaceStore.setState({
        apiConnected: true,
        apiStatus: 'connected',
        nestLlmEnvConfigured: health.llmEnvConfigured,
      });
    })();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void bootstrap();
  }, [bootstrap, isAuthenticated]);

  useEffect(() => {
    const sync = () => {
      const next = useWorkspaceConfigStore.getState().getVisibleWorkspaces();
      const prev = useWorkspaceStore.getState().workspaceList;
      const same =
        prev.length === next.length &&
        prev.every((w, i) =>
          w.id === next[i]?.id &&
          w.name === next[i]?.name &&
          w.namespace === next[i]?.namespace &&
          w.description === next[i]?.description &&
          w.memberCount === next[i]?.memberCount,
        );
      if (!same) {
        useWorkspaceStore.setState({ workspaceList: next });
      }
    };
    sync();
    return useWorkspaceConfigStore.subscribe(sync);
  }, []);

  useEffect(() => {
    if (!catalogReady || hydratedRef.current) return;
    hydratedRef.current = true;
    setSessionsReady(false);

    void (async () => {
      try {
        const { workspaceId: wsId, getCatalog } = useWorkspaceStore.getState();
        const defaultChatId = getCatalog(wsId).defaultChatId;

        await useMarketplaceStore.getState().bootstrap(wsId);
        await usePortalContentStore.getState().bootstrap(wsId);
        usePlazaToolGuideStore.getState().bootstrap(wsId);
        useInboxStore.getState().bootstrap(wsId);
        try {
          const { hydrateAllPlatformDocs } = await import('@/domain/hydratePlatformDocs');
          await hydrateAllPlatformDocs(wsId);
        } catch {
          /* docs optional until API ready */
        }

        const persisted = await loadSessions(wsId);
        const catalogChats = getCatalog(wsId).chats ?? {};
        const mergedSessions = persisted
          ? { ...structuredClone(catalogChats), ...persisted }
          : undefined;

        loadWorkspace(wsId, defaultChatId, mergedSessions);
      } catch {
        /* 目录/货架加载失败仍进入工作台，避免登录后白屏 */
      } finally {
        setSessionsReady(true);
      }
    })();
  }, [catalogReady, loadWorkspace]);

  const reloadAllStores = useCallback((nextWorkspaceId: string) => {
    const defaultChatId = switchWorkspace(nextWorkspaceId);
    useNavigationIntentStore.getState().clearAll();
    setWorkspaceHydrating(true);
    setSessionsReady(false);
    void (async () => {
      try {
        await useMarketplaceStore.getState().bootstrap(nextWorkspaceId);
        await usePortalContentStore.getState().bootstrap(nextWorkspaceId);
        usePlazaToolGuideStore.getState().bootstrap(nextWorkspaceId);
        useInboxStore.getState().bootstrap(nextWorkspaceId);
        try {
          const { hydrateAllPlatformDocs } = await import('@/domain/hydratePlatformDocs');
          await hydrateAllPlatformDocs(nextWorkspaceId);
        } catch {
          /* docs optional until API ready */
        }
        const persisted = await loadSessions(nextWorkspaceId);
        const catalog = useWorkspaceStore.getState().getCatalog(nextWorkspaceId);
        const mergedSessions = persisted
          ? { ...structuredClone(catalog.chats), ...persisted }
          : undefined;

        loadWorkspace(nextWorkspaceId, defaultChatId, mergedSessions);
      } finally {
        setWorkspaceHydrating(false);
        setSessionsReady(true);
      }
    })();
  }, [switchWorkspace, loadWorkspace]);

  const handleApiRetry = useCallback(() => {
    hydratedRef.current = false;
    useWorkspaceStore.setState({
      catalogReady: false,
      catalogLoading: false,
      apiConnected: false,
      apiStatus: 'unknown',
    });
    void bootstrap();
  }, [bootstrap]);

  const handleNewTask = useCallback(() => {
    openAiAssistantForNewTask();
  }, []);

  const handleSubmitTask = useCallback((text: string, agent?: PrototypeAgentSeed | null) => {
    if (!canExecuteChat()) {
      useConversationStore.setState({ pushToast: READONLY_EXECUTE_HINT });
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      useConversationStore.setState({ pushToast: '请输入任务描述' });
      return;
    }
    if (!sessionsReady) {
      useConversationStore.setState({ pushToast: '工作区加载中，请稍候再试' });
      return;
    }

    const chatId = createAgentTaskSession({
      title: trimmed,
      agentName: agent?.name,
      agentIcon: agent?.icon,
      agentId: agent?.id,
      initialMessage: trimmed,
      autoSend: true,
      switchTo: true,
    });
    useHomeStore.getState().setDraftText('');
    goToTaskWithTransit(trimmed, chatId);
  }, [createAgentTaskSession, goToTaskWithTransit, sessionsReady]);

  const handleInvokeAgent = useCallback((agent: PrototypeAgentSeed, prompt?: string) => {
    if (!canExecuteChat()) {
      useConversationStore.setState({ pushToast: READONLY_EXECUTE_HINT });
      return;
    }
    if (!sessionsReady) {
      useConversationStore.setState({ pushToast: '工作区加载中，请稍候再试' });
      return;
    }
    const chatId = findOrCreateAgentSession(agent.id, agent.name, agent.icon);
    switchChat(chatId);
    // 无外部 prompt 时使用专家演示任务并自动发送（挂载主 Skill）
    const message = (prompt?.trim() || buildAgentDemoPrompt(agent)).trim();
    useConversationStore.setState({
      pendingTaskSubmit: { chatId, message, autoSend: true },
    });
    goToTaskWithTransit(message, chatId);
  }, [findOrCreateAgentSession, switchChat, goToTaskWithTransit, sessionsReady]);

  const handleInvokeSkill = useCallback((skill: PrototypeSkillSeed) => {
    if (!canExecuteChat()) {
      useConversationStore.setState({ pushToast: READONLY_EXECUTE_HINT });
      return;
    }
    if (!sessionsReady) {
      useConversationStore.setState({ pushToast: '工作区加载中，请稍候再试' });
      return;
    }
    const currentSkill = useMarketplaceStore.getState().skills.find((item) => item.id === skill.id);
    if (!currentSkill || !isSkillRunnable(currentSkill)) {
      const reason = !currentSkill
        ? '该 Skill 已不在当前工作区'
        : !isSkillCallable(currentSkill)
          ? '该 Skill 尚未启用在线调用'
          : !hasSkillExecutionBody(currentSkill)
            ? '该 Skill 缺少执行正文，暂不可调用'
            : '该 Skill 暂不可调用';
      useConversationStore.setState({ pushToast: reason });
      return;
    }
    const reviewAgent = getAgentById('agent-review');
    const marketAgents = useMarketplaceStore.getState().agents;
    const boundAgent =
      reviewAgent?.skillIds?.includes(currentSkill.id)
        ? reviewAgent
        : marketAgents.find((a) => a.skillIds?.includes(currentSkill.id) && a.published) ??
          PROTOTYPE_AGENTS.find((a) => a.skillIds?.includes(currentSkill.id) && a.published) ??
          reviewAgent;
    const initialMessage = buildSkillDemoPrompt(currentSkill);
    // 进入任务对话并自动发送，使 AI任务链路挂载 Skill 正文后执行
    const chatId = createAgentTaskSession({
      title: currentSkill.name,
      agentId: boundAgent?.id,
      agentName: boundAgent?.name,
      agentIcon: boundAgent?.icon ?? currentSkill.icon,
      skillId: currentSkill.id,
      taskSource: 'skill',
      initialMessage,
      autoSend: Boolean(initialMessage.trim()),
      switchTo: true,
    });
    goToTaskWithTransit(currentSkill.name, chatId);
  }, [createAgentTaskSession, goToTaskWithTransit, sessionsReady]);

  const handleAskKbDocument = useCallback((doc: PrototypeKbDocument) => {
    const agent = getAgentById('agent-knowledge');
    if (!agent) return;
    handleInvokeAgent(
      agent,
      `@知识 Agent 基于知识库文档「${doc.title}」/检索 ：${doc.desc.slice(0, 40)}…`,
    );
  }, [handleInvokeAgent]);

  const handleRunAutomation = useCallback((_automationId: string, agentId: string, name: string) => {
    const agent = getAgentById(agentId);
    if (agent) {
      handleInvokeAgent(agent, `@${agent.name} 执行自动化：${name}`);
    }
  }, [handleInvokeAgent]);

  const handleStartExpertTeam = useCallback(
    (plan: ScenarioDemoPlan, fromIndex = 0) => {
      if (!canExecuteChat()) {
        useConversationStore.setState({ pushToast: READONLY_EXECUTE_HINT });
        return;
      }
      if (!sessionsReady) {
        useConversationStore.setState({ pushToast: '工作区加载中，请稍候再试' });
        return;
      }
      if (plan.mode !== 'team' || !plan.steps.length) {
        useConversationStore.setState({ pushToast: '该场景不是专家团模式' });
        return;
      }
      const chatId = startExpertTeamRelay({
        scenarioId: plan.scenarioId,
        scenarioLabel: plan.scenarioLabel,
        steps: plan.steps,
        fromIndex,
        autoApprove: true,
      });
      if (!chatId) return;
      goToTaskWithTransit(`专家团 · ${plan.scenarioLabel}`, chatId);
    },
    [sessionsReady, startExpertTeamRelay, goToTaskWithTransit],
  );

  const viewHandlers = useMemo(
    () => ({
      onSubmitTask: handleSubmitTask,
      onInvokeAgent: handleInvokeAgent,
      onInvokeSkill: handleInvokeSkill,
      onAskKbDocument: handleAskKbDocument,
      onRunAutomation: handleRunAutomation,
      onStartExpertTeam: handleStartExpertTeam,
      onOpenTaskChat: navigateToTaskChat,
      onWorkspaceSwitch: reloadAllStores,
    }),
    [
      handleSubmitTask,
      handleInvokeAgent,
      handleInvokeSkill,
      handleAskKbDocument,
      handleRunAutomation,
      handleStartExpertTeam,
      reloadAllStores,
    ],
  );

  const commandHandlers = useMemo<AppCommandHandlers>(
    () => ({
      goto: (view) => setAppView(view),
      invokeAgentById: (agentId) => {
        const agent = getAgentById(agentId);
        if (agent) handleInvokeAgent(agent);
      },
      invokeSkillById: (skillId) => {
        const skill = useMarketplaceStore.getState().skills.find((s) => s.id === skillId);
        if (skill) handleInvokeSkill(skill);
      },
      openWarRoom: () => {
        useTaskStore.getState().setTaskLanding('collab');
        setAppView('task');
        const rooms = Object.values(useConversationStore.getState().chats)
          .filter((c) => c.sessionGroup === 'pinned' || c.type === 'group')
          .sort((a, b) => (b.pinnedAt ?? b.createdAt ?? 0) - (a.pinnedAt ?? a.createdAt ?? 0));
        if (rooms[0]) switchChat(rooms[0].id);
        else useConversationStore.setState({ currentChatId: '' });
      },
      newTask: handleNewTask,
      exportArtifact: () => {
        setAppView('task');
        openExport();
      },
      pushToGroup: () => {
        setAppView('task');
        void pushToGroup();
      },
      openSettings: () => openSettings(),
    }),
    [setAppView, handleInvokeAgent, handleInvokeSkill, handleNewTask, switchChat, openExport, pushToGroup, openSettings],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        useCommandPaletteStore.getState().togglePalette();
        return;
      }
      if (e.key === 'Escape') {
        const { open, closePalette } = useCommandPaletteStore.getState();
        if (open) {
          closePalette();
          return;
        }
        if (useAppViewStore.getState().settingsOpen) {
          closeSettings();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeSettings]);

  // 窄视口 / 高 DPI 缩放：首次进入时收起侧栏，给主内容更多横向空间
  useEffect(() => {
    if (window.innerWidth <= 1280) {
      useAppViewStore.setState({ sidebarCollapsed: true });
    }
  }, []);

  if (!sessionBootstrapped) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#fbfbfd]">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-zinc-200 border-t-claw-600" />
        <p className="text-[13px] text-[#86868b]">正在校验登录会话…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (!catalogReady) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#fbfbfd]">
        <div className="home-hero-mark mb-1">
          <MssZhishuMark size={48} />
        </div>
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-zinc-200 border-t-claw-600" />
        <p className="text-[13px] text-[#86868b]">
          {catalogLoading ? '正在从 API 加载 Workspace 目录…' : '正在初始化平台…'}
        </p>
      </div>
    );
  }

  return (
    <AppErrorBoundary>
    <div className="flex h-screen flex-col">
      <AppHeader apiConnected={apiConnected} onWorkspaceSwitch={reloadAllStores} />
      <OfflineBanner onRetry={handleApiRetry} />

      <div
        className={cn(
          'flex flex-1 overflow-hidden bg-[#fbfbfd]',
          shellPerspective === 'ops' ? 'shell-ops-stage' : 'shell-business-stage',
        )}
      >
        <AppShellSidebar />

        <main className="main-stage relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {workspaceHydrating && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#f5f5f7]/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-claw-600" />
                <p className="text-[12px] text-[#86868b]">正在切换工作区…</p>
              </div>
            </div>
          )}
          {blockedOpsView ? (
            <AccessDeniedPanel targetView={blockedOpsView} onBack={clearBlockedOpsView} />
          ) : (
            <AppViewRouter appView={appView} handlers={viewHandlers} />
          )}
        </main>
      </div>

      {settingsOpen && (
        <Suspense fallback={null}>
          <LazySettingsDrawer />
        </Suspense>
      )}

      {paletteOpen && (
        <Suspense fallback={null}>
          <LazyCommandPalette handlers={commandHandlers} />
        </Suspense>
      )}

      {exportOpen && (
        <Suspense fallback={null}>
          <LazyExportModal
            open={exportOpen}
            payload={exportResult(workspace.name)}
            onClose={closeExport}
          />
        </Suspense>
      )}

      <TaskGlobalModals onWorkspaceSwitch={reloadAllStores} />
      <HomeToTaskTransit open={transit.open} summary={transit.summary} />
      <GlobalToastHost />
      <AssetApprovalModal />
    </div>
    </AppErrorBoundary>
  );
}
