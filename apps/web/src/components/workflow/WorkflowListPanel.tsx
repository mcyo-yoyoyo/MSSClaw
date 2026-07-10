import type { Workflow } from '@/domain/workflow';
import { getWorkflowStatusClass, getWorkflowStatusLabel, WORKFLOW_STATUS_FLOW, type WorkflowStatus } from '@/domain/workflow';
import { cn } from '@/lib/utils';
import {
  StudioFilterChip,
  StudioListPanelHeader,
} from '@/components/studio/StudioShell';

export function WorkflowStatusBadge({ status }: { status: WorkflowStatus }) {
  return (
    <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-semibold', getWorkflowStatusClass(status))}>
      {getWorkflowStatusLabel(status)}
    </span>
  );
}

interface WorkflowListPanelProps {
  workflows: Workflow[];
  selectedWorkflowId: string | null;
  statusFilter: WorkflowStatus | 'all';
  onSelect: (id: string) => void;
  onFilterChange: (filter: WorkflowStatus | 'all') => void;
}

export function WorkflowListPanel({
  workflows,
  selectedWorkflowId,
  statusFilter,
  onSelect,
  onFilterChange,
}: WorkflowListPanelProps) {
  return (
    <aside className="studio-list-panel">
      <StudioListPanelHeader title="Workflow 画布" subtitle="LangGraph · 专家编排" />

      <div className="border-b border-black/[0.05] px-3 py-3">
        <div className="flex flex-wrap gap-1.5">
          <StudioFilterChip active={statusFilter === 'all'} onClick={() => onFilterChange('all')} label="全部" />
          {WORKFLOW_STATUS_FLOW.map((s) => (
            <StudioFilterChip
              key={s}
              active={statusFilter === s}
              onClick={() => onFilterChange(s)}
              label={getWorkflowStatusLabel(s)}
            />
          ))}
        </div>
      </div>

      <div className="scroll-hidden flex-grow space-y-1.5 overflow-y-auto p-3">
        {workflows.length === 0 ? (
          <p className="px-2 py-8 text-center text-[12px] text-[#86868b]">暂无 Workflow</p>
        ) : (
          workflows.map((wf) => (
            <button
              key={wf.id}
              type="button"
              onClick={() => onSelect(wf.id)}
              className={cn('studio-list-item', selectedWorkflowId === wf.id && 'active')}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-[12px] font-semibold text-[#1d1d1f]">{wf.name}</span>
                <span className="shrink-0 font-mono text-[10px] text-[#aeaeb2]">{wf.version}</span>
              </div>
              <p className="mb-2 line-clamp-2 text-[11px] text-[#86868b]">{wf.description}</p>
              <WorkflowStatusBadge status={wf.status} />
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
