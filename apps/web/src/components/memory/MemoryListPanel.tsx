import {
  formatTokenCount,
  getMemoryStatusClass,
  getScopeClass,
  SCOPE_LABELS,
  type MemoryScope,
  type MemoryStore,
} from '@/domain/memory';
import { cn } from '@/lib/utils';
import {
  StudioFilterChip,
  StudioListPanelHeader,
} from '@/components/studio/StudioShell';

interface MemoryListPanelProps {
  stores: MemoryStore[];
  selectedStoreId: string | null;
  scopeFilter: MemoryScope | 'all';
  onSelect: (id: string) => void;
  onScopeFilterChange: (filter: MemoryScope | 'all') => void;
}

const SCOPE_FILTERS: { id: MemoryScope | 'all'; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'agent', label: 'Agent' },
  { id: 'session', label: '会话' },
  { id: 'workspace', label: '工作区' },
];

export function MemoryListPanel({
  stores,
  selectedStoreId,
  scopeFilter,
  onSelect,
  onScopeFilterChange,
}: MemoryListPanelProps) {
  return (
    <aside className="studio-list-panel">
      <StudioListPanelHeader title="Memory 中心" subtitle="分层记忆 · 保留策略 · Reflection" />

      <div className="border-b border-black/[0.05] px-3 py-3">
        <div className="flex flex-wrap gap-1.5">
          {SCOPE_FILTERS.map((f) => (
            <StudioFilterChip
              key={f.id}
              active={scopeFilter === f.id}
              onClick={() => onScopeFilterChange(f.id)}
              label={f.label}
            />
          ))}
        </div>
      </div>

      <div className="scroll-hidden flex-grow space-y-1.5 overflow-y-auto p-3">
        {stores.length === 0 ? (
          <p className="px-2 py-8 text-center text-[12px] text-[#86868b]">暂无 Memory Store</p>
        ) : (
          stores.map((store) => (
            <button
              key={store.id}
              type="button"
              onClick={() => onSelect(store.id)}
              className={cn('studio-list-item', selectedStoreId === store.id && 'active')}
            >
              <div className="mb-1 flex items-center gap-2">
                <i className="fa-solid fa-brain text-claw-600" />
                <span className="truncate text-[12px] font-semibold text-[#1d1d1f]">{store.name}</span>
              </div>
              <p className="mb-2 line-clamp-2 text-[11px] text-[#86868b]">{store.description}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-semibold', getScopeClass(store.scope))}>
                  {SCOPE_LABELS[store.scope]}
                </span>
                <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize', getMemoryStatusClass(store.status))}>
                  {store.status}
                </span>
                <span className="text-[10px] text-[#aeaeb2]">{formatTokenCount(store.totalTokens)} tok</span>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
