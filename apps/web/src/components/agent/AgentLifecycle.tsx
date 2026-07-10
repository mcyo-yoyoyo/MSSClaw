import {
  AGENT_STATUS_FLOW,
  getAgentPublishAction,
  getAgentStatusClass,
  getAgentStatusLabel,
  type Agent,
  type AgentStatus,
} from '@/domain/agent';
import { AgentAvatar } from '@/components/brand/AgentAvatar';
import { cn } from '@/lib/utils';

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  return (
    <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold', getAgentStatusClass(status))}>
      {getAgentStatusLabel(status)}
    </span>
  );
}

export function AgentPublishBar({
  status,
  onAdvance,
}: {
  status: AgentStatus;
  onAdvance?: () => void;
}) {
  const action = getAgentPublishAction(status);
  const currentIdx = AGENT_STATUS_FLOW.indexOf(status);

  return (
    <div className="border-b border-black/[0.06] bg-white px-6 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#aeaeb2]">Agent Lifecycle</h3>
        {action && onAdvance && (
          <button
            type="button"
            onClick={onAdvance}
            className="apple-btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
          >
            {action}
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        {AGENT_STATUS_FLOW.map((step, index) => {
          const active = index === currentIdx;
          const done = index < currentIdx;
          return (
            <div key={step} className="flex flex-grow items-center">
              <div className={cn('flex flex-col items-center gap-1 px-2 py-1', active && 'rounded-lg bg-claw-50 ring-1 ring-claw-200')}>
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold',
                    active ? 'bg-claw-600 text-white' : done ? 'bg-green-500 text-white' : 'bg-slate-200 text-[#86868b]',
                  )}
                >
                  {done ? <i className="fa-solid fa-check text-[9px]" /> : index + 1}
                </div>
                <span className={cn('text-[10px] font-bold', active ? 'text-claw-600' : 'text-[#86868b]')}>
                  {getAgentStatusLabel(step)}
                </span>
              </div>
              {index < AGENT_STATUS_FLOW.length - 1 && (
                <div className={cn('mx-1 h-0.5 flex-grow', index < currentIdx ? 'bg-green-400' : 'bg-slate-200')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AgentListItem({
  agent,
  active,
  onClick,
}: {
  agent: Agent;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('studio-list-item', active && 'active')}
    >
      <div className="mb-2 flex items-center gap-2">
        <AgentAvatar agentId={agent.id} size={32} title={agent.name} />
        <div className="min-w-0 flex-grow">
          <p className="truncate text-sm font-bold text-[#1d1d1f]">{agent.name}</p>
          <p className="truncate text-[10px] text-[#86868b]">{agent.llm.model}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <AgentStatusBadge status={agent.status} />
        <span className="font-mono text-[10px] text-[#aeaeb2]">{agent.version}</span>
      </div>
    </button>
  );
}
