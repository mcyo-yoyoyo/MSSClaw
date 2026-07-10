import { useEffect, useState } from 'react';

import type { ChatMessage } from '@/domain/chat';

import { cn } from '@/lib/utils';



interface PlanMessageCardProps {

  message: ChatMessage;

  iconBg?: string;

  iconClass?: string;

  onApprove: (planId: string, steps: string[]) => void;

  onSavePlan: (planId: string, steps: string[]) => void;

}



export function PlanMessageCard({

  message,

  iconBg = 'bg-gradient-to-br from-[#18181b] to-[#18181b]',

  iconClass = 'fa-robot',

  onApprove,

  onSavePlan,

}: PlanMessageCardProps) {

  const [steps, setSteps] = useState(message.steps ?? []);

  const [checked, setChecked] = useState<Set<number>>(() => new Set((message.steps ?? []).map((_, i) => i)));

  const [editing, setEditing] = useState(false);

  const editable = message.awaitingApproval ?? false;

  const planId = message.planId ?? '';



  useEffect(() => {

    setSteps(message.steps ?? []);

    setChecked(new Set((message.steps ?? []).map((_, i) => i)));

  }, [message.planId, message.steps]);



  const selectedSteps = steps.filter((_, i) => checked.has(i)).map((s) => s.trim()).filter(Boolean);



  const toggleChecked = (index: number) => {

    setChecked((prev) => {

      const next = new Set(prev);

      if (next.has(index)) next.delete(index);

      else next.add(index);

      return next;

    });

  };



  const handleSave = () => {

    if (!selectedSteps.length) return;

    onSavePlan(planId, selectedSteps);

    setEditing(false);

  };



  return (

    <div className="mb-3 flex max-w-[95%] gap-2.5">

      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs text-white shadow-sm', iconBg)}>

        <i className={cn('fa-solid', iconClass)} />

      </div>

      <div className="flex min-w-0 flex-1 flex-col">

        <span className="mb-1 ml-0.5 text-[10px] font-semibold text-[#86868b]">

          {message.name} · 执行计划

        </span>

        <div className="plan-card rounded-2xl px-4 py-3">

          <p className="mb-2 text-[12px] font-bold text-claw-900">

            <i className="fa-solid fa-list-check mr-1 text-claw-600" />

            已理解任务，请确认后执行：

          </p>

          {(message.mountedSkills?.length ?? 0) > 0 && (

            <>

              <p className="mb-1.5 text-[10px] text-[#86868b]">挂载 Skill</p>

              <div className="mb-2 flex flex-wrap gap-1.5">

                {message.mountedSkills!.map((s) => (

                  <span

                    key={s}

                    className="rounded-full border border-zinc-200 bg-claw-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-700"

                  >

                    {s}

                  </span>

                ))}

              </div>

            </>

          )}

          <ul className="space-y-1.5">

            {steps.map((step, i) => (

              <li key={i} className="flex items-center gap-2 text-[12px] text-[#6e6e73]">

                <input

                  type="checkbox"

                  checked={checked.has(i)}

                  disabled={!editable}

                  onChange={() => toggleChecked(i)}

                  className="plan-step-check shrink-0 accent-claw-600"

                />

                <input

                  type="text"

                  value={step}

                  readOnly={!editable || !editing}

                  onChange={(e) => {

                    const next = [...steps];

                    next[i] = e.target.value;

                    setSteps(next);

                  }}

                  className="plan-step-text flex-1 rounded border border-zinc-200 bg-white/60 px-2 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-claw-400"

                />

              </li>

            ))}

          </ul>

          {editable && (

            <div className="mt-3 flex flex-wrap gap-2">

              <button

                type="button"

                onClick={() => onApprove(planId, selectedSteps)}

                disabled={!selectedSteps.length}

                className="rounded-lg bg-claw-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-zinc-700 disabled:opacity-50"

              >

                <i className="fa-solid fa-play mr-1" />

                确认执行

              </button>

              {editing ? (

                <button

                  type="button"

                  onClick={handleSave}

                  disabled={!selectedSteps.length}

                  className="rounded-lg border border-zinc-200 bg-claw-50 px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:bg-claw-100 disabled:opacity-50"

                >

                  保存计划

                </button>

              ) : (

                <button

                  type="button"

                  onClick={() => setEditing(true)}

                  className="rounded-lg border border-black/[0.06] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#6e6e73] transition hover:border-zinc-400"

                >

                  调整计划

                </button>

              )}

              {editing && (

                <button

                  type="button"

                  onClick={() => {

                    setSteps(message.steps ?? []);

                    setChecked(new Set((message.steps ?? []).map((_, idx) => idx)));

                    setEditing(false);

                  }}

                  className="rounded-lg border border-black/[0.06] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#86868b] transition hover:bg-black/[0.03]"

                >

                  取消

                </button>

              )}

            </div>

          )}

        </div>

      </div>

    </div>

  );

}


