import { cn } from '@/lib/utils';
import {
  resolvePipelineStepTargets,
  type ScenarioDemoPlan,
  type ScenarioPipelineStep,
} from '@/domain/scenarioPipeline';
import { CenterModal } from '@/components/center/CenterShell';

interface ExpertTeamModalProps {
  plan: ScenarioDemoPlan | null;
  onClose: () => void;
  /** 启动专家团：从第 index 步开始（默认 0） */
  onStartTeam: (fromIndex?: number) => void;
  /** 单独调用某一步的专家/技能 */
  onInvokeStep: (step: ScenarioPipelineStep) => void;
}

export function ExpertTeamModal({
  plan,
  onClose,
  onStartTeam,
  onInvokeStep,
}: ExpertTeamModalProps) {
  if (!plan || plan.mode !== 'team') return null;

  return (
    <CenterModal
      open
      title={`专家团 · ${plan.scenarioLabel}`}
      onClose={onClose}
      size="lg"
      actions={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onStartTeam(0)}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-zinc-800"
          >
            启动专家团（同会话跑完全程）
          </button>
        </>
      }
    >
      <div className="space-y-3 text-left">
        <p className="text-[12px] leading-relaxed text-zinc-600">
          本场景需要 <span className="font-semibold text-zinc-900">{plan.steps.length}</span>{' '}
          位专家协作。启动后将在同一任务对话中顺序接力（计划自动确认）；也可单独调用某一步。
        </p>
        <ol className="space-y-2">
          {plan.steps.map((step, idx) => {
            const { agent, skill } = resolvePipelineStepTargets(step);
            return (
              <li
                key={`${step.agentId}-${step.skillId ?? idx}`}
                className="flex flex-wrap items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-2.5"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-[10px] font-semibold text-white">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-zinc-900">
                    {step.label}
                    {agent ? (
                      <span className="ml-1.5 font-normal text-zinc-500">· {agent.name}</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">{step.blurb}</p>
                  <p className="mt-1 font-mono text-[10px] text-claw-700">
                    {step.command || skill?.command || '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onInvokeStep(step)}
                  className={cn(
                    'shrink-0 rounded-lg border border-black/8 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-700',
                    'transition hover:bg-zinc-50',
                  )}
                >
                  单独调用
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </CenterModal>
  );
}
