import { useEffect } from 'react';
import { useMssBuildStatsCopyStore } from '@/stores/mssBuildStatsCopyStore';

/** 门户运营 · MSS 建设概况口径说明 */
export function PortalBuildStatsCopyPanel() {
  const copy = useMssBuildStatsCopyStore((s) => s.copy);
  const hydrate = useMssBuildStatsCopyStore((s) => s.hydrate);
  const update = useMssBuildStatsCopyStore((s) => s.update);
  const resetToDefaults = useMssBuildStatsCopyStore((s) => s.resetToDefaults);
  const toast = useMssBuildStatsCopyStore((s) => s.toast);
  const dismissToast = useMssBuildStatsCopyStore((s) => s.dismissToast);

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
          配置 MSS工具集市「建设概况」统计条的标题与口径说明。案例数 / 场景覆盖仍由当前筛选下的真实列表推导，此处只解释含义与建设目标，避免业务用户误解统计口径。
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!window.confirm('恢复默认建设概况口径文案？')) return;
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
        <label className="block text-[11px] font-medium text-zinc-500">
          统计条标题
          <input
            value={copy.title}
            onChange={(e) => update({ title: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] text-zinc-900"
            placeholder="建设概况"
          />
        </label>
        <label className="block text-[11px] font-medium text-zinc-500">
          覆盖口径说明
          <textarea
            value={copy.coverageBlurb}
            onChange={(e) => update({ coverageBlurb: e.target.value })}
            rows={4}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] leading-relaxed text-zinc-900"
          />
        </label>
        <label className="block text-[11px] font-medium text-zinc-500">
          建设目标（可选）
          <textarea
            value={copy.goalBlurb}
            onChange={(e) => update({ goalBlurb: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] leading-relaxed text-zinc-900"
            placeholder="例如：各业务场景均有可复用的场景案例与场景技能"
          />
        </label>
      </div>
    </div>
  );
}
