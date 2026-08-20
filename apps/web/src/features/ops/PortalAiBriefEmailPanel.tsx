import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAiBriefEmailCopyStore } from '@/stores/aiBriefEmailCopyStore';
import {
  fetchAiBriefSubscriptions,
  type AiBriefEmailSubscriptionRecord,
} from '@/api/aiBriefSubscriptionsApi';
import { downloadAiBriefSubscriptionsExcel } from '@/domain/aiBriefSubscriptionExport';
import { useWorkspaceStore } from '@/stores/workspaceStore';

/** 门户运营 · AI 快讯邮件模板文案与落地链接 */
export function PortalAiBriefEmailPanel() {
  const copy = useAiBriefEmailCopyStore((s) => s.copy);
  const hydrate = useAiBriefEmailCopyStore((s) => s.hydrate);
  const update = useAiBriefEmailCopyStore((s) => s.update);
  const resetToDefaults = useAiBriefEmailCopyStore((s) => s.resetToDefaults);
  const toast = useAiBriefEmailCopyStore((s) => s.toast);
  const dismissToast = useAiBriefEmailCopyStore((s) => s.dismissToast);
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const [subscriptions, setSubscriptions] = useState<AiBriefEmailSubscriptionRecord[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionsError, setSubscriptionsError] = useState<string | null>(null);
  const [subscriptionSearch, setSubscriptionSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const subscriptionLoadGeneration = useRef(0);

  const loadSubscriptions = useCallback(async () => {
    const generation = ++subscriptionLoadGeneration.current;
    setSubscriptionsLoading(true);
    setSubscriptionsError(null);
    try {
      const result = await fetchAiBriefSubscriptions(workspaceId);
      if (generation !== subscriptionLoadGeneration.current) return;
      setSubscriptions(result.items);
    } catch {
      if (generation !== subscriptionLoadGeneration.current) return;
      setSubscriptionsError('订阅名单加载失败，请确认后台服务与管理员权限');
    } finally {
      if (generation === subscriptionLoadGeneration.current) {
        setSubscriptionsLoading(false);
      }
    }
  }, [workspaceId]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    void loadSubscriptions();
    return () => {
      subscriptionLoadGeneration.current += 1;
    };
  }, [loadSubscriptions]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => dismissToast(), 2400);
    return () => window.clearTimeout(t);
  }, [toast, dismissToast]);

  const visibleSubscriptions = useMemo(() => {
    const query = subscriptionSearch.trim().toLowerCase();
    if (!query) return subscriptions;
    return subscriptions.filter((item) =>
      [item.userName, item.email, item.userId].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [subscriptionSearch, subscriptions]);

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || '—';
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-zinc-200/90 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-semibold text-zinc-900">邮件订阅名单</h3>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                {subscriptions.length} 人
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
              数据来自后台数据库；用户在 AI快讯页订阅、更新或取消后会同步到这里。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadSubscriptions()}
              disabled={subscriptionsLoading}
              className="rounded-xl border border-zinc-200 px-3 py-1.5 text-[11px] font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-wait disabled:text-zinc-300"
            >
              <i className="fa-solid fa-rotate mr-1" />
              刷新
            </button>
            <button
              type="button"
              disabled={!visibleSubscriptions.length || exporting}
              onClick={() => {
                setExporting(true);
                void downloadAiBriefSubscriptionsExcel(visibleSubscriptions)
                  .catch(() => setSubscriptionsError('Excel 导出失败，请重试'))
                  .finally(() => setExporting(false));
              }}
              className="rounded-xl bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              <i className="fa-solid fa-file-excel mr-1" />
              {exporting ? '导出中…' : '导出 Excel'}
            </button>
          </div>
        </div>

        <label className="relative mt-3 block">
          <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400" />
          <input
            type="search"
            value={subscriptionSearch}
            onChange={(event) => setSubscriptionSearch(event.target.value)}
            placeholder="搜索姓名、邮箱或用户 ID"
            className="w-full rounded-xl border border-zinc-200 py-2 pl-8 pr-3 text-[12px] text-zinc-900 outline-none transition focus:border-[#0071e3]"
          />
        </label>

        {subscriptionsError ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {subscriptionsError}
          </p>
        ) : null}

        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-100">
          <table className="min-w-full border-collapse text-left text-[11px]">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-semibold">姓名</th>
                <th className="px-3 py-2 font-semibold">邮箱</th>
                <th className="px-3 py-2 font-semibold">订阅时间</th>
                <th className="px-3 py-2 font-semibold">更新时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {subscriptionsLoading && !subscriptions.length ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-zinc-400">
                    <i className="fa-solid fa-spinner fa-spin mr-1" />加载订阅名单…
                  </td>
                </tr>
              ) : visibleSubscriptions.length ? (
                visibleSubscriptions.map((item) => (
                  <tr key={item.userId} className="text-zinc-700">
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium text-zinc-900">
                      {item.userName || '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">{item.email}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-zinc-500">
                      {formatDateTime(item.subscribedAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-zinc-500">
                      {formatDateTime(item.updatedAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-zinc-400">
                    {subscriptionSearch ? '没有匹配的订阅记录' : '暂无邮件订阅'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

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
