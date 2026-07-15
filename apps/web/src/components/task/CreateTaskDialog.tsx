import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useTaskStore } from '@/stores/taskStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateAgent: (title: string, agentId?: string) => void;
  onCreateWarRoom: (title: string) => void;
}

export function CreateTaskDialog({ open, onClose, onCreateAgent, onCreateWarRoom }: CreateTaskDialogProps) {
  const preset = useTaskStore((s) => s.createDialogPreset);
  const agents = useMarketplaceStore((s) => s.agents);
  const publishedAgents = agents.filter((a) => a.published);
  const [type, setType] = useState<'agent' | 'warroom'>('agent');
  const [title, setTitle] = useState('');
  const [agentId, setAgentId] = useState('agent-data-analysis');
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    setType(preset);
    setTitle('');
    const first = agents.find((a) => a.published)?.id ?? 'agent-data-analysis';
    setAgentId(first);
  }, [open, preset, agents]);

  if (!open) return null;

  const handleSubmit = () => {
    const t = title.trim() || (type === 'warroom' ? '新协作室' : '新 Agent 任务');
    if (type === 'warroom') onCreateWarRoom(t);
    else onCreateAgent(t, agentId);
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
            新建任务
          </h3>
          <button type="button" onClick={onClose} className="text-[#aeaeb2] hover:text-[#6e6e73]">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('agent')}
              className={cn(
                'flex-1 rounded-xl border px-3 py-2 text-[12px] font-semibold transition',
                type === 'agent' ? 'border-zinc-900 bg-claw-50 text-zinc-700' : 'border-black/8 hover:border-zinc-400',
              )}
            >
              Agent 任务
            </button>
            <button
              type="button"
              onClick={() => setType('warroom')}
              className={cn(
                'flex-1 rounded-xl border px-3 py-2 text-[12px] font-semibold transition',
                type === 'warroom' ? 'border-zinc-900 bg-claw-50 text-zinc-700' : 'border-black/8 hover:border-zinc-400',
              )}
            >
              协作室
            </button>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-[#86868b]">任务标题</label>
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
              placeholder={type === 'warroom' ? '例如：Q3 拉美 Campaign 作战室' : '例如：代表处 SO 排名分析'}
              className="w-full rounded-xl border border-black/8 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-claw-500/20"
              autoFocus
            />
          </div>
          {type === 'agent' && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[#86868b]">绑定 Agent</label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full rounded-xl border border-black/8 px-3 py-2 text-[13px]"
              >
                {publishedAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {type === 'warroom' && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
              创建后你将成为管理员，可邀请成员进入本协作室；AI 能力仅对本室成员开放。
            </p>
          )}
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
