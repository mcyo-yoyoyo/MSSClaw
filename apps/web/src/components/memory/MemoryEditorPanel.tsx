import {
  getEntriesForLayer,
  getLayerPolicy,
  MEMORY_LAYER_FLOW,
  type MemoryLayer,
  type MemoryStore,
} from '@/domain/memory';
import { cn } from '@/lib/utils';
import { StudioToolbar } from '@/components/studio/StudioShell';

interface MemoryEditorPanelProps {
  store: MemoryStore;
  selectedLayer: MemoryLayer;
  reflectionRunning: boolean;
  onSelectLayer: (layer: MemoryLayer) => void;
  onUpdatePolicy: (
    layer: MemoryLayer,
    patch: Partial<{ retentionDays: number; maxTokens: number; reflectionEnabled: boolean; decayRate: number }>,
  ) => void;
  onRunReflection: () => void;
}

export function MemoryEditorPanel({
  store,
  selectedLayer,
  reflectionRunning,
  onSelectLayer,
  onUpdatePolicy,
  onRunReflection,
}: MemoryEditorPanelProps) {
  const policy = getLayerPolicy(store, selectedLayer);
  const entries = getEntriesForLayer(store, selectedLayer);
  const layerMeta = MEMORY_LAYER_FLOW.find((l) => l.id === selectedLayer);

  return (
    <div className="studio-editor-panel">
      <StudioToolbar
        icon="fa-brain"
        title={store.name}
        badge={layerMeta?.label}
        actions={
          <button
            type="button"
            onClick={onRunReflection}
            disabled={reflectionRunning}
            className="apple-btn-primary flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
          >
            <i className={cn('fa-solid fa-arrows-rotate', reflectionRunning && 'animate-spin')} />
            {reflectionRunning ? 'Reflection 中…' : '运行 Reflection'}
          </button>
        }
      />

      <div className="scroll-hidden flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-5">
          <section>
            <p className="section-label mb-2">选择记忆层</p>
            <div className="flex flex-wrap gap-2">
              {MEMORY_LAYER_FLOW.map((layer) => {
                const count = getEntriesForLayer(store, layer.id).length;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => onSelectLayer(layer.id)}
                    className={cn(
                      'filter-chip flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium',
                      selectedLayer === layer.id && 'active',
                    )}
                    title={layer.desc}
                  >
                    <i className={cn('fa-solid text-[10px]', layer.icon)} />
                    {layer.label}
                    {count > 0 && (
                      <span className="rounded-full bg-black/[0.06] px-1.5 text-[9px] font-semibold">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {layerMeta && <p className="mt-2 text-[12px] text-[#86868b]">{layerMeta.desc}</p>}
          </section>

          {policy && (
            <section className="apple-card p-4">
              <p className="section-label mb-3">层策略</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field
                  label="保留天数"
                  value={policy.retentionDays}
                  onChange={(v) => onUpdatePolicy(selectedLayer, { retentionDays: Number(v) })}
                />
                <Field
                  label="Token 上限"
                  value={policy.maxTokens}
                  onChange={(v) => onUpdatePolicy(selectedLayer, { maxTokens: Number(v) })}
                />
                <Field
                  label="衰减率"
                  value={policy.decayRate}
                  step="0.05"
                  onChange={(v) => onUpdatePolicy(selectedLayer, { decayRate: Number(v) })}
                />
              </div>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] text-[#424245]">
                <input
                  type="checkbox"
                  checked={policy.reflectionEnabled}
                  onChange={(e) => onUpdatePolicy(selectedLayer, { reflectionEnabled: e.target.checked })}
                  className="rounded border-black/20 text-claw-600 focus:ring-zinc-900/20"
                />
                启用自动 Reflection
              </label>
            </section>
          )}

          <section>
            <p className="section-label mb-3">
              记忆条目
              <span className="ml-2 font-normal normal-case text-[#86868b]">({entries.length})</span>
            </p>
            {entries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/[0.08] py-12 text-center text-[13px] text-[#86868b]">
                该层暂无记忆条目
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <article key={entry.id} className="apple-card p-4">
                    <p className="text-[13px] leading-relaxed text-[#1d1d1f]">{entry.content}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[#86868b]">
                      <span>{entry.source}</span>
                      <span>·</span>
                      <span>{entry.tokenCount} tok</span>
                      <span>·</span>
                      <span>{entry.lastAccessed}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-[#86868b]">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="apple-input w-full py-2 font-mono text-[13px]"
      />
    </label>
  );
}
