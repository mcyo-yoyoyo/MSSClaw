import { useState } from 'react';
import type { Skill } from '@/domain/skill';
import { getSkillLifecycleAction, SKILL_LIFECYCLE_FLOW, getSkillLifecycleLabel } from '@/domain/skill';
import type { SkillTraceStep } from '@/domain/skill';
import { cn } from '@/lib/utils';

interface SkillEditorPanelProps {
  skill: Skill;
  liveTrace: SkillTraceStep[];
  traceRunning: boolean;
  onAdvanceLifecycle: () => void;
  onRunTrace: () => void;
}

export function SkillEditorPanel({
  skill,
  liveTrace,
  traceRunning,
  onAdvanceLifecycle,
  onRunTrace,
}: SkillEditorPanelProps) {
  const [tab, setTab] = useState<'schema' | 'trace' | 'deps'>('schema');
  const action = getSkillLifecycleAction(skill.lifecycle);
  const currentIdx = SKILL_LIFECYCLE_FLOW.indexOf(skill.lifecycle);

  return (
    <div className="studio-editor-panel">
      <div className="border-b border-black/[0.06] bg-white px-6 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#aeaeb2]">Skill Lifecycle</h3>
          {action && (
            <button
              type="button"
              onClick={onAdvanceLifecycle}
              className="rounded-lg bg-claw-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800"
            >
              {action}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {SKILL_LIFECYCLE_FLOW.map((step, index) => (
            <div key={step} className="flex flex-grow items-center">
              <div className={cn('flex flex-col items-center gap-1 px-1', index === currentIdx && 'rounded-lg bg-claw-50 px-2 py-1 ring-1 ring-claw-200')}>
                <span className={cn('text-[10px] font-bold', index === currentIdx ? 'text-claw-600' : 'text-[#aeaeb2]')}>
                  {getSkillLifecycleLabel(step)}
                </span>
              </div>
              {index < SKILL_LIFECYCLE_FLOW.length - 1 && (
                <div className={cn('mx-0.5 h-0.5 flex-grow', index < currentIdx ? 'bg-green-400' : 'bg-slate-200')} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-black/[0.05] px-6 py-3">
        <div>
          <h2 className="font-mono text-lg font-bold text-[#1d1d1f]">{skill.name}</h2>
          <p className="text-xs text-[#86868b]">{skill.displayName} · {skill.description}</p>
        </div>
        <div className="flex rounded-lg border border-black/[0.06] bg-black/[0.04] p-0.5">
          {(['schema', 'trace', 'deps'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                'rounded-md px-4 py-1.5 text-xs font-bold capitalize transition',
                tab === item ? 'bg-white text-claw-600 shadow-sm' : 'text-[#86868b]',
              )}
            >
              {item === 'schema' ? 'Schema' : item === 'trace' ? 'Trace' : 'Deps'}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-hidden flex-grow overflow-y-auto p-6">
        {tab === 'schema' && (
          <div className="mx-auto grid max-w-3xl gap-4">
            <SchemaBlock title="Input Schema" code={skill.inputSchema} />
            <SchemaBlock title="Output Schema" code={skill.outputSchema} />
            <div className="grid grid-cols-3 gap-3">
              <MetricCard label="Retry" value={String(skill.retry)} />
              <MetricCard label="Timeout" value={`${skill.timeoutMs}ms`} />
              <MetricCard label="Memory" value={skill.memoryPolicy} />
            </div>
            {skill.promptName && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-[10px] font-bold uppercase text-claw-600">Bound Prompt</p>
                <code className="text-sm font-bold text-[#1d1d1f]">{skill.promptName}</code>
              </div>
            )}
            {skill.toolNames.length > 0 && (
              <div className="rounded-xl border border-black/[0.06] p-4">
                <p className="mb-2 text-[10px] font-bold uppercase text-[#86868b]">Tools</p>
                <div className="flex flex-wrap gap-2">
                  {skill.toolNames.map((tool) => (
                    <span key={tool} className="rounded-lg bg-black/[0.04] px-2.5 py-1 text-[11px] font-medium text-[#424245]">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'trace' && (
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase text-[#86868b]">Live Trace</h4>
              <button
                type="button"
                onClick={onRunTrace}
                disabled={traceRunning}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-black disabled:opacity-50"
              >
                {traceRunning ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin" /> Running...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-bug" /> Run Skill Trace
                  </>
                )}
              </button>
            </div>
            <div className="cot-timeline space-y-0">
              {(liveTrace.length ? liveTrace : skill.lastTrace ?? []).map((step, i) => (
                <TraceStep key={i} step={step} />
              ))}
              {liveTrace.length === 0 && !skill.lastTrace?.length && (
                <p className="py-8 text-center text-sm text-[#aeaeb2]">点击 Run Skill Trace 开始调试</p>
              )}
            </div>
          </div>
        )}

        {tab === 'deps' && (
          <div className="mx-auto max-w-2xl space-y-4">
            <DepSection title="Depends On" items={skill.dependsOn} empty="无上游依赖" accent="amber" />
            <DepSection title="Used By Agents" items={skill.usedByAgents} empty="暂无 Agent 引用" accent="indigo" />
            <DepSection title="Used By Workflows" items={skill.usedByWorkflows} empty="暂无 Workflow 引用" accent="violet" />
          </div>
        )}
      </div>
    </div>
  );
}

function SchemaBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="rounded-xl border border-black/[0.06] overflow-hidden">
      <div className="border-b border-black/[0.06] bg-[#fafafa] px-4 py-2">
        <span className="text-[10px] font-bold uppercase text-[#86868b]">{title}</span>
      </div>
      <pre className="bg-slate-900 p-4 font-mono text-[12px] text-green-400">{code}</pre>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-white p-3 text-center">
      <p className="text-[10px] font-bold uppercase text-[#aeaeb2]">{label}</p>
      <p className="mt-1 text-sm font-bold text-[#1d1d1f]">{value}</p>
    </div>
  );
}

function TraceStep({ step }: { step: SkillTraceStep }) {
  const statusColor = step.status === 'ok' ? 'border-green-500' : step.status === 'warn' ? 'border-amber-500' : 'border-red-500';
  return (
    <div className="cot-node flex gap-4">
      <div className="w-20 shrink-0 pt-1 text-right font-mono text-[10px] text-[#aeaeb2]">{step.timestamp}</div>
      <div className={cn('flex-grow rounded-lg border border-black/[0.06] border-l-4 bg-white p-3', statusColor)}>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#1d1d1f]">{step.phase}</span>
          <span className="font-mono text-[10px] text-claw-600">{step.latency}</span>
        </div>
        <p className="text-[11px] text-[#86868b]">{step.detail}</p>
      </div>
    </div>
  );
}

function DepSection({
  title,
  items,
  empty,
  accent,
}: {
  title: string;
  items: string[];
  empty: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-black/[0.06] p-4">
      <h4 className={cn('mb-3 text-xs font-bold uppercase', `text-${accent}-600`)}>{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-[#aeaeb2]">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item} className="rounded-lg border border-black/[0.06] bg-[#fafafa] px-3 py-1.5 text-[11px] font-medium text-[#424245]">
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
