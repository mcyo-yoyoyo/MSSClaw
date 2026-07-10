import { useState } from 'react';
import type { Agent } from '@/domain/agent';
import { AgentPublishBar } from '@/components/agent/AgentLifecycle';
import { cn } from '@/lib/utils';

interface AgentEditorPanelProps {
  agent: Agent;
  onPersonaChange: (value: string) => void;
  onAdvanceStatus: () => void;
  testInput: string;
  testRunning: boolean;
  onTestInputChange: (value: string) => void;
  onRunTest: () => void;
}

export function AgentEditorPanel({
  agent,
  onPersonaChange,
  onAdvanceStatus,
  testInput,
  testRunning,
  onTestInputChange,
  onRunTest,
}: AgentEditorPanelProps) {
  const [tab, setTab] = useState<'persona' | 'bindings' | 'test'>('persona');

  return (
    <div className="studio-editor-panel">
      <AgentPublishBar status={agent.status} onAdvance={onAdvanceStatus} />

      <div className="flex items-center justify-between border-b border-black/[0.05] px-6 py-3">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-white', `bg-${agent.color}-600`)}>
            <i className={cn('fa-solid', agent.icon)} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1d1d1f]">{agent.name}</h2>
            <p className="text-xs text-[#86868b]">{agent.description}</p>
          </div>
        </div>
        <div className="flex rounded-lg border border-black/[0.06] bg-black/[0.04] p-0.5">
          {(['persona', 'bindings', 'test'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                'rounded-md px-4 py-1.5 text-xs font-bold capitalize transition',
                tab === item ? 'bg-white text-claw-600 shadow-sm' : 'text-[#86868b]',
              )}
            >
              {item === 'persona' ? 'Persona' : item === 'bindings' ? 'Bindings' : 'Test'}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-hidden flex-grow overflow-y-auto p-6">
        {tab === 'persona' && (
          <div className="mx-auto max-w-3xl space-y-4">
            <label className="block text-xs font-bold uppercase text-[#86868b]">System Persona</label>
            <textarea
              value={agent.persona}
              onChange={(e) => onPersonaChange(e.target.value)}
              rows={14}
              className="w-full rounded-xl border border-black/[0.06] bg-[#fafafa] p-4 font-mono text-[13px] leading-relaxed text-[#1d1d1f] focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
            <p className="text-[11px] text-[#aeaeb2]">Persona 定义 Agent 角色边界与输出风格，发布前需通过 Test 验证。</p>
          </div>
        )}

        {tab === 'bindings' && (
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4">
            <BindingCard title="Prompt" icon="fa-file-lines" items={[agent.bindings.promptName]} accent="indigo" />
            <BindingCard
              title="Workflows"
              icon="fa-diagram-project"
              items={agent.bindings.workflowNames.length ? agent.bindings.workflowNames : ['未绑定']}
              accent="violet"
            />
            <BindingCard title="Skills" icon="fa-puzzle-piece" items={agent.bindings.skillNames} accent="blue" />
            <BindingCard
              title="Knowledge"
              icon="fa-database"
              items={agent.bindings.knowledgeNames.length ? agent.bindings.knowledgeNames : ['未绑定']}
              accent="emerald"
            />
            <BindingCard title="Tools" icon="fa-screwdriver-wrench" items={agent.bindings.toolNames} accent="amber" colSpan />
          </div>
        )}

        {tab === 'test' && (
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="rounded-xl border border-black/[0.06] bg-[#fafafa] p-4">
              <h4 className="mb-2 text-xs font-bold uppercase text-[#86868b]">Sandbox Test Input</h4>
              <textarea
                value={testInput}
                onChange={(e) => onTestInputChange(e.target.value)}
                rows={4}
                placeholder="输入测试问题，验证 Agent 绑定与 Persona..."
                className="w-full rounded-lg border border-black/[0.06] bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
              <button
                type="button"
                onClick={onRunTest}
                disabled={testRunning || !testInput.trim()}
                className="mt-3 flex items-center gap-2 rounded-lg bg-claw-600 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {testRunning ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin" /> 运行中...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-play" /> 运行 Agent Test
                  </>
                )}
              </button>
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-[#86868b]">
              完整 Trace / Replay 将在接入 Runtime API 后显示于此
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BindingCard({
  title,
  icon,
  items,
  accent,
  colSpan,
}: {
  title: string;
  icon: string;
  items: string[];
  accent: string;
  colSpan?: boolean;
}) {
  return (
    <div className={cn('rounded-xl border border-black/[0.06] bg-white p-4 shadow-sm', colSpan && 'col-span-2')}>
      <h4 className={cn('mb-3 flex items-center gap-2 text-xs font-bold uppercase', `text-${accent}-600`)}>
        <i className={cn('fa-solid', icon)} /> {title}
      </h4>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-lg border border-black/[0.06] bg-[#fafafa] px-2.5 py-1 text-[11px] font-medium text-[#424245]">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
