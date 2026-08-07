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
    <div className="mb-5 space-y-3 px-1">
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <div className="market-mode-switch" role="tablist" aria-label="外部工具筛选方式">
          {EXTERNAL_FILTER_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => onModeChange(m.id)}
              className={cn('market-mode-switch__btn', mode === m.id && 'is-active')}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="market-stats-pill md:text-[13px]">
          <span className="font-semibold tracking-tight text-[#1d1d1f]">工具统计</span>
          <span className="text-[#d4d4d8]">·</span>
          <span>
            <span className="text-[15px] font-semibold tabular-nums leading-none text-[#1d1d1f] md:text-[16px]">
              {stats.total}
            </span>{' '}
            款工具
          </span>
          <span className="text-[#d4d4d8]">·</span>
          <span>
            <span className="text-[15px] font-semibold tabular-nums leading-none text-[#1d1d1f] md:text-[16px]">
              {stats.overseas}
            </span>{' '}
            海外
          </span>
          <span className="text-[#d4d4d8]">·</span>
          <span>
            <span className="text-[15px] font-semibold tabular-nums leading-none text-[#1d1d1f] md:text-[16px]">
              {stats.domestic}
            </span>{' '}
            国内
          </span>
        </div>
      </div>
      <div className="market-chip-rail" role="tablist" aria-label="细分筛选">
        {mode === 'scene' ? (
          <>
            <button
              type="button"
              onClick={() => onSceneChange('all')}
              className={cn('market-chip-rail__btn', scene === 'all' && 'is-active')}
            >
              全部
            </button>
            {workScenes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSceneChange(c.id)}
                className={cn('market-chip-rail__btn', scene === c.id && 'is-active')}
              >
                <i className={cn('fa-solid hidden text-[10px] sm:inline', c.icon)} />
                <span className="truncate">{c.label}</span>
              </button>
            ))}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onTypeChange('all')}
              className={cn('market-chip-rail__btn', type === 'all' && 'is-active')}
            >
              全部
            </button>
            {toolTypes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onTypeChange(c.id)}
                className={cn('market-chip-rail__btn', type === c.id && 'is-active')}
              >
                <i className={cn('fa-solid hidden text-[10px] sm:inline', c.icon)} />
                <span className="truncate">{c.label}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
