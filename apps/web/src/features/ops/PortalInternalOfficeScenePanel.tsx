import { useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  INTERNAL_OFFICE_SCENE_ICON_PRESETS,
  listDefaultInternalOfficeTools,
} from '@/domain/internalOfficeScenes';
import { resolveToolMarketShelf } from '@/domain/aiToolCategories';
import { resolveToolLogoUrl } from '@/domain/toolLogo';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useInternalOfficeSceneCatalogStore } from '@/stores/internalOfficeSceneCatalogStore';

/** 门户运营 · 公司办公场景字典（文案 / 工具绑定 / 顺序） */
export function PortalInternalOfficeScenePanel() {
  const tools = useMarketplaceStore((s) => s.tools);
  const entries = useInternalOfficeSceneCatalogStore((s) => s.entries);
  const hydrate = useInternalOfficeSceneCatalogStore((s) => s.hydrate);
  const updateEntry = useInternalOfficeSceneCatalogStore((s) => s.updateEntry);
  const setToolIds = useInternalOfficeSceneCatalogStore((s) => s.setToolIds);
  const setToolBlurb = useInternalOfficeSceneCatalogStore((s) => s.setToolBlurb);
  const moveEntry = useInternalOfficeSceneCatalogStore((s) => s.moveEntry);
  const resetToDefaults = useInternalOfficeSceneCatalogStore((s) => s.resetToDefaults);
  const toast = useInternalOfficeSceneCatalogStore((s) => s.toast);
  const dismissToast = useInternalOfficeSceneCatalogStore((s) => s.dismissToast);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => dismissToast(), 2400);
    return () => window.clearTimeout(t);
  }, [toast, dismissToast]);

  const candidateTools = useMemo(() => {
    const defaults = listDefaultInternalOfficeTools();
    const byId = new Map(defaults.map((t) => [t.id, t]));
    for (const t of tools) {
      if (t.published === false) continue;
      const shelf = resolveToolMarketShelf(t);
      const isInternal =
        shelf === 'internal' ||
        t.sourceType === 'internal' ||
        Boolean(t.tags?.includes('hw-internal'));
      if (!isInternal) continue;
      if (!byId.has(t.id)) {
        byId.set(t.id, {
          id: t.id,
          name: t.name,
          blurb: t.desc || t.name,
          homepageUrl: t.homepageUrl || '#',
          logoUrl: resolveToolLogoUrl(t) || '',
        });
      }
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  }, [tools]);

  const visibleCount = entries.filter((e) => e.visible).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4">
        <p className="text-[12px] leading-relaxed text-zinc-500">
          配置公司工具推荐页的办公场景：名称、简介、图标、是否展示、排序，以及场景绑定的内部工具。
          工具访问链接与 Logo 仍在「配置工具」维护；此处只决定场景如何陈列与引用哪些工具。
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!window.confirm('恢复默认办公场景文案、顺序与工具绑定？')) return;
              resetToDefaults();
            }}
            className="rounded-xl border border-zinc-200 px-3 py-1.5 text-[12px] font-medium text-zinc-600 hover:bg-zinc-50"
          >
            恢复默认
          </button>
          <span className="text-[11px] text-zinc-400">
            业务可见 {visibleCount} / {entries.length}
          </span>
        </div>
      </div>

      {toast ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
          {toast}
        </div>
      ) : null}

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <article
            key={entry.id}
            className={cn(
              'rounded-2xl border bg-white p-4',
              entry.visible ? 'border-zinc-200/90' : 'border-dashed border-zinc-200 opacity-80',
            )}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-50 text-zinc-600 ring-1 ring-zinc-100">
                  <i className={cn('fa-solid text-[14px]', entry.icon)} />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-zinc-900">
                    {entry.label}
                    <span className="ml-2 text-[11px] font-medium text-zinc-400">
                      {entry.id}
                    </span>
                  </p>
                  <p className="text-[11px] text-zinc-400">{entry.english}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveEntry(entry.id, -1)}
                  className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] disabled:opacity-40"
                >
                  上移
                </button>
                <button
                  type="button"
                  disabled={index === entries.length - 1}
                  onClick={() => moveEntry(entry.id, 1)}
                  className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] disabled:opacity-40"
                >
                  下移
                </button>
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2 py-1 text-[11px]">
                  <input
                    type="checkbox"
                    className="accent-zinc-800"
                    checked={entry.visible}
                    onChange={(e) => updateEntry(entry.id, { visible: e.target.checked })}
                  />
                  展示
                </label>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-[11px] text-zinc-600">
                场景名
                <input
                  value={entry.label}
                  onChange={(e) => updateEntry(entry.id, { label: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-zinc-400"
                />
              </label>
              <label className="block text-[11px] text-zinc-600">
                英文副标
                <input
                  value={entry.english}
                  onChange={(e) => updateEntry(entry.id, { english: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-zinc-400"
                />
              </label>
            </div>
            <label className="mt-2 block text-[11px] text-zinc-600">
              简介
              <textarea
                rows={2}
                value={entry.description}
                onChange={(e) => updateEntry(entry.id, { description: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-zinc-400"
              />
            </label>
            <label className="mt-2 block text-[11px] text-zinc-600">
              图标
              <select
                value={entry.icon}
                onChange={(e) => updateEntry(entry.id, { icon: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-zinc-400"
              >
                {INTERNAL_OFFICE_SCENE_ICON_PRESETS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
                {!INTERNAL_OFFICE_SCENE_ICON_PRESETS.includes(
                  entry.icon as (typeof INTERNAL_OFFICE_SCENE_ICON_PRESETS)[number],
                ) ? (
                  <option value={entry.icon}>{entry.icon}</option>
                ) : null}
              </select>
            </label>

            <p className="mb-1.5 mt-3 text-[11px] font-medium text-zinc-600">绑定工具</p>
            <div className="flex flex-wrap gap-1.5">
              {candidateTools.map((t) => {
                const on = entry.toolIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      const next = on
                        ? entry.toolIds.filter((id) => id !== t.id)
                        : [...entry.toolIds, t.id];
                      setToolIds(entry.id, next);
                    }}
                    className={cn(
                      'inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition',
                      on
                        ? 'border-zinc-800 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
                    )}
                  >
                    <ToolLogo
                      name={t.name}
                      logoUrl={t.logoUrl}
                      size={16}
                      className="rounded"
                    />
                    <span className="truncate">{t.name}</span>
                  </button>
                );
              })}
            </div>

            {entry.toolIds.length ? (
              <div className="mt-2 space-y-1.5 rounded-xl border border-zinc-100 bg-zinc-50/80 p-2.5">
                {entry.toolIds.map((toolId) => {
                  const meta =
                    candidateTools.find((t) => t.id === toolId) ??
                    listDefaultInternalOfficeTools().find((t) => t.id === toolId);
                  return (
                    <label key={toolId} className="block text-[11px] text-zinc-600">
                      {meta?.name || toolId} · 场景内说明
                      <input
                        value={entry.toolBlurbs[toolId] ?? meta?.blurb ?? ''}
                        onChange={(e) => setToolBlurb(entry.id, toolId, e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-zinc-400"
                      />
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-amber-700">至少绑定一个工具，否则场景无法打开。</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
