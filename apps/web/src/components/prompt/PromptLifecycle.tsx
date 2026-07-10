import {
  PROMPT_LIFECYCLE_FLOW,
  getLifecycleActionLabel,
  getLifecycleClass,
  getLifecycleLabel,
  type Prompt,
  type PromptLifecycle,
} from '@/domain/prompt';
import { cn } from '@/lib/utils';

interface PromptLifecycleBarProps {
  lifecycle: PromptLifecycle;
  onAdvance?: () => void;
}

export function PromptLifecycleBar({ lifecycle, onAdvance }: PromptLifecycleBarProps) {
  const action = getLifecycleActionLabel(lifecycle);
  const currentIdx = PROMPT_LIFECYCLE_FLOW.indexOf(lifecycle);

  return (
    <div className="border-b border-black/[0.06] bg-white px-6 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#aeaeb2]">Publish Lifecycle</h3>
        {action && onAdvance && (
          <button
            type="button"
            onClick={onAdvance}
            className="rounded-lg bg-claw-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-zinc-800"
          >
            {action}
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        {PROMPT_LIFECYCLE_FLOW.map((step, index) => {
          const active = index === currentIdx;
          const done = index < currentIdx;
          return (
            <div key={step} className="flex flex-grow items-center">
              <div
                className={cn(
                  'flex min-w-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center transition',
                  active && 'bg-claw-50 ring-1 ring-claw-200',
                  done && 'opacity-80',
                )}
              >
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold',
                    active ? 'bg-claw-600 text-white' : done ? 'bg-green-500 text-white' : 'bg-slate-200 text-[#86868b]',
                  )}
                >
                  {done ? <i className="fa-solid fa-check text-[9px]" /> : index + 1}
                </div>
                <span className={cn('text-[10px] font-bold', active ? 'text-claw-600' : 'text-[#86868b]')}>
                  {getLifecycleLabel(step)}
                </span>
              </div>
              {index < PROMPT_LIFECYCLE_FLOW.length - 1 && (
                <div className={cn('mx-1 h-0.5 flex-grow', index < currentIdx ? 'bg-green-400' : 'bg-slate-200')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PromptStatusBadge({ lifecycle }: { lifecycle: PromptLifecycle }) {
  return (
    <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold', getLifecycleClass(lifecycle))}>
      {getLifecycleLabel(lifecycle)}
    </span>
  );
}

export function PromptListItem({
  prompt,
  active,
  onClick,
}: {
  prompt: Prompt;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border p-3 text-left transition',
        active ? 'border-zinc-300 bg-claw-50 shadow-sm' : 'border-transparent hover:border-black/[0.06] hover:bg-black/[0.03]',
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-bold text-[#1d1d1f]">{prompt.name}</span>
        <span className="shrink-0 text-[10px] font-mono text-[#aeaeb2]">{prompt.version}</span>
      </div>
      <p className="mb-2 line-clamp-2 text-[11px] text-[#86868b]">{prompt.description}</p>
      <div className="flex items-center justify-between">
        <PromptStatusBadge lifecycle={prompt.lifecycle} />
        {prompt.evaluationScore !== undefined && (
          <span className="text-[10px] font-bold text-emerald-600">Eval {Math.round(prompt.evaluationScore * 100)}%</span>
        )}
      </div>
    </button>
  );
}
