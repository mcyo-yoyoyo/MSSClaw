import { AGENT_STATUS_FLOW, getAgentStatusLabel, type AgentStatus } from '@/domain/agent';
import { AgentListItem } from '@/components/agent/AgentLifecycle';
import type { Agent } from '@/domain/agent';
import {
  StudioFilterChip,
  StudioListPanelHeader,
} from '@/components/studio/StudioShell';

interface AgentListPanelProps {
  agents: Agent[];
  selectedAgentId: string | null;
  statusFilter: AgentStatus | 'all';
  onSelect: (id: string) => void;
  onFilterChange: (filter: AgentStatus | 'all') => void;
}

export function AgentListPanel({
  agents,
  selectedAgentId,
  statusFilter,
  onSelect,
  onFilterChange,
}: AgentListPanelProps) {
  return (
    <aside className="studio-list-panel w-wide">
      <StudioListPanelHeader
        title="Agent Studio"
        subtitle="Persona · 绑定 · 测试 · 发布"
      />

      <div className="border-b border-black/[0.05] px-3 py-3">
        <div className="flex flex-wrap gap-1.5">
          <StudioFilterChip active={statusFilter === 'all'} onClick={() => onFilterChange('all')} label="全部" />
          {AGENT_STATUS_FLOW.map((step) => (
            <StudioFilterChip
              key={step}
              active={statusFilter === step}
              onClick={() => onFilterChange(step)}
              label={getAgentStatusLabel(step)}
            />
          ))}
        </div>
      </div>

      <div className="scroll-hidden flex-grow space-y-1.5 overflow-y-auto p-3">
        {agents.map((agent) => (
          <AgentListItem
            key={agent.id}
            agent={agent}
            active={selectedAgentId === agent.id}
            onClick={() => onSelect(agent.id)}
          />
        ))}
      </div>
    </aside>
  );
}
