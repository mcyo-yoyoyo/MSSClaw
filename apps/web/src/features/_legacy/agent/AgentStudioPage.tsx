import { AgentEditorPanel } from '@/components/agent/AgentEditorPanel';
import { AgentInspectorPanel } from '@/components/agent/AgentInspectorPanel';
import { AgentListPanel } from '@/components/agent/AgentListPanel';
import { StudioEmptyState, StudioPage } from '@/components/studio/StudioShell';
import { useAgentStore } from '@/stores/agentStore';

interface AgentStudioPageProps {
  onOpenChat?: (chatId: string) => void;
}

export function AgentStudioPage({ onOpenChat }: AgentStudioPageProps) {
  const {
    selectedAgentId,
    statusFilter,
    selectAgent,
    setStatusFilter,
    updatePersona,
    advanceStatus,
    testInput,
    testRunning,
    setTestInput,
    runTest,
    selectedAgent,
    filteredAgents,
  } = useAgentStore();

  const agent = selectedAgent();

  return (
    <StudioPage
      tip={
        <>
          <i className="fa-solid fa-wand-magic-sparkles text-claw-600" />
          <span>
            <strong>学习提示：</strong>
            Agent Studio 用于配置 Persona、绑定 Skill / Workflow，测试通过后可发布至 Agent 中心供团队调用。
          </span>
        </>
      }
    >
      <AgentListPanel
        agents={filteredAgents()}
        selectedAgentId={selectedAgentId}
        statusFilter={statusFilter}
        onSelect={selectAgent}
        onFilterChange={setStatusFilter}
      />

      {agent ? (
        <>
          <AgentEditorPanel
            agent={agent}
            onPersonaChange={(value) => updatePersona(agent.id, value)}
            onAdvanceStatus={() => advanceStatus(agent.id)}
            testInput={testInput}
            testRunning={testRunning}
            onTestInputChange={setTestInput}
            onRunTest={() => void runTest(agent.id)}
          />
          <AgentInspectorPanel
            agent={agent}
            onOpenChat={agent.chatId && onOpenChat ? () => onOpenChat(agent.chatId!) : undefined}
          />
        </>
      ) : (
        <StudioEmptyState
          icon="fa-robot"
          title="选择一个 Agent"
          hint="从左侧列表选择 Agent，配置 Persona 与绑定关系后运行测试"
        />
      )}
    </StudioPage>
  );
}
