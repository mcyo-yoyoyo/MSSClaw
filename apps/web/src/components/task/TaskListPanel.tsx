import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { ChatConfig } from '@/domain/chat';
import { isUserCreatedTask } from '@/domain/chat';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/stores/taskStore';

interface TaskListPanelProps {
  chats: Record<string, ChatConfig>;
  currentChatId: string;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onOpenResources?: () => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, title: string) => boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function matchSearch(chat: ChatConfig, q: string) {
  if (!q) return true;
  const hay = `${chat.title} ${chat.status} ${chat.badge ?? ''}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

function isRenamableAgentTask(chat: ChatConfig) {
  return chat.id.startsWith('task_');
}

function SessionItem({
  chat,
  active,
  onClick,
  onDelete,
  onRename,
}: {
  chat: ChatConfig;
  active: boolean;
  onClick: () => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, title: string) => boolean;
}) {
  const iconBg = chat.iconBg ?? 'bg-gradient-to-br from-[#18181b] to-[#18181b]';
  const deletable = isUserCreatedTask(chat);
  const renamable = Boolean(onRename) && isRenamableAgentTask(chat);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraftTitle(chat.title);
  }, [chat.title, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitRename = () => {
    const next = draftTitle.trim();
    if (!next || next === chat.title) {
      setDraftTitle(chat.title);
      setEditing(false);
      return;
    }
    const ok = onRename?.(chat.id, next);
    if (ok === false) {
      setDraftTitle(chat.title);
    }
    setEditing(false);
  };

  const handleDelete = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!onDelete) return;
    const ok = window.confirm(`确定删除任务「${chat.title}」？\n删除后对话记录将无法恢复。`);
    if (ok) onDelete(chat.id);
  };

  const handleRenameClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setDraftTitle(chat.title);
    setEditing(true);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraftTitle(chat.title);
      setEditing(false);
    }
  };

  return (
    <div className={cn('chat-nav-item-wrap group relative', active && 'active')}>
      <button
        type="button"
        onClick={onClick}
        onDoubleClick={(e) => {
          if (!renamable) return;
          e.preventDefault();
          e.stopPropagation();
          setDraftTitle(chat.title);
          setEditing(true);
        }}
        className={cn(
          'chat-nav-item relative flex w-full items-center gap-3 px-4 py-2.5 text-left',
          active && 'active',
          (deletable || renamable) && 'pr-16',
        )}
      >
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm text-white shadow-sm', iconBg)}>
          <i className={cn('fa-solid', chat.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={commitRename}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-zinc-300 bg-white px-1.5 py-0.5 text-[13px] font-semibold text-[#1d1d1f] outline-none ring-2 ring-zinc-900/10"
              maxLength={64}
              aria-label="重命名任务"
            />
          ) : (
            <span className="block truncate text-[13px] font-semibold text-[#1d1d1f]">{chat.title}</span>
          )}
          <span className="block truncate text-[10px] text-[#86868b]">
            {chat.badge ?? (chat.type === 'group' ? 'WarRoom' : 'Agent')}
          </span>
        </div>
      </button>
      {!editing && (
        <div className="session-action-btns">
          {renamable && (
            <button
              type="button"
              onClick={handleRenameClick}
              className="session-action-btn session-rename-btn"
              title="重命名"
              aria-label={`重命名任务 ${chat.title}`}
            >
              <i className="fa-solid fa-pen text-[10px]" />
            </button>
          )}
          {deletable && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="session-action-btn session-delete-btn"
              title="删除任务"
              aria-label={`删除任务 ${chat.title}`}
            >
              <i className="fa-solid fa-trash-can text-[10px]" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function TaskListPanel({
  chats,
  currentChatId,
  onSwitch,
  onCreate,
  onOpenResources,
  onDelete,
  onRename,
  collapsed,
  onToggleCollapse,
}: TaskListPanelProps) {
  const { sessionSearch, setSessionSearch, sessionGroupsCollapsed, toggleSessionGroup } = useTaskStore();

  const pinned = Object.values(chats)
    .filter((c) => c.sessionGroup === 'pinned' && matchSearch(c, sessionSearch))
    .sort((a, b) => (b.pinnedAt ?? b.createdAt ?? 0) - (a.pinnedAt ?? a.createdAt ?? 0));

  const agents = Object.values(chats)
    .filter((c) => (c.sessionGroup === 'agents' || (!c.sessionGroup && c.type === 'bot')) && matchSearch(c, sessionSearch))
    .sort((a, b) => (b.pinnedAt ?? b.createdAt ?? 0) - (a.pinnedAt ?? a.createdAt ?? 0));

  return (
    <>
      <aside
        className={cn(
          'task-list-panel z-30 flex shrink-0 flex-col border-r border-black/[0.06] bg-white',
          collapsed && 'collapsed',
        )}
      >
        <div className="border-b border-black/[0.06] px-4 pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#86868b] transition hover:bg-black/[0.04] hover:text-claw-600"
                title="收起任务列表"
              >
                <i className="fa-solid fa-chevron-left text-xs" />
              </button>
              <h2 className="truncate text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">任务列表</h2>
            </div>
            <button
              type="button"
              onClick={onCreate}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-claw-600 text-white shadow-sm shadow-black/10 transition hover:bg-zinc-700"
              title="新建 WarRoom 或 Agent 任务"
            >
              <i className="fa-solid fa-plus text-xs" />
            </button>
            {onOpenResources && (
              <button
                type="button"
                onClick={onOpenResources}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-black/8 text-[#86868b] transition hover:border-zinc-400 hover:text-claw-600"
                title="资源浏览"
              >
                <i className="fa-solid fa-folder-tree text-xs" />
              </button>
            )}
          </div>
          <div className="relative">
            <i className="fa-solid fa-search absolute left-3 top-2.5 text-xs text-[#aeaeb2]" />
            <input
              type="text"
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              placeholder="搜索 Agent、任务或消息…"
              className="w-full rounded-xl border border-black/8 bg-[#fafafa] py-2 pl-9 pr-3 text-[13px] text-[#1d1d1f] placeholder:text-[#aeaeb2] focus:border-zinc-900/30 focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
            />
          </div>
        </div>

        <div className="scroll-hidden flex-grow overflow-y-auto py-2">
          <div className={cn('session-group', sessionGroupsCollapsed.pinned && 'collapsed')}>
            <button type="button" className="session-group-header" onClick={() => toggleSessionGroup('pinned')}>
              <span className="flex items-center gap-2">
                <span>WarRoom</span>
                <span className="mono font-normal text-[#aeaeb2]">{pinned.length}</span>
              </span>
              <i className="fa-solid fa-chevron-down session-group-chevron" />
            </button>
            <div className="session-group-body">
              {pinned.length ? (
                pinned.map((c) => (
                  <SessionItem
                    key={c.id}
                    chat={c}
                    active={currentChatId === c.id}
                    onClick={() => onSwitch(c.id)}
                    onDelete={onDelete}
                  />
                ))
              ) : (
                <p className="px-4 py-3 text-[11px] text-[#86868b]">暂无 WarRoom · 点击 + 创建</p>
              )}
            </div>
          </div>

          <div className={cn('session-group mt-2', sessionGroupsCollapsed.agents && 'collapsed')}>
            <button type="button" className="session-group-header" onClick={() => toggleSessionGroup('agents')}>
              <span className="flex items-center gap-2">
                <span>Agent 任务</span>
                <span className="mono font-normal text-[#aeaeb2]">{agents.length}</span>
              </span>
              <i className="fa-solid fa-chevron-down session-group-chevron" />
            </button>
            <div className="session-group-body">
              {agents.length ? (
                agents.map((c) => (
                  <SessionItem
                    key={c.id}
                    chat={c}
                    active={currentChatId === c.id}
                    onClick={() => onSwitch(c.id)}
                    onDelete={onDelete}
                    onRename={onRename}
                  />
                ))
              ) : (
                <p className="px-4 py-3 text-[11px] text-[#86868b]">暂无 Agent 任务 · 点击 + 创建</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-black/[0.06] bg-[#fafafa]/80 px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] text-[#86868b]">
            <i className="fa-solid fa-shield-halved text-claw-600" />
            <span>企业数据护栏 · GDPR Compliant</span>
          </div>
        </div>
      </aside>

      {collapsed && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="task-list-expand-tab visible flex flex-col items-center justify-center gap-1 text-[10px] font-semibold"
          title="展开任务列表"
        >
          <i className="fa-solid fa-list-check text-sm" />
          <span style={{ writingMode: 'vertical-rl' }}>任务</span>
        </button>
      )}
    </>
  );
}
