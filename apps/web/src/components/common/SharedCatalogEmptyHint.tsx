import { cn } from '@/lib/utils';
import { isDemoContentEnabled } from '@/domain/demoContentPolicy';
import { useWorkspaceStore } from '@/stores/workspaceStore';

/** 配置中心 / 货架空列表时的阶段 1 提示 */
export function SharedCatalogEmptyHint({
  assetLabel,
  className,
}: {
  assetLabel: string;
  className?: string;
}) {
  const apiConnected = useWorkspaceStore((s) => s.apiConnected);
  const apiStatus = useWorkspaceStore((s) => s.apiStatus);
  const demoOn = isDemoContentEnabled();

  let tip: string;
  if (!apiConnected) {
    tip =
      apiStatus === 'local-demo'
        ? '当前为本机模式。部门内共享请确认已部署后台并反代 /api。'
        : '共享服务未连通：同事上传的内容不会出现在此。请联系运维检查 /api/v1/health。';
  } else if (!demoOn) {
    tip = `演示样例已关闭。请用平台运营账号在「配置${assetLabel}」中新建或导入，保存后同事刷新即可看到。`;
  } else {
    tip = `暂无匹配的${assetLabel}。可调整筛选，或新建/导入后发布供同事下载。`;
  }

  return (
    <div
      className={cn(
        'col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center',
        className,
      )}
    >
      <i className="fa-regular fa-folder-open mb-2 text-[22px] text-zinc-300" />
      <p className="text-[13px] font-semibold text-zinc-700">暂无{assetLabel}</p>
      <p className="mt-1.5 max-w-md text-[11px] leading-relaxed text-zinc-500">{tip}</p>
    </div>
  );
}
