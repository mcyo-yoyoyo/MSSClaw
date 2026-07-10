import { useEffect, useRef, useState } from 'react';

export interface ToastSource {
  key: string;
  message: string | null;
  dismiss: () => void;
}

interface QueuedToast {
  id: string;
  message: string;
}

interface ToastHostProps {
  sources: ToastSource[];
}

export function ToastHost({ sources }: ToastHostProps) {
  const [queue, setQueue] = useState<QueuedToast[]>([]);
  const [active, setActive] = useState<QueuedToast | null>(null);
  const lastSeenRef = useRef<Map<string, string>>(new Map());

  const messageKey = sources.map((s) => `${s.key}:${s.message ?? ''}`).join('|');

  useEffect(() => {
    for (const src of sources) {
      if (!src.message) continue;
      const prev = lastSeenRef.current.get(src.key);
      if (prev === src.message) continue;
      lastSeenRef.current.set(src.key, src.message);
      setQueue((q) => [...q, { id: `${src.key}-${Date.now()}`, message: src.message! }]);
      src.dismiss();
    }
    // messageKey tracks source changes; sources read from latest render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageKey]);

  useEffect(() => {
    if (active || queue.length === 0) return;
    const [next, ...rest] = queue;
    setActive(next);
    setQueue(rest);
  }, [active, queue]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setActive(null), 3500);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!active) return null;

  return (
    <div className="toast-enter pointer-events-auto fixed bottom-5 right-5 z-[110] flex max-w-sm items-center gap-3 rounded-2xl border border-black/[0.06] bg-[#1d1d1f]/95 px-4 py-3 text-[13px] font-medium text-white shadow-2xl backdrop-blur-md">
      <span className="flex-1 leading-snug">{active.message}</span>
      <button
        type="button"
        onClick={() => setActive(null)}
        className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        关闭
      </button>
    </div>
  );
}
