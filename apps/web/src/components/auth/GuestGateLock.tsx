import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores/sessionStore';

/** 游客写操作的统一锁形角标；父按钮需要带 `relative`。 */
export function GuestGateLock({ className }: { className?: string }) {
  const isGuest = useSessionStore((state) => state.isGuest);

  if (!isGuest) return null;

  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute -right-1 -top-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[7px] text-zinc-500 shadow-sm ring-1 ring-zinc-200',
        className,
      )}
    >
      <i className="fa-solid fa-lock" />
    </span>
  );
}
