import { MemoryEditorPanel } from '@/components/memory/MemoryEditorPanel';
import { MemoryInspectorPanel } from '@/components/memory/MemoryInspectorPanel';
import { MemoryListPanel } from '@/components/memory/MemoryListPanel';
import { StudioEmptyState, StudioPage } from '@/components/studio/StudioShell';
import { useMemoryStore } from '@/stores/memoryStore';

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

  const store = selectedStore();

  return (
    <StudioPage
      tip={
        <>
          <i className="fa-solid fa-brain text-claw-600" />
          <span>
            <strong>学习提示：</strong>
            Memory 分层存储 Agent 长期上下文。Reflection 可定期提炼会话摘要写入长期记忆。
          </span>
        </>
      }
    >
      <MemoryListPanel
        stores={filteredStores()}
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
