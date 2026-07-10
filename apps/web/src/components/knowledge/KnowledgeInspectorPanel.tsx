import type { KnowledgeBase } from '@/domain/knowledge';
import { formatCount } from '@/domain/knowledge';
import { getKbStatusClass } from '@/domain/knowledge';
import { cn } from '@/lib/utils';

interface KnowledgeInspectorPanelProps {
  base: KnowledgeBase;
}

export function KnowledgeInspectorPanel({ base }: KnowledgeInspectorPanelProps) {
  return (
    <aside className="studio-inspector-panel">
      <div className="border-b border-black/[0.06] bg-white px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#aeaeb2]">Inspector</h3>
      </div>

      <section className="border-b border-black/[0.06] p-4">
        <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold capitalize', getKbStatusClass(base.status))}>
          {base.status}
        </span>
        <dl className="mt-3 space-y-2 text-xs">
          <Row label="Vector DB" value={base.vectorDb} />
          <Row label="Collection" value={base.collection} />
          <Row label="Embedding" value={base.embeddingModel} />
          <Row label="Updated" value={base.updatedAt} />
        </dl>
      </section>

      <section className="border-b border-black/[0.06] p-4">
        <h4 className="mb-3 text-[11px] font-bold uppercase text-[#86868b]">Index Stats</h4>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Documents" value={formatCount(base.totalDocuments)} />
          <StatCard label="Chunks" value={formatCount(base.totalChunks)} />
          <StatCard label="Storage" value={`${base.storageGb} GB`} />
          <StatCard label="In Queue" value={String(base.documents.filter((d) => d.status !== 'indexed').length)} />
        </div>
      </section>

      <section className="border-b border-black/[0.06] p-4">
        <h4 className="mb-2 text-[11px] font-bold uppercase text-[#86868b]">Chunk Config</h4>
        <div className="space-y-1.5 text-[11px] text-[#6e6e73]">
          <p><b>Strategy:</b> {base.chunkStrategy}</p>
          <p><b>Chunk Size:</b> {base.chunkSize} tokens</p>
          <p><b>Overlap:</b> {base.overlap} tokens</p>
        </div>
      </section>

      <section className="border-b border-black/[0.06] p-4">
        <h4 className="mb-2 text-[11px] font-bold uppercase text-[#86868b]">Retrieval</h4>
        <div className="space-y-2 text-[11px]">
          <div className="rounded-lg border border-black/[0.06] bg-white p-2.5">
            <p className="font-bold text-[#424245]">Hybrid Search</p>
            <p className="text-[#86868b]">Dense + BM25 · Top-K 15</p>
          </div>
          <div className="rounded-lg border border-black/[0.06] bg-white p-2.5">
            <p className="font-bold text-[#424245]">Reranker</p>
            <p className="text-[#86868b]">bge-reranker-large · Top-3</p>
          </div>
        </div>
      </section>

      <section className="p-4">
        <h4 className="mb-2 text-[11px] font-bold uppercase text-[#86868b]">Tags</h4>
        <div className="flex flex-wrap gap-1.5">
          {base.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-[#6e6e73]">
              {tag}
            </span>
          ))}
        </div>
      </section>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[#aeaeb2]">{label}</dt>
      <dd className="truncate font-medium text-[#424245]">{value}</dd>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/[0.06] bg-white p-3 text-center">
      <p className="text-base font-bold text-emerald-600">{value}</p>
      <p className="text-[10px] text-[#86868b]">{label}</p>
    </div>
  );
}
