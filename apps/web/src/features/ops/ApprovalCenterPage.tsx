import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { CenterPageHeader, CenterSearchInput } from '@/components/center/CenterShell';
import {
  ASSET_APPROVAL_KIND_LABELS,
  ASSET_APPROVAL_REASON_LABELS,
  approvalActionTitle,
} from '@/domain/assetApproval';
import { getCurrentUserName } from '@/domain/currentUser';
import {
  useAssetApprovalStore,
  type AssetApprovalRecord,
} from '@/stores/assetApprovalStore';

type TabId = 'mine' | 'todo' | 'history' | 'watch';

const TABS: { id: TabId; label: string }[] = [
  { id: 'mine', label: '我的申请' },
  { id: 'todo', label: '我的待办' },
  { id: 'history', label: '历史审批' },
  { id: 'watch', label: '我的关注' },
];

const STATUS_LABEL: Record<AssetApprovalRecord['status'], string> = {
  pending: '审批中',
  approved: '审批完成',
  cancelled: '已撤回',
  rejected: '已驳回',
};

function formatTime(ts?: number) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('zh-CN', { hour12: false });
}

export function ApprovalCenterPage() {
  const history = useAssetApprovalStore((s) => s.history);
  const watched = useAssetApprovalStore((s) => s.watched);
  const hydrate = useAssetApprovalStore((s) => s.hydrate);
  const resumePending = useAssetApprovalStore((s) => s.resumePending);
  const withdraw = useAssetApprovalStore((s) => s.withdraw);
  const toggleWatch = useAssetApprovalStore((s) => s.toggleWatch);
  const isWatched = useAssetApprovalStore((s) => s.isWatched);

  const [tab, setTab] = useState<TabId>('mine');
  const [q, setQ] = useState('');
  const me = getCurrentUserName();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (h: AssetApprovalRecord) => {
      if (!needle) return true;
      return (
        h.id.toLowerCase().includes(needle) ||
        h.assetName.toLowerCase().includes(needle) ||
        h.submitterName.toLowerCase().includes(needle)
      );
    };

    if (tab === 'mine') {
      return history.filter((h) => h.submitterName === me && match(h));
    }
    if (tab === 'todo') {
      return history.filter((h) => h.status === 'pending' && match(h));
    }
    if (tab === 'history') {
      return history.filter(
        (h) =>
          (h.submitterName === me || h.status === 'approved' || h.status === 'rejected') &&
          h.status !== 'pending' &&
          match(h),
      );
    }
    // watch: pending/最近变更置顶
    const ids = new Set(watched.map((w) => `${w.kind}:${w.assetId}`));
    return history
      .filter((h) => ids.has(`${h.kind}:${h.assetId}`) && match(h))
      .sort((a, b) => {
        const ap = a.status === 'pending' ? 1 : 0;
        const bp = b.status === 'pending' ? 1 : 0;
        if (ap !== bp) return bp - ap;
        return b.updatedAt - a.updatedAt;
      });
  }, [history, tab, q, me, watched]);

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl">
        <CenterPageHeader
          title="审批中心"
          subtitle="Skill / Agent / 工具 · 上架、更新、下架统一单据"
          tip="链路：提交人 → 业务主管 → MSS 质量与运营。驳回可不填意见；演示环境可打开单据「模拟通过」。"
          actions={
            <CenterSearchInput
              value={q}
              onChange={setQ}
              placeholder="搜索申请单号 / 资源名称 / 申请人…"
            />
          }
        />

        <div className="mb-4 flex gap-1 rounded-xl bg-zinc-100/80 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 rounded-lg px-3 py-2 text-[12px] font-semibold transition',
                tab === t.id
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.length ? (
            filtered.map((h) => (
              <article
                key={h.id}
                className="rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono text-zinc-400">{h.id}</p>
                    <h3 className="mt-0.5 text-[14px] font-semibold text-zinc-900">
                      {h.assetName}
                      <span className="ml-2 text-[11px] font-medium text-zinc-500">
                        {ASSET_APPROVAL_KIND_LABELS[h.kind]} · {approvalActionTitle(h.reasons)}
                      </span>
                    </h3>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      申请人 {h.submitterName}
                      <span className="mx-1.5 text-zinc-300">·</span>
                      创建 {formatTime(h.createdAt)}
                      <span className="mx-1.5 text-zinc-300">·</span>
                      更新 {formatTime(h.updatedAt)}
                    </p>
                    {h.reasons?.length ? (
                      <p className="mt-1 text-[11px] text-zinc-600">
                        {h.reasons.map((r) => ASSET_APPROVAL_REASON_LABELS[r]).join(' · ')}
                      </p>
                    ) : null}
                    {h.note ? (
                      <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500">{h.note}</p>
                    ) : null}
                    {h.rejectNote ? (
                      <p className="mt-1 text-[11px] text-rose-600">驳回说明：{h.rejectNote}</p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      h.status === 'pending' && 'bg-amber-50 text-amber-800',
                      h.status === 'approved' && 'bg-emerald-50 text-emerald-800',
                      h.status === 'rejected' && 'bg-rose-50 text-rose-700',
                      h.status === 'cancelled' && 'bg-zinc-100 text-zinc-500',
                    )}
                  >
                    {STATUS_LABEL[h.status]}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-zinc-100 pt-2.5">
                  {h.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => resumePending(h.id)}
                      className="rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[11px] font-semibold text-white"
                    >
                      打开审批
                    </button>
                  ) : null}
                  {tab === 'mine' && h.status === 'pending' && h.submitterName === me ? (
                    <button
                      type="button"
                      onClick={() => withdraw(h.id)}
                      className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-700"
                    >
                      撤回
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      toggleWatch({
                        kind: h.kind,
                        assetId: h.assetId,
                        assetName: h.assetName,
                      })
                    }
                    className={cn(
                      'rounded-lg border px-2.5 py-1.5 text-[11px] font-medium',
                      isWatched(h.assetId, h.kind)
                        ? 'border-sky-200 bg-sky-50 text-sky-900'
                        : 'border-zinc-200 text-zinc-700',
                    )}
                  >
                    {isWatched(h.assetId, h.kind) ? '已关注' : '关注'}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-14 text-center text-[13px] text-zinc-400">
              {q.trim() ? '无匹配单据' : '暂无记录'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
