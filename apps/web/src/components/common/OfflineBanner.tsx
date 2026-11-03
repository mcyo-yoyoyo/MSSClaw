import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { DATA_FETCH_FAILED_MESSAGE, useDataFetchNotice } from '@/domain/dataFetchNotice';
import { isSystemAdmin } from '@/domain/currentUser';
import { useSessionStore } from '@/stores/sessionStore';
import { useShareSyncStore } from '@/domain/shareSync';
import { useWorkspaceStore } from '@/stores/workspaceStore';

interface OfflineBannerProps {
  onRetry: () => void;
}

const DISMISS_KEY = 'mssclaw_api_banner_dismissed_v1';

function canSeeShareBanner(role: string | undefined): boolean {
  return role === 'super_admin' || role === 'capability_ops' || isSystemAdmin(role as never);
}

/**
 * 接口失败、网络断开或后端不可达时，全站只显示同一句提示。
 */
export function OfflineBanner({ onRetry }: OfflineBannerProps) {
  const apiConnected = useWorkspaceStore((s) => s.apiConnected);
  const apiStatus = useWorkspaceStore((s) => s.apiStatus);
  const catalogLoading = useWorkspaceStore((s) => s.catalogLoading);
  const failStreak = useShareSyncStore((s) => s.failStreak);
  const lastSync = useShareSyncStore((s) => s.last);
  const role = useSessionStore((s) => s.user?.platformRole);
  const isOps = canSeeShareBanner(role);
  const fetchFailed = useDataFetchNotice((s) => s.failed);
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [dismissed, setDismissed] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(DISMISS_KEY) === '1';
  });

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setDismissed(false);
      localStorage.removeItem(DISMISS_KEY);
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
    if (apiConnected) {
      setDismissed(false);
      localStorage.removeItem(DISMISS_KEY);
    }
  }, [apiConnected]);

  const offline = !online;
  const apiDown = online && !apiConnected && apiStatus === 'unreachable';
  const syncFail =
    isOps &&
    online &&
    apiConnected &&
    failStreak >= 1 &&
    lastSync &&
    !lastSync.synced &&
    lastSync.reason === 'failed';
  const visible = !dismissed && (offline || apiDown || fetchFailed || syncFail);

  if (!visible) return null;

  const message = DATA_FETCH_FAILED_MESSAGE;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2 text-[12px]',
        offline
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : syncFail
            ? 'border-rose-200 bg-rose-50 text-rose-900'
            : 'border-orange-200 bg-orange-50 text-orange-900',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <i
          className={cn(
            'fa-solid shrink-0',
            offline ? 'fa-wifi-slash' : syncFail ? 'fa-cloud-arrow-up' : 'fa-plug-circle-xmark',
          )}
        />
        <span className="truncate">{message}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {online && (
          <button
            type="button"
            disabled={catalogLoading}
            onClick={() => {
              setDismissed(false);
              localStorage.removeItem(DISMISS_KEY);
              onRetry();
            }}
            className="rounded-lg border border-current/20 px-2.5 py-1 text-[11px] font-semibold transition hover:bg-black/[0.04] disabled:opacity-50"
          >
            {catalogLoading ? '重连中…' : '重试'}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            localStorage.setItem(DISMISS_KEY, '1');
          }}
          className="rounded-lg px-2 py-1 text-[11px] opacity-70 transition hover:opacity-100"
          aria-label="暂时关闭提示"
        >
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
    </div>
  );
}
