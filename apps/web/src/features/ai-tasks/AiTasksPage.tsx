import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { AgentPortrait } from '@/components/brand/AgentPortrait';
import { SharedComposer } from '@/components/chat/SharedComposer';
import { TaskChatPanel } from '@/components/chat/TaskChatPanel';
import {
  aiTaskSessionPreview,
  currentAiTaskOwnerLabel,
  formatAiTaskTime,
  groupAiTasksByAgent,
  listAiTaskSessions,
} from '@/domain/aiTaskGroups';
import { canUseWarRoomAi, isUserCreatedTask } from '@/domain/chat';
import { canExecuteChat } from '@/domain/permissions';
import { getAgentById } from '@/domain/plan';
import { getTaskUiStatus, taskUiStatusClass } from '@/domain/taskUiStatus';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

/**
 * AI 任务：按 Agent / Skill 归类的历史执行会话（Codex 式左右分栏）。
 * 无任务 / 新建：页内展示对话输入壳（待上线），不再跳转首页旧链路。
 */
export function AiTasksPage() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const platformRole = useSessionStore((s) => s.user?.platformRole);
  const executeAllowed = canExecuteChat(platformRole);
  const showToast = useMarketplaceStore((s) => s.showToast);

  const chats = useConversationStore((s) => s.chats);
  const agents = useMarketplaceStore((s) => s.agents);
  const currentChatId = useConversationStore((s) => s.currentChatId);
  const switchChat = useConversationStore((s) => s.switchChat);
  const sendMessage = useConversationStore((s) => s.sendMessage);
  const approvePlan = useConversationStore((s) => s.approvePlan);
  const savePlanSteps = useConversationStore((s) => s.savePlanSteps);
  const isAgentTyping = useConversationStore((s) => s.isAgentTyping);
  const streamStatus = useConversationStore((s) => s.streamStatus);
  const cancelStream = useConversationStore((s) => s.cancelStream);
  const pinCurrentChat = useConversationStore((s) => s.pinCurrentChat);
  const exportChatJson = useConversationStore((s) => s.exportChatJson);
  const clearSandbox = useConversationStore((s) => s.clearSandbox);
  const deleteTaskSession = useConversationStore((s) => s.deleteTaskSession);
  const pendingTaskSubmit = useConversationStore((s) => s.pendingTaskSubmit);
  const consumePendingTaskSubmit = useConversationStore((s) => s.consumePendingTaskSubmit);

  const [query, setQuery] = useState('');
  const [activeGroupKey, setActiveGroupKey] = useState<string | 'all'>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState('');
  const [composeDraft, setComposeDraft] = useState('');
  /** 窄屏：从对话返回列表时保留当前会话，仅切换面板 */
  const [narrowListFocus, setNarrowListFocus] = useState(false);
  /** 页内「新建任务」着陆（Codex 对话壳，待上线） */
  const [composeFocus, setComposeFocus] = useState(false);
  const pendingHandled = useRef<string | null>(null);

  const groups = useMemo(() => groupAiTasksByAgent(chats), [chats, agents]);
  const allSessions = useMemo(() => listAiTaskSessions(chats), [chats]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .map((g) => {
        const sessions = g.sessions.filter((c) => {
          if (activeGroupKey !== 'all' && g.key !== activeGroupKey) return false;
          if (!q) return true;
          const hay = `${c.title} ${g.label} ${aiTaskSessionPreview(c)}`.toLowerCase();
          return hay.includes(q);
        });
        return { ...g, sessions };
      })
      .filter((g) => g.sessions.length > 0);
  }, [groups, query, activeGroupKey]);

  const chat = chats[currentChatId];
  const showChat = Boolean(chat) && allSessions.some((c) => c.id === currentChatId);

  useEffect(() => {
    if (!allSessions.length) {
      setComposeFocus(true);
      return;
    }
    if (allSessions.some((c) => c.id === currentChatId)) return;
    if (composeFocus) return;
    switchChat(allSessions[0]!.id);
  }, [allSessions, currentChatId, switchChat, composeFocus]);

  // 外部「新建任务 / 做任务」意图：打开页内对话壳
  const pendingAiTaskCompose = useNavigationIntentStore((s) => s.pendingAiTaskCompose);
  useEffect(() => {
    if (!pendingAiTaskCompose) return;
    if (useNavigationIntentStore.getState().consumeAiTaskCompose()) {
      setComposeFocus(true);
      setNarrowListFocus(false);
      setComposeDraft('');
    }
  }, [pendingAiTaskCompose]);

  // 执行跳转落地：聚焦刚创建会话所属 Agent 分组
  useEffect(() => {
    const targetId = pendingTaskSubmit?.chatId;
    if (!targetId) return;
    const group = groups.find((g) => g.sessions.some((s) => s.id === targetId));
    if (!group) return;
    setActiveGroupKey(group.key);
    setCollapsed((prev) => ({ ...prev, [group.key]: false }));
    setNarrowListFocus(false);
    setComposeFocus(false);
  }, [pendingTaskSubmit?.chatId, groups]);

  // 承接 invoke Skill/Agent 的自动投递
  useEffect(() => {
    if (!pendingTaskSubmit || pendingTaskSubmit.chatId !== currentChatId) return;
    const pending = consumePendingTaskSubmit();
    if (!pending) return;
    const key = `${pending.chatId}:${pending.message}:${pending.autoSend}`;
    if (pendingHandled.current === key) return;
    pendingHandled.current = key;
    setComposeFocus(false);

    if (pending.autoSend) {
      void sendMessage(pending.message, workspaceId);
    } else {
      setDraft(pending.message);
    }
  }, [
    currentChatId,
    pendingTaskSubmit,
    consumePendingTaskSubmit,
    sendMessage,
    workspaceId,
  ]);

  const openSession = (id: string) => {
    switchChat(id);
    setDraft('');
    setNarrowListFocus(false);
    setComposeFocus(false);
  };

  const handleNewTask = () => {
    setComposeFocus(true);
    setNarrowListFocus(false);
    setComposeDraft('');
  };

  const viewingChat = showChat && !composeFocus && !narrowListFocus;
  const viewingComposer = composeFocus || !showChat;
  const showListPane = narrowListFocus || !(viewingChat || (composeFocus && showChat));
  // 宽屏始终显示列表；窄屏在对话/新建时隐藏列表
  const listVisibleClass = viewingChat || (composeFocus && showChat) ? 'max-xl:hidden' : '';

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,#fafafa_0%,#f4f4f5_48%,#fafafa_100%)]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {viewingChat || (composeFocus && showChat) ? (
            <button
              type="button"
              onClick={() => {
                setNarrowListFocus(true);
                setComposeFocus(false);
              }}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 xl:hidden"
              title="返回任务列表"
              aria-label="返回任务列表"
            >
              <i className="fa-solid fa-arrow-left text-[12px]" />
            </button>
          ) : null}
          <div className="min-w-0">
            <h1 className="text-[16px] font-semibold tracking-tight text-zinc-900">AI 任务</h1>
            <p className="mt-0.5 truncate text-[12px] text-zinc-500">
              {currentAiTaskOwnerLabel()} 的个人执行历史 · {allSessions.length} 条（仅本人可见）
            </p>
          </div>
        </div>
        {executeAllowed ? (
          <button
            type="button"
            onClick={handleNewTask}
            className="shrink-0 rounded-full bg-zinc-900 px-3.5 py-2 text-[12px] font-semibold text-white shadow-[0_8px_20px_-12px_rgba(24,24,27,0.55)] transition hover:bg-zinc-800"
          >
            <i className="fa-solid fa-plus mr-1.5 text-[10px]" />
            新建任务
          </button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <aside
          className={cn(
            'flex min-h-0 shrink-0 flex-col border-zinc-200/80 bg-white/70',
            'w-full border-b xl:flex xl:w-[min(300px,30vw)] xl:max-w-[320px] xl:border-b-0 xl:border-r',
            listVisibleClass,
            showListPane ? 'flex min-h-0 flex-1 xl:flex-none' : 'hidden xl:flex',
          )}
        >
          <div className="space-y-2 border-b border-zinc-100 p-3">
            <label className="relative block">
              <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索任务、Agent、内容…"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 py-2 pl-8 pr-3 text-[12px] outline-none transition focus:border-zinc-400 focus:bg-white"
              />
            </label>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setActiveGroupKey('all')}
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition',
                  activeGroupKey === 'all'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80',
                )}
              >
                全部
              </button>
              {groups.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setActiveGroupKey(g.key)}
                  className={cn(
                    'max-w-[140px] shrink-0 truncate rounded-full px-2.5 py-1 text-[11px] font-medium transition',
                    activeGroupKey === g.key
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80',
                  )}
                  title={g.label}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {!filteredGroups.length ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center">
                <i className="fa-solid fa-inbox mb-2 text-[18px] text-zinc-300" />
                <p className="text-[13px] font-medium text-zinc-700">暂无任务记录</p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  {executeAllowed
                    ? '可先从 MSS 工具集市选择已上架的 Skill / Agent 执行，记录将出现在此'
                    : '尚无可查看的历史记录'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredGroups.map((group) => {
                  const isCollapsed = collapsed[group.key];
                  return (
                    <section
                      key={group.key}
                      className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsed((prev) => ({ ...prev, [group.key]: !prev[group.key] }))
                        }
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-zinc-50/80"
                      >
                        {(() => {
                          const agent = group.agentId ? getAgentById(group.agentId) : null;
                          if (agent) {
                            return (
                              <AgentPortrait
                                agentId={agent.id}
                                name={agent.name}
                                icon={agent.icon || group.icon}
                                avatarUrl={agent.avatarUrl}
                                avatarPresetId={agent.avatarPresetId}
                                size={32}
                                className="shrink-0 shadow-sm ring-1 ring-black/5"
                              />
                            );
                          }
                          return (
                            <span
                              className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white',
                                group.iconBg,
                              )}
                            >
                              <i className={cn('fa-solid text-[12px]', group.icon)} />
                            </span>
                          );
                        })()}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-zinc-900">
                            {group.label}
                          </span>
                          <span className="block text-[10px] text-zinc-400">
                            {group.subtitle} · {group.sessions.length} 次执行
                          </span>
                        </span>
                        <i
                          className={cn(
                            'fa-solid fa-chevron-down text-[10px] text-zinc-400 transition',
                            isCollapsed && '-rotate-90',
                          )}
                        />
                      </button>
                      {!isCollapsed ? (
                        <ul className="border-t border-zinc-100 px-1.5 py-1.5">
                          {group.sessions.map((session) => {
                            const status = getTaskUiStatus(session);
                            const active = session.id === currentChatId && !composeFocus;
                            const canDelete = executeAllowed && isUserCreatedTask(session);
                            return (
                              <li key={session.id} className="group relative">
                                <button
                                  type="button"
                                  onClick={() => openSession(session.id)}
                                  className={cn(
                                    'mb-0.5 flex w-full flex-col gap-1 rounded-xl px-2.5 py-2 text-left transition',
                                    canDelete && 'pr-8',
                                    active
                                      ? 'bg-zinc-900 text-white'
                                      : 'hover:bg-zinc-50 text-zinc-800',
                                  )}
                                >
                                  <span className="flex items-center gap-2">
                                    <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
                                      {session.title || session.id}
                                    </span>
                                    <span
                                      className={cn(
                                        'shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold',
                                        active
                                          ? 'bg-white/15 text-white'
                                          : taskUiStatusClass(status.id),
                                      )}
                                    >
                                      {status.label}
                                    </span>
                                  </span>
                                  <span
                                    className={cn(
                                      'line-clamp-2 text-[10px] leading-relaxed',
                                      active ? 'text-white/70' : 'text-zinc-400',
                                    )}
                                  >
                                    {aiTaskSessionPreview(session)}
                                  </span>
                                  <span
                                    className={cn(
                                      'text-[10px]',
                                      active ? 'text-white/50' : 'text-zinc-400',
                                    )}
                                  >
                                    {formatAiTaskTime(session.pinnedAt ?? session.createdAt)}
                                    {session.skillId && group.agentId
                                      ? ` · Skill ${session.skillId}`
                                      : ''}
                                    {session.taskSource === 'skill'
                                      ? ' · Skill'
                                      : session.taskSource === 'expert'
                                        ? ' · Agent'
                                        : ''}
                                  </span>
                                </button>
                                {canDelete ? (
                                  <button
                                    type="button"
                                    title="删除任务"
                                    aria-label={`删除任务「${session.title || session.id}」`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const label = session.title || session.id;
                                      if (
                                        !window.confirm(
                                          `确定删除任务「${label}」？\n删除后对话记录将无法恢复。`,
                                        )
                                      ) {
                                        return;
                                      }
                                      deleteTaskSession(session.id);
                                    }}
                                    className={cn(
                                      'absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100',
                                      active
                                        ? 'text-white/70 hover:bg-white/15 hover:text-white'
                                        : 'text-zinc-400 hover:bg-red-50 hover:text-red-600',
                                    )}
                                  >
                                    <i className="fa-solid fa-trash-can text-[10px]" />
                                  </button>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <main
          className={cn(
            'min-w-0 flex-1 bg-white',
            viewingChat || viewingComposer ? 'flex min-h-0 flex-col' : 'max-xl:hidden',
          )}
        >
          {viewingChat && chat ? (
            <TaskChatPanel
              chat={chat}
              draft={draft}
              onDraftChange={setDraft}
              onSend={(text) => {
                void sendMessage(text, workspaceId);
                setDraft('');
              }}
              isAgentTyping={isAgentTyping}
              streamStatus={streamStatus}
              onCancelStream={cancelStream}
              onApprovePlan={(planId, steps) => void approvePlan(planId, steps)}
              onSavePlan={(planId, steps) => savePlanSteps(planId, steps)}
              onPinChat={pinCurrentChat}
              onExportChat={exportChatJson}
              onDeleteChat={
                isUserCreatedTask(chat)
                  ? () => {
                      if (window.confirm(`确定删除任务「${chat.title}」？`)) {
                        deleteTaskSession(chat.id);
                      }
                    }
                  : undefined
              }
              onClearSandbox={clearSandbox}
              aiAllowed={canUseWarRoomAi(chat) && executeAllowed}
              previewCollapsed
              hideSkill
            />
          ) : (
            <AiTasksComposerLanding
              draft={composeDraft}
              onDraftChange={setComposeDraft}
              onSubmitAttempt={() =>
                showToast('MSS AI 助手暂未上线，请先从 MSS 工具集市选择 Skill 或 Agent 执行')
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}

/** Codex 风格新建对话壳：视觉先行，能力标注待上线 */
function AiTasksComposerLanding({
  draft,
  onDraftChange,
  onSubmitAttempt,
}: {
  draft: string;
  onDraftChange: (v: string) => void;
  onSubmitAttempt: () => void;
}) {
  return (
    <div className="relative flex h-full min-h-0 flex-col items-center justify-start overflow-y-auto px-5 pb-10 pt-[min(8vh,64px)] md:px-10 md:pt-[min(10vh,80px)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_12%,rgba(24,24,27,0.04),transparent_50%)]" />
      <div className="relative w-full max-w-[920px]">
        <div className="mb-5 flex flex-col items-center text-center md:mb-6">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-amber-800">
            <i className="fa-solid fa-hourglass-half text-[9px]" />
            待上线
          </span>
          <h2 className="text-[22px] font-semibold tracking-tight text-zinc-500 md:text-[26px]">
            MSS AI助手
          </h2>
          <p className="mt-2 overflow-x-auto whitespace-nowrap text-center text-[12px] leading-relaxed text-zinc-500 md:text-[13px]">
            当前助手对话暂未开放。请先前往 MSS 工具集市，选择已上架的 Skill 或 Agent 发起执行；完成后可在左侧查看历史任务记录。
          </p>
        </div>

        <div className="relative min-h-[220px] rounded-2xl border border-zinc-200/90 bg-white/95 p-3 shadow-[0_16px_40px_-24px_rgba(24,24,27,0.35)] ring-1 ring-black/[0.03] md:min-h-[260px] md:p-4">
          <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-white/35 backdrop-blur-[1px]" />
          <div className="pointer-events-none relative opacity-90 [&_textarea]:!min-h-[148px] md:[&_textarea]:!min-h-[180px]">
            <SharedComposer
              variant="landing"
              value={draft}
              onChange={onDraftChange}
              onSubmit={() => onSubmitAttempt()}
              disabled
              hideSkill
              placeholder="助手对话即将上线，敬请期待…"
            />
          </div>
          <button
            type="button"
            onClick={onSubmitAttempt}
            className="absolute inset-0 z-20 cursor-not-allowed rounded-2xl"
            aria-label="MSS AI助手待上线"
          />
        </div>

        <p className="mt-4 text-center text-[11px] text-zinc-400">
          助手对话 · 待上线 · 历史任务可在左侧随时回看
        </p>
      </div>
    </div>
  );
}
