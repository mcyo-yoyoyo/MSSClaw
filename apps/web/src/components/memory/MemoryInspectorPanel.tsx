import {
  formatTokenCount,
  getMemoryStatusClass,
  getScopeClass,
  SCOPE_LABELS,
  type MemoryStore,
} from '@/domain/memory';
import { cn } from '@/lib/utils';

interface MemoryInspectorPanelProps {
  store: MemoryStore;
}

export function MemoryInspectorPanel({ store }: MemoryInspectorPanelProps) {
  return (
    <aside className="studio-inspector-panel">
      <div className="p-4">
        <p className="section-label mb-3">概览</p>
        <div className="apple-card space-y-3 p-4">
          <div className="flex flex-wrap gap-1.5">
            <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize', getMemoryStatusClass(store.status))}>
              {store.status}
            </span>
            <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-semibold', getScopeClass(store.scope))}>
              {SCOPE_LABELS[store.scope]}
            </span>
          </div>
          <dl className="space-y-2 text-[12px]">
            <Row label="总 Token" value={formatTokenCount(store.totalTokens)} />
            <Row label="条目数" value={String(store.entries.length)} />
            <Row label="更新于" value={store.updatedAt} />
            {store.boundAgentName && <Row label="绑定 Agent" value={store.boundAgentName} />}
          </dl>
        </div>
      </div>

      {store.reflectionLogs.length > 0 && (
        <div className="border-t border-black/[0.05] p-4">
          <p className="section-label mb-3">Reflection 记录</p>
          <div className="space-y-2">
            {store.reflectionLogs.slice(0, 3).map((log) => (
              <div key={log.id} className="apple-card p-3 text-[11px]">
                <p className="text-[10px] text-[#aeaeb2]">{log.timestamp}</p>
                <p className="mt-1 text-[#424245]">{log.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[#86868b]">{label}</dt>
      <dd className="truncate font-medium text-[#1d1d1f]">{value}</dd>
    </div>
  );
}
