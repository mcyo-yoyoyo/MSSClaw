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
  buildSystemPromptWithSkill,
  getSkillById,
  getSkillPlanSteps,
  resolveSkillFromText,
} from '@/domain/skillRuntime';
import { getSkillPack } from '@/domain/skills/catalog';
import {
  buildAgentOrchestrationSteps,
  getAgentSystemPrompt,
  getPrimarySkill,
} from '@/domain/agents/runtime';
import { getAgentPack } from '@/domain/agents/catalog';
import {
  buildExpertTeamStepPrompt,
  resolvePipelineStepTargets,
  type ScenarioPipelineStep,
} from '@/domain/scenarioPipeline';
import {
  type ChatConfig,
  type ChatMessage,
  type ExecutionStep,
  type ModuleId,
  type WarRoomMember,
  canUseWarRoomAi,
  LEGACY_DEFAULT_CHAT_IDS,
  isUserCreatedTask,
  isWarRoom,
  isWarRoomAdmin,
} from '@/domain/chat';
import { getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';
import { canExecuteChat, READONLY_EXECUTE_HINT } from '@/domain/permissions';
import {
  clampTitle,
  deriveTaskTitle,
  isUsableAiTaskTitle,
  TASK_TITLE_MAX_LEN,
} from '@/domain/taskTitle';
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
  skillId?: string;
}

/** 场景专家团：同会话顺序接力状态 */
export interface ExpertTeamRelay {
  chatId: string;
  scenarioId: string;
  scenarioLabel: string;
  steps: ScenarioPipelineStep[];
  currentIndex: number;
  /** 演示模式：计划自动确认，无需每次点「确认执行」 */
  autoApprove: boolean;
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
  expertTeamRelay: ExpertTeamRelay | null;
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
  /** 推送交付物到作战室和/或成员（成员走「我的消息」） */
  pushToGroup: (target?: {
    warroomIds?: string[];
    memberIds?: string[];
  }) => Promise<void>;
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
  /** 专家团同会话接力：建一个任务，从 fromIndex 起自动顺序跑完 */
  startExpertTeamRelay: (opts: {
    scenarioId: string;
    scenarioLabel: string;
    steps: ScenarioPipelineStep[];
    fromIndex?: number;
    autoApprove?: boolean;
  }) => string;
  clearExpertTeamRelay: (reason?: string) => void;
  createWarRoomSession: (title: string) => string;
  addWarRoomMember: (chatId: string, member: WarRoomMember) => boolean;
  removeWarRoomMember: (chatId: string, memberId: string) => boolean;
  setWarRoomMemberAi: (chatId: string, memberId: string, canUseAi: boolean) => boolean;
  consumePendingTaskSubmit: () => PendingTaskSubmit | null;
  findOrCreateAgentSession: (agentId: string, agentName: string, agentIcon: string) => string;
  deleteTaskSession: (chatId: string) => boolean;
  renameTaskSession: (chatId: string, title: string, opts?: { silent?: boolean }) => boolean;
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

type StoreSet = (
  partial: Partial<ConversationState> | ((s: ConversationState) => Partial<ConversationState>),
) => void;

async function advanceExpertTeamRelay(get: () => ConversationState, set: StoreSet) {
  const relay = get().expertTeamRelay;
  if (!relay) return;

  const finishedIndex = relay.currentIndex;
  const finishedStep = relay.steps[finishedIndex];
  const nextIndex = finishedIndex + 1;
  const prevReply = get().sandboxAgentReply;

  if (nextIndex >= relay.steps.length) {
    const chat = get().chats[relay.chatId];
    if (chat) {
      set({
        expertTeamRelay: null,
        pushToast: `专家团「${relay.scenarioLabel}」已全部完成（${relay.steps.length} 步）`,
        chats: {
          ...get().chats,
          [relay.chatId]: {
            ...chat,
            status: `专家团完成 · ${relay.steps.length} 步`,
            history: [
              ...chat.history,
              {
                role: 'agent',
                name: '专家团编排',
                text: `🎉 专家团「${relay.scenarioLabel}」已全部完成（共 ${relay.steps.length} 步）。可在右侧预览各步交付物，或继续追问。`,
              },
            ],
          },
        },
      });
    } else {
      set({
        expertTeamRelay: null,
        pushToast: `专家团「${relay.scenarioLabel}」已全部完成`,
      });
    }
    schedulePersistFromState(get);
    return;
  }

  const nextStep = relay.steps[nextIndex]!;
  const { agent: nextAgent } = resolvePipelineStepTargets(nextStep);
  const chat = get().chats[relay.chatId];
  if (!chat) {
    set({ expertTeamRelay: null });
    return;
  }

  set({
    expertTeamRelay: { ...relay, currentIndex: nextIndex },
    ...(nextAgent ? { activeAgentId: nextAgent.id } : {}),
    ...(get().currentChatId !== relay.chatId ? { currentChatId: relay.chatId } : {}),
    pushToast: `专家团接力 ${nextIndex + 1}/${relay.steps.length}：${nextStep.label}`,
    chats: {
      ...get().chats,
      [relay.chatId]: {
        ...chat,
        agentId: nextAgent?.id ?? nextStep.agentId,
        badge: (nextAgent?.name ?? nextStep.label).replace(/\s*Agent\s*/i, ''),
        status: `专家团 ${nextIndex + 1}/${relay.steps.length} · ${nextStep.label}`,
        iconBg: nextAgent?.color
          ? `bg-gradient-to-br ${nextAgent.color}`
          : chat.iconBg,
        history: [
          ...chat.history,
          {
            role: 'agent',
            name: '专家团编排',
            text: `✅ 第 ${finishedIndex + 1} 步「${finishedStep?.label ?? ''}」完成 · 正在接力第 ${nextIndex + 1} 步「${nextStep.label}」…`,
          },
        ],
      },
    },
  });
  schedulePersistFromState(get);

  await sleep(480);
  const liveRelay = get().expertTeamRelay;
  if (!liveRelay || liveRelay.chatId !== relay.chatId) return;
  if (get().isAgentTyping || get().pendingPipeline) return;

  const message = buildExpertTeamStepPrompt(
    { scenarioLabel: relay.scenarioLabel, steps: relay.steps },
    nextIndex,
    prevReply,
  );
  await get().sendMessage(message);
}

async function runApprovedPipeline(get: () => ConversationState, set: StoreSet) {
  const pipeline = get().pendingPipeline;
  if (!pipeline) return;

  const { currentChatId, chats } = get();
  const chat = chats[currentChatId];
  if (!chat) return;

  const agent = getAgentById(pipeline.agentId);
  const skill = getSkillById(pipeline.skillId);
  const systemPrompt = buildSystemPromptWithSkill(
    getAgentSystemPrompt(agent) ?? agent?.systemPrompt,
    skill,
  );
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
    streamStatus: useLlm
      ? `LLM 执行中 · ${pipeline.targetAgent}${skill ? ` · ${skill.name}` : ''}`
      : skill
        ? `执行专家编排 · ${pipeline.targetAgent} · ${skill.name}`
        : agent
          ? `执行专家 · ${pipeline.targetAgent}`
          : '连接 API Runtime…',
  });
  get().abortController?.abort();
  const controller = new AbortController();
  set({ abortController: controller });

  let stepCounter = 0;
  let agentTypeResult: 'marketing' | 'knowledge' = pipeline.actionType;
  let streamingStarted = false;
  let completedOk = false;

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
      completedOk = true;
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
      systemPrompt,
      actionType: pipeline.actionType,
      kbContext,
      skillId: pipeline.skillId,
      skillName: skill?.name,
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
    const relay = get().expertTeamRelay;
    if (
      completedOk &&
      !controller.signal.aborted &&
      relay &&
      relay.chatId === currentChatId
    ) {
      void advanceExpertTeamRelay(get, set);
    }
  }
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  activeModule: 'chat',
  currentChatId: 'marketing',
  chats: structuredClone(useWorkspaceStore.getState().getCatalog('ws-cn-marketing').chats),
  isAgentTyping: false,
  streamStatus: null,
  abortController: null,
  ...resetSandboxState(),
  exportOpen: false,
  pushToast: null,
  selectedResourceName: null,
  pendingTaskSubmit: null,
  pendingPipeline: null,
  expertTeamRelay: null,
  activeAgentId: 'agent-data-analysis',
  persistWorkspaceId: null,
  kbArtifact: null,
  kbPreviewDocId: null,

  setActiveModule: (module, resourceName = null) =>
    set({ activeModule: module, selectedResourceName: resourceName }),

  loadWorkspace: (workspaceId, defaultChatId, persistedChats) => {
    get().abortController?.abort();
    const prev = get();
    const pending = prev.pendingTaskSubmit;
    const catalog = useWorkspaceStore.getState().getCatalog(workspaceId);
    const baseChats = structuredClone(catalog.chats);
    const merged = persistedChats ? { ...baseChats, ...persistedChats } : baseChats;
    // 移除已下线 WarRoom、Smoke/营销/知识等历史默认会话
    const { group_q3: _removedDefaultWarroom, ...withoutLegacy } = merged;
    const chats = Object.fromEntries(
      Object.entries(withoutLegacy).filter(([id, chat]) => {
        if (LEGACY_DEFAULT_CHAT_IDS.has(id)) return false;
        if (/^smoke\b/i.test(chat.title) || /smoke\s*test/i.test(chat.title)) return false;
        return true;
      }),
    ) as Record<string, ChatConfig>;

    // 保留水合期间内存里新建的任务，避免刚创建就被异步 loadWorkspace 冲掉
    for (const [id, chat] of Object.entries(prev.chats)) {
      if (!chats[id] && isUserCreatedTask(chat) && !LEGACY_DEFAULT_CHAT_IDS.has(id)) {
        chats[id] = chat;
      }
    }

    let chatId = defaultChatId && chats[defaultChatId] ? defaultChatId : Object.keys(chats)[0] ?? '';
    if (pending?.chatId && chats[pending.chatId]) {
      chatId = pending.chatId;
    } else if (prev.currentChatId && chats[prev.currentChatId] && isUserCreatedTask(chats[prev.currentChatId])) {
      chatId = prev.currentChatId;
    }

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
      // 保留 pendingTaskSubmit，供任务页自动投递
      ...resetSandboxState(),
    });
    schedulePersistFromState(get);
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
    const relay = get().expertTeamRelay;
    set({
      isAgentTyping: false,
      streamStatus: null,
      abortController: null,
      ...(relay
        ? {
            expertTeamRelay: null,
            pendingPipeline: null,
            pushToast: `专家团「${relay.scenarioLabel}」已中止`,
          }
        : {}),
    });
  },

  sendMessage: async (text, _workspaceId) => {
    const trimmed = text.trim();
    const { currentChatId, chats, isAgentTyping, pendingPipeline } = get();
    if (!trimmed || isAgentTyping) return;

    if (!canExecuteChat()) {
      set({ pushToast: READONLY_EXECUTE_HINT });
      return;
    }

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

    const skillFromText = resolveSkillFromText(trimmed);
    const skillBoundAgent = skillFromText
      ? useMarketplaceStore.getState().agents.find((a) => a.skillIds?.includes(skillFromText.id) && a.published) ??
        null
      : null;
    const bound =
      resolveAgentFromText(trimmed) ??
      getAgentById(chat.agentId ?? get().activeAgentId ?? undefined) ??
      skillBoundAgent;
    if (bound) set({ activeAgentId: bound.id });

    // 消息未显式 /skill 时，自动挂载专家主 Skill
    const skill = skillFromText ?? (bound ? getPrimarySkill(bound) : null);
    const skillPack = skill ? getSkillPack(skill.id) : null;
    const agentPack = bound ? getAgentPack(bound.id) : null;

    const userMessage: ChatMessage = { role: 'user', text: trimmed };
    const llmReady = isLlmConfigured();
    set({
      isAgentTyping: true,
      streamStatus: llmReady
        ? 'LLM 正在生成执行计划…'
        : skill
          ? `正在挂载 Skill · ${skill.name}${bound ? ` · ${bound.name}` : ''}`
          : 'Agent 正在理解任务…',
      chats: {
        ...chats,
        [currentChatId]: { ...chat, history: [...chat.history, userMessage, { role: 'typing' }] },
      },
    });

    await sleep(llmReady ? 200 : 600);

    const actionType =
      skillPack?.agentType ??
      agentPack?.agentType ??
      resolveActionTypeFromText(trimmed, bound?.id ?? chat.agentId);
    let targetAgent = bound?.name ?? (chat.type === 'bot' ? chat.title : '营销 Agent');
    if (!bound && chat.type === 'group') {
      targetAgent = actionType === 'knowledge' ? '知识 Agent' : '数据分析 Agent';
    }

    const orchSteps = buildAgentOrchestrationSteps(bound, skill);
    const skillSteps = getSkillPlanSteps(skill);
    const presetSteps = orchSteps ?? skillSteps;
    const resolved = presetSteps
      ? { steps: presetSteps, fromLlm: false }
      : await resolvePlanSteps({
          userTask: trimmed,
          actionType,
          agentId: bound?.id ?? chat.agentId,
          agentName: targetAgent,
        });
    const { steps, fromLlm } = resolved;
    const planId = `plan-${Date.now()}`;
    const mountedSkills = skill
      ? [skill.name, ...getSkillLabels(bound?.id ?? chat.agentId).filter((n) => n !== skill.name)].slice(0, 4)
      : getSkillLabels(bound?.id ?? chat.agentId);
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
        streamStatus: fromLlm
          ? 'LLM 计划已生成 · 等待确认'
          : skill
            ? `已挂载「${skill.name}」· 专家编排待确认`
            : '等待确认执行计划',
        pendingPipeline: {
          text: trimmed,
          actionType,
          targetAgent,
          steps,
          planId,
          agentId: bound?.id ?? chat.agentId,
          skillId: skill?.id,
        },
        chats: {
          ...state.chats,
          [currentChatId]: { ...current, history: [...history, planMsg] },
        },
      };
    });
    schedulePersistFromState(get);

    const relay = get().expertTeamRelay;
    const pending = get().pendingPipeline;
    if (
      relay?.autoApprove &&
      relay.chatId === currentChatId &&
      pending &&
      pending.planId === planId
    ) {
      await get().approvePlan(pending.planId, pending.steps);
    }
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

  pushToGroup: async (target) => {
    const { chats, currentChatId, sandboxReady, sandboxType, sandboxQuery } = get();
    if (!sandboxReady) {
      set({ pushToast: '请先生成交付物后再推送' });
      return;
    }

    const chatTitle = chats[currentChatId]?.title ?? '当前任务';
    const allRooms = Object.values(chats).filter((c) => isWarRoom(c));
    const warroomIds =
      target?.warroomIds?.length
        ? target.warroomIds
        : target?.memberIds?.length
          ? []
          : allRooms.slice(0, 1).map((r) => r.id);
    const memberIds = target?.memberIds ?? [];

    if (!warroomIds.length && !memberIds.length) {
      set({ pushToast: '请选择作战室或成员' });
      return;
    }

    const { useInboxStore } = await import('@/stores/inboxStore');
    const inbox = useInboxStore.getState();
    const fromName = getCurrentUserName() || '同事';
    const fromUserId = getCurrentUserId() || undefined;
    let pushedRooms = 0;
    let lastMessage = '';

    for (const rid of warroomIds) {
      const warroom = chats[rid];
      if (!warroom || !isWarRoom(warroom)) continue;
      const targetGroup = warroom.title;
      const result = await pushArtifactToGroup({
        chatTitle,
        targetGroup,
        artifactType: sandboxType ?? 'marketing',
        query: sandboxQuery,
        webhookUrl: loadWarroomWebhookUrl(),
      });
      lastMessage = result.message;
      if (!result.ok) continue;

      const pushMsg: ChatMessage = {
        role: 'system',
        text: `📦 ${fromName} 从「${chatTitle}」推送了一份交付物到本作战室`,
      };
      set((state) => ({
        chats: {
          ...state.chats,
          [rid]: {
            ...state.chats[rid],
            history: [...state.chats[rid].history, pushMsg],
          },
        },
      }));
      pushedRooms += 1;

      const recipientIds = (warroom.members ?? [])
        .map((m) => m.id)
        .filter((id) => id && id !== fromUserId);
      if (recipientIds.length) {
        inbox.pushToUsers(recipientIds, {
          kind: 'deliverable',
          title: `作战室「${targetGroup}」收到交付物`,
          body: `${fromName} 推送了「${chatTitle}」的分析交付物${sandboxQuery ? `（${sandboxQuery}）` : ''}。可在任务中心查看。`,
          fromUserId,
          fromName,
          meta: {
            chatId: currentChatId,
            warroomId: rid,
            warroomTitle: targetGroup,
            artifactType: sandboxType ?? undefined,
            query: sandboxQuery || undefined,
          },
        });
      }
    }

    if (memberIds.length) {
      inbox.pushToUsers(memberIds, {
        kind: 'deliverable',
        title: `${fromName} 向你推送了交付物`,
        body: `来自任务「${chatTitle}」${sandboxQuery ? ` · ${sandboxQuery}` : ''}。请在任务中心打开对应会话查看预览。`,
        fromUserId,
        fromName,
        meta: {
          chatId: currentChatId,
          artifactType: sandboxType ?? undefined,
          query: sandboxQuery || undefined,
        },
      });
    }

    schedulePersistFromState(get);

    const parts: string[] = [];
    if (pushedRooms) parts.push(`${pushedRooms} 个作战室`);
    if (memberIds.length) parts.push(`${memberIds.length} 位成员（我的消息）`);
    set({
      pushToast: parts.length
        ? `已推送到 ${parts.join(' · ')}`
        : lastMessage || '推送完成',
    });
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
    if (!canExecuteChat()) {
      set({ pushToast: READONLY_EXECUTE_HINT });
      return '';
    }
    const id = `task_${Date.now()}`;
    const agent = agentId ? getAgentById(agentId) : null;
    const titleTrim = title.trim();
    const msgTrim = (initialMessage || '').trim();
    const sourceText = msgTrim || titleTrim;
    // 标题与正文不同：视为显式命名（技能名 / 专家团等）；否则从描述提炼
    const hasExplicitTitle = Boolean(titleTrim && msgTrim && titleTrim !== msgTrim);
    const resolvedTitle = hasExplicitTitle
      ? clampTitle(titleTrim, 22)
      : deriveTaskTitle(sourceText, { agentName });
    const newChat: ChatConfig = {
      id,
      title: resolvedTitle,
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
            ? `任务「${resolvedTitle}」已创建，已绑定 ${agentName}。请描述目标或使用 Skill 指令。`
            : `任务「${resolvedTitle}」已创建。请 @ Agent 或 / 调用 Skill，确认计划后执行。`,
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

    // 规则标题来自长描述时，若已配置模型则异步精炼（不覆盖显式标题）
    if (!hasExplicitTitle && sourceText.length > TASK_TITLE_MAX_LEN) {
      void (async () => {
        try {
          const { isLlmConfigured, refineTaskTitleWithLlm } = await import('@/api/llmClient');
          if (!isLlmConfigured()) return;
          const aiTitle = await refineTaskTitleWithLlm(sourceText, { agentName });
          if (!isUsableAiTaskTitle(aiTitle)) return;
          if (!get().chats[id]) return;
          get().renameTaskSession(id, clampTitle(aiTitle), { silent: true });
        } catch {
          /* keep rule title */
        }
      })();
    }

    return id;
  },

  startExpertTeamRelay: ({
    scenarioId,
    scenarioLabel,
    steps,
    fromIndex = 0,
    autoApprove = true,
  }) => {
    const stepsToRun = steps.slice(fromIndex);
    if (!stepsToRun.length) {
      set({ pushToast: '专家团无可用步骤' });
      return '';
    }

    const first = stepsToRun[0]!;
    const { agent: firstAgent } = resolvePipelineStepTargets(first);
    const bound = firstAgent ?? getAgentById(first.agentId);
    const initialMessage = buildExpertTeamStepPrompt(
      { scenarioLabel, steps: stepsToRun },
      0,
    );

    const id = get().createAgentTaskSession({
      title: `专家团 · ${scenarioLabel}`,
      agentName: bound?.name ?? first.label,
      agentIcon: bound?.icon ?? 'fa-users',
      agentId: bound?.id ?? first.agentId,
      initialMessage,
      autoSend: true,
      switchTo: true,
    });

    const chat = get().chats[id];
    if (chat) {
      set({
        expertTeamRelay: {
          chatId: id,
          scenarioId,
          scenarioLabel,
          steps: stepsToRun,
          currentIndex: 0,
          autoApprove,
        },
        pushToast: `专家团已启动 · 共 ${stepsToRun.length} 步，同会话自动接力`,
        chats: {
          ...get().chats,
          [id]: {
            ...chat,
            status: `专家团 1/${stepsToRun.length} · ${first.label}`,
            history: [
              {
                role: 'agent',
                name: '专家团编排',
                text: `已创建专家团任务「${scenarioLabel}」，共 ${stepsToRun.length} 步，将在同一会话中顺序接力${autoApprove ? '（计划自动确认）' : ''}。`,
              },
            ],
          },
        },
      });
    } else {
      set({
        expertTeamRelay: {
          chatId: id,
          scenarioId,
          scenarioLabel,
          steps: stepsToRun,
          currentIndex: 0,
          autoApprove,
        },
        pushToast: `专家团已启动 · 共 ${stepsToRun.length} 步`,
      });
    }

    schedulePersistFromState(get);
    return id;
  },

  clearExpertTeamRelay: (reason) => {
    const relay = get().expertTeamRelay;
    if (!relay) return;
    set({
      expertTeamRelay: null,
      ...(reason ? { pushToast: reason } : {}),
    });
  },

  createWarRoomSession: (title) => {
    if (!canExecuteChat()) {
      set({ pushToast: READONLY_EXECUTE_HINT });
      return '';
    }
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
    const { pendingTaskSubmit: pending, currentChatId } = get();
    if (!pending) return null;
    // 仅在当前会话匹配时消费，避免路由/水合竞态把待发送消息清掉
    if (pending.chatId !== currentChatId) return null;
    set({ pendingTaskSubmit: null });
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
    if (!canExecuteChat()) {
      set({ pushToast: READONLY_EXECUTE_HINT });
      return false;
    }
    const chat = get().chats[chatId];
    if (!chat || !isUserCreatedTask(chat)) {
      set({ pushToast: '该任务不可删除' });
      return false;
    }

    const deletingCurrent = get().currentChatId === chatId;
    if (deletingCurrent) {
      get().abortController?.abort();
    }
    if (get().expertTeamRelay?.chatId === chatId) {
      set({ expertTeamRelay: null });
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

  renameTaskSession: (chatId, title, opts) => {
    if (!canExecuteChat()) {
      set({ pushToast: READONLY_EXECUTE_HINT });
      return false;
    }
    const chat = get().chats[chatId];
    const nextTitle = title.trim();
    if (!chat || !nextTitle) {
      if (!opts?.silent) set({ pushToast: '任务名称不能为空' });
      return false;
    }
    // 仅允许重命名用户创建的 Agent 任务
    if (!chat.id.startsWith('task_')) {
      if (!opts?.silent) set({ pushToast: '仅支持重命名创建的 Agent 任务' });
      return false;
    }
    if (chat.title === nextTitle) return true;

    set({
      chats: {
        ...get().chats,
        [chatId]: { ...chat, title: nextTitle },
      },
      ...(opts?.silent ? {} : { pushToast: `已重命名为「${nextTitle}」` }),
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
