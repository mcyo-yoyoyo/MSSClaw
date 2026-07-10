import type { KnowledgeBase } from '@/domain/knowledge';
import { formatCount, getKbStatusClass } from '@/domain/knowledge';
import { cn } from '@/lib/utils';

interface KnowledgeListPanelProps {
  bases: KnowledgeBase[];
  selectedBaseId: string | null;
  onSelect: (id: string) => void;
}

export function KnowledgeListPanel({ bases, selectedBaseId, onSelect }: KnowledgeListPanelProps) {
  return (
    <aside className="studio-list-panel">
      <div className="border-b border-black/[0.05] p-4">
        <h2 className="mb-1 text-sm font-bold text-[#1d1d1f]">Knowledge Center</h2>
        <p className="text-[11px] text-[#86868b]">Document → Chunk → Index</p>
      </div>

      <div className="scroll-hidden flex-grow space-y-2 overflow-y-auto p-3">
        {bases.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-[#aeaeb2]">暂无知识库</p>
        ) : (
          bases.map((base) => (
            <button
              key={base.id}
              type="button"
              onClick={() => onSelect(base.id)}
              className={cn(
                'w-full rounded-xl border p-3 text-left transition',
                selectedBaseId === base.id
                  ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                  : 'border-transparent hover:border-black/[0.06] hover:bg-black/[0.03]',
              )}
            >
              <div className="mb-1 flex items-center gap-2">
                <i className="fa-solid fa-database text-emerald-600" />
                <code className="truncate text-[11px] font-bold text-[#1d1d1f]">{base.name}</code>
              </div>
              <p className="mb-2 line-clamp-2 text-[11px] text-[#86868b]">{base.description}</p>
              <div className="flex items-center justify-between">
                <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold capitalize', getKbStatusClass(base.status))}>
                  {base.status}
                </span>
                <span className="text-[10px] text-[#aeaeb2]">{base.storageGb} GB</span>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="border-t border-black/[0.05] p-3">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 py-2.5 text-xs font-bold text-emerald-600"
        >
          <i className="fa-solid fa-plus" /> 新建知识库
        </button>
      </div>
    </aside>
  );
}

export function KbStatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/[0.06] bg-white p-3 text-center">
      <p className="text-lg font-bold text-emerald-600">{value}</p>
      <p className="text-[10px] text-[#86868b]">{label}</p>
    </div>
  );
}

export { formatCount };
