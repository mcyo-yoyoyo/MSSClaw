import type { ExecutionStep } from '@/domain/chat';

interface ExecutionTraceProps {
  steps: ExecutionStep[];
  totalTime: string;
  accent: 'indigo' | 'emerald';
}

const ACCENT = {
  indigo: {
    icon: 'text-claw-600',
    badge: 'border-zinc-200 bg-claw-50 text-claw-600',
    latency: 'text-claw-600',
    hover: 'hover:border-zinc-300',
  },
  emerald: {
    icon: 'text-emerald-600',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-600',
    latency: 'text-emerald-600',
    hover: 'hover:border-emerald-300',
  },
} as const;

export function ExecutionTrace({ steps, totalTime, accent }: ExecutionTraceProps) {
  const styles = ACCENT[accent];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between border-b border-black/[0.05] pb-4">
        <div>
          <h3 className={`flex items-center gap-2 text-lg font-bold text-[#1d1d1f]`}>
            <i className={`fa-solid fa-network-wired ${styles.icon}`} /> Agent Execution DAG
          </h3>
          <p className="mt-1 text-xs text-[#86868b]">记录大模型拆解意图并调度企业 Skill (Tools) 的完整思维链与耗时。</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase text-[#aeaeb2]">Total Latency</span>
          <p className={`font-mono text-xl font-bold ${styles.latency}`}>{totalTime}</p>
        </div>
      </div>

      <div className="cot-timeline">
        {steps.map((step) => (
          <div key={step.skill} className="cot-node flex gap-5">
            <div className="w-28 shrink-0 pt-1 text-right">
              <span className={`inline-block rounded border px-2 py-1 font-mono text-[10px] font-bold ${styles.badge}`}>
                {step.skill}
              </span>
              <div className="mt-1 font-mono text-[10px] text-[#aeaeb2]">
                <i className="fa-regular fa-clock" /> {step.time}
              </div>
            </div>
            <div className={`flex-grow rounded-lg border border-black/[0.06] bg-white p-3 shadow-sm transition-colors ${styles.hover}`}>
              <h6 className="mb-1 text-[12px] font-bold text-[#1d1d1f]">{step.label}</h6>
              <p className="text-[11px] leading-relaxed text-[#86868b]">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
