import { create } from 'zustand';
import { exportExecutionSnapshot, pushArtifactToGroup, streamExecution } from '@/api/agentRuntime';
import { resolveKbContextForTask } from '@/api/kbClient';
import { scheduleSaveSessions } from '@/domain/persistence/storage';
import { downloadBlob } from '@/lib/download';
import { loadWarroomWebhookUrl } from '@/domain/webhookConfig';
import type { KbArtifact } from '@/domain/kbSearch';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import type { StreamEvent } from '@/domain/stream';
import { isLlmConfigured } from '@/api/llmClient';
import {
  getAgentById,
  getSkillLabels,
  inferActionType,
  resolveActionTypeFromText,
  resolveAgentFromText,
  resolvePlanSteps,
} from '@/domain/plan';
import {
  type ChatConfig,
  type ChatMessage,
  type ExecutionStep,
  type ModuleId,
  type WarRoomMember,
  canUseWarRoomAi,
  isUserCreatedTask,
  isWarRoom,
  isWarRoomAdmin,
} from '@/domain/chat';
import { getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';
import { useSessionStore } from '@/stores/sessionStore';

interface PendingTaskSubmit {
  chatId: string;
  message: string;
  autoSend?: boolean;
}

interface PendingPipeline {
  text: string;
  actionType: 'marketing' | 'knowledge';
  targetAgent: string;
  steps: string[];
  planId: string;
  agentId?: string;
}

interface ConversationState {
  activeModule: ModuleId;
  currentChatId: string;
  chats: Record<string, ChatConfig>;
  isAgentTyping: boolean;
  streamStatus: string | null;
  abortController: AbortController | null;
  sandboxReady: boolean;
  sandboxType: 'marketing' | 'knowledge' | null;
  sandboxQuery: string;
  sandboxAgentName: string;
  sandboxSkills: string[];
  sandboxAgentReply: string;
  executionSteps: ExecutionStep[];
  totalLatency: string;
  exportOpen: boolean;
  pushToast: string | null;
  selectedResourceName: string | null;
  pendingTaskSubmit: PendingTaskSubmit | null;
  pendingPipeline: PendingPipeline | null;
  activeAgentId: string | null;
  persistWorkspaceId: string | null;
  kbArtifact: KbArtifact | null;
  kbPreviewDocId: string | null;

  setActiveModule: (module: ModuleId, resourceName?: string | null) => void;
  loadWorkspace: (workspaceId: string, defaultChatId: string, persistedChats?: Record<string, ChatConfig>) => void;
  switchChat: (chatId: string) => void;
  sendMessage: (text: string, workspaceId?: string) => Promise<void>;
  approvePlan: (planId: string, steps: string[]) => Promise<void>;
  savePlanSteps: (planId: string, steps: string[]) => void;
  cancelStream: () => void;
  openExport: () => void;
  closeExport: () => void;
  exportResult: (workspaceName: string) => object;
  exportChatJson: () => void;
  pinCurrentChat: () => void;
  clearSandbox: () => void;
  openKbPreview: (docId: string) => void;
  closeKbPreview: () => void;
  pushToGroup: () => Promise<void>;
  dismissToast: () => void;
  createAgentTaskSession: (opts: {
    title: string;
    agentName?: string;
    agentIcon?: string;
    agentId?: string;
    initialMessage?: string;
    autoSend?: boolean;
    switchTo?: boolean;
  }) => string;
  createWarRoomSession: (title: string) => string;
  addWarRoomMember: (chatId: string, member: WarRoomMember) => boolean;
  removeWarRoomMember: (chatId: string, memberId: string) => boolean;
  setWarRoomMemberAi: (chatId: string, memberId: string, canUseAi: boolean) => boolean;
  consumePendingTaskSubmit: () => PendingTaskSubmit | null;
  findOrCreateAgentSession: (agentId: string, agentName: string, agentIcon: string) => string;
  deleteTaskSession: (chatId: string) => boolean;
  renameTaskSession: (chatId: string, title: string) => boolean;
  runTaskExample: (type: 'marketing' | 'knowledge' | 'warroom') => void;
  dismissChatPrompt: (prompt: string) => void;
  dismissAllChatPrompts: () => void;
}

function resetSandboxState() {
  return {
    sandboxReady: false,
    sandboxType: null as 'marketing' | 'knowledge' | null,
    sandboxQuery: '',
    sandboxAgentName: '',
    sandboxSkills: [] as string[],
    sandboxAgentReply: '',
    executionSteps: [] as ExecutionStep[],
    totalLatency: '0.00s',
    kbArtifact: null as KbArtifact | null,
    kbPreviewDocId: null as string | null,
  };
}

function appendAgentToken(history: ChatMessage[], token: string): ChatMessage[] {
  const next = [...history];
  const last = next[next.length - 1];
  if (!last || last.role !== 'agent') return next;
  next[next.length - 1] = { ...last, text: (last.text ?? '') + token };
  return next;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function schedulePersistFromState(get: () => ConversationState) {
  const { chats, persistWorkspaceId } = get();
  if (!persistWorkspaceId) return;
  scheduleSaveSessions(persistWorkspaceId, chats);
}

async function runApprovedPipeline(get: () => ConversationState, set: (partial: Partial<ConversationState> | ((s: ConversationState) => Partial<ConversationState>)) => void) {
  const pipeline = get().pendingPipeline;
  if (!pipeline) return;

  const { currentChatId, chats } = get();
  const chat = chats[currentChatId];
  if (!chat) return;

  const agent = getAgentById(pipeline.agentId);
  const useLlm = isLlmConfigured();
  let kbContext: string | undefined;

  if (pipeline.actionType === 'knowledge') {
    set({ isAgentTyping: true, streamStatus: '正在检索知识库…' });
    const workspaceId = useWorkspaceStore.getState().workspaceId;
    const kbDocs = useMarketplaceStore.getState().kbDocs;
    const artifact = await resolveKbContextForTask(workspaceId, pipeline.text, kbDocs);
    kbContext = artifact.contextText;
    set({ kbArtifact: artifact });
  }

  set({
    pendingPipeline: null,
    isAgentTyping: true,
    streamStatus: useLlm ? `LLM 执行中 · ${pipeline.targetAgent}` : '连接 API Runtime…',
  });
  get().abortController?.abort();
  const controller = new AbortController();
  set({ abortController: controller });

  let stepCounter = 0;
  let agentTypeResult: 'marketing' | 'knowledge' = pipeline.actionType;
  let streamingStarted = false;

  const applyEvent = (event: StreamEvent) => {
    const current = get().chats[currentChatId];
    if (!current) return;

    if (event.type === 'skill_start') {
      stepCounter += 1;
      set({ streamStatus: `执行 Skill: ${event.label}` });
      set((state) => ({
        chats: {
          ...state.chats,
          [currentChatId]: {
            ...current,
            history: [
              ...current.history,
              {
                role: 'step' as const,
                stepId: `step-${stepCounter}`,
                index: stepCounter,
                total: pipeline.steps.length,
                label: event.label,
                stepStatus: 'running' as const,
              },
            ],
          },
        },
      }));
      return;
    }

    if (event.type === 'token') {
      set((state) => {
        const c = state.chats[currentChatId];
        let history = c.history;
        if (!streamingStarted) {
          history = [
            ...history,
            { role: 'agent' as const, name: pipeline.targetAgent, text: '', streaming: true },
          ];
          streamingStarted = true;
        }
        return {
          chats: {
            ...state.chats,
            [currentChatId]: { ...c, history: appendAgentToken(history, event.content) },
          },
        };
      });
      return;
    }

    if (event.type === 'artifact') {
      agentTypeResult = event.agentType;
      set({ streamStatus: '生成交付物…' });
      return;
    }

    if (event.type === 'done') {
      set((state) => {
        const c = state.chats[currentChatId];
        let history = c.history.map((m) =>
          m.role === 'step' && m.stepStatus === 'running' ? { ...m, stepStatus: 'done' as const } : m,
        );
        history = history.map((m, i) =>
          i === history.length - 1 && m.role === 'agent' ? { ...m, name: event.agentName, streaming: false } : m,
        );
        if (event.followUp) history = [...history, event.followUp];

        const lastAgent = [...history].reverse().find((m) => m.role === 'agent' && m.text?.trim());
        const planMsg = [...history].reverse().find((m) => m.role === 'plan');
        const skills =
          planMsg?.mountedSkills?.length
            ? planMsg.mountedSkills
            : getSkillLabels(pipeline.agentId ?? c.agentId);

        return {
          isAgentTyping: false,
          streamStatus: null,
          abortController: null,
          sandboxReady: true,
          sandboxType: agentTypeResult,
          sandboxQuery: pipeline.text,
          sandboxAgentName: event.agentName || pipeline.targetAgent,
          sandboxSkills: skills,
          sandboxAgentReply: lastAgent?.text ?? '',
          executionSteps: event.steps,
          totalLatency: event.totalTime,
          kbArtifact: agentTypeResult === 'knowledge' ? state.kbArtifact : null,
          chats: { ...state.chats, [currentChatId]: { ...c, history } },
        };
      });
      return;
    }

    if (event.type === 'error') {
      set((state) => ({
        isAgentTyping: false,
        streamStatus: null,
        abortController: null,
        pushToast: event.message,
        chats: {
          ...state.chats,
          [currentChatId]: {
            ...current,
            history: [
              ...current.history.filter((m) => m.role !== 'typing'),
              {
                role: 'agent',
                name: 'System',
                text: `⚠️ 流式请求失败：${event.message}`,
                streaming: false,
              },
            ],
          },
        },
      }));
    }
  };

  try {
    for await (const event of streamExecution({
      chatId: currentChatId,
      message: pipeline.text,
      workspaceId: useWorkspaceStore.getState().workspaceId,
      signal: controller.signal,
      planSteps: pipeline.steps,
      agentId: pipeline.agentId,
      agentName: pipeline.targetAgent,
      systemPrompt: agent?.systemPrompt,
      actionType: pipeline.actionType,
      kbContext,
    })) {
      if (controller.signal.aborted) break;
      applyEvent(event);
    }
  } catch {
    if (!controller.signal.aborted) {
      set({ isAgentTyping: false, streamStatus: null, abortController: null });
    }
  } finally {
    schedulePersistFromState(get);
  }
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  activeModule: 'chat',
  currentChatId: 'marketing',
  chats: structuredClone(useWorkspaceStore.getState().getCatalog('ws-3c-latam').chats),
  isAgentTyping: false,
  streamStatus: null,
  abortController: null,
  ...resetSandboxState(),
  exportOpen: false,
  pushToast: null,
  selectedResourceName: null,
  pendingTaskSubmit: null,
  pendingPipeline: null,
  activeAgentId: 'agent-data-analysis',
  persistWorkspaceId: null,
  kbArtifact: null,
  kbPreviewDocId: null,

  setActiveModule: (module, resourceName = null) =>
    set({ activeModule: module, selectedResourceName: resourceName }),

  loadWorkspace: (workspaceId, defaultChatId, persistedChats) => {
    get().abortController?.abort();
    const catalog = useWorkspaceStore.getState().getCatalog(workspaceId);
    const baseChats = structuredClone(catalog.chats);
    const merged = persistedChats ? { ...baseChats, ...persistedChats } : baseChats;
    // 移除已下线的默认拉美 WarRoom；同步知识 Agent 展示名
    const { group_q3: _removedDefaultWarroom, ...withoutLegacy } = merged;
    const chats = Object.fromEntries(
      Object.entries(withoutLegacy).map(([id, chat]) => {
        if (id === 'knowledge' || chat.agentId === 'agent-knowledge') {
          return [
            id,
            {
              ...chat,
              title: chat.title === '知识检索 Agent' ? '知识 Agent' : chat.title,
              history: chat.history.map((m) =>
                m.name === '知识检索 Agent' ? { ...m, name: '知识 Agent' } : m,
              ),
            },
          ];
        }
        return [id, chat];
      }),
    ) as Record<string, ChatConfig>;
    const chatId = chats[defaultChatId] ? defaultChatId : Object.keys(chats)[0] ?? defaultChatId;
    set({
      chats,
      currentChatId: chatId,
      persistWorkspaceId: workspaceId,
      activeModule: 'chat',
      selectedResourceName: null,
      isAgentTyping: false,
      streamStatus: null,
      abortController: null,
      pendingPipeline: null,
      ...resetSandboxState(),
    });
  },

  switchChat: (chatId) => {
    get().abortController?.abort();
    set({
      currentChatId: chatId,
      activeModule: 'chat',
      selectedResourceName: null,
      isAgentTyping: false,
      streamStatus: null,
      abortController: null,
      pendingPipeline: null,
      ...resetSandboxState(),
    });
  },

  cancelStream: () => {
    get().abortController?.abort();
    set({ isAgentTyping: false, streamStatus: null, abortController: null });
  },

  sendMessage: async (text, _workspaceId) => {
    const trimmed = text.trim();
    const { currentChatId, chats, isAgentTyping, pendingPipeline } = get();
    if (!trimmed || isAgentTyping) return;

    if (pendingPipeline) {
      set({ pushToast: '请先「确认执行」或「调整计划」' });
      return;
    }

    const chat = chats[currentChatId];
    if (!chat) return;

    if (isWarRoom(chat) && !canUseWarRoomAi(chat)) {
      set({
        pushToast: isWarRoom(chat) && !chat.members?.some((m) => m.id === getCurrentUserId())
          ? '你不是本 WarRoom 成员，无法使用 AI。请联系管理员邀请。'
          : '管理员已关闭你在本 WarRoom 的 AI 权限',
      });
      return;
    }

    const bound = resolveAgentFromText(trimmed) ?? getAgentById(chat.agentId ?? get().activeAgentId ?? undefined);
    if (bound) set({ activeAgentId: bound.id });

    const userMessage: ChatMessage = { role: 'user', text: trimmed };
    const llmReady = isLlmConfigured();
    set({
      isAgentTyping: true,
      streamStatus: llmReady ? 'LLM 正在生成执行计划…' : 'Agent 正在理解任务…',
      chats: {
        ...chats,
        [currentChatId]: { ...chat, history: [...chat.history, userMessage, { role: 'typing' }] },
      },
    });

    await sleep(llmReady ? 200 : 600);

    const actionType = resolveActionTypeFromText(trimmed, bound?.id ?? chat.agentId);
    let targetAgent = bound?.name ?? (chat.type === 'bot' ? chat.title : '营销 Agent');
    if (!bound && chat.type === 'group') {
      targetAgent = actionType === 'knowledge' ? '知识 Agent' : '数据分析 Agent';
    }

    const { steps, fromLlm } = await resolvePlanSteps({
      userTask: trimmed,
      actionType,
      agentId: bound?.id ?? chat.agentId,
      agentName: targetAgent,
    });
    const planId = `plan-${Date.now()}`;
    const mountedSkills = getSkillLabels(bound?.id ?? chat.agentId);
    const planMsg: ChatMessage = {
      role: 'plan',
      name: targetAgent,
      planId,
      steps,
      mountedSkills,
      awaitingApproval: true,
    };

    set((state) => {
      const current = state.chats[currentChatId];
      const history = current.history.filter((m) => m.role !== 'typing');
      return {
        isAgentTyping: false,
        streamStatus: fromLlm ? 'LLM 计划已生成 · 等待确认' : '等待确认执行计划',
        pendingPipeline: {
          text: trimmed,
          actionType,
          targetAgent,
          steps,
          planId,
          agentId: bound?.id ?? chat.agentId,
        },
        chats: {
          ...state.chats,
          [currentChatId]: { ...current, history: [...history, planMsg] },
        },
      };
    });
    schedulePersistFromState(get);
  },

  approvePlan: async (planId, steps) => {
    const { pendingPipeline, currentChatId, chats } = get();
    if (!pendingPipeline || pendingPipeline.planId !== planId) {
      set({ pushToast: '该计划已过期，请重新发送任务' });
      return;
    }
    if (!steps.length) {
      set({ pushToast: '请至少保留一个执行步骤' });
      return;
    }

    const chat = chats[currentChatId];
    const updatedHistory = chat.history.map((m) =>
      m.role === 'plan' && m.planId === planId ? { ...m, steps, awaitingApproval: false } : m,
    );

    set({
      pendingPipeline: { ...pendingPipeline, steps },
      chats: { ...chats, [currentChatId]: { ...chat, history: updatedHistory } },
    });

    await runApprovedPipeline(get, set);
  },

  savePlanSteps: (planId, steps) => {
    const { pendingPipeline, currentChatId, chats } = get();
    if (!pendingPipeline || pendingPipeline.planId !== planId) {
      set({ pushToast: '该计划已过期，请重新发送任务' });
      return;
    }

    const filtered = steps.map((s) => s.trim()).filter(Boolean);
    if (!filtered.length) {
      set({ pushToast: '请至少保留一个执行步骤' });
      return;
    }

    const chat = chats[currentChatId];
    set({
      pendingPipeline: { ...pendingPipeline, steps: filtered },
      pushToast: '执行计划已保存，可点击「确认执行」',
      chats: {
        ...chats,
        [currentChatId]: {
          ...chat,
          history: chat.history.map((m) =>
            m.role === 'plan' && m.planId === planId ? { ...m, steps: filtered } : m,
          ),
        },
      },
    });
    schedulePersistFromState(get);
  },

  openExport: () => set({ exportOpen: true }),
  closeExport: () => set({ exportOpen: false }),

  exportResult: (workspaceName) => {
    const { chats, currentChatId, sandboxQuery, sandboxType } = get();
    return exportExecutionSnapshot({
      workspace: workspaceName,
      chatTitle: chats[currentChatId].title,
      query: sandboxQuery || 'N/A',
      agentType: sandboxType ?? 'marketing',
    });
  },

  exportChatJson: () => {
    const { chats, currentChatId } = get();
    const chat = chats[currentChatId];
    if (!chat) return;
    const safeName = chat.title.replace(/[^\w\u4e00-\u9fff-]+/g, '_') || 'chat';
    downloadBlob(`${safeName}-对话.json`, JSON.stringify(chat, null, 2));
    set({ pushToast: '对话已导出为 JSON' });
  },

  pinCurrentChat: () => {
    const { currentChatId, chats } = get();
    const chat = chats[currentChatId];
    if (!chat) return;
    set({
      chats: { ...chats, [currentChatId]: { ...chat, pinnedAt: Date.now() } },
      pushToast: '任务已置顶',
    });
    schedulePersistFromState(get);
  },

  clearSandbox: () => {
    set({ ...resetSandboxState(), pushToast: '交付物已清空' });
  },

  openKbPreview: (docId) => set({ kbPreviewDocId: docId }),
  closeKbPreview: () => set({ kbPreviewDocId: null }),

  pushToGroup: async () => {
    const { chats, currentChatId, sandboxReady, sandboxType, sandboxQuery } = get();
    if (!sandboxReady) {
      set({ pushToast: '请先生成交付物后再推送' });
      return;
    }

    const warroom = Object.values(chats).find((c) => c.sessionGroup === 'pinned');
    const targetGroup = warroom?.title ?? '作战 WarRoom';
    const chatTitle = chats[currentChatId].title;

    const result = await pushArtifactToGroup({
      chatTitle,
      targetGroup,
      artifactType: sandboxType ?? 'marketing',
      query: sandboxQuery,
      webhookUrl: loadWarroomWebhookUrl(),
    });

    if (result.ok && warroom) {
      const pushMsg: ChatMessage = {
        role: 'system',
        text: `📦 ${chatTitle} 推送了一份 Agent 分析 Artifact 到群组`,
      };
      set((state) => ({
        pushToast: result.message,
        chats: {
          ...state.chats,
          [warroom.id]: {
            ...state.chats[warroom.id],
            history: [...state.chats[warroom.id].history, pushMsg],
          },
        },
      }));
      schedulePersistFromState(get);
      return;
    }

    set({ pushToast: result.message });
  },

  dismissToast: () => set({ pushToast: null }),

  dismissChatPrompt: (prompt) => {
    const { chats, currentChatId } = get();
    const chat = chats[currentChatId];
    if (!chat) return;
    set({
      chats: {
        ...chats,
        [currentChatId]: {
          ...chat,
          prompts: chat.prompts.filter((p) => p !== prompt),
        },
      },
    });
    schedulePersistFromState(get);
  },

  dismissAllChatPrompts: () => {
    const { chats, currentChatId } = get();
    const chat = chats[currentChatId];
    if (!chat || !chat.prompts.length) return;
    set({
      chats: {
        ...chats,
        [currentChatId]: { ...chat, prompts: [] },
      },
    });
    schedulePersistFromState(get);
  },

  createAgentTaskSession: ({
    title,
    agentName,
    agentIcon = 'fa-robot',
    agentId,
    initialMessage,
    autoSend = true,
    switchTo = true,
  }) => {
    const id = `task_${Date.now()}`;
    const agent = agentId ? getAgentById(agentId) : null;
    const newChat: ChatConfig = {
      id,
      title,
      type: 'bot',
      icon: agentIcon,
      color: 'claw',
      iconBg: agent?.color ? `bg-gradient-to-br ${agent.color}` : 'bg-zinc-700',
      badge: agentName?.replace(/\s*Agent\s*/i, '') ?? '新任务',
      sessionGroup: 'agents',
      agentId: agentId ?? agent?.id,
      actionType: inferActionType(agentId ?? agent?.id),
      status: agentName ? `已绑定 ${agentName}` : '待分配 Agent · 输入 @ 或 / 调用',
      createdAt: Date.now(),
      history: [
        {
          role: 'agent',
          name: agentName || '任务助理',
          text: agentName
            ? `任务「${title}」已创建，已绑定 ${agentName}。请描述目标或使用 Skill 指令。`
            : `任务「${title}」已创建。请 @ Agent 或 / 调用 Skill，确认计划后执行。`,
        },
      ],
      prompts: [],
    };

    if (agentId) set({ activeAgentId: agentId });

    set((state) => ({
      chats: { ...state.chats, [id]: newChat },
      ...(switchTo
        ? {
            currentChatId: id,
            activeModule: 'chat' as ModuleId,
            pendingPipeline: null,
            pendingTaskSubmit: initialMessage ? { chatId: id, message: initialMessage, autoSend } : null,
            ...resetSandboxState(),
          }
        : {}),
      pushToast: switchTo ? '已创建 Agent 任务' : state.pushToast,
    }));

    schedulePersistFromState(get);
    return id;
  },

  createWarRoomSession: (title) => {
    const id = `warroom_${Date.now()}`;
    const userId = getCurrentUserId();
    const userName = getCurrentUserName();
    const sessionUser = useSessionStore.getState().user;
    const admin: WarRoomMember = {
      id: userId,
      name: userName,
      email: sessionUser?.email,
      avatar: sessionUser?.avatar ?? 'bg-zinc-900',
      role: 'admin',
      canUseAi: true,
    };
    const newChat: ChatConfig = {
      id,
      title,
      type: 'group',
      icon: 'fa-users',
      color: 'orange',
      iconBg: 'bg-gradient-to-br from-amber-400 to-orange-600',
      badge: 'WarRoom',
      sessionGroup: 'pinned',
      actionType: 'marketing',
      status: `管理员 ${userName} · 1 位成员 · AI 仅成员可用`,
      createdAt: Date.now(),
      adminId: userId,
      members: [admin],
      history: [
        {
          role: 'system',
          text: `WarRoom「${title}」已创建。你是管理员，可邀请成员；成员均可在本室对话框中 @ Agent、/ Skill 调用 AI。`,
        },
      ],
      prompts: [],
    };

    set((state) => ({
      chats: { ...state.chats, [id]: newChat },
      currentChatId: id,
      pendingPipeline: null,
      ...resetSandboxState(),
      pushToast: '已创建 WarRoom',
    }));

    schedulePersistFromState(get);
    return id;
  },

  addWarRoomMember: (chatId, member) => {
    const chat = get().chats[chatId];
    if (!chat || !isWarRoom(chat)) {
      set({ pushToast: '仅 WarRoom 可添加成员' });
      return false;
    }
    if (!isWarRoomAdmin(chat)) {
      set({ pushToast: '仅管理员可添加成员' });
      return false;
    }
    if (chat.members?.some((m) => m.id === member.id)) {
      set({ pushToast: '该成员已在 WarRoom 中' });
      return false;
    }

    const members = [...(chat.members ?? []), { ...member, role: 'member' as const, canUseAi: member.canUseAi !== false }];
    const systemMsg: ChatMessage = {
      role: 'system',
      text: `${getCurrentUserName()} 邀请 ${member.name} 加入 WarRoom · 可在本室 @ Agent、/ Skill 调用 AI`,
    };

    set((state) => ({
      chats: {
        ...state.chats,
        [chatId]: {
          ...state.chats[chatId],
          members,
          status: `管理员 · ${members.length} 位成员 · AI 仅成员可用`,
          history: [...state.chats[chatId].history, systemMsg],
        },
      },
      pushToast: `已添加 ${member.name}`,
    }));
    schedulePersistFromState(get);
    return true;
  },

  removeWarRoomMember: (chatId, memberId) => {
    const chat = get().chats[chatId];
    if (!chat || !isWarRoom(chat) || !isWarRoomAdmin(chat)) {
      set({ pushToast: '仅管理员可移除成员' });
      return false;
    }
    if (memberId === chat.adminId || chat.members?.find((m) => m.id === memberId)?.role === 'admin') {
      set({ pushToast: '不能移除管理员' });
      return false;
    }
    const removed = chat.members?.find((m) => m.id === memberId);
    const members = (chat.members ?? []).filter((m) => m.id !== memberId);
    const systemMsg: ChatMessage = {
      role: 'system',
      text: `${removed?.name ?? memberId} 已移出 WarRoom`,
    };

    set((state) => ({
      chats: {
        ...state.chats,
        [chatId]: {
          ...state.chats[chatId],
          members,
          status: `管理员 · ${members.length} 位成员 · AI 仅成员可用`,
          history: [...state.chats[chatId].history, systemMsg],
        },
      },
      pushToast: '已移除成员',
    }));
    schedulePersistFromState(get);
    return true;
  },

  setWarRoomMemberAi: (chatId, memberId, canUseAi) => {
    const chat = get().chats[chatId];
    if (!chat || !isWarRoom(chat) || !isWarRoomAdmin(chat)) {
      set({ pushToast: '仅管理员可调整 AI 权限' });
      return false;
    }
    if (memberId === chat.adminId) {
      set({ pushToast: '管理员始终可使用 AI' });
      return false;
    }

    const members = (chat.members ?? []).map((m) => (m.id === memberId ? { ...m, canUseAi } : m));
    const target = members.find((m) => m.id === memberId);

    set((state) => ({
      chats: {
        ...state.chats,
        [chatId]: { ...state.chats[chatId], members },
      },
      pushToast: canUseAi ? `已开启 ${target?.name ?? ''} 的 AI 权限` : `已关闭 ${target?.name ?? ''} 的 AI 权限`,
    }));
    schedulePersistFromState(get);
    return true;
  },

  consumePendingTaskSubmit: () => {
    const pending = get().pendingTaskSubmit;
    if (pending) set({ pendingTaskSubmit: null });
    return pending;
  },

  findOrCreateAgentSession: (agentId, agentName, agentIcon) => {
    const existing = Object.values(get().chats).find((c) => c.agentId === agentId);
    if (existing) return existing.id;
    return get().createAgentTaskSession({
      title: agentName,
      agentName,
      agentIcon,
      agentId,
      switchTo: false,
    });
  },

  deleteTaskSession: (chatId) => {
    const chat = get().chats[chatId];
    if (!chat || !isUserCreatedTask(chat)) {
      set({ pushToast: '该任务不可删除' });
      return false;
    }

    const deletingCurrent = get().currentChatId === chatId;
    if (deletingCurrent) {
      get().abortController?.abort();
    }

    const remainingEntries = Object.entries(get().chats).filter(([id]) => id !== chatId);
    const remaining = Object.fromEntries(remainingEntries) as Record<string, ChatConfig>;
    const remainingList = Object.values(remaining);

    let nextChatId = get().currentChatId;
    if (deletingCurrent) {
      const sameGroup = remainingList
        .filter(
          (c) =>
            c.sessionGroup === chat.sessionGroup ||
            (!c.sessionGroup && chat.sessionGroup === 'agents' && c.type === 'bot'),
        )
        .sort((a, b) => (b.pinnedAt ?? b.createdAt ?? 0) - (a.pinnedAt ?? a.createdAt ?? 0));
      nextChatId = sameGroup[0]?.id ?? remainingList[0]?.id ?? 'marketing';
    }

    set({
      chats: remaining,
      ...(deletingCurrent
        ? {
            currentChatId: nextChatId,
            activeModule: 'chat' as ModuleId,
            isAgentTyping: false,
            streamStatus: null,
            abortController: null,
            pendingPipeline: null,
            pendingTaskSubmit: null,
            ...resetSandboxState(),
          }
        : {}),
      pushToast: `已删除任务「${chat.title}」`,
    });

    schedulePersistFromState(get);
    return true;
  },

  renameTaskSession: (chatId, title) => {
    const chat = get().chats[chatId];
    const nextTitle = title.trim();
    if (!chat || !nextTitle) {
      set({ pushToast: '任务名称不能为空' });
      return false;
    }
    // 仅允许重命名用户创建的 Agent 任务
    if (!chat.id.startsWith('task_')) {
      set({ pushToast: '仅支持重命名创建的 Agent 任务' });
      return false;
    }
    if (chat.title === nextTitle) return true;

    set({
      chats: {
        ...get().chats,
        [chatId]: { ...chat, title: nextTitle },
      },
      pushToast: `已重命名为「${nextTitle}」`,
    });
    schedulePersistFromState(get);
    return true;
  },

  runTaskExample: (type) => {
    const examples = {
      marketing: {
        agentId: 'agent-data-analysis',
        prompt: '分析各代表处 SO 排名与环比异动，剔除 IoT，/数据分析 /so报表',
      },
      knowledge: {
        agentId: 'agent-doc-review',
        prompt: '筛查可穿戴营销物料中的医疗用语合规风险，/合规筛查',
      },
      warroom: {
        agentId: 'agent-price-monitor',
        prompt: '汇总本周 18 国渠道 offer 变化，生成调价建议周报，/价格监测',
      },
    };
    const ex = examples[type];
    const agent = getAgentById(ex.agentId);
    if (!agent) return;
    const chatId = get().findOrCreateAgentSession(agent.id, agent.name, agent.icon);
    get().switchChat(chatId);
    set({ pendingTaskSubmit: { chatId, message: ex.prompt, autoSend: true } });
  },
}));
