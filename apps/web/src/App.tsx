import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppHeader } from '@/components/shell/AppHeader';
import { AppShellSidebar } from '@/components/shell/AppShellSidebar';
import { GlobalToastHost } from '@/components/common/GlobalToastHost';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { MssZhishuMark } from '@/components/brand/MssZhishuMark';
import { useConversationStore } from '@/stores/conversationStore';
import { useHomeStore } from '@/stores/homeStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { getAgentById } from '@/domain/plan';
import type { PrototypeAgentSeed, PrototypeKbDocument, PrototypeSkillSeed } from '@/domain/prototype/types';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useTaskStore } from '@/stores/taskStore';
import type { AppCommandHandlers } from '@/domain/commands';
import { useAppRouting } from '@/hooks/useAppRouting';
import { useTaskRouteSync, navigateToTaskChat } from '@/hooks/useTaskRouteSync';
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
import { useWorkspaceConfigStore } from '@/stores/workspaceConfigStore';
import { useSessionStore } from '@/stores/sessionStore';

export function App() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const switchWorkspace = useWorkspaceStore((s) => s.switchWorkspace);
  const bootstrap = useWorkspaceStore((s) => s.bootstrap);
  const catalogReady = useWorkspaceStore((s) => s.catalogReady);
  const catalogLoading = useWorkspaceStore((s) => s.catalogLoading);
  const apiConnected = useWorkspaceStore((s) => s.apiConnected);
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const workspaceList = useWorkspaceStore((s) => s.workspaceList);

  const appView = useAppViewStore((s) => s.appView);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const closeSettings = useAppViewStore((s) => s.closeSettings);
  const settingsOpen = useAppViewStore((s) => s.settingsOpen);
  const openSettings = useAppViewStore((s) => s.openSettings);
  const paletteOpen = useCommandPaletteStore((s) => s.open);

  const loadWorkspace = useConversationStore((s) => s.loadWorkspace);
  const exportOpen = useConversationStore((s) => s.exportOpen);
  const closeExport = useConversationStore((s) => s.closeExport);
  const exportResult = useConversationStore((s) => s.exportResult);
  const createAgentTaskSession = useConversationStore((s) => s.createAgentTaskSession);
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
  const [workspaceHydrating, setWorkspaceHydrating] = useState(false);

  useAppRouting();
  useTaskRouteSync(appView);
  usePlatformStoreLoader(appView);

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

    void (async () => {
      const { workspaceId: wsId, getCatalog } = useWorkspaceStore.getState();
      const defaultChatId = getCatalog(wsId).defaultChatId;

      await useMarketplaceStore.getState().bootstrap(wsId);

      const persisted = await loadSessions(wsId);
      const catalogChats = getCatalog(wsId).chats;
      const mergedSessions = persisted
        ? { ...structuredClone(catalogChats), ...persisted }
        : undefined;

      loadWorkspace(wsId, defaultChatId, mergedSessions);
    })();
  }, [catalogReady, loadWorkspace]);

  const reloadAllStores = useCallback((nextWorkspaceId: string) => {
    const defaultChatId = switchWorkspace(nextWorkspaceId);
    setWorkspaceHydrating(true);
    void (async () => {
      try {
        await useMarketplaceStore.getState().bootstrap(nextWorkspaceId);
        const persisted = await loadSessions(nextWorkspaceId);
        const catalog = useWorkspaceStore.getState().getCatalog(nextWorkspaceId);
        const mergedSessions = persisted
          ? { ...structuredClone(catalog.chats), ...persisted }
          : undefined;

        loadWorkspace(nextWorkspaceId, defaultChatId, mergedSessions);
      } finally {
        setWorkspaceHydrating(false);
      }
    })();
  }, [switchWorkspace, loadWorkspace]);

  const handleApiRetry = useCallback(() => {
    useWorkspaceStore.setState({ catalogReady: false, catalogLoading: false });
    void bootstrap();
  }, [bootstrap]);

  const handleNewTask = useCallback(() => {
    setAppView('task');
    useTaskStore.getState().openCreateDialog();
  }, [setAppView]);

  const handleSubmitTask = useCallback((text: string, agent?: PrototypeAgentSeed | null) => {
    const trimmed = text.trim();
    if (!trimmed) {
      useConversationStore.setState({ pushToast: '请输入任务描述' });
      return;
    }
    const title = trimmed.length > 28 ? `${trimmed.slice(0, 28)}…` : trimmed;
    createAgentTaskSession({
      title,
      agentName: agent?.name,
      agentIcon: agent?.icon,
      agentId: agent?.id,
      initialMessage: trimmed,
      autoSend: true,
    });
    useHomeStore.getState().setDraftText('');
    setAppView('task');
  }, [createAgentTaskSession, setAppView]);

  const handleInvokeAgent = useCallback((agent: PrototypeAgentSeed, prompt?: string) => {
    const chatId = findOrCreateAgentSession(agent.id, agent.name, agent.icon);
    switchChat(chatId);
    const message = prompt || `@${agent.name} `;
    useConversationStore.setState({
      pendingTaskSubmit: { chatId, message, autoSend: Boolean(prompt) },
      ...(!prompt ? { pushToast: `已选择 ${agent.name}` } : {}),
    });
    setAppView('task');
  }, [findOrCreateAgentSession, switchChat, setAppView]);

  const handleInvokeSkill = useCallback((skill: PrototypeSkillSeed) => {
    createAgentTaskSession({
      title: skill.name,
      initialMessage: `${skill.command} `,
      autoSend: false,
    });
    setAppView('task');
  }, [createAgentTaskSession, setAppView]);

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

  const viewHandlers = useMemo(
    () => ({
      onSubmitTask: handleSubmitTask,
      onInvokeAgent: handleInvokeAgent,
      onInvokeSkill: handleInvokeSkill,
      onAskKbDocument: handleAskKbDocument,
      onRunAutomation: handleRunAutomation,
      onOpenTaskChat: navigateToTaskChat,
      onWorkspaceSwitch: reloadAllStores,
    }),
    [handleSubmitTask, handleInvokeAgent, handleInvokeSkill, handleAskKbDocument, handleRunAutomation, reloadAllStores],
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
        setAppView('task');
        const warroom = Object.values(useConversationStore.getState().chats).find(
          (c) => c.sessionGroup === 'pinned',
        );
        if (warroom) switchChat(warroom.id);
        else useTaskStore.getState().openCreateDialog('warroom');
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
    <div className="flex h-screen flex-col">
      <AppHeader apiConnected={apiConnected} onWorkspaceSwitch={reloadAllStores} />
      <OfflineBanner onRetry={handleApiRetry} />

      <div className="flex flex-1 overflow-hidden bg-[#fbfbfd]">
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
          <AppViewRouter appView={appView} handlers={viewHandlers} />
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

      <GlobalToastHost />
    </div>
  );
}
