import { cn } from '@/lib/utils';

/** 外部工具货架 / 详情：信息安全合规提示 */
export function ExternalComplianceBanner({
  className,
  dense,
}: {
  className?: string;
  dense?: boolean;
}) {
  return (
    <aside
      role="note"
      className={cn(
        'flex gap-2.5 rounded-xl border border-amber-200/90 bg-amber-50/90 text-amber-950',
        dense ? 'px-3 py-2' : 'px-3.5 py-2.5',
        className,
      )}
    >
      <i
        className={cn(
          'fa-solid fa-shield-halved mt-0.5 shrink-0 text-amber-700/80',
          dense ? 'text-[12px]' : 'text-[13px]',
        )}
        aria-hidden
      />
      <div className="min-w-0">
        <p className={cn('font-semibold', dense ? 'text-[12px]' : 'text-[13px]')}>
          外部 AI 工具合规提示
        </p>
        <p className={cn('mt-0.5 leading-snug text-amber-900/80', dense ? 'text-[11px]' : 'text-[12px]')}>
          公司信息安全要求：请勿将内部敏感信息、客户数据、未公开方案等输入外部 AI。使用前确认数据出境与账号权限合规。
        </p>
      </div>
    </aside>
  );
}
