import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { WorkflowInspectorPanel } from '@/components/workflow/WorkflowInspectorPanel';
import { WorkflowListPanel } from '@/components/workflow/WorkflowListPanel';
import { StudioEmptyState, StudioPage, StudioToolbar } from '@/components/studio/StudioShell';
import { useWorkflowStore } from '@/stores/workflowStore';

export function WorkflowStudioPage() {
  const {
    selectedWorkflowId,
    selectedNodeId,
    statusFilter,
    debugRunning,
    debugTrace,
    selectWorkflow,
    selectNode,
    setStatusFilter,
    advanceStatus,
    runDebug,
    selectedWorkflow,
    filteredWorkflows,
  } = useWorkflowStore();

  const workflow = selectedWorkflow();
  const selectedNode = workflow?.nodes.find((n) => n.id === selectedNodeId) ?? null;

  return (
    <StudioPage
      tip={
        <>
          <i className="fa-solid fa-diagram-project text-claw-600" />
          <span>
            <strong>学习提示：</strong>
            Workflow 基于 LangGraph 节点编排。选中节点后在右侧 Inspector 调试，通过后推进发布状态。
          </span>
        </>
      }
    >
      <WorkflowListPanel
        workflows={filteredWorkflows()}
        selectedWorkflowId={selectedWorkflowId}
        statusFilter={statusFilter}
        onSelect={selectWorkflow}
        onFilterChange={setStatusFilter}
      />

      {workflow ? (
        <>
          <div className="studio-editor-panel">
            <StudioToolbar
              icon="fa-diagram-project"
              title={workflow.name}
              badge="LangGraph"
              actions={
                <div className="hidden gap-1.5 md:flex">
                  {(['start', 'llm', 'skill', 'condition', 'approval', 'end'] as const).map((type) => (
                    <span
                      key={type}
                      className="rounded-full border border-black/[0.06] bg-[#fafafa] px-2 py-0.5 text-[9px] font-semibold uppercase text-[#86868b]"
                    >
                      + {type}
                    </span>
                  ))}
                </div>
              }
            />
            <WorkflowCanvas
              workflow={workflow}
              selectedNodeId={selectedNodeId}
              debugTrace={debugTrace}
              onSelectNode={selectNode}
            />
          </div>
          <WorkflowInspectorPanel
            workflow={workflow}
            selectedNode={selectedNode}
            debugTrace={debugTrace}
            debugRunning={debugRunning}
            onRunDebug={() => void runDebug(workflow.id)}
            onAdvanceStatus={() => advanceStatus(workflow.id)}
          />
        </>
      ) : (
        <StudioEmptyState
          icon="fa-diagram-project"
          title="选择一个 Workflow"
          hint="从左侧列表选择已有流程，或在资源浏览器中创建新的 LangGraph 编排"
        />
      )}
    </StudioPage>
  );
}
