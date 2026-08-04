import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  BUSINESS_SCENE_ICON_PRESETS,
  useBusinessScenarioCatalogStore,
} from '@/stores/businessScenarioCatalogStore';

/** 门户运营 · MSS 场景分类字典（文案 / 图标 / 可见 / 顺序） */
export function PortalSceneCategoryPanel() {
  const categories = useBusinessScenarioCatalogStore((s) => s.categories);
  const hydrate = useBusinessScenarioCatalogStore((s) => s.hydrate);
  const updateCategory = useBusinessScenarioCatalogStore((s) => s.updateCategory);
  const moveCategory = useBusinessScenarioCatalogStore((s) => s.moveCategory);
  const resetToDefaults = useBusinessScenarioCatalogStore((s) => s.resetToDefaults);
  const toast = useBusinessScenarioCatalogStore((s) => s.toast);
  const dismissToast = useBusinessScenarioCatalogStore((s) => s.dismissToast);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => dismissToast(), 2400);
    return () => window.clearTimeout(t);
  }, [toast, dismissToast]);

  const visibleCount = categories.filter((c) => c.tabVisible).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4">
        <p className="text-[12px] leading-relaxed text-zinc-500">
          配置 MSS工具集市「场景分类」卡片的名称、简介、图标、是否展示与排序。场景编码（S1–S8）保持稳定，以兼容项目 /
          Skill 映射；不在此新增编码。
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!window.confirm('恢复默认场景分类文案与顺序？')) return;
              resetToDefaults();
            }}
            className="rounded-xl border border-zinc-200 px-3 py-1.5 text-[12px] font-medium text-zinc-600 hover:bg-zinc-50"
          >
            恢复默认
          </button>
          <span className="text-[11px] text-zinc-400">
            业务可见 {visibleCount} / {categories.length}
          </span>
        </div>
      </div>

      {toast ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
          {toast}
        </div>
      ) : null}

      <div className="space-y-3">
        {categories.map((c, index) => (
          <article
            key={c.id}
            className={cn(
              'rounded-2xl border bg-white p-4',
              c.tabVisible ? 'border-zinc-200/90' : 'border-dashed border-zinc-200 opacity-80',
            )}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-50 text-zinc-600 ring-1 ring-zinc-100">
                  <i className={cn('fa-solid text-[14px]', c.icon)} />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-zinc-900">
                    {c.label}
                    <span className="ml-2 text-[11px] font-medium text-zinc-400">{c.id}</span>
                  </p>
                  <p className="text-[11px] text-zinc-400">{c.fullLabel}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveCategory(c.id, -1)}
                  className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] text-zinc-600 disabled:opacity-30"
                  title="上移"
                >
                  <i className="fa-solid fa-arrow-up" />
                </button>
                <button
                  type="button"
                  disabled={index === categories.length - 1}
                  onClick={() => moveCategory(c.id, 1)}
                  className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] text-zinc-600 disabled:opacity-30"
                  title="下移"
                >
                  <i className="fa-solid fa-arrow-down" />
                </button>
                <label className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
                  <input
                    type="checkbox"
                    checked={c.tabVisible}
                    onChange={(e) =>
                      updateCategory(c.id, { tabVisible: e.target.checked })
                    }
                  />
                  集市可见
                </label>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="text-[11px] font-medium text-zinc-500">
                展示名
                <input
                  value={c.label}
                  onChange={(e) => updateCategory(c.id, { label: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px]"
                />
              </label>
              <label className="text-[11px] font-medium text-zinc-500">
                全称
                <input
                  value={c.fullLabel}
                  onChange={(e) => updateCategory(c.id, { fullLabel: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px]"
                />
              </label>
              <label className="text-[11px] font-medium text-zinc-500 sm:col-span-2">
                简介
                <input
                  value={c.blurb}
                  onChange={(e) => updateCategory(c.id, { blurb: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px]"
                />
              </label>
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-[11px] font-medium text-zinc-500">图标</p>
                <div className="flex flex-wrap gap-1.5">
                  {BUSINESS_SCENE_ICON_PRESETS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      title={icon}
                      onClick={() => updateCategory(c.id, { icon })}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg border transition',
                        c.icon === icon
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50',
                      )}
                    >
                      <i className={cn('fa-solid text-[12px]', icon)} />
                    </button>
                  ))}
                </div>
                <input
                  value={c.icon}
                  onChange={(e) => updateCategory(c.id, { icon: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 font-mono text-[12px]"
                  placeholder="fa-icon-name"
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
