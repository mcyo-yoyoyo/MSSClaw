import { useMemo, useState } from 'react';
import { MemoryEditorPanel } from '@/components/memory/MemoryEditorPanel';
import { MemoryInspectorPanel } from '@/components/memory/MemoryInspectorPanel';
import { MemoryListPanel } from '@/components/memory/MemoryListPanel';
import { StudioEmptyState, StudioPage } from '@/components/studio/StudioShell';
import { OrgAssetFilterBar } from '@/components/center/OrgAssetFilters';
import type { DeptFilter, EfficiencyFilter, RegionFilter } from '@/domain/assetFilters';
import { HQ_DEPTS, REGIONS } from '@/domain/orgTaxonomy';
import { useMemoryStore } from '@/stores/memoryStore';

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
        ? /办公|文档|会议|共享|workspace/i.test(blob)
        : efficiency === 'manage'
          ? /管理|营销|campaign|洞察/i.test(blob)
          : /流程|rag|session|研发/i.test(blob);
    if (!hit) return false;
  }
  return true;
}

export function MemoryCenterPage() {
  const {
    selectedStoreId,
    selectedLayer,
    scopeFilter,
    reflectionRunning,
    selectStore,
    setSelectedLayer,
    setScopeFilter,
    updateLayerPolicy,
    runReflection,
    selectedStore,
    filteredStores,
  } = useMemoryStore();

  const [deptFilter, setDeptFilter] = useState<DeptFilter>('all');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const [efficiencyFilter, setEfficiencyFilter] = useState<EfficiencyFilter>('all');

  const stores = useMemo(() => {
    return filteredStores().filter((s) =>
      matchesTaxonomy(
        `${s.name} ${s.description} ${s.scope} ${s.tags.join(' ')} ${s.boundAgentName ?? ''}`,
        deptFilter,
        regionFilter,
        efficiencyFilter,
      ),
    );
  }, [filteredStores, deptFilter, regionFilter, efficiencyFilter]);

  const store = selectedStore();

  return (
    <StudioPage
      tip={
        <>
          <i className="fa-solid fa-brain text-claw-600" />
          <span>
            <strong>学习提示：</strong>
            记忆分层存储 Agent 长期上下文。Reflection 可定期提炼会话摘要写入长期记忆。
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
      <MemoryListPanel
        stores={stores}
        selectedStoreId={selectedStoreId}
        scopeFilter={scopeFilter}
        onSelect={selectStore}
        onScopeFilterChange={setScopeFilter}
      />

      {store ? (
        <>
          <MemoryEditorPanel
            store={store}
            selectedLayer={selectedLayer}
            reflectionRunning={reflectionRunning}
            onSelectLayer={setSelectedLayer}
            onUpdatePolicy={(layer, patch) => updateLayerPolicy(store.id, layer, patch)}
            onRunReflection={() => void runReflection(store.id)}
          />
          <MemoryInspectorPanel store={store} />
        </>
      ) : (
        <StudioEmptyState
          icon="fa-brain"
          title="选择一个 Memory Store"
          hint="Memory Store 按 Agent 或工作区隔离，支持短期 / 长期 / 共享层策略"
        />
      )}
    </StudioPage>
  );
}
