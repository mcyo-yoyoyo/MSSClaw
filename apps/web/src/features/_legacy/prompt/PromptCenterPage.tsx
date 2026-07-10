import { PromptEditorPanel } from '@/components/prompt/PromptEditorPanel';
import { PromptInspectorPanel } from '@/components/prompt/PromptInspectorPanel';
import { PromptListPanel } from '@/components/prompt/PromptListPanel';
import { StudioEmptyState, StudioPage } from '@/components/studio/StudioShell';
import { usePromptStore } from '@/stores/promptStore';

export function PromptCenterPage() {
  const {
    selectedPromptId,
    lifecycleFilter,
    selectPrompt,
    setLifecycleFilter,
    advanceLifecycle,
    selectedPrompt,
    filteredPrompts,
  } = usePromptStore();

  const prompt = selectedPrompt();

  return (
    <StudioPage
      tip={
        <>
          <i className="fa-solid fa-file-code text-claw-600" />
          <span>
            <strong>学习提示：</strong>
            Prompt 模板经草稿 → 评审 → 发布生命周期管理，Agent 与 Skill 可引用已发布版本。
          </span>
        </>
      }
    >
      <PromptListPanel
        prompts={filteredPrompts()}
        selectedPromptId={selectedPromptId}
        lifecycleFilter={lifecycleFilter}
        onSelect={selectPrompt}
        onFilterChange={setLifecycleFilter}
      />

      {prompt ? (
        <>
          <PromptEditorPanel
            prompt={prompt}
            onAdvanceLifecycle={() => advanceLifecycle(prompt.id)}
          />
          <PromptInspectorPanel prompt={prompt} />
        </>
      ) : (
        <StudioEmptyState
          icon="fa-file-code"
          title="选择一个 Prompt"
          hint="左侧列表按生命周期筛选，选中后可编辑模板并推进审批状态"
        />
      )}
    </StudioPage>
  );
}
