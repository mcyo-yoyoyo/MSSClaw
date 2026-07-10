import type { ChatMessage } from '@/domain/chat';
import { cn } from '@/lib/utils';

export function StepMessageRow({ message }: { message: ChatMessage }) {
  const status = message.stepStatus ?? 'pending';
  const icon =
    status === 'done'
      ? 'fa-circle-check text-claw-600'
      : status === 'running'
        ? 'fa-spinner fa-spin text-amber-500'
        : 'fa-circle text-slate-300';

  return (
    <div className="step-msg mb-1.5 flex max-w-[95%] gap-2.5">
      <div className="w-8 shrink-0" />
      <div
        className={cn(
          'step-line flex items-center gap-2 rounded-lg border border-black/[0.05] border-l-[3px] px-3 py-1.5 text-[11px] text-[#6e6e73]',
          status === 'running' && 'active',
          status === 'done' && 'done',
        )}
      >
        <i className={cn('fa-solid text-[10px]', icon)} />
        <span className="mono text-[10px] text-[#aeaeb2]">
          {message.index}/{message.total}
        </span>
        <span>{message.label}</span>
      </div>
    </div>
  );
}
