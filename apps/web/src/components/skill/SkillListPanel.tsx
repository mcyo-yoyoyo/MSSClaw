import {
  getSkillLifecycleClass,
  getSkillLifecycleLabel,
  SKILL_LIFECYCLE_FLOW,
  type Skill,
  type SkillLifecycle,
} from '@/domain/skill';
import { cn } from '@/lib/utils';

export function SkillLifecycleBadge({ lifecycle }: { lifecycle: SkillLifecycle }) {
  return (
    <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold', getSkillLifecycleClass(lifecycle))}>
      {getSkillLifecycleLabel(lifecycle)}
    </span>
  );
}

interface SkillListPanelProps {
  skills: Skill[];
  selectedSkillId: string | null;
  lifecycleFilter: SkillLifecycle | 'all';
  onSelect: (id: string) => void;
  onFilterChange: (filter: SkillLifecycle | 'all') => void;
}

export function SkillListPanel({
  skills,
  selectedSkillId,
  lifecycleFilter,
  onSelect,
  onFilterChange,
}: SkillListPanelProps) {
  return (
    <aside className="studio-list-panel">
      <div className="border-b border-black/[0.05] p-4">
        <h2 className="mb-1 text-sm font-bold text-[#1d1d1f]">Skill Center</h2>
        <p className="text-[11px] text-[#86868b]">Debug · Trace · Dependency · Publish</p>
      </div>

      <div className="border-b border-black/[0.05] px-3 py-3">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={lifecycleFilter === 'all'} onClick={() => onFilterChange('all')} label="All" />
          {SKILL_LIFECYCLE_FLOW.map((s) => (
            <FilterChip
              key={s}
              active={lifecycleFilter === s}
              onClick={() => onFilterChange(s)}
              label={getSkillLifecycleLabel(s)}
            />
          ))}
        </div>
      </div>

      <div className="scroll-hidden flex-grow space-y-2 overflow-y-auto p-3">
        {skills.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-[#aeaeb2]">暂无 Skill</p>
        ) : (
          skills.map((skill) => (
            <button
              key={skill.id}
              type="button"
              onClick={() => onSelect(skill.id)}
              className={cn(
                'w-full rounded-xl border p-3 text-left transition',
                selectedSkillId === skill.id
                  ? 'border-zinc-300 bg-claw-50 shadow-sm'
                  : 'border-transparent hover:border-black/[0.06] hover:bg-black/[0.03]',
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <code className="truncate text-[11px] font-bold text-claw-600">{skill.name}</code>
                <span className="font-mono text-[10px] text-[#aeaeb2]">{skill.version}</span>
              </div>
              <p className="mb-2 line-clamp-2 text-[11px] text-[#86868b]">{skill.description}</p>
              <SkillLifecycleBadge lifecycle={skill.lifecycle} />
            </button>
          ))
        )}
      </div>
    </aside>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-2.5 py-1 text-[10px] font-bold transition',
        active ? 'bg-claw-600 text-white' : 'bg-black/[0.04] text-[#86868b] hover:bg-black/[0.06]',
      )}
    >
      {label}
    </button>
  );
}
