import { ToolEditorPanel } from '@/components/tool/ToolEditorPanel';
import { ToolInspectorPanel } from '@/components/tool/ToolInspectorPanel';
import { ToolListPanel } from '@/components/tool/ToolListPanel';
import { StudioEmptyState, StudioPage } from '@/components/studio/StudioShell';
import { useToolStore } from '@/stores/toolStore';

export function ToolCenterPage() {
  const {
    selectedToolId,
    typeFilter,
    selectTool,
    setTypeFilter,
    testRunning,
    testConnection,
    selectedTool,
    filteredTools,
  } = useToolStore();

  const tool = selectedTool();

  return (
    <StudioPage
      tip={
        <>
          <i className="fa-solid fa-circle-info text-claw-600" />
          <span>
            <strong>学习提示：</strong>
            Tool 是外部连接器（API / MCP）。在 Skill 中心编辑时选择「连接器（Tool）」即可完成挂载。
          </span>
        </>
      }
    >
      <ToolListPanel
        tools={filteredTools()}
        selectedToolId={selectedToolId}
        typeFilter={typeFilter}
        onSelect={selectTool}
        onTypeFilterChange={setTypeFilter}
      />

      {tool ? (
        <>
          <ToolEditorPanel
            tool={tool}
            testRunning={testRunning}
            onTestConnection={() => void testConnection(tool.id)}
          />
          <ToolInspectorPanel tool={tool} />
        </>
      ) : (
        <StudioEmptyState
          icon="fa-plug"
          title="选择一个 Tool"
          hint="从左侧列表选择连接器，或注册新的 HTTP / MCP / OpenAPI Tool"
        />
      )}
    </StudioPage>
  );
}
