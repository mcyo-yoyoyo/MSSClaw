import type { Workflow, WorkflowNode } from '@/domain/workflow';
import { NODE_META } from '@/domain/workflow';
import { WorkflowStatusBadge } from '@/components/workflow/WorkflowListPanel';
import { cn } from '@/lib/utils';

interface WorkflowInspectorPanelProps {
  workflow: Workflow;
  selectedNode: WorkflowNode | null;
  debugTrace: string[];
  debugRunning: boolean;
  onRunDebug: () => void;
  onAdvanceStatus: () => void;
}

export function WorkflowInspectorPanel({
  workflow,
  selectedNode,
  debugTrace,
  debugRunning,
  onRunDebug,
  onAdvanceStatus,
}: WorkflowInspectorPanelProps) {
  return (
    <aside className="studio-inspector-panel w-[300px]">
      <div className="border-b border-black/[0.06] bg-white px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#aeaeb2]">Inspector</h3>
      </div>

      <section className="border-b border-black/[0.06] p-4">
        <h4 className="mb-2 text-[11px] font-bold uppercase text-[#86868b]">Workflow</h4>
        <p className="mb-2 text-sm font-bold text-[#1d1d1f]">{workflow.name}</p>
        <WorkflowStatusBadge status={workflow.status} />
        <dl className="mt-3 space-y-1.5 text-xs">
          <Row label="Version" value={workflow.version} />
          <Row label="Nodes" value={String(workflow.nodes.length)} />
          <Row label="Edges" value={String(workflow.edges.length)} />
          <Row label="Author" value={workflow.author} />
        </dl>
        <button
          type="button"
          onClick={onAdvanceStatus}
          className="mt-3 w-full rounded-lg border border-zinc-200 bg-claw-50 py-2 text-xs font-bold text-claw-600 hover:bg-zinc-100"
        >
          推进发布状态
        </button>
      </section>

      {selectedNode && (
        <section className="border-b border-black/[0.06] p-4">
          <h4 className="mb-2 text-[11px] font-bold uppercase text-[#86868b]">Selected Node</h4>
          <div className={cn('mb-2 rounded-lg border p-3', NODE_META[selectedNode.type].bg, NODE_META[selectedNode.type].border)}>
            <p className="text-sm font-bold text-[#1d1d1f]">{selectedNode.label}</p>
            <p className="text-[10px] uppercase text-[#86868b]">{selectedNode.type}</p>
          </div>
          {selectedNode.config && (
            <dl className="space-y-1.5 text-xs">
              {Object.entries(selectedNode.config).map(([key, value]) => (
                <Row key={key} label={key} value={value} />
              ))}
            </dl>
          )}
        </section>
      )}

      <section className="flex flex-grow flex-col p-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[11px] font-bold uppercase text-[#86868b]">Debug Trace</h4>
          <button
            type="button"
            onClick={onRunDebug}
            disabled={debugRunning}
            className="rounded-lg bg-slate-900 px-3 py-1 text-[10px] font-bold text-white hover:bg-black disabled:opacity-50"
          >
            {debugRunning ? 'Running...' : 'Debug'}
          </button>
        </div>
        <div className="scroll-hidden flex-grow overflow-y-auto rounded-lg border border-black/[0.06] bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-green-400">
          {debugTrace.length === 0 ? (
            <span className="text-[#86868b]">点击 Debug 逐步回放节点执行</span>
          ) : (
            debugTrace.map((line, i) => <div key={i}>{line}</div>)
          )}
        </div>
      </section>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[#aeaeb2]">{label}</dt>
      <dd className="font-medium text-[#424245]">{value}</dd>
    </div>
  );
}
