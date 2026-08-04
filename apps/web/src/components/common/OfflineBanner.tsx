import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { isSystemAdmin } from '@/domain/currentUser';
import { useSessionStore } from '@/stores/sessionStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

interface OfflineBannerProps {
  onRetry: () => void;
}

const DISMISS_KEY = 'mssclaw_api_banner_dismissed_v1';

/**
 * 仅平台管理员可见。普通登录用户无需关心 API / 部署状态。
 * 本机（localhost）未开后端时不提示，避免开发/试用惊吓。
 */
export function OfflineBanner({ onRetry }: OfflineBannerProps) {
  const apiConnected = useWorkspaceStore((s) => s.apiConnected);
  const apiStatus = useWorkspaceStore((s) => s.apiStatus);
  const catalogLoading = useWorkspaceStore((s) => s.catalogLoading);
  const role = useSessionStore((s) => s.user?.platformRole);
  const isAdmin = isSystemAdmin(role);
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

  // 普通用户：永远不看运维条
  if (!isAdmin) return null;

  const offline = !online;
  const apiDown = online && !apiConnected && apiStatus === 'unreachable';
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
            : '共享服务未连通：多用户数据与附件暂时无法互通。请联系 IT 按内网部署说明检查后台服务。'}
        </span>
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
