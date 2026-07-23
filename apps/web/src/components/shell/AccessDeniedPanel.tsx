import { getNavMetaLabel } from '@/domain/navPresentation';
import { OPS_ONLY_HINT } from '@/domain/permissions';
import type { AppView } from '@/domain/appView';

interface AccessDeniedPanelProps {
  targetView: string;
  onBack: () => void;
}

/** 业务壳误入运营专属页时的拦截面 */
export function AccessDeniedPanel({ targetView, onBack }: AccessDeniedPanelProps) {
  const label = getNavMetaLabel(targetView as AppView) || targetView;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
        <i className="fa-solid fa-lock text-xl" />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-900">
          「{label}」不可用
        </h2>
        <p className="text-[13px] leading-relaxed text-zinc-500">
          {OPS_ONLY_HINT}。你当前使用的是业务工作台；如需「配置专家 / 配置技能 / 配置工具」或治理项，请使用具备运营权限的账号。业务侧从「做任务 / 找案例」使用已上架且精选露出的能力。
        </p>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-zinc-800"
      >
        返回首页
      </button>
    </div>
  );
}
