import { cn } from '@/lib/utils';
import {
  MARKET_SECURITY_LABEL,
  MARKET_SHELF_META,
  type MarketShelfCard,
} from '@/domain/marketShelf';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { useMarketCompareStore } from '@/stores/marketCompareStore';
import type { ReactNode } from 'react';

/** 轻量对比抽屉：同货架 2–3 项 */
export function MarketCompareDrawer({
  onOpenCard,
}: {
  onOpenCard: (card: MarketShelfCard) => void;
}) {
  const items = useMarketCompareStore((s) => s.items);
  const kind = useMarketCompareStore((s) => s.kind);
  const open = useMarketCompareStore((s) => s.drawerOpen);
  const setDrawerOpen = useMarketCompareStore((s) => s.setDrawerOpen);
  const remove = useMarketCompareStore((s) => s.remove);
  const clear = useMarketCompareStore((s) => s.clear);

  if (!open || items.length < 2 || !kind) return null;

  const cols = items;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-900/40 p-3 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="关闭对比"
        onClick={() => setDrawerOpen(false)}
      />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="text-[16px] font-semibold text-zinc-900">能力对比</h2>
            <p className="mt-0.5 text-[12px] text-zinc-500">
              {MARKET_SHELF_META[kind].label} · 已选 {cols.length} 项
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clear}
              className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-zinc-500 hover:bg-zinc-50"
            >
              清空
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-zinc-600 hover:bg-zinc-50"
            >
              关闭
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
          <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
            <thead>
              <tr>
                <th className="w-24 py-2 pr-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  维度
                </th>
                {cols.map((c) => (
                  <th key={c.id} className="px-2 py-2 align-bottom">
                    <div className="flex items-start gap-2">
                      <ToolLogo
                        name={c.title}
                        logoUrl={c.logoUrl}
                        icon={c.icon}
                        size={32}
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-zinc-900">{c.title}</p>
                        <button
                          type="button"
                          onClick={() => remove(c.id)}
                          className="mt-0.5 text-[11px] text-zinc-400 hover:text-zinc-700"
                        >
                          移除
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <CompareRow label="能帮我做什么">
                {cols.map((c) => (
                  <td key={c.id} className="px-2 py-2.5 align-top text-zinc-600">
                    {c.outcomeHint || c.description || '—'}
                  </td>
                ))}
              </CompareRow>
              <CompareRow label="安全分级">
                {cols.map((c) => (
                  <td key={c.id} className="px-2 py-2.5 align-top">
                    <span
                      className={cn(
                        'inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                        c.securityLevel === 'external' && 'bg-amber-50 text-amber-800',
                        c.securityLevel === 'internal' && 'bg-teal-50 text-teal-800',
                        c.securityLevel === 'mss' && 'bg-violet-50 text-violet-800',
                        !c.securityLevel && 'bg-zinc-100 text-zinc-600',
                      )}
                    >
                      {c.securityLevel
                        ? MARKET_SECURITY_LABEL[c.securityLevel]
                        : MARKET_SHELF_META[c.kind].shortLabel}
                    </span>
                  </td>
                ))}
              </CompareRow>
              <CompareRow label="适用场景">
                {cols.map((c) => (
                  <td key={c.id} className="px-2 py-2.5 align-top text-zinc-600">
                    {(c.sceneTags?.length ? c.sceneTags : c.badges.map((b) => b.label))
                      .slice(0, 4)
                      .join(' · ') || '—'}
                  </td>
                ))}
              </CompareRow>
              <CompareRow label="在线可用">
                {cols.map((c) => (
                  <td key={c.id} className="px-2 py-2.5 align-top text-zinc-600">
                    {c.kind === 'projects'
                      ? c.runnable
                        ? '可站内执行'
                        : '详情 / 下载为主'
                      : c.homepageUrl && c.homepageUrl !== '#'
                        ? '有入口链接'
                        : '需 How to / 申请'}
                  </td>
                ))}
              </CompareRow>
              <CompareRow label="区域">
                {cols.map((c) => (
                  <td key={c.id} className="px-2 py-2.5 align-top text-zinc-600">
                    {c.region === 'overseas'
                      ? '海外'
                      : c.region === 'domestic'
                        ? '国内'
                        : c.badges.find((b) => b.tone === 'region')?.label || '—'}
                  </td>
                ))}
              </CompareRow>
              <CompareRow label="合规提示">
                {cols.map((c) => (
                  <td key={c.id} className="px-2 py-2.5 align-top text-[12px] leading-snug text-zinc-600">
                    {c.securityLevel === 'external'
                      ? '勿输入公司敏感信息到外部 AI'
                      : c.securityLevel === 'internal'
                        ? '公司内工具，遵循数据分级'
                        : 'MSS 能力，按组织可见性与权限使用'}
                  </td>
                ))}
              </CompareRow>
            </tbody>
          </table>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 px-4 py-3 sm:px-5">
          {cols.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                onOpenCard(c);
              }}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition hover:bg-white"
            >
              打开 {c.title}
            </button>
          ))}
        </footer>
      </div>
    </div>
  );
}

function CompareRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <tr className="border-t border-zinc-100">
      <th className="py-2.5 pr-3 align-top text-[12px] font-semibold text-zinc-500">{label}</th>
      {children}
    </tr>
  );
}

/** 底部对比条：选满 2 项后出现 */
export function MarketCompareDock() {
  const items = useMarketCompareStore((s) => s.items);
  const setDrawerOpen = useMarketCompareStore((s) => s.setDrawerOpen);
  const clear = useMarketCompareStore((s) => s.clear);
  const remove = useMarketCompareStore((s) => s.remove);

  if (items.length < 1) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-xl items-center gap-3 rounded-2xl border border-zinc-200 bg-white/95 px-3 py-2.5 shadow-[0_12px_40px_-16px_rgba(24,24,27,0.45)] backdrop-blur">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {items.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => remove(c.id)}
              title={`移除 ${c.title}`}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-700"
            >
              <ToolLogo name={c.title} logoUrl={c.logoUrl} icon={c.icon} size={18} />
              <span className="max-w-[72px] truncate">{c.title}</span>
              <i className="fa-solid fa-xmark text-[9px] text-zinc-400" />
            </button>
          ))}
          <span className="shrink-0 text-[11px] text-zinc-400">{items.length}/3</span>
        </div>
        <button
          type="button"
          disabled={items.length < 2}
          onClick={() => setDrawerOpen(true)}
          className={cn(
            'shrink-0 rounded-xl px-3 py-2 text-[12px] font-semibold transition',
            items.length >= 2
              ? 'bg-zinc-900 text-white hover:bg-zinc-800'
              : 'cursor-not-allowed bg-zinc-100 text-zinc-400',
          )}
        >
          对比
        </button>
        <button
          type="button"
          onClick={clear}
          className="shrink-0 text-[11px] font-medium text-zinc-400 hover:text-zinc-700"
        >
          清空
        </button>
      </div>
    </div>
  );
}
