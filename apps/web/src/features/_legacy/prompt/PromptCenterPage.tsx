import { useMemo, useState } from 'react';
import { PromptEditorPanel } from '@/components/prompt/PromptEditorPanel';
import { PromptInspectorPanel } from '@/components/prompt/PromptInspectorPanel';
import { PromptListPanel } from '@/components/prompt/PromptListPanel';
import { StudioEmptyState, StudioPage } from '@/components/studio/StudioShell';
import { OrgAssetFilterBar } from '@/components/center/OrgAssetFilters';
import type { DeptFilter, EfficiencyFilter, RegionFilter } from '@/domain/assetFilters';
import { HQ_DEPTS, REGIONS } from '@/domain/orgTaxonomy';
import { usePromptStore } from '@/stores/promptStore';

function matchesTaxonomy(
  blob: string,
  dept: DeptFilter,
  region: RegionFilter,
  efficiency: EfficiencyFilter,
) {
  if (dept !== 'all') {
    const label = HQ_DEPTS.find((d) => d.id === dept)?.label ?? dept;
    if (!blob.toLowerCase().includes(label.toLowerCase()) && !blob.toLowerCase().includes(dept)) {
      return false;
    }
  }
  if (region !== 'all') {
    const label = REGIONS.find((r) => r.id === region)?.label ?? region;
    if (!blob.toLowerCase().includes(label.toLowerCase()) && !blob.toLowerCase().includes(region)) {
      return false;
    }
  }
  if (efficiency !== 'all') {
    const hit =
      efficiency === 'office'
        ? /办公|文档|会议|问答|qa|ppt/i.test(blob)
        : efficiency === 'manage'
          ? /管理|价格|评论|洞察|舆情/i.test(blob)
          : /流程|招聘|培训|sop|合规/i.test(blob);
    if (!hit) return false;
  }
  return true;
}

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

  const [deptFilter, setDeptFilter] = useState<DeptFilter>('all');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const [efficiencyFilter, setEfficiencyFilter] = useState<EfficiencyFilter>('all');

  const prompts = useMemo(() => {
    return filteredPrompts().filter((p) =>
      matchesTaxonomy(
        `${p.name} ${p.description} ${p.tags.join(' ')}`,
        deptFilter,
        regionFilter,
        efficiencyFilter,
      ),
    );
  }, [filteredPrompts, deptFilter, regionFilter, efficiencyFilter]);

  const prompt = selectedPrompt();

  return (
    <StudioPage
      tip={
        <>
          <i className="fa-solid fa-file-code text-claw-600" />
          <span>
            <strong>学习提示：</strong>
            提示词模板经草稿 → 评审 → 发布生命周期管理，Agent 与 Skill 可引用已发布版本。
          </span>
        </>
      }
    >
      <div className="border-b border-black/[0.05] bg-white px-4 pt-3">
        <OrgAssetFilterBar
          deptFilter={deptFilter}
          regionFilter={regionFilter}
          efficiencyFilter={efficiencyFilter}
          onDeptChange={setDeptFilter}
          onRegionChange={setRegionFilter}
          onEfficiencyChange={setEfficiencyFilter}
        />
      </div>
      <PromptListPanel
        prompts={prompts}
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
