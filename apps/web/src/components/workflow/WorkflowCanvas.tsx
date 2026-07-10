import type { Workflow, WorkflowNode } from '@/domain/workflow';
import { getNodeCenter, NODE_META } from '@/domain/workflow';
import { cn } from '@/lib/utils';

interface WorkflowCanvasProps {
  workflow: Workflow;
  selectedNodeId: string | null;
  debugTrace: string[];
  onSelectNode: (nodeId: string) => void;
}

export function WorkflowCanvas({ workflow, selectedNodeId, debugTrace, onSelectNode }: WorkflowCanvasProps) {
  const nodeMap = Object.fromEntries(workflow.nodes.map((n) => [n.id, n]));
  const height = Math.max(...workflow.nodes.map((n) => n.y)) + 120;

  return (
    <div className="relative flex-grow overflow-auto bg-[#f8fafc]">
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }} />

      <svg className="pointer-events-none absolute left-0 top-0" width="600" height={height}>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
          </marker>
        </defs>
        {workflow.edges.map((edge) => {
          const from = nodeMap[edge.from];
          const to = nodeMap[edge.to];
          if (!from || !to) return null;
          const start = getNodeCenter(from);
          const end = getNodeCenter(to);
          const midY = (start.y + end.y) / 2;
          const path =
            Math.abs(start.x - end.x) < 20
              ? `M ${start.x} ${start.y} L ${end.x} ${end.y - 28}`
              : `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y - 28}`;

          return (
            <g key={edge.id}>
              <path d={path} fill="none" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
              {edge.label && (
                <text x={(start.x + end.x) / 2} y={midY - 6} textAnchor="middle" className="fill-slate-400 text-[10px]">
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="relative" style={{ minHeight: height, minWidth: 480 }}>
        {workflow.nodes.map((node) => (
          <CanvasNode
            key={node.id}
            node={node}
            active={selectedNodeId === node.id}
            debugged={debugTrace.some((line) => line.includes(node.label))}
            onClick={() => onSelectNode(node.id)}
          />
        ))}
      </div>
    </div>
  );
}

function CanvasNode({
  node,
  active,
  debugged,
  onClick,
}: {
  node: WorkflowNode;
  active: boolean;
  debugged: boolean;
  onClick: () => void;
}) {
  const meta = NODE_META[node.type];

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ left: node.x, top: node.y }}
      className={cn(
        'absolute w-[180px] rounded-xl border-2 p-3 text-left shadow-sm transition',
        meta.bg,
        meta.border,
        active && 'ring-2 ring-zinc-400 ring-offset-2',
        debugged && 'shadow-md shadow-green-200',
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <i className={cn('fa-solid text-xs', meta.icon, meta.color)} />
        <span className="text-[10px] font-bold uppercase text-[#aeaeb2]">{node.type}</span>
        {debugged && <i className="fa-solid fa-check ml-auto text-[10px] text-green-500" />}
      </div>
      <p className="text-sm font-bold text-[#1d1d1f]">{node.label}</p>
      {node.description && <p className="mt-0.5 line-clamp-1 text-[10px] text-[#86868b]">{node.description}</p>}
    </button>
  );
}
