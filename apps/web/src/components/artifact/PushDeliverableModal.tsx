import { useMemo, useState } from 'react';
import { CenterModal } from '@/components/center/CenterShell';
import { ModalActions } from '@/components/center/CenterFormFields';
import { isWarRoom, type ChatConfig } from '@/domain/chat';
import type { WorkspaceMember } from '@/domain/rbac';
import { cn } from '@/lib/utils';

export type PushDeliverableTarget =
  | { mode: 'warroom'; warroomIds: string[] }
  | { mode: 'members'; memberIds: string[] };

interface PushDeliverableModalProps {
  open: boolean;
  onClose: () => void;
  warrooms: ChatConfig[];
  members: WorkspaceMember[];
  onConfirm: (target: PushDeliverableTarget) => void;
}

type Tab = 'warroom' | 'members';

export function PushDeliverableModal({
  open,
  onClose,
  warrooms,
  members,
  onConfirm,
}: PushDeliverableModalProps) {
  const [tab, setTab] = useState<Tab>('warroom');
  const [warroomIds, setWarroomIds] = useState<string[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const rooms = useMemo(() => warrooms.filter((c) => isWarRoom(c)), [warrooms]);

  const toggle = (list: string[], id: string, set: (v: string[]) => void) => {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleConfirm = () => {
    if (tab === 'warroom') {
      if (!warroomIds.length) return;
      onConfirm({ mode: 'warroom', warroomIds });
    } else {
      if (!memberIds.length) return;
      onConfirm({ mode: 'members', memberIds });
    }
    setWarroomIds([]);
    setMemberIds([]);
    onClose();
  };

  const canSave =
    tab === 'warroom' ? warroomIds.length > 0 : memberIds.length > 0;

  return (
    <CenterModal
      open={open}
      title="推送交付物"
      onClose={onClose}
      size="lg"
      elevate
      actions={
        <ModalActions
          onCancel={onClose}
          onSave={() => {
            if (!canSave) return;
            handleConfirm();
          }}
          saveLabel={canSave ? '发送' : '请先选择'}
        />
      }
    >
      <div className="space-y-3 text-left">
        <p className="text-[11px] leading-relaxed text-zinc-500">
          选择作战室或成员接收交付物通知。作战室将写入群聊记录；成员将收到「我的消息」。
        </p>

        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
          {(
            [
              ['warroom', '作战室'],
              ['members', '成员'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-[11px] font-semibold transition',
                tab === id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'warroom' ? (
          <ul className="max-h-[40vh] space-y-1.5 overflow-y-auto">
            {rooms.length === 0 ? (
              <li className="rounded-xl border border-dashed border-zinc-200 px-3 py-8 text-center text-[12px] text-zinc-400">
                暂无作战室，请先在任务中心创建 WarRoom
              </li>
            ) : (
              rooms.map((room) => {
                const checked = warroomIds.includes(room.id);
                return (
                  <li key={room.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition',
                        checked
                          ? 'border-zinc-900 bg-zinc-900/5'
                          : 'border-zinc-200 hover:border-zinc-300',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="accent-claw-600"
                        checked={checked}
                        onChange={() => toggle(warroomIds, room.id, setWarroomIds)}
                      />
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
                        <i className="fa-solid fa-users text-[11px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold text-zinc-900">
                          {room.title}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {room.members?.length ?? 0} 名成员 · 协作室
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })
            )}
          </ul>
        ) : (
          <ul className="max-h-[40vh] space-y-1.5 overflow-y-auto">
            {members.length === 0 ? (
              <li className="rounded-xl border border-dashed border-zinc-200 px-3 py-8 text-center text-[12px] text-zinc-400">
                当前工作区暂无成员
              </li>
            ) : (
              members.map((m) => {
                const checked = memberIds.includes(m.id);
                return (
                  <li key={m.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition',
                        checked
                          ? 'border-zinc-900 bg-zinc-900/5'
                          : 'border-zinc-200 hover:border-zinc-300',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="accent-claw-600"
                        checked={checked}
                        onChange={() => toggle(memberIds, m.id, setMemberIds)}
                      />
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white',
                          m.avatar || 'bg-zinc-700',
                        )}
                      >
                        {(m.name?.[0] ?? '?').toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold text-zinc-900">
                          {m.name}
                        </span>
                        <span className="truncate text-[10px] text-zinc-400">
                          {m.email || m.id}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    </CenterModal>
  );
}
