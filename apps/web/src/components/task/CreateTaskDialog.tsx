import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateWarRoom: (title: string) => void;
}

/** 仅用于新建协作空间；Agent 任务统一走首页做任务 */
export function CreateTaskDialog({ open, onClose, onCreateWarRoom }: CreateTaskDialogProps) {
  const [title, setTitle] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    setTitle('');
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
    onCreateWarRoom(title.trim() || '新协作空间');
    setTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <button type="button" aria-label="关闭" className="absolute inset-0" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-title"
        className="relative w-full max-w-md rounded-2xl border border-black/5 bg-white shadow-apple-lg"
      >
        <div className="flex items-center justify-between border-b border-black/[0.05] px-5 py-4">
          <h3 id="create-task-title" className="text-sm font-bold text-[#1d1d1f]">
            新建协作空间
          </h3>
          <button type="button" onClick={onClose} className="text-[#aeaeb2] hover:text-[#6e6e73]">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-[#86868b]">协作空间标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="例如：Q3 拉美 Campaign 协作空间"
              className="w-full rounded-xl border border-black/8 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-claw-500/20"
              autoFocus
            />
          </div>
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
            创建后你将成为管理员，可邀请成员进入本协作空间；AI 能力仅对本空间成员开放。
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-black/[0.05] px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium">
            取消
          </button>
          <button type="button" onClick={handleSubmit} className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white">
            创建
          </button>
        </div>
      </div>
    </div>
  );
}
