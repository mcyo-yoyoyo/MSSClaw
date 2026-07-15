import { useRef, useState } from 'react';
import type { ChatConfig, ChatMessage } from '@/domain/chat';
import { isUserCreatedTask, isWarRoom } from '@/domain/chat';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { PlanMessageCard } from '@/components/chat/PlanMessageCard';
import { StepMessageRow } from '@/components/chat/StepMessageRow';
import { SharedComposer } from '@/components/chat/SharedComposer';
import { cn } from '@/lib/utils';
import { useConversationStore } from '@/stores/conversationStore';

interface TaskChatPanelProps {
  chat: ChatConfig;
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: (text: string) => void;
  isAgentTyping: boolean;
  streamStatus?: string | null;
  onCancelStream?: () => void;
  onApprovePlan: (planId: string, steps: string[]) => void;
  onSavePlan: (planId: string, steps: string[]) => void;
  onPinChat: () => void;
  onExportChat: () => void;
  onShareChat?: () => void;
  onDeleteChat?: () => void;
  onClearSandbox: () => void;
  onManageMembers?: () => void;
  /** WarRoom 内是否允许当前用户使用 AI */
  aiAllowed?: boolean;
  /** 右侧交付物预览已收起时，聊天区占满剩余宽度 */
  previewCollapsed?: boolean;
}

export function TaskChatPanel({
  chat,
  draft,
  onDraftChange,
  onSend,
  isAgentTyping,
  streamStatus,
  onCancelStream,
  onApprovePlan,
  onSavePlan,
  onPinChat,
  onExportChat,
  onShareChat,
  onDeleteChat,
  onClearSandbox,
  onManageMembers,
  aiAllowed = true,
  previewCollapsed = false,
}: TaskChatPanelProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const iconBg = chat.iconBg ?? 'bg-gradient-to-br from-[#18181b] to-[#18181b]';
  const canDelete = isUserCreatedTask(chat) && !!onDeleteChat;
  const warroom = isWarRoom(chat);
  const memberCount = chat.members?.length ?? 0;

  const renderMessage = (message: ChatMessage, index: number) => {
    if (message.role === 'plan') {
      return (
        <PlanMessageCard
          key={`plan-${message.planId ?? index}`}
          message={message}
          iconBg={iconBg}
          iconClass={chat.icon}
          onApprove={onApprovePlan}
          onSavePlan={onSavePlan}
        />
      );
    }
    if (message.role === 'step') {
      return <StepMessageRow key={message.stepId ?? index} message={message} />;
    }
    return (
      <MessageBubble
        key={`${message.role}-${index}`}
        message={message}
        accentColor="claw"
        iconClass={chat.icon}
        iconBg={iconBg}
      />
    );
  };

  return (
    <main
      className={cn(
        'task-chat-panel relative z-20 flex min-h-0 flex-col border-r border-zinc-200/80 bg-white',
        previewCollapsed
          ? 'min-w-0 flex-1'
          : 'w-[340px] min-w-[300px] max-w-[380px] shrink-0',
      )}
    >
      <header className="glass-bar flex h-14 shrink-0 items-center justify-between border-b border-black/[0.06] px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className={cn('relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm', iconBg)}>
            <i className={cn('fa-solid', chat.icon)} />
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
          </div>
          <div className="min-w-0 flex-col">
            <h2 className="truncate text-[14px] font-semibold leading-tight text-[#1d1d1f]">{chat.title}</h2>
            <span className={cn('truncate text-[10px]', chat.type === 'bot' ? 'font-medium text-claw-600' : 'text-[#86868b]')}>
              {chat.status}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {warroom && onManageMembers && (
            <button
              type="button"
              onClick={onManageMembers}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium text-[#86868b] transition hover:bg-black/[0.04] hover:text-[#1d1d1f]"
              title="管理成员"
            >
              <i className="fa-solid fa-user-group text-[11px]" />
              <span>{memberCount || 1}</span>
            </button>
          )}
          <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#86868b] transition hover:bg-black/[0.04] hover:text-[#1d1d1f]"
            title="任务菜单"
          >
            <i className="fa-solid fa-ellipsis-vertical text-sm" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-black/8 bg-white py-1 shadow-apple-lg">
              {warroom && onManageMembers && (
                <button
                  type="button"
                  onClick={() => {
                    onManageMembers();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] text-[#1d1d1f] hover:bg-black/[0.04]"
                >
                  <i className="fa-solid fa-user-plus w-4 text-[#86868b]" />
                  管理成员
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onPinChat();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] text-[#1d1d1f] hover:bg-black/[0.04]"
              >
                <i className="fa-solid fa-thumbtack w-4 text-[#86868b]" />
                置顶任务
              </button>
              <button
                type="button"
                onClick={() => {
                  onExportChat();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] text-[#1d1d1f] hover:bg-black/[0.04]"
              >
                <i className="fa-solid fa-file-export w-4 text-[#86868b]" />
                导出对话 JSON
              </button>
              {onShareChat && (
                <button
                  type="button"
                  onClick={() => {
                    onShareChat();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] text-[#1d1d1f] hover:bg-black/[0.04]"
                >
                  <i className="fa-solid fa-link w-4 text-[#86868b]" />
                  复制任务链接
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onClearSandbox();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] text-[#1d1d1f] hover:bg-black/[0.04]"
              >
                <i className="fa-solid fa-eraser w-4 text-[#86868b]" />
                清空交付物
              </button>
              {canDelete && (
                <>
                  <div className="my-1 border-t border-black/[0.06]" />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      const ok = window.confirm(`确定删除任务「${chat.title}」？\n删除后对话记录将无法恢复。`);
                      if (ok) onDeleteChat?.();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] text-red-600 hover:bg-red-50"
                  >
                    <i className="fa-solid fa-trash-can w-4" />
                    删除任务
                  </button>
                </>
              )}
            </div>
          )}
          </div>
        </div>
      </header>

      <div className="chat-surface scroll-hidden flex-grow space-y-4 overflow-y-auto px-5 py-4">
        {chat.history.map((m, i) => renderMessage(m, i))}
      </div>

      {warroom && (
        <div className="border-t border-amber-100 bg-amber-50/80 px-4 py-2 text-[10px] text-amber-800">
          <i className="fa-solid fa-shield-halved mr-1.5" />
          本室成员可在对话框中 @ Agent、/ Skill 调用 AI
          {!aiAllowed && ' · 你当前无 AI 权限，请联系管理员'}
        </div>
      )}

      {!warroom &&
        chat.prompts.length > 0 &&
        aiAllowed &&
        (chat.id === 'marketing' || chat.id === 'knowledge') && (
        <div className="border-t border-black/[0.06] bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#86868b]">
              <i className="fa-solid fa-bolt text-amber-500" />
              推荐指令
            </span>
            <button
              type="button"
              onClick={() => useConversationStore.getState().dismissAllChatPrompts()}
              className="rounded px-1.5 py-0.5 text-[10px] text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              title="关闭全部推荐"
            >
              全部关闭
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {chat.prompts.slice(0, 3).map((prompt) => (
              <div
                key={prompt}
                className="prompt-chip group flex items-stretch overflow-hidden rounded-lg bg-white"
              >
                <button
                  type="button"
                  onClick={() => onSend(prompt)}
                  className="line-clamp-1 min-w-0 flex-1 px-3 py-2.5 text-left text-[12px] text-[#424245] transition hover:bg-zinc-50"
                >
                  <i className="fa-solid fa-terminal mr-1 text-[10px] text-[#aeaeb2]" />
                  {prompt}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    useConversationStore.getState().dismissChatPrompt(prompt);
                  }}
                  className="flex w-8 shrink-0 items-center justify-center border-l border-zinc-100 text-zinc-300 transition hover:bg-zinc-50 hover:text-zinc-600"
                  title="关闭此推荐"
                  aria-label="关闭此推荐"
                >
                  <i className="fa-solid fa-xmark text-[11px]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative shrink-0 border-t border-zinc-200/80 bg-white p-3">
        {!aiAllowed ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-center">
            <p className="text-[12px] font-medium text-zinc-700">无法在本 WarRoom 使用 AI</p>
            <p className="mt-1 text-[11px] text-zinc-500">请联系管理员将你加入成员，或开启 AI 权限</p>
            {onManageMembers && (
              <button
                type="button"
                onClick={onManageMembers}
                className="mt-3 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                查看成员
              </button>
            )}
          </div>
        ) : (
          <SharedComposer
            variant="workspace"
            value={draft}
            onChange={onDraftChange}
            onSubmit={onSend}
            disabled={isAgentTyping}
            placeholder={warroom ? '本室成员可 @ Agent、/ Skill…' : '继续对话… @ Agent · / Skill'}
          />
        )}
      </div>

      {streamStatus && (
        <div
          className={cn(
            'exec-status-bar flex shrink-0 items-center justify-between px-4 py-2 text-[11px] text-zinc-800',
            isAgentTyping && 'running',
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <i className={cn('fa-solid shrink-0 text-claw-600', isAgentTyping ? 'fa-spinner fa-spin' : 'fa-circle-check')} />
            <span className="truncate font-medium">{streamStatus}</span>
          </div>
          {isAgentTyping && onCancelStream && (
            <button
              type="button"
              onClick={onCancelStream}
              className="shrink-0 rounded px-2 py-1 text-[10px] font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            >
              取消
            </button>
          )}
        </div>
      )}
    </main>
  );
}
