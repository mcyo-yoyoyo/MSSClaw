import { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ChatConfig, WarRoomMember } from '@/domain/chat';
import { isWarRoomAdmin } from '@/domain/chat';
import { getCurrentUserId } from '@/domain/currentUser';
import { getMembersByWorkspace, type WorkspaceMember } from '@/domain/rbac';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface WarRoomMembersModalProps {
  open: boolean;
  chat: ChatConfig;
  workspaceId: string;
  onClose: () => void;
  onAddMember: (member: WarRoomMember) => void;
  onRemoveMember: (memberId: string) => void;
  onToggleAi: (memberId: string, canUseAi: boolean) => void;
}

export function WarRoomMembersModal({
  open,
  chat,
  workspaceId,
  onClose,
  onAddMember,
  onRemoveMember,
  onToggleAi,
}: WarRoomMembersModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  useFocusTrap(open, dialogRef);

  const members = chat.members ?? [];
  const isAdmin = isWarRoomAdmin(chat);
  const workspaceMembers = useMemo(() => getMembersByWorkspace(workspaceId), [workspaceId]);

  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workspaceMembers
      .filter((m) => m.status === 'active' && !memberIds.has(m.id))
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [workspaceMembers, memberIds, query]);

  if (!open) return null;

  const addFromWorkspace = (wm: WorkspaceMember) => {
    onAddMember({
      id: wm.id,
      name: wm.name,
      email: wm.email,
      avatar: wm.avatar,
      role: 'member',
      canUseAi: true,
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <button type="button" aria-label="关闭" className="absolute inset-0" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-apple-lg"
      >
        <div className="flex items-center justify-between border-b border-black/[0.05] px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-[#1d1d1f]">WarRoom 成员</h3>
            <p className="mt-0.5 text-[11px] text-[#86868b]">
              {chat.title} · AI 仅对本室成员开放
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-[#aeaeb2] hover:text-[#6e6e73]">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="scroll-hidden flex-1 space-y-4 overflow-y-auto p-5">
          <section>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              当前成员 · {members.length}
            </h4>
            <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
              {members.map((m) => {
                const isSelf = m.id === getCurrentUserId();
                const isOwner = m.role === 'admin' || m.id === chat.adminId;
                return (
                  <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white',
                        m.avatar || 'bg-zinc-600',
                      )}
                    >
                      {m.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-zinc-900">
                        {m.name}
                        {isSelf && <span className="ml-1 text-[10px] text-zinc-400">（我）</span>}
                      </p>
                      <p className="truncate text-[10px] text-zinc-500">
                        {isOwner ? '管理员' : '成员'}
                        {m.email ? ` · ${m.email}` : ''}
                      </p>
                    </div>
                    {isAdmin && (
                      <label className="flex shrink-0 items-center gap-1.5 text-[10px] text-zinc-500">
                        <input
                          type="checkbox"
                          checked={m.canUseAi !== false}
                          disabled={isOwner}
                          onChange={(e) => onToggleAi(m.id, e.target.checked)}
                        />
                        AI
                      </label>
                    )}
                    {isAdmin && !isOwner && (
                      <button
                        type="button"
                        onClick={() => onRemoveMember(m.id)}
                        className="rounded-lg px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50"
                      >
                        移除
                      </button>
                    )}
                  </li>
                );
              })}
              {!members.length && (
                <li className="px-3 py-6 text-center text-[12px] text-zinc-400">暂无成员</li>
              )}
            </ul>
          </section>

          {isAdmin && (
            <section>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                添加工作区成员
              </h4>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索姓名或邮箱…"
                className="mb-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {candidates.map((wm) => (
                  <li key={wm.id}>
                    <button
                      type="button"
                      onClick={() => addFromWorkspace(wm)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-zinc-50"
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white',
                          wm.avatar,
                        )}
                      >
                        {wm.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-zinc-900">{wm.name}</p>
                        <p className="truncate text-[10px] text-zinc-500">{wm.email}</p>
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-700">
                        <i className="fa-solid fa-plus mr-1" />
                        添加
                      </span>
                    </button>
                  </li>
                ))}
                {!candidates.length && (
                  <li className="px-3 py-4 text-center text-[12px] text-zinc-400">
                    {query ? '无匹配成员' : '工作区成员均已加入'}
                  </li>
                )}
              </ul>
            </section>
          )}

          {!isAdmin && (
            <p className="rounded-xl bg-zinc-50 px-3 py-2 text-[11px] text-zinc-500">
              仅 WarRoom 管理员可添加或移除成员。
            </p>
          )}
        </div>

        <div className="border-t border-black/[0.05] px-5 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="apple-btn-secondary rounded-xl px-4 py-2 text-[12px] font-semibold"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
