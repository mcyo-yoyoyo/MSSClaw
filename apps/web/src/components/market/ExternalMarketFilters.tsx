import { cn } from '@/lib/utils';
import {
  type ExternalToolTypeId,
} from '@/domain/externalToolTaxonomy';
import { listVisibleExternalToolTypes } from '@/domain/externalTaxonomyCatalog';
import { useExternalTaxonomyCatalogStore } from '@/stores/externalTaxonomyCatalogStore';

export function ExternalMarketFilters({
  type,
  stats,
  onTypeChange,
}: {
  type: ExternalToolTypeId | 'all';
  stats: { total: number; overseas: number; domestic: number };
  onTypeChange: (t: ExternalToolTypeId | 'all') => void;
}) {
  const catalog = useExternalTaxonomyCatalogStore((s) => s.catalog);
  const toolTypes = listVisibleExternalToolTypes(catalog);

  return (
    <div className="mb-5 space-y-3 px-1">
      <div className="flex flex-wrap items-center justify-center gap-2.5">
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
      <div
        className="market-chip-rail market-chip-rail--external"
        role="tablist"
        aria-label="细分筛选"
      >
        <button
          type="button"
          onClick={() => onTypeChange('all')}
          className={cn('market-chip-rail__btn', type === 'all' && 'is-active')}
        >
          <i className="fa-solid fa-border-all text-[10px] opacity-75" aria-hidden />
          全部
        </button>
        {toolTypes.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onTypeChange(c.id)}
            className={cn('market-chip-rail__btn', type === c.id && 'is-active')}
          >
            <i className={cn('fa-solid text-[10px] opacity-75', c.icon)} aria-hidden />
            <span className="truncate">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
