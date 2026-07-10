interface ExportModalProps {
  open: boolean;
  payload: object;
  onClose: () => void;
}

export function ExportModal({ open, payload, onClose }: ExportModalProps) {
  if (!open) return null;

  const json = JSON.stringify(payload, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
  };

  const handleDownload = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `mss-claw-export-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-black/[0.06] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-black/[0.05] px-6 py-4">
          <h3 className="text-sm font-bold text-[#1d1d1f]">导出 Execution 快照</h3>
          <button type="button" onClick={onClose} className="text-[#aeaeb2] hover:text-[#424245]">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <p className="text-xs text-[#86868b]">导出当前 Artifact 与 Trace 元数据，可用于审计或联合作战分享。</p>
          <pre className="scroll-hidden max-h-64 overflow-auto rounded-xl bg-slate-900 p-4 font-mono text-xs text-slate-200">
            {json}
          </pre>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={handleCopy} className="rounded-lg border border-black/[0.06] px-4 py-2 text-xs font-bold text-[#6e6e73] hover:bg-black/[0.03]">
              复制 JSON
            </button>
            <button type="button" onClick={handleDownload} className="rounded-lg bg-claw-600 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800">
              下载 JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
