import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspaceStore';

interface OfflineBannerProps {
  onRetry: () => void;
}

export function OfflineBanner({ onRetry }: OfflineBannerProps) {
  const apiConnected = useWorkspaceStore((s) => s.apiConnected);
  const catalogLoading = useWorkspaceStore((s) => s.catalogLoading);
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setDismissed(false);
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (apiConnected) setDismissed(false);
  }, [apiConnected]);

  const offline = !online;
  const apiDown = online && !apiConnected;
  const visible = !dismissed && (offline || apiDown);

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2 text-[12px]',
        offline
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-orange-200 bg-orange-50 text-orange-900',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <i className={cn('fa-solid shrink-0', offline ? 'fa-wifi-slash' : 'fa-plug-circle-xmark')} />
        <span className="truncate">
          {offline
            ? '网络已断开，部分功能将使用本地缓存'
            : 'API 未连接，当前为本地 Demo 模式（数据仅存浏览器）'}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {online && (
          <button
            type="button"
            disabled={catalogLoading}
            onClick={() => {
              setDismissed(false);
              onRetry();
            }}
            className="rounded-lg border border-current/20 px-2.5 py-1 text-[11px] font-semibold transition hover:bg-black/[0.04] disabled:opacity-50"
          >
            {catalogLoading ? '重连中…' : '重试连接'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-lg px-2 py-1 text-[11px] opacity-70 transition hover:opacity-100"
          aria-label="暂时关闭提示"
        >
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
    </div>
  );
}
