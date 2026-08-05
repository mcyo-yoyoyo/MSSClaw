import { cn } from '@/lib/utils';
import {
  EXTERNAL_FILTER_MODES,
  type ExternalFilterMode,
  type ExternalToolTypeId,
  type ExternalWorkSceneId,
} from '@/domain/externalToolTaxonomy';
import {
  listVisibleExternalToolTypes,
  listVisibleExternalWorkScenes,
} from '@/domain/externalTaxonomyCatalog';
import { useExternalTaxonomyCatalogStore } from '@/stores/externalTaxonomyCatalogStore';

const chipClass = (active: boolean) =>
  cn(
    'flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-center text-[11px] font-semibold transition md:px-2 md:text-[12px]',
    active
      ? 'bg-zinc-900 text-white shadow-sm'
      : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
  );

export function ExternalMarketFilters({
  mode,
  scene,
  type,
  stats,
  onModeChange,
  onSceneChange,
  onTypeChange,
}: {
  mode: ExternalFilterMode;
  scene: ExternalWorkSceneId | 'all';
  type: ExternalToolTypeId | 'all';
  stats: { total: number; overseas: number; domestic: number };
  onModeChange: (m: ExternalFilterMode) => void;
  onSceneChange: (s: ExternalWorkSceneId | 'all') => void;
  onTypeChange: (t: ExternalToolTypeId | 'all') => void;
}) {
  const catalog = useExternalTaxonomyCatalogStore((s) => s.catalog);
  const workScenes = listVisibleExternalWorkScenes(catalog);
  const toolTypes = listVisibleExternalToolTypes(catalog);

  return (
    <div className="mb-5 space-y-2.5 px-1">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="inline-flex h-11 items-center rounded-xl border border-zinc-200 bg-zinc-50/80 p-1">
          {EXTERNAL_FILTER_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onModeChange(m.id)}
              className={cn(
                'inline-flex h-full items-center rounded-lg px-5 text-[14px] font-semibold transition md:text-[15px]',
                mode === m.id
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="inline-flex h-11 max-w-full flex-wrap items-center gap-x-2.5 gap-y-0 rounded-xl border border-zinc-200/90 bg-white px-3.5 text-[12px] text-zinc-600 md:text-[13px]">
          <span className="inline-flex items-center font-semibold tracking-tight text-zinc-800">
            工具统计
          </span>
          <span className="text-zinc-300">·</span>
          <span>
            <span className="text-[15px] font-semibold tabular-nums leading-none text-zinc-900 md:text-[16px]">
              {stats.total}
            </span>{' '}
            款工具
          </span>
          <span className="text-zinc-300">·</span>
          <span>
            <span className="text-[15px] font-semibold tabular-nums leading-none text-zinc-900 md:text-[16px]">
              {stats.overseas}
            </span>{' '}
            海外
          </span>
          <span className="text-zinc-300">·</span>
          <span>
            <span className="text-[15px] font-semibold tabular-nums leading-none text-zinc-900 md:text-[16px]">
              {stats.domestic}
            </span>{' '}
            国内
          </span>
        </div>
      </div>
      <div className="w-full">
        <div className="flex w-full items-stretch gap-1 rounded-2xl border border-zinc-200/80 bg-white px-2 py-2 shadow-[0_8px_24px_-20px_rgba(24,24,27,0.35)] sm:gap-1.5 sm:px-2.5">
          {mode === 'scene' ? (
            <>
              <button
                type="button"
                onClick={() => onSceneChange('all')}
                className={chipClass(scene === 'all')}
              >
                全部
              </button>
              {workScenes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSceneChange(c.id)}
                  className={chipClass(scene === c.id)}
                >
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onTypeChange('all')}
                className={chipClass(type === 'all')}
              >
                全部
              </button>
              {toolTypes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onTypeChange(c.id)}
                  className={chipClass(type === c.id)}
                >
                  <i className={cn('fa-solid hidden text-[10px] sm:inline', c.icon)} />
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
