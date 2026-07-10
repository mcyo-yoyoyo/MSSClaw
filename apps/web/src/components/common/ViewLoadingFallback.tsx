export function ViewLoadingFallback({ label = '加载中…' }: { label?: string }) {
  return (
    <div className="center-surface flex flex-1 flex-col items-center justify-center gap-3 p-5">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-zinc-200 border-t-claw-600" />
      <p className="text-[13px] font-medium text-[#1d1d1f]">{label}</p>
      <p className="text-[11px] text-[#86868b]">MSS Claw</p>
    </div>
  );
}