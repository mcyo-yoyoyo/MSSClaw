import { useEffect, useRef, useState } from 'react';
import { MssZhishuMark } from '@/components/brand/MssZhishuMark';
import { writeSessionToken } from '@/api/client';
import { completeOAuthLogin, type OAuthCallbackFailure } from '@/api/authOAuthApi';
import {
  appRootUrl,
  readCallbackParams,
  stripCallbackQuery,
  takeGateIntent,
  takeReturnTo,
} from '@/domain/authMode';
import { getVisitorId } from '@/domain/visitorIdentity';

type Phase = 'working' | 'ok' | 'failed';

/**
 * IDaaS 回跳落地页。独立于主壳渲染（见 main.tsx），不触发工作区装载。
 *
 * 失败时【不静默跳走】：错误码、traceId、上游原因、处置建议全部摆在页面上，
 * 并提供「复制诊断信息」。内网联调时用户把这段贴出来就够定位，
 * 不用再去翻服务器日志或让人重现一遍。
 */
export function OAuthCallbackView() {
  const [phase, setPhase] = useState<Phase>('working');
  const [failure, setFailure] = useState<OAuthCallbackFailure | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const startedRef = useRef(false);
  const pageRef = useRef({ origin: window.location.origin, path: window.location.pathname });

  useEffect(() => {
    // StrictMode 会跑两次 effect，而授权码是一次性的——第二次必然报 code 已用过
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      const params = readCallbackParams();
      // 先抹掉 query：授权码不该留在历史记录与 Referer 里
      stripCallbackQuery();

      if (params.error) {
        setFailure({
          ok: false,
          code: `idaas_${params.error}`,
          error: '企业统一身份认证未通过',
          detail: params.errorDescription || `IDaaS 在回调里返回了 error=${params.error}`,
          hint: '这是 IDaaS 侧直接拒绝，未进入本平台逻辑；核对应用注册状态与 redirect_uri',
          traceId: '',
          steps: [],
        });
        setPhase('failed');
        return;
      }
      if (!params.code) {
        setFailure({
          ok: false,
          code: 'oauth_code_missing',
          error: '回调地址里没有授权码',
          detail: `当前地址 ${pageRef.current.origin}${pageRef.current.path} 未携带 code 参数`,
          hint: '多为直接访问了回调页；请从登录页重新发起。若是 IDaaS 跳回来的，核对注册的 redirect_uri',
          traceId: '',
          steps: [],
        });
        setPhase('failed');
        return;
      }

      const result = await completeOAuthLogin({
        code: params.code,
        state: params.state,
        visitorId: getVisitorId(),
      });

      if (!result.ok) {
        setFailure(result);
        setPhase('failed');
        return;
      }

      writeSessionToken(result.token);
      setPhase('ok');
      // 整页跳回应用：主壳启动时用 /auth/me 还原会话，与密码登录走同一条路
      const returnTo = takeReturnTo();
      window.location.replace(`${appRootUrl()}${returnTo || '#/home'}`);
    })();
  }, []);

  const diagnosticsText = () => {
    const intent = takeGateIntent();
    return [
      'MSS Claw 统一身份登录失败诊断',
      `时间        : ${new Date().toISOString()}`,
      `错误码      : ${failure?.code ?? '-'}`,
      `traceId     : ${failure?.traceId || '(未生成，说明未进入后端逻辑)'}`,
      `提示信息    : ${failure?.error ?? '-'}`,
      `详细原因    : ${failure?.detail ?? '-'}`,
      `处置建议    : ${failure?.hint ?? '-'}`,
      `后端步骤    : ${failure?.steps?.join(' → ') || '-'}`,
      `回调地址    : ${pageRef.current.origin}${pageRef.current.path}`,
      `登录前意图  : ${intent || '-'}`,
      `浏览器      : ${navigator.userAgent}`,
      '',
      `服务端日志请 grep: [oauth]${failure?.traceId ? `[${failure.traceId}]` : ''}`,
    ].join('\n');
  };

  const copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(diagnosticsText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (phase !== 'failed') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#fbfbfd]">
        <MssZhishuMark size={48} />
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-zinc-200 border-t-[#e0122f]" />
        <p className="text-[13px] text-[#86868b]">
          {phase === 'ok' ? '登录成功，正在进入平台…' : '正在完成企业统一身份认证…'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f4f6] px-5 py-10">
      <div className="w-full max-w-[560px] rounded-2xl border border-zinc-200 bg-white p-7 shadow-[0_18px_50px_-28px_rgba(24,24,27,0.45)] md:p-8">
        <div className="flex flex-col items-center text-center">
          <MssZhishuMark size={48} />
          <h1 className="mt-3.5 text-[16px] font-semibold text-zinc-900">
            {failure?.error ?? '登录失败'}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
            <span className="rounded-md bg-red-50 px-2 py-0.5 font-mono text-[11px] text-red-600">
              {failure?.code}
            </span>
            {failure?.traceId ? (
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-600">
                trace {failure.traceId}
              </span>
            ) : null}
          </div>
        </div>

        {failure?.hint ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="mb-1 text-[11px] font-semibold tracking-wide text-amber-700">怎么处理</p>
            <p className="text-[13px] leading-6 text-amber-900">{failure.hint}</p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 flex w-full items-center justify-between rounded-xl border border-zinc-200 px-4 py-2.5 text-[12px] text-zinc-600 transition hover:bg-zinc-50"
        >
          <span>详细信息（给运维/开发看）</span>
          <i className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'} text-[11px]`} />
        </button>

        {expanded ? (
          <pre className="mt-2 max-h-[280px] overflow-auto whitespace-pre-wrap break-all rounded-xl bg-zinc-950 px-4 py-3 font-mono text-[11px] leading-5 text-zinc-100">
            {diagnosticsText()}
          </pre>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => window.location.replace(`${appRootUrl()}#/login`)}
            className="rounded-xl bg-[#e0122f] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#c01028]"
          >
            重新登录
          </button>
          <button
            type="button"
            onClick={copyDiagnostics}
            className="rounded-xl border border-zinc-200 bg-white py-2.5 text-[13px] font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            {copied ? '已复制' : '复制诊断信息'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => window.location.replace(`${appRootUrl()}#/home`)}
          className="mt-2.5 w-full rounded-xl py-2 text-[12px] text-zinc-500 transition hover:text-zinc-700"
        >
          以游客身份浏览
        </button>

        <p className="mt-4 text-center text-[11px] leading-5 text-zinc-400">
          排查手册：docs/auth-oauth-troubleshooting.md
          {failure?.traceId ? ` · 服务端日志 grep [oauth][${failure.traceId}]` : ''}
        </p>
      </div>
    </div>
  );
}
