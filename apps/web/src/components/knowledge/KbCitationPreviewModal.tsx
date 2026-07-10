import { KB_COLLECTIONS } from '@/domain/prototype/kb';
import type { PrototypeKbDocument } from '@/domain/prototype/types';
import { CenterModal } from '@/components/center/CenterShell';

interface KbCitationPreviewModalProps {
  doc: PrototypeKbDocument | null;
  citationIndex?: number;
  snippet?: string;
  onClose: () => void;
}

function getCollectionName(id: string) {
  return KB_COLLECTIONS.find((c) => c.id === id)?.name ?? id;
}

export function KbCitationPreviewModal({
  doc,
  citationIndex,
  snippet,
  onClose,
}: KbCitationPreviewModalProps) {
  if (!doc) return null;

  const previewText =
    snippet?.trim() ||
    doc.chunkTexts?.[0]?.trim() ||
    doc.desc ||
    '暂无预览内容';

  return (
    <CenterModal
      open
      title={`引用 [${citationIndex ?? '?'}] · ${doc.title}`}
      onClose={onClose}
      actions={
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-black/8 px-4 py-2 text-[12px]"
        >
          关闭
        </button>
      }
    >
      <div className="space-y-3 text-left text-[13px]">
        <div className="flex flex-wrap gap-2">
          {doc.tags.map((t) => (
            <span key={t} className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px]">
              {t}
            </span>
          ))}
        </div>
        <pre className="whitespace-pre-wrap rounded-xl bg-black/[0.03] p-4 text-[12px] leading-relaxed">
          {previewText}
        </pre>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-[#86868b]">
          <span>分区：{getCollectionName(doc.collection)}</span>
          <span>密级：{doc.clearance}</span>
          <span>类型：{doc.type}</span>
          <span>Chunks：{doc.chunks}</span>
        </div>
      </div>
    </CenterModal>
  );
}
