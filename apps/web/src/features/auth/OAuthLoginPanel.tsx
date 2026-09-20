import { useState } from 'react';
import { MssZhishuMark } from '@/components/brand/MssZhishuMark';
import { fetchAuthorizeUrl } from '@/api/authOAuthApi';
import { rememberGateIntent, rememberReturnTo } from '@/domain/authMode';
import { useAuthModeStore } from '@/stores/authModeStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

interface OAuthLoginPanelProps {
  hint?: string;
  title?: string;
  /** 登录墙场景：记下回来该打开哪个页面 */
  intent?: string;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * 企业统一身份登录入口。与 LoginForm 同位替换，供登录页与登录墙共用。
 *
 * 跳转前把当前路由存进 sessionStorage，回调成功后原路送回；
 * 拿不到授权地址时把后端给的原因直接摊开，而不是笼统一句「登录失败」。
 */
export function OAuthLoginPanel({
  hint,
  title = '登录MSS AI提效平台',
  intent,
  footer,
  className,
}: OAuthLoginPanelProps) {
  const providerLabel = useAuthModeStore((s) => s.providerLabel);
  const ready = useAuthModeStore((s) => s.ready);
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ code: string; error: string; detail: string; hint: string } | null>(null);

  const start = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const returnTo = window.location.hash.startsWith('#/') ? window.location.hash : '';
      rememberReturnTo(returnTo);
      if (intent) rememberGateIntent(intent);

      const result = await fetchAuthorizeUrl({ workspaceId, returnTo });
      if (!result.ok) {
        setError(result);
        setSubmitting(false);
        return;
      }
      window.location.assign(result.url);
    } catch (err) {
      setError({
        code: 'network_unreachable',
        error: '连不上服务端',
        detail: err instanceof Error ? err.message : String(err),
        hint: '确认 Nginx 已反代 /api 到 Nest，且 API 进程在运行',
      });
      setSubmitting(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-col items-center text-center">
        <MssZhishuMark size={56} />
        <h2 className="mt-3.5 text-[16px] font-semibold text-zinc-900">{title}</h2>
        <p className="mt-1.5 text-[12px] text-zinc-500">通过{providerLabel}登录，无需单独设置密码</p>
      </div>

      {hint ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-center text-[12px] text-zinc-600">
          {hint}
        </p>
      ) : null}

      {!ready ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] leading-5 text-amber-900">
          服务端统一身份配置尚未填完，登录会失败。请运维执行
          <code className="mx-1 rounded bg-amber-100 px-1 font-mono text-[11px]">
            GET /api/v1/auth/oauth/diagnostics
          </code>
          查看缺哪一项。
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
          <p className="text-[12px] font-medium text-red-700">{error.error}</p>
          <p className="mt-1 font-mono text-[11px] text-red-500">{error.code}</p>
          {error.detail ? (
            <pre className="mt-1.5 max-h-28 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-4 text-red-600">
              {error.detail}
            </pre>
          ) : null}
          {error.hint ? <p className="mt-1.5 text-[11px] leading-4 text-red-700">→ {error.hint}</p> : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={start}
        disabled={submitting}
        className="w-full rounded-xl bg-[#e0122f] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#c01028] disabled:opacity-60"
      >
        {submitting ? '正在跳转…' : `使用${providerLabel}登录`}
      </button>

      {footer}
    </div>
  );
}
