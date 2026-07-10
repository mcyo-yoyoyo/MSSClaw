import type { ModuleId } from '@/domain/chat';
import { cn } from '@/lib/utils';

const MODULES: { id: ModuleId; label: string; icon: string }[] = [
  { id: 'chat', label: 'Chat', icon: 'fa-message' },
  { id: 'agent', label: 'Agent', icon: 'fa-robot' },
  { id: 'prompt', label: 'Prompt', icon: 'fa-file-lines' },
  { id: 'skill', label: 'Skill', icon: 'fa-puzzle-piece' },
  { id: 'tool', label: 'Tool', icon: 'fa-screwdriver-wrench' },
  { id: 'workflow', label: 'Workflow', icon: 'fa-layer-group' },
  { id: 'knowledge', label: 'Knowledge', icon: 'fa-database' },
  { id: 'memory', label: 'Memory', icon: 'fa-brain' },
  { id: 'settings', label: 'Settings', icon: 'fa-gear' },
];

interface AppSidebarProps {
  activeModule: ModuleId;
  workspaceName: string;
  onChange: (module: ModuleId) => void;
}

export function AppSidebar({ activeModule, workspaceName, onChange }: AppSidebarProps) {
  return (
    <nav className="z-50 flex w-16 shrink-0 flex-col items-center bg-slate-900 py-4">
      <div
        className="mb-3 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-claw-500 shadow-lg"
        title={workspaceName}
      >
        <i className="fa-solid fa-shield-cat text-lg text-white" />
      </div>
      <p className="mb-4 max-w-[52px] truncate text-center text-[8px] font-medium text-[#aeaeb2]" title={workspaceName}>
        {workspaceName}
      </p>

      <div className="flex w-full flex-grow flex-col gap-2 px-2">
        {MODULES.map((module) => (
          <button
            key={module.id}
            type="button"
            onClick={() => onChange(module.id)}
            className={cn(
              'group flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl transition',
              activeModule === module.id
                ? 'bg-white/10 text-white'
                : 'text-[#aeaeb2] hover:bg-white/10 hover:text-white',
            )}
            title={module.label}
          >
            <i className={cn('fa-solid text-lg', module.icon)} />
            <span className="text-[8px] font-medium opacity-80 group-hover:opacity-100">
              {module.label}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-slate-600 bg-slate-700 text-xs font-bold text-white">
        Mcyo
      </div>
    </nav>
  );
}
