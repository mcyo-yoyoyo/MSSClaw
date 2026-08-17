import { cn } from '@/lib/utils';
import {
  buildAgentHubFilterFacets,
  isAgentHubFilterEmpty,
  type AgentCapabilityTypeId,
  type AgentFilterSource,
  type AgentHubFilterSelection,
} from '@/domain/agentHubFilters';
import type { AssetVisibility } from '@/domain/orgTaxonomy';

function FilterChip({
  label,
  icon,
  count,
  active,
  onClick,
}: {
  label: string;
  icon?: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const empty = count === 0 && !active;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={empty}
      aria-pressed={active}
      title={empty ? `${label}（当前范围内暂无内容）` : label}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition',
        active
          ? 'border-zinc-900 bg-zinc-900 text-white'
          : empty
            ? 'cursor-not-allowed border-zinc-100 bg-zinc-50/70 text-zinc-300'
            : 'border-zinc-200/90 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900',
      )}
    >
      {icon ? <i className={cn(icon, 'text-[10px] opacity-70')} /> : null}
      {label}
      <span className={cn('tabular-nums text-[11px]', active ? 'opacity-70' : 'text-zinc-400')}>
        {count}
      </span>
    </button>
  );
}

function DimensionRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-1.5 w-[52px] shrink-0 text-[11px] font-medium text-zinc-400">
        {label}
      </span>
      <div className="flex min-w-0 flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/**
 * Agent Hub 页内筛选：能力类型 · 开放范围 · 适配平台（V1.4 §1.4）
 * 职能 / 区域走左栏组织轴，不在此重复。
 *
 * 适配平台仅在数据里出现 ≥2 个不同平台时展示 —— 运营未配置
 * environment.platforms 时全部落到同一默认平台，单选项的筛选没有意义。
 */
export function AgentHubFilterRow({
  agents,
  selection,
  onChange,
  className,
}: {
  agents: AgentFilterSource[];
  selection: AgentHubFilterSelection;
  onChange: (next: AgentHubFilterSelection) => void;
  className?: string;
}) {
  const facets = buildAgentHubFilterFacets(agents, selection);
  const platformOptions = facets.platforms.filter((p) => p.count > 0);
  const showPlatforms = platformOptions.length > 1;
  const dirty = !isAgentHubFilterEmpty(selection);

  const toggleCapability = (id: AgentCapabilityTypeId) => {
    const next = selection.capabilityTypes.includes(id)
      ? selection.capabilityTypes.filter((v) => v !== id)
      : [...selection.capabilityTypes, id];
    onChange({ ...selection, capabilityTypes: next });
  };

  const toggleVisibility = (id: AssetVisibility) => {
    const next = selection.visibilities.includes(id)
      ? selection.visibilities.filter((v) => v !== id)
      : [...selection.visibilities, id];
    onChange({ ...selection, visibilities: next });
  };

  const togglePlatform = (id: string) => {
    const next = selection.platforms.includes(id)
      ? selection.platforms.filter((v) => v !== id)
      : [...selection.platforms, id];
    onChange({ ...selection, platforms: next });
  };

  return (
    <section
      className={cn(
        'rounded-2xl border border-zinc-200/80 bg-white/70 px-3.5 py-3',
        className,
      )}
      aria-label="Agent 筛选"
    >
      <div className="space-y-2">
        <DimensionRow label="能力类型">
          {facets.capabilityTypes.map((type) => (
            <FilterChip
              key={type.id}
              label={type.label}
              icon={`fa-solid ${type.icon}`}
              count={type.count}
              active={selection.capabilityTypes.includes(type.id)}
              onClick={() => toggleCapability(type.id)}
            />
          ))}
        </DimensionRow>

        <DimensionRow label="开放范围">
          {facets.visibilities.map((item) => (
            <FilterChip
              key={item.id}
              label={item.label}
              count={item.count}
              active={selection.visibilities.includes(item.id)}
              onClick={() => toggleVisibility(item.id)}
            />
          ))}
        </DimensionRow>

        {showPlatforms ? (
          <DimensionRow label="适配平台">
            {platformOptions.map((item) => (
              <FilterChip
                key={item.id}
                label={item.label}
                count={item.count}
                active={selection.platforms.includes(item.id)}
                onClick={() => togglePlatform(item.id)}
              />
            ))}
          </DimensionRow>
        ) : null}
      </div>

      {dirty ? (
        <div className="mt-2.5 flex justify-end border-t border-zinc-100 pt-2">
          <button
            type="button"
            onClick={() =>
              onChange({ capabilityTypes: [], visibilities: [], platforms: [] })
            }
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            <i className="fa-solid fa-rotate-left text-[10px]" />
            清除筛选
          </button>
        </div>
      ) : null}
    </section>
  );
}
