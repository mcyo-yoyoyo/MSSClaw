import { MssZhishuMark } from '@/components/brand/MssZhishuMark';

interface HomeToTaskTransitProps {
  open: boolean;
  summary: string;
}

/** 首页 → 任务中心的短过渡层 */
export function HomeToTaskTransit({ open, summary }: HomeToTaskTransitProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#fbfbfd]/92 backdrop-blur-md">
      <div className="mx-4 flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-zinc-200/80 bg-white px-6 py-8 shadow-lg">
        <div className="home-hero-mark">
          <MssZhishuMark size={40} />
        </div>
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-zinc-200 border-t-zinc-900" />
        <div className="text-center">
          <p className="text-[14px] font-semibold text-zinc-900">正在打开工作台…</p>
          {summary ? (
            <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-zinc-500">「{summary}」</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
