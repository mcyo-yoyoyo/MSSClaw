import type { Agent } from '@/domain/agent';
import { AgentStatusBadge } from '@/components/agent/AgentLifecycle';

interface AgentInspectorPanelProps {
  agent: Agent;
  onOpenChat?: () => void;
}

export function AgentInspectorPanel({ agent, onOpenChat }: AgentInspectorPanelProps) {
  return (
    <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-black/[0.06] bg-[#fafafa]/80">
      <div className="border-b border-black/[0.06] bg-white px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#aeaeb2]">Inspector</h3>
      </div>

      <section className="border-b border-black/[0.06] p-4">
        <h4 className="mb-3 text-[11px] font-bold uppercase text-[#86868b]">Runtime Config</h4>
        <dl className="space-y-2 text-xs">
          <Row label="Model" value={agent.llm.model} />
          <Row label="Temperature" value={String(agent.llm.temperature)} />
          <Row label="Max Tokens" value={String(agent.llm.maxTokens)} />
          <Row label="Version" value={agent.version} />
          <Row label="Status" value={<AgentStatusBadge status={agent.status} />} />
        </dl>
      </section>

      <section className="border-b border-black/[0.06] p-4">
        <h4 className="mb-3 text-[11px] font-bold uppercase text-[#86868b]">Binding Summary</h4>
        <div className="grid grid-cols-2 gap-2 text-center">
          {[
            ['Skills', agent.bindings.skillIds.length],
            ['Tools', agent.bindings.toolIds.length],
            ['Workflows', agent.bindings.workflowIds.length],
            ['Knowledge', agent.bindings.knowledgeIds.length],
          ].map(([label, count]) => (
            <div key={label as string} className="rounded-lg border border-black/[0.06] bg-white p-3">
              <p className="text-lg font-bold text-claw-600">{count as number}</p>
              <p className="text-[10px] text-[#86868b]">{label as string}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-black/[0.06] p-4">
        <h4 className="mb-3 text-[11px] font-bold uppercase text-[#86868b]">Tags</h4>
        <div className="flex flex-wrap gap-1.5">
          {agent.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-[#6e6e73]">
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className="p-4">
        <h4 className="mb-3 text-[11px] font-bold uppercase text-[#86868b]">Actions</h4>
        <div className="space-y-2">
          {agent.chatId && onOpenChat && (
            <button
              type="button"
              onClick={onOpenChat}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-claw-50 py-2.5 text-xs font-bold text-claw-600 hover:bg-zinc-100"
            >
              <i className="fa-solid fa-message" /> 在 Chat 中测试
            </button>
          )}
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/[0.06] bg-white py-2.5 text-xs font-bold text-[#6e6e73] hover:bg-black/[0.03]"
          >
            <i className="fa-solid fa-clock-rotate-left" /> 查看 Trace 历史
          </button>
        </div>
        <p className="mt-3 text-[10px] text-[#aeaeb2]">
          更新：{agent.updatedAt} · {agent.author}
        </p>
      </section>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[#aeaeb2]">{label}</dt>
      <dd className="text-right font-medium text-[#424245]">{value}</dd>
    </div>
  );
}
