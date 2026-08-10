import { useEffect } from 'react';
import { useAiBriefEmailCopyStore } from '@/stores/aiBriefEmailCopyStore';

/** 门户运营 · AI 快讯邮件模板文案与落地链接 */
export function PortalAiBriefEmailPanel() {
  const copy = useAiBriefEmailCopyStore((s) => s.copy);
  const hydrate = useAiBriefEmailCopyStore((s) => s.hydrate);
  const update = useAiBriefEmailCopyStore((s) => s.update);
  const resetToDefaults = useAiBriefEmailCopyStore((s) => s.resetToDefaults);
  const toast = useAiBriefEmailCopyStore((s) => s.toast);
  const dismissToast = useAiBriefEmailCopyStore((s) => s.dismissToast);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => dismissToast(), 2400);
    return () => window.clearTimeout(t);
  }, [toast, dismissToast]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4">
        <p className="text-[12px] leading-relaxed text-zinc-500">
          配置「AI快讯」页下载的 HTML 邮件模板壳：品牌标题、页脚引导文案、按钮文字与平台链接。快讯正文仍取当日动态；改这里只影响邮件落地引导，便于对外推广时统一口径。
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!window.confirm('恢复默认 AI 快讯邮件文案？')) return;
              resetToDefaults();
            }}
            className="rounded-xl border border-zinc-200 px-3 py-1.5 text-[12px] font-medium text-zinc-600 hover:bg-zinc-50"
          >
            恢复默认
          </button>
        </div>
      </div>

      {toast ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
          {toast}
        </div>
      ) : null}

      <div className="space-y-3 rounded-2xl border border-zinc-200/90 bg-white p-4">
        <p className="text-[12px] font-semibold text-zinc-800">邮件头部</p>
        <label className="block text-[11px] font-medium text-zinc-500">
          品牌行
          <input
            value={copy.brandLabel}
            onChange={(e) => update({ brandLabel: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] text-zinc-900"
            placeholder="MSS AI 提效作战平台"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-[11px] font-medium text-zinc-500">
            主标题
            <input
              value={copy.headline}
              onChange={(e) => update({ headline: e.target.value })}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] text-zinc-900"
              placeholder="MSS AI快讯"
            />
          </label>
          <label className="block text-[11px] font-medium text-zinc-500">
            日期行后缀
            <input
              value={copy.dateSuffix}
              onChange={(e) => update({ dateSuffix: e.target.value })}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] text-zinc-900"
              placeholder="精选产业动态速读"
            />
          </label>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-zinc-200/90 bg-white p-4">
        <p className="text-[12px] font-semibold text-zinc-800">页脚引导（探索 / 进入平台）</p>
        <label className="block text-[11px] font-medium text-zinc-500">
          引导标题
          <input
            value={copy.ctaTitle}
            onChange={(e) => update({ ctaTitle: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] text-zinc-900"
            placeholder="学工具、用工具、造工具"
          />
        </label>
        <label className="block text-[11px] font-medium text-zinc-500">
          引导说明
          <textarea
            value={copy.ctaBlurb}
            onChange={(e) => update({ ctaBlurb: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] leading-relaxed text-zinc-900"
            placeholder="打开平台浏览外部工具精选…"
          />
        </label>
        <label className="block text-[11px] font-medium text-zinc-500">
          按钮文案
          <input
            value={copy.ctaButtonLabel}
            onChange={(e) => update({ ctaButtonLabel: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] text-zinc-900"
            placeholder="进入 MSS AI平台"
          />
        </label>
        <label className="block text-[11px] font-medium text-zinc-500">
          平台链接
          <input
            value={copy.platformUrl}
            onChange={(e) => update({ platformUrl: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 font-mono text-[12px] text-zinc-900"
            placeholder="https://mssclaw.vercel.app（留空则用当前站点地址）"
          />
          <span className="mt-1 block text-[10px] text-zinc-400">
            正式发信建议填稳定公网地址；留空时下载会使用当前浏览器访问地址。
          </span>
        </label>
        <label className="block text-[11px] font-medium text-zinc-500">
          页脚说明
          <textarea
            value={copy.footerNote}
            onChange={(e) => update({ footerNote: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] leading-relaxed text-zinc-900"
          />
        </label>
      </div>
    </div>
  );
}
