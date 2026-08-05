import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ExternalToolTypeId } from '@/domain/externalToolTaxonomy';
import { EXTERNAL_TYPE_ICON_PRESETS } from '@/domain/externalTaxonomyCatalog';
import { useExternalTaxonomyCatalogStore } from '@/stores/externalTaxonomyCatalogStore';

type DictTab = 'types' | 'scenes';

/** 门户运营 · 外精选分类字典（工具类型 / 工作场景） */
export function PortalExternalTaxonomyPanel() {
  const catalog = useExternalTaxonomyCatalogStore((s) => s.catalog);
  const hydrate = useExternalTaxonomyCatalogStore((s) => s.hydrate);
  const updateType = useExternalTaxonomyCatalogStore((s) => s.updateType);
  const updateScene = useExternalTaxonomyCatalogStore((s) => s.updateScene);
  const moveType = useExternalTaxonomyCatalogStore((s) => s.moveType);
  const moveScene = useExternalTaxonomyCatalogStore((s) => s.moveScene);
  const resetToDefaults = useExternalTaxonomyCatalogStore((s) => s.resetToDefaults);
  const toast = useExternalTaxonomyCatalogStore((s) => s.toast);
  const dismissToast = useExternalTaxonomyCatalogStore((s) => s.dismissToast);
  const [tab, setTab] = useState<DictTab>('types');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => dismissToast(), 2400);
    return () => window.clearTimeout(t);
  }, [toast, dismissToast]);

  const visibleTypes = catalog.types.filter((t) => t.visible).length;
  const visibleScenes = catalog.scenes.filter((s) => s.visible).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4">
        <p className="text-[12px] leading-relaxed text-zinc-500">
          配置外精选货架顶部「按工具类型 / 按工作场景」芯片的名称、图标、是否展示与顺序。编码保持稳定以兼容
          CSV / 工具主数据；隐藏后筛选条不再显示，已标注该类型的工具仍保留字段。
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-0.5">
            {(
              [
                ['types', `工具类型（${visibleTypes}）`],
                ['scenes', `工作场景（${visibleScenes}）`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
                  tab === id
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm('恢复默认外精选分类文案与顺序？')) return;
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

      {tab === 'types' ? (
        <div className="space-y-3">
          {catalog.types.map((t, index) => (
            <article
              key={t.id}
              className={cn(
                'rounded-2xl border bg-white p-4',
                t.visible ? 'border-zinc-200/90' : 'border-dashed border-zinc-200 opacity-80',
              )}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-50 text-zinc-600 ring-1 ring-zinc-100">
                    <i className={cn('fa-solid text-[14px]', t.icon)} />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-zinc-900">
                      {t.label}
                      <span className="ml-2 text-[11px] font-medium text-zinc-400">{t.id}</span>
                    </p>
                    <p className="text-[11px] text-zinc-400">{t.csvLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveType(t.id, -1)}
                    className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] disabled:opacity-40"
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    disabled={index === catalog.types.length - 1}
                    onClick={() => moveType(t.id, 1)}
                    className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] disabled:opacity-40"
                  >
                    下移
                  </button>
                  <label className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2 py-1 text-[11px]">
                    <input
                      type="checkbox"
                      className="accent-zinc-800"
                      checked={t.visible}
                      onChange={(e) => updateType(t.id, { visible: e.target.checked })}
                    />
                    展示
                  </label>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-[11px] text-zinc-600">
                  展示名
                  <input
                    value={t.label}
                    onChange={(e) => updateType(t.id, { label: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-zinc-400"
                  />
                </label>
                <label className="block text-[11px] text-zinc-600">
                  图标
                  <select
                    value={t.icon}
                    onChange={(e) => updateType(t.id, { icon: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-zinc-400"
                  >
                    {EXTERNAL_TYPE_ICON_PRESETS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                    {!EXTERNAL_TYPE_ICON_PRESETS.includes(
                      t.icon as (typeof EXTERNAL_TYPE_ICON_PRESETS)[number],
                    ) ? (
                      <option value={t.icon}>{t.icon}</option>
                    ) : null}
                  </select>
                </label>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {catalog.scenes.map((s, index) => (
            <article
              key={s.id}
              className={cn(
                'rounded-2xl border bg-white p-4',
                s.visible ? 'border-zinc-200/90' : 'border-dashed border-zinc-200 opacity-80',
              )}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-zinc-900">
                  {s.label}
                  <span className="ml-2 text-[11px] font-medium text-zinc-400">{s.id}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveScene(s.id, -1)}
                    className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] disabled:opacity-40"
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    disabled={index === catalog.scenes.length - 1}
                    onClick={() => moveScene(s.id, 1)}
                    className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] disabled:opacity-40"
                  >
                    下移
                  </button>
                  <label className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2 py-1 text-[11px]">
                    <input
                      type="checkbox"
                      className="accent-zinc-800"
                      checked={s.visible}
                      onChange={(e) => updateScene(s.id, { visible: e.target.checked })}
                    />
                    展示
                  </label>
                </div>
              </div>
              <label className="mb-2 block text-[11px] text-zinc-600">
                展示名
                <input
                  value={s.label}
                  onChange={(e) => updateScene(s.id, { label: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-zinc-400"
                />
              </label>
              <p className="mb-1.5 text-[11px] text-zinc-500">关联工具类型（决定「按工作场景」筛选）</p>
              <div className="flex flex-wrap gap-1.5">
                {catalog.types.map((t) => {
                  const on = s.typeIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        const next = on
                          ? s.typeIds.filter((id) => id !== t.id)
                          : [...s.typeIds, t.id];
                        updateScene(s.id, { typeIds: next as ExternalToolTypeId[] });
                      }}
                      className={cn(
                        'rounded-lg border px-2 py-1 text-[11px] font-medium transition',
                        on
                          ? 'border-zinc-800 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
