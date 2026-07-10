import type { KnowledgeBase, KnowledgeDocument } from '@/domain/knowledge';
import {
  getDocumentStatusClass,
  getDocumentStatusLabel,
  getPipelineStageIndex,
  PIPELINE_STAGES,
} from '@/domain/knowledge';
import { cn } from '@/lib/utils';

interface KnowledgePipelinePanelProps {
  base: KnowledgeBase;
  selectedDocument: KnowledgeDocument | null;
  pipelineRunning: boolean;
  onSelectDocument: (id: string) => void;
  onRunPipeline: (docId: string) => void;
}

const FILE_ICONS: Record<KnowledgeDocument['type'], string> = {
  pdf: 'fa-file-pdf text-red-500',
  docx: 'fa-file-word text-blue-500',
  xlsx: 'fa-file-excel text-green-600',
  md: 'fa-file-lines text-[#86868b]',
  html: 'fa-file-code text-orange-500',
};

export function KnowledgePipelinePanel({
  base,
  selectedDocument,
  pipelineRunning,
  onSelectDocument,
  onRunPipeline,
}: KnowledgePipelinePanelProps) {
  const stageIdx = getPipelineStageIndex(base.pipelineStage);

  return (
    <div className="flex min-w-0 flex-grow flex-col overflow-hidden bg-white">
      <div className="border-b border-black/[0.06] px-6 py-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#aeaeb2]">RAG Pipeline</h3>
        <div className="flex items-center gap-1">
          {PIPELINE_STAGES.map((stage, index) => (
            <div key={stage.id} className="flex flex-grow items-center">
              <div
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg px-2 py-2',
                  index <= stageIdx ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'opacity-40',
                )}
              >
                <i className={cn('fa-solid text-xs', stage.icon, index <= stageIdx ? 'text-emerald-600' : 'text-[#aeaeb2]')} />
                <span className={cn('text-[9px] font-bold', index <= stageIdx ? 'text-emerald-700' : 'text-[#aeaeb2]')}>
                  {stage.label}
                </span>
              </div>
              {index < PIPELINE_STAGES.length - 1 && (
                <div className={cn('mx-0.5 h-0.5 flex-grow', index < stageIdx ? 'bg-emerald-400' : 'bg-slate-200')} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-grow overflow-hidden">
        <div className="flex w-[340px] shrink-0 flex-col border-r border-black/[0.06]">
          <div className="flex items-center justify-between border-b border-black/[0.05] px-4 py-3">
            <h4 className="text-xs font-bold uppercase text-[#86868b]">Documents</h4>
            <button type="button" className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700">
              <i className="fa-solid fa-upload mr-1" /> Upload
            </button>
          </div>
          <div className="scroll-hidden flex-grow overflow-y-auto p-2">
            {base.documents.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => onSelectDocument(doc.id)}
                className={cn(
                  'mb-1.5 flex w-full items-start gap-3 rounded-lg border p-3 text-left transition',
                  selectedDocument?.id === doc.id
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-transparent hover:bg-black/[0.03]',
                )}
              >
                <i className={cn('fa-solid mt-0.5 text-sm', FILE_ICONS[doc.type])} />
                <div className="min-w-0 flex-grow">
                  <p className="truncate text-[12px] font-semibold text-[#1d1d1f]">{doc.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold', getDocumentStatusClass(doc.status))}>
                      {getDocumentStatusLabel(doc.status)}
                    </span>
                    <span className="text-[9px] text-[#aeaeb2]">{doc.sizeMb} MB · {doc.domain}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="scroll-hidden flex-grow overflow-y-auto p-6">
          {selectedDocument ? (
            <DocumentDetail
              doc={selectedDocument}
              base={base}
              pipelineRunning={pipelineRunning}
              onRunPipeline={() => onRunPipeline(selectedDocument.id)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#aeaeb2]">
              选择文档查看 Chunk 详情与索引状态
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentDetail({
  doc,
  base,
  pipelineRunning,
  onRunPipeline,
}: {
  doc: KnowledgeDocument;
  base: KnowledgeBase;
  pipelineRunning: boolean;
  onRunPipeline: () => void;
}) {
  const canRun = doc.status === 'pending' || doc.status === 'chunking' || doc.status === 'embedding';

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h3 className="text-lg font-bold text-[#1d1d1f]">{doc.name}</h3>
        <p className="text-xs text-[#86868b]">
          {doc.type.toUpperCase()} · {doc.sizeMb} MB · 密级 {doc.clearanceLevel} · 更新 {doc.updatedAt}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Chunks" value={doc.chunks > 0 ? String(doc.chunks) : '—'} />
        <MiniStat label="Strategy" value={base.chunkStrategy} />
        <MiniStat label="Size/Overlap" value={`${base.chunkSize}/${base.overlap}`} />
      </div>

      {doc.status === 'indexed' && doc.chunks > 0 && (
        <div className="rounded-xl border border-black/[0.06] bg-[#fafafa] p-4">
          <h4 className="mb-3 text-[10px] font-bold uppercase text-[#86868b]">Sample Chunks (preview)</h4>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-black/[0.06] bg-white p-3 text-[11px] leading-relaxed text-[#6e6e73]">
                <span className="mb-1 block font-mono text-[9px] text-emerald-600">chunk_{doc.id}_{i}</span>
                …文档片段内容预览，用于向量检索与 Rerank 重排。实际内容来自 {doc.domain} 域…
              </div>
            ))}
          </div>
        </div>
      )}

      {canRun && (
        <button
          type="button"
          onClick={onRunPipeline}
          disabled={pipelineRunning}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pipelineRunning ? (
            <>
              <i className="fa-solid fa-circle-notch fa-spin" /> Pipeline 运行中...
            </>
          ) : (
            <>
              <i className="fa-solid fa-gears" /> 运行 Chunk → Embed → Index
            </>
          )}
        </button>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[0.06] p-3 text-center">
      <p className="text-[10px] font-bold uppercase text-[#aeaeb2]">{label}</p>
      <p className="mt-1 truncate text-xs font-bold text-[#1d1d1f]">{value}</p>
    </div>
  );
}
