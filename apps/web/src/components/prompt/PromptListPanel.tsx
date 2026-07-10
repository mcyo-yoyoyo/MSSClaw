import {
  PROMPT_LIFECYCLE_FLOW,
  getLifecycleLabel,
  type PromptLifecycle,
} from '@/domain/prompt';
import { PromptListItem } from '@/components/prompt/PromptLifecycle';
import type { Prompt } from '@/domain/prompt';
import {
  StudioFilterChip,
  StudioListPanelHeader,
} from '@/components/studio/StudioShell';

interface PromptListPanelProps {
  prompts: Prompt[];
  selectedPromptId: string | null;
  lifecycleFilter: PromptLifecycle | 'all';
  onSelect: (promptId: string) => void;
  onFilterChange: (filter: PromptLifecycle | 'all') => void;
}

export function PromptListPanel({
  prompts,
  selectedPromptId,
  lifecycleFilter,
  onSelect,
  onFilterChange,
}: PromptListPanelProps) {
  return (
    <aside className="studio-list-panel w-wide">
      <StudioListPanelHeader title="Prompt 中心" subtitle="草稿 → 评审 → 发布" />

      <div className="border-b border-black/[0.05] px-3 py-3">
        <div className="flex flex-wrap gap-1.5">
          <StudioFilterChip active={lifecycleFilter === 'all'} onClick={() => onFilterChange('all')} label="全部" />
          {PROMPT_LIFECYCLE_FLOW.map((step) => (
            <StudioFilterChip
              key={step}
              active={lifecycleFilter === step}
              onClick={() => onFilterChange(step)}
              label={getLifecycleLabel(step)}
            />
          ))}
        </div>
      </div>

      <div className="scroll-hidden flex-grow space-y-1.5 overflow-y-auto p-3">
        {prompts.length === 0 ? (
          <p className="px-2 py-8 text-center text-[12px] text-[#86868b]">当前筛选下暂无 Prompt</p>
        ) : (
          prompts.map((prompt) => (
            <PromptListItem
              key={prompt.id}
              prompt={prompt}
              active={selectedPromptId === prompt.id}
              onClick={() => onSelect(prompt.id)}
            />
          ))
        )}
      </div>

      <div className="border-t border-black/[0.05] p-3">
        <button
          type="button"
          className="apple-btn-secondary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-semibold"
        >
          <i className="fa-solid fa-plus text-claw-600" /> 新建 Prompt
        </button>
      </div>
    </aside>
  );
}
