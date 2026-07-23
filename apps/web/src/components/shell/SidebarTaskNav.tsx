import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { ChatConfig } from '@/domain/chat';
import { isUserCreatedTask, isWarRoom } from '@/domain/chat';
import {
  getTaskUiStatus,
  selectSidebarTasks,
  SIDEBAR_ACTIVE_TASK_LIMIT,
  taskUiStatusClass,
} from '@/domain/taskUiStatus';
import { ROUTE_PREFETCH } from '@/features/lazyPages';
import { cn } from '@/lib/utils';
import { canExecuteChat } from '@/domain/permissions';
import { useAppViewStore } from '@/stores/appViewStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useTaskStore } from '@/stores/taskStore';

export type SidebarChatKind = 'agents' | 'warrooms';

function isRenamableAgentTask(chat: ChatConfig) {
  return chat.id.startsWith('task_');
}

function SidebarSessionItem({
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
  const status = getTaskUiStatus(chat);
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
    if (ok === false) setDraftTitle(chat.title);
    setEditing(false);
  };

  const handleDelete = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!onDelete) return;
    const label = isWarRoom(chat) ? '协作空间' : '任务';
    const ok = window.confirm(`确定删除${label}「${chat.title}」？\n删除后对话记录将无法恢复。`);
    if (ok) onDelete(chat.id);
  };

  return (
    <div className={cn('sidebar-task-item group relative', active && 'active')}>
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
          'wb-nav-item wb-nav-item-nested w-full',
          active && 'active',
          (deletable || renamable) && 'pr-12',
        )}
        title={`${chat.title} · ${status.label}`}
      >
        <i
          className={cn(
            'fa-solid w-5 shrink-0 text-center text-[12px] text-zinc-400',
            isWarRoom(chat) ? 'fa-comments' : 'fa-comment-dots',
          )}
        />
        <span className="nav-label min-w-0 flex-1 truncate text-left">
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={commitRename}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitRename();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setDraftTitle(chat.title);
                  setEditing(false);
                }
              }}
              className="w-full rounded border border-zinc-300 bg-white px-1 py-0.5 text-[11px] font-medium text-zinc-900 outline-none"
              maxLength={64}
              aria-label="重命名"
            />
          ) : (
            chat.title
          )}
        </span>
        {!editing && (
          <span
            className={cn(
              'nav-label shrink-0 rounded px-1 py-0.5 text-[9px] font-medium leading-none',
              taskUiStatusClass(status.id),
            )}
          >
            {status.label}
          </span>
        )}
      </button>
      {!editing && (
        <div className="sidebar-task-actions">
          {renamable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDraftTitle(chat.title);
                setEditing(true);
              }}
              className="sidebar-task-action-btn"
              title="重命名"
            >
              <i className="fa-solid fa-pen text-[9px]" />
            </button>
          )}
          {deletable && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="sidebar-task-action-btn danger"
              title="删除"
            >
              <i className="fa-solid fa-trash-can text-[9px]" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface SidebarTaskNavProps {
  kind: SidebarChatKind;
  /** 一级菜单文案：任务记录 / 协作空间 */
  label: string;
  /** 折叠侧栏 / tooltip 用短名 */
  shortLabel?: string;
  icon: string;
  compact?: boolean;
}

export function SidebarTaskNav({
  kind,
  label,
  shortLabel,
  icon,
  compact = false,
}: SidebarTaskNavProps) {
  const appView = useAppViewStore((s) => s.appView);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const chats = useConversationStore((s) => s.chats);
  const currentChatId = useConversationStore((s) => s.currentChatId);
  const switchChat = useConversationStore((s) => s.switchChat);
  const deleteTaskSession = useConversationStore((s) => s.deleteTaskSession);
  const renameTaskSession = useConversationStore((s) => s.renameTaskSession);
  const setTaskLanding = useTaskStore((s) => s.setTaskLanding);
  const taskLanding = useTaskStore((s) => s.taskLanding);
  const platformRole = useSessionStore((s) => s.user?.platformRole);
  const canManage = canExecuteChat(platformRole);
  const [showAll, setShowAll] = useState(false);

  const allItems = useMemo(() => {
    const list = Object.values(chats).filter((c) =>
      kind === 'warrooms'
        ? c.sessionGroup === 'pinned' || isWarRoom(c)
        : c.sessionGroup === 'agents' || (!c.sessionGroup && c.type === 'bot'),
    );
    return list.sort(
      (a, b) => (b.pinnedAt ?? b.createdAt ?? 0) - (a.pinnedAt ?? a.createdAt ?? 0),
    );
  }, [chats, kind]);

  const { visible, total } = useMemo(() => {
    if (kind === 'warrooms') {
      return { visible: allItems, total: allItems.length };
    }
    if (showAll) {
      return selectSidebarTasks(allItems, currentChatId, allItems.length);
    }
    return selectSidebarTasks(allItems, currentChatId);
  }, [allItems, currentChatId, kind, showAll]);

  const current = chats[currentChatId];
  const kindActive =
    appView === 'task' &&
    (kind === 'warrooms'
      ? taskLanding === 'collab' ||
        Boolean(current && (isWarRoom(current) || current.sessionGroup === 'pinned'))
      : taskLanding === 'tasks' || Boolean(current && !isWarRoom(current)));

  const tip = shortLabel ?? label;

  const openChat = (chatId?: string) => {
    const landing = kind === 'warrooms' ? 'collab' : 'tasks';
    setTaskLanding(landing);
    if (chatId) {
      switchChat(chatId);
    } else if (allItems[0]) {
      switchChat(allItems[0]!.id);
    } else {
      // 空列表：进入任务区对应空态，不自动弹新建
      useConversationStore.setState({ currentChatId: '' });
    }
    setAppView('task');
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => openChat()}
        onMouseEnter={() => ROUTE_PREFETCH.task?.()}
        className={cn('wb-nav-item', kindActive && 'active')}
        title={tip}
      >
        <i className={cn('fa-solid w-5 text-center text-[15px]', icon)} />
        <span className="nav-label">{label}</span>
      </button>
    );
  }

  return (
    <div className="sidebar-task-nav">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => openChat()}
          onMouseEnter={() => ROUTE_PREFETCH.task?.()}
          className={cn('wb-nav-item min-w-0 flex-1', kindActive && 'active')}
          title={tip}
        >
          <i className={cn('fa-solid w-5 text-center text-[15px]', icon)} />
          <span className="nav-label">{label}</span>
          <span className="nav-label ml-auto text-[10px] font-normal text-zinc-400">{total}</span>
        </button>
      </div>

      {visible.length > 0 && (
        <div className="mt-0.5">
          {visible.map((c) => (
            <SidebarSessionItem
              key={c.id}
              chat={c}
              active={appView === 'task' && currentChatId === c.id}
              onClick={() => openChat(c.id)}
              onDelete={canManage ? (id) => deleteTaskSession(id) : undefined}
              onRename={
                canManage && kind === 'agents' && c.id.startsWith('task_')
                  ? (id, title) => renameTaskSession(id, title)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {kind === 'agents' && total > SIDEBAR_ACTIVE_TASK_LIMIT ? (
        <button
          type="button"
          onClick={() => {
            if (showAll) {
              setShowAll(false);
              return;
            }
            setShowAll(true);
            setAppView('task');
          }}
          className="mt-0.5 w-full rounded-lg px-3 py-1.5 text-left text-[11px] text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
        >
          {showAll ? '收起' : `全部任务（${total}）…`}
        </button>
      ) : null}
    </div>
  );
}
