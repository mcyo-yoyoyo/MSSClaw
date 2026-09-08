import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { streamExecution } from '@/api/agentRuntime';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { SharedComposer } from '@/components/chat/SharedComposer';
import { inferActionType } from '@/domain/plan';
import { getSkillPack } from '@/domain/skills/catalog';
import {
  buildSystemPromptWithSkill,
  getSkillPlanSteps,
  isSkillRunnable,
} from '@/domain/skillRuntime';
import { skillDisplayName } from '@/domain/skillDisplay';
import type { ChatMessage } from '@/domain/chat';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { loadSessions, scheduleSaveSessions } from '@/domain/persistence/storage';
import { getCurrentUserId } from '@/domain/currentUser';
import type { ChatConfig } from '@/domain/chat';
import { cn } from '@/lib/utils';

interface SkillChatDrawerProps {
  skill: PrototypeSkillSeed | null;
  open: boolean;
  onClose: () => void;
  onSkillChange?: (skill: PrototypeSkillSeed) => void;
}

interface ActiveRun {
  id: number;
  controller: AbortController;
  cancelled: boolean;
  terminal: boolean;
}

function finishStreaming(messages: ChatMessage[], fallback?: string): ChatMessage[] {
  const index = lastStreamingAgentIndex(messages);
  if (index < 0) return messages;
  const next = [...messages];
  const current = next[index]!;
  next[index] = {
    ...current,
    streaming: false,
    text: current.text?.trim() ? current.text : fallback ?? current.text,
  };
  return next;
}

function appendToken(messages: ChatMessage[], token: string): ChatMessage[] {
  const index = lastStreamingAgentIndex(messages);
  if (index < 0) return messages;
  const next = [...messages];
  const current = next[index]!;
  next[index] = { ...current, text: `${current.text ?? ''}${token}` };
  return next;
}

function lastStreamingAgentIndex(messages: ChatMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === 'agent' && message.streaming) return index;
  }
  return -1;
}

function conversationPrompt(messages: ChatMessage[], current: string): string {
  const previous = messages
    .filter(
      (message) =>
        (message.role === 'user' || message.role === 'agent') &&
        Boolean(message.text?.trim()) &&
        !message.streaming,
    )
    .slice(-6)
    .map((message) => `${message.role === 'user' ? '用户' : '助手'}：${message.text!.trim()}`)
    .join('\n');
  if (!previous) return current;
  return `以下是此前对话，请保持上下文连续：\n${previous}\n\n用户：${current}`.slice(-8000);
}

/**
 * Skill 入口的轻量对话抽屉：停留在当前货架页，直接进行普通多轮对话。
 * 任务中心的计划卡和步骤流不在这个入口展示。
 */
export function SkillChatDrawer({ skill, open, onClose, onSkillChange }: SkillChatDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<ActiveRun | null>(null);
  const resizeRef = useRef({ pointerId: -1, startX: 0, startWidth: 0, lastWidth: 560 });
  const nextRunId = useRef(0);
  const workspaceId = useWorkspaceStore((state) => state.workspaceId);
  const agents = useMarketplaceStore((state) => state.agents);
  const skills = useMarketplaceStore((state) => state.skills);
  const [drawerWidth, setDrawerWidth] = useState(() => {
    if (typeof window === 'undefined') return 560;
    const saved = Number(window.localStorage.getItem('mss-skill-chat-width'));
    const maxWidth = Math.max(360, window.innerWidth - 16);
    if (Number.isFinite(saved) && saved >= 360) return Math.min(saved, maxWidth);
    return Math.min(560, maxWidth);
  });
  const [resizing, setResizing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [running, setRunning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyChats, setHistoryChats] = useState<ChatConfig[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const persistedChatsRef = useRef<Record<string, ChatConfig>>({});

  const agent = useMemo(
    () =>
      skill
        ? agents.find((candidate) => candidate.published && candidate.skillIds?.includes(skill.id)) ?? null
        : null,
    [agents, skill],
  );
  const displayName = skill ? skillDisplayName(skill) : 'Skill';
  const availableSkills = useMemo(
    () => skills.filter((candidate) => candidate.published && isSkillRunnable(candidate)),
    [skills],
  );

  useFocusTrap(open, drawerRef);

  useEffect(() => {
    const clampWidth = () => {
      const maxWidth = Math.max(360, window.innerWidth - 16);
      setDrawerWidth((current) => Math.min(current, maxWidth));
    };
    clampWidth();
    window.addEventListener('resize', clampWidth);
    return () => window.removeEventListener('resize', clampWidth);
  }, []);

  useEffect(() => {
    if (!open) return;
    drawerRef.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
  }, [open, skill?.id]);

  useEffect(() => {
    if (!skill) {
      setMessages([]);
      setDraft('');
      return;
    }
    runRef.current?.controller.abort();
    runRef.current = null;
    setRunning(false);
    setDraft('');
    const initialName = skillDisplayName(skill);
    const initialMessages: ChatMessage[] = [
      {
        role: 'agent',
        name: initialName,
        text: `已打开「${initialName}」对话，请描述你的目标或问题。`,
      },
    ];
    setMessages(initialMessages);
    setHistoryReady(false);
    let active = true;
    void loadSessions(workspaceId).then((chats) => {
      if (!active) return;
      persistedChatsRef.current = chats ?? {};
      setHistoryChats(Object.values(chats ?? {}).filter((chat) => chat.id.startsWith('skill:')));
      const history = chats?.[`skill:${skill.id}`]?.history;
      setMessages(history?.length ? history : initialMessages);
      setHistoryReady(true);
    });
    return () => {
      active = false;
    };
  }, [skill?.id, workspaceId]);

  useEffect(() => {
    if (!skill || !workspaceId || !historyReady || messages.some((message) => message.streaming)) return;
    const id = `skill:${skill.id}`;
    const chat: ChatConfig = {
      id,
      title: displayName,
      type: 'bot',
      icon: 'fa-robot',
      color: 'claw',
      status: 'active',
      history: messages,
      prompts: [],
      skillId: skill.id,
      ownerUserId: getCurrentUserId(),
      createdAt: persistedChatsRef.current[id]?.createdAt ?? Date.now(),
    };
    const next = { ...persistedChatsRef.current, [id]: chat };
    persistedChatsRef.current = next;
    setHistoryChats(Object.values(next).filter((candidate) => candidate.id.startsWith('skill:')));
    scheduleSaveSessions(workspaceId, next);
  }, [displayName, historyReady, messages, skill, workspaceId]);

  useEffect(() => {
    if (open) return;
    setShowHistory(false);
    const run = runRef.current;
    if (!run) return;
    run.cancelled = true;
    run.controller.abort();
    runRef.current = null;
    setRunning(false);
    setMessages((current) => [
      ...finishStreaming(current),
      { role: 'system', text: '任务已手动终止' },
    ]);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    const element = messagesRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  useEffect(
    () => () => {
      runRef.current?.controller.abort();
    },
    [],
  );

  const stop = () => {
    const run = runRef.current;
    if (!run) return;
    run.cancelled = true;
    run.controller.abort();
    runRef.current = null;
    setRunning(false);
    setMessages((current) => [
      ...finishStreaming(current),
      { role: 'system', text: '任务已手动终止' },
    ]);
  };

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: drawerWidth,
      lastWidth: drawerWidth,
    };
    setResizing(true);
  };

  const handleResizeMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (resizeRef.current.pointerId !== event.pointerId) return;
    const maxWidth = Math.max(360, window.innerWidth - 16);
    const rawWidth = resizeRef.current.startWidth + (resizeRef.current.startX - event.clientX);
    const nextWidth = Math.min(maxWidth, Math.max(360, rawWidth));
    resizeRef.current.lastWidth = nextWidth;
    setDrawerWidth(nextWidth);
  };

  const handleResizeEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (resizeRef.current.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    resizeRef.current.pointerId = -1;
    setResizing(false);
    window.localStorage.setItem('mss-skill-chat-width', String(Math.round(resizeRef.current.lastWidth)));
  };

  const send = (text: string) => {
    const currentSkill = skill;
    const trimmed = text.trim();
    if (!currentSkill || !open || !trimmed || running) return;

    if (!isSkillRunnable(currentSkill)) {
      setMessages((current) => [
        ...current,
        { role: 'user', text: trimmed },
        { role: 'agent', name: 'System', text: '该 Skill 当前不可调用，请刷新后重试。' },
      ]);
      return;
    }

    const controller = new AbortController();
    const run: ActiveRun = {
      id: ++nextRunId.current,
      controller,
      cancelled: false,
      terminal: false,
    };
    runRef.current = run;
    const assistantName = agent?.name ?? displayName;
    const prompt = conversationPrompt(messages, trimmed);
    const planSteps = getSkillPlanSteps(currentSkill) ?? [displayName];
    const actionType =
      getSkillPack(currentSkill.id)?.agentType ??
      (agent?.id
        ? inferActionType(agent.id)
        : currentSkill.category === 'experience' || currentSkill.category === 'process'
          ? 'knowledge'
          : 'marketing');

    setMessages((current) => [
      ...current,
      { role: 'user', text: trimmed },
      { role: 'agent', name: assistantName, text: '', streaming: true },
    ]);
    setDraft('');
    setRunning(true);

    void (async () => {
      try {
        for await (const event of streamExecution({
          chatId: `skill_drawer_${currentSkill.id}`,
          message: prompt,
          workspaceId,
          signal: controller.signal,
          planSteps,
          agentId: agent?.id,
          agentName: assistantName,
          systemPrompt: buildSystemPromptWithSkill(agent?.systemPrompt, currentSkill),
          actionType,
          skillId: currentSkill.id,
          skillName: displayName,
          assetType: 'skill',
        })) {
          if (runRef.current !== run || controller.signal.aborted) break;
          if (event.type === 'token') {
            setMessages((current) => appendToken(current, event.content));
          } else if (event.type === 'done') {
            run.terminal = true;
            setMessages((current) => {
              const finished = finishStreaming(current, '已完成处理。');
              return event.followUp ? [...finished, event.followUp] : finished;
            });
          } else if (event.type === 'error') {
            run.terminal = true;
            setMessages((current) =>
              finishStreaming(
                current,
                `⚠️ ${event.message || '执行失败，请重试。'}${event.detail ? `\n\n详情：${event.detail}` : ''}`,
              ),
            );
          }
        }

        if (
          runRef.current === run &&
          !run.terminal &&
          !run.cancelled &&
          !controller.signal.aborted
        ) {
          run.terminal = true;
          setMessages((current) =>
            finishStreaming(current, '⚠️ 对话流未正常结束，请重试。'),
          );
        }
      } catch (error) {
        if (runRef.current !== run || run.cancelled || controller.signal.aborted) return;
        run.terminal = true;
        const reason = error instanceof Error ? error.message : '未知错误';
        setMessages((current) => finishStreaming(current, `⚠️ ${reason}`));
      } finally {
        if (runRef.current === run) {
          runRef.current = null;
          setRunning(false);
        }
      }
    })();
  };

  if (!open || !skill) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Skill 对话"
        className={cn(
          'fixed inset-y-0 right-0 z-[120] flex max-w-[min(100vw-16px,760px)] flex-col',
          'border-l border-zinc-200/90 bg-[#fbfbfd] shadow-2xl',
          resizing && 'select-none',
        )}
        style={{ width: drawerWidth, transition: resizing ? 'none' : undefined }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          role="separator"
          aria-label="调整 Skill 对话宽度"
          aria-orientation="vertical"
          title="拖动调整宽度"
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
          className="group absolute left-0 top-0 z-50 h-full w-2 cursor-col-resize touch-none"
        >
          <span className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-zinc-300/0 transition-colors group-hover:bg-zinc-300/70" />
        </div>
        <header className="flex shrink-0 items-center justify-end gap-1 border-b border-black/[0.06] bg-white px-3 py-2">
          <button
            type="button"
            onClick={() => setShowHistory((current) => !current)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition',
              showHistory
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700',
            )}
            aria-label="查看对话历史"
            aria-pressed={showHistory}
          >
            <i className="fa-solid fa-clock-rotate-left" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="关闭 Skill 对话"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </header>

        <div ref={messagesRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 scroll-hidden">
          {showHistory ? (
            <div>
              <h2 className="mb-3 text-[14px] font-semibold text-zinc-900">对话历史</h2>
              <div className="space-y-2">
                {historyChats.length ? (
                  [...historyChats]
                    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
                    .map((chat) => {
                      const skillId = chat.id.slice('skill:'.length);
                      const targetSkill = availableSkills.find((candidate) => candidate.id === skillId);
                      const lastMessage = [...chat.history]
                        .reverse()
                        .find((message) => message.text?.trim());
                      return (
                        <button
                          key={chat.id}
                          type="button"
                          onClick={() => {
                            setShowHistory(false);
                            if (targetSkill && targetSkill.id !== skill.id) onSkillChange?.(targetSkill);
                          }}
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
                        >
                          <span className="block text-[12px] font-medium text-zinc-900">{chat.title}</span>
                          <span className="mt-1 block truncate text-[11px] text-zinc-400">
                            {lastMessage?.text ?? '暂无消息'}
                          </span>
                        </button>
                      );
                    })
                ) : (
                  <p className="py-10 text-center text-[12px] text-zinc-400">暂无历史对话</p>
                )}
              </div>
            </div>
          ) : messages.length ? (
            messages.map((message, index) => (
              <MessageBubble
                key={`${message.role}-${index}`}
                message={message}
                accentColor="claw"
                iconClass="fa-robot"
                iconBg="bg-zinc-900"
                agentName="MSS AI"
                showAgentBadge={false}
              />
            ))
          ) : (
            <div className="flex h-full items-center justify-center text-center text-[12px] text-zinc-400">
              描述你的目标，开始对话
            </div>
          )}
        </div>

        {!showHistory ? <footer className="shrink-0 border-t border-zinc-200/90 bg-white p-3">
          <div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] text-zinc-400">
            <i className="fa-solid fa-robot text-zinc-500" />
            <label className="sr-only" htmlFor="skill-chat-drawer-skill">选择 Skill</label>
            <select
              id="skill-chat-drawer-skill"
              value={skill?.id ?? ''}
              onChange={(event) => {
                const next = availableSkills.find((candidate) => candidate.id === event.target.value);
                if (next) onSkillChange?.(next);
              }}
              className="min-w-0 flex-1 rounded-md border-0 bg-transparent text-[10px] text-zinc-500 outline-none"
            >
              {skill ? <option value={skill.id}>当前 Skill：{displayName}</option> : null}
              {availableSkills
                .filter((candidate) => candidate.id !== skill?.id)
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    切换至：{skillDisplayName(candidate)}
                  </option>
                ))}
            </select>
          </div>
          <SharedComposer
            variant="workspace"
            value={draft}
            onChange={setDraft}
            onSubmit={send}
            disabled={running}
            busy={running}
            onStop={stop}
            hideAgent
            hideSkill
            placeholder={`向 ${displayName} 描述任务…`}
          />
        </footer> : null}
      </aside>
    </>
  );
}
