import { cn } from '@/lib/utils';
import {
  ASSET_APPROVAL_KIND_LABELS,
  ASSET_APPROVAL_NODES,
  approvalNodeStatuses,
  type ApprovalNodeStatus,
} from '@/domain/assetApproval';
import { useAssetApprovalStore } from '@/stores/assetApprovalStore';

function statusMeta(status: ApprovalNodeStatus) {
  if (status === 'done') {
    return { label: '已通过', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', ring: 'border-emerald-300' };
  }
  if (status === 'active') {
    return { label: '审批中', chip: 'bg-amber-50 text-amber-700 border-amber-200', ring: 'border-amber-400 ring-2 ring-amber-200' };
  }
  if (status === 'rejected') {
    return { label: '已驳回', chip: 'bg-red-50 text-red-600 border-red-200', ring: 'border-red-300' };
  }
  return { label: '等待中', chip: 'bg-zinc-50 text-zinc-500 border-zinc-200', ring: 'border-zinc-200' };
}

/** 上架审批流程示意：提交人 → 业务主管 → MSS 质量与运营 */
export function AssetApprovalModal() {
  const current = useAssetApprovalStore((s) => s.current);
  const advance = useAssetApprovalStore((s) => s.advance);
  const close = useAssetApprovalStore((s) => s.close);

  if (!current) return null;

  const statuses = approvalNodeStatuses(current.stepIndex);
  const kindLabel = ASSET_APPROVAL_KIND_LABELS[current.kind];
  const activeNode = ASSET_APPROVAL_NODES[current.stepIndex];

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[110] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-black/5 bg-white shadow-apple-lg">
        <div className="flex items-start justify-between border-b border-black/[0.06] px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">上架审批</p>
            <h3 className="mt-0.5 text-[16px] font-semibold text-zinc-900">
              {kindLabel} · {current.assetName}
            </h3>
            <p className="mt-1 text-[12px] text-zinc-500">
              配置完成后需经三级审批方可正式上架。当前节点：
              <span className="font-medium text-zinc-800">{activeNode?.title ?? '已完成'}</span>
            </p>
          </div>
          <button type="button" onClick={close} className="text-zinc-400 hover:text-zinc-800">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* 流程轨道 */}
          <div className="flex items-center gap-1 px-1">
            {ASSET_APPROVAL_NODES.map((node, i) => {
              const st = statuses[i];
              const meta = statusMeta(st);
              return (
                <div key={node.id} className="flex min-w-0 flex-1 items-center">
                  <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full border-2 bg-white text-[12px]',
                        meta.ring,
                        st === 'done' && 'bg-emerald-50 text-emerald-700',
                        st === 'active' && 'bg-amber-50 text-amber-700',
                        st === 'pending' && 'text-zinc-400',
                      )}
                    >
                      <i className={cn('fa-solid', st === 'done' ? 'fa-check' : node.icon)} />
                    </div>
                    <p className="truncate text-center text-[10px] font-semibold text-zinc-700">{node.title}</p>
                  </div>
                  {i < ASSET_APPROVAL_NODES.length - 1 ? (
                    <div
                      className={cn(
                        'mb-4 h-0.5 w-6 shrink-0 sm:w-10',
                        i < current.stepIndex ? 'bg-emerald-400' : 'bg-zinc-200',
                      )}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* 节点卡片 */}
          <div className="grid gap-2 sm:grid-cols-3">
            {ASSET_APPROVAL_NODES.map((node, i) => {
              const st = statuses[i];
              const meta = statusMeta(st);
              return (
                <div
                  key={node.id}
                  className={cn(
                    'rounded-xl border bg-white p-3 transition',
                    meta.ring,
                    st === 'active' && 'bg-amber-50/40',
                    st === 'done' && 'bg-emerald-50/30',
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold text-zinc-800">{node.title}</span>
                    <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-bold', meta.chip)}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-zinc-500">{node.roleLabel}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">{node.desc}</p>
                  {i === 0 ? (
                    <p className="mt-2 truncate text-[10px] text-zinc-400">
                      提交人：{current.submitterName}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-600">
            <strong className="font-semibold text-zinc-800">流程说明：</strong>
            资产保存为待审草稿后进入本流程。业务主管通过后进入 MSS 质量与运营终审；终审通过后自动上架到对应能力中心。演示环境可点击「模拟通过」推进节点。
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.06] bg-[#fafafa]/60 px-5 py-4">
          <button
            type="button"
            onClick={close}
            className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium text-zinc-600 hover:bg-white"
          >
            稍后处理
          </button>
          <button
            type="button"
            onClick={advance}
            className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
          >
            {current.stepIndex >= 2 ? '终审通过并上架' : `模拟通过「${activeNode?.title ?? ''}」`}
          </button>
        </div>
      </div>
    </div>
  );
}
