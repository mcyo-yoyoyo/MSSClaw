import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ASSET_VISIBILITY_LABELS,
  getDeptLabel,
  getRegionLabel,
} from '@/domain/orgTaxonomy';
import {
  CenterPageHeader,
  StatCardGrid,
} from '@/components/center/CenterShell';
import { ToolEditorModal, type ToolEditorTarget } from '@/components/center/ToolEditorModal';
import { SharedCatalogEmptyHint } from '@/components/common/SharedCatalogEmptyHint';
import { AssetAccentMark, assetAccentBorderStyle } from '@/components/brand/AssetAccentMark';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { resolveToolLogoUrl } from '@/domain/toolLogo';
import { resolveToolMarketShelf } from '@/domain/aiToolCategories';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { isAiSaasTool } from '@/domain/portalNavigation';

type ToolTypeFilter = 'all' | 'overseas' | 'domestic' | 'company' | 'mss';

const TOOL_TYPE_FILTERS: Array<{ value: ToolTypeFilter; label: string }> = [
  { value: 'all', label: '全部工具' },
  { value: 'overseas', label: '海外工具' },
  { value: 'domestic', label: '国内工具' },
  { value: 'company', label: '公司工具' },
  { value: 'mss', label: 'MSS工具' },
];

function matchesToolType(tool: Parameters<typeof resolveToolMarketShelf>[0], filter: ToolTypeFilter) {
  if (filter === 'all') return true;
  if (filter === 'overseas') return tool.sourceType === 'external' && tool.region === 'overseas';
  if (filter === 'domestic') return tool.sourceType === 'external' && tool.region === 'domestic';
  const shelf = resolveToolMarketShelf(tool);
  if (filter === 'company') return shelf === 'internal';
  return tool.sourceType !== 'external' && shelf !== 'internal';
}

export function ToolCenterPage() {
  const {
    tools,
    toolSearch,
    setToolSearch,
    showToast,
  } = useMarketplaceStore();

  const consumeToolId = useNavigationIntentStore((s) => s.consumeToolId);
  const pendingToolId = useNavigationIntentStore((s) => s.pendingToolId);
  const [editorTarget, setEditorTarget] = useState<ToolEditorTarget>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toolTypeFilter, setToolTypeFilter] = useState<ToolTypeFilter>('all');

  const list = useMemo(() => {
    const keyword = toolSearch.trim().toLocaleLowerCase();
    return tools.filter((tool) => {
      if (!matchesToolType(tool, toolTypeFilter)) return false;
      if (!keyword) return true;
      const searchable = [
        tool.name,
        tool.desc,
        tool.cardSummary,
        tool.productIntro,
        tool.bestFor,
        tool.company,
        tool.author,
        tool.publisher,
        ...(tool.tags ?? []),
        ...(tool.toolTypeLabels ?? []),
        ...(tool.coreCapabilities ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase();
      return searchable.includes(keyword);
    });
  }, [tools, toolSearch, toolTypeFilter]);

  useEffect(() => {
    if (!pendingToolId) return;
    const id = consumeToolId();
    if (!id) return;
    const found = tools.find((t) => t.id === id);
    if (found) setEditorTarget(found.id);
    else showToast(`未找到工具：${id}`);
  }, [pendingToolId, tools, consumeToolId, showToast]);

  const stats = useMemo(() => {
    const pub = tools.filter((t) => t.published).length;
    const external = tools.filter((t) => t.sourceType === 'external').length;
    const totalInvokes = tools.reduce((n, t) => n + t.invokes, 0);
    return [
      ['Tool 总数', tools.length],
      ['已发布', pub],
      ['外部工具', external],
      ['总打开/调用', totalInvokes.toLocaleString()],
    ] as [string, string | number][];
  }, [tools]);

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl">
        <CenterPageHeader
          title="配置工具"
          subtitle="登记主数据与上架；外精选 / 公司推荐的陈列与 How to 在「门户运营」维护"
          tip={
            <>
              各 NP 与区域可将内外部工具登记上架。短期不做组织数据权限（全员/本组织浏览相同）；仅发布方仍限发布者。外精选与 CSV、公司工具与办公场景字典联动。
            </>
          }
          actions={
            <>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
                >
                  更多
                  <i className="fa-solid fa-chevron-down ml-1 text-[9px]" />
                </button>
                {moreOpen ? (
                  <div className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setEditorTarget('new');
                        setMoreOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-zinc-700 hover:bg-zinc-50"
                    >
                      <i className="fa-solid fa-plug w-3.5 text-[10px] text-zinc-400" />
                      登记连接器
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setEditorTarget('new-external')}
                className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition"
              >
                <i className="fa-solid fa-plus mr-1" />
                登记外部工具
              </button>
            </>
          }
        />

        <StatCardGrid items={stats} />

        <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-black/[0.05] bg-white/80 p-2 shadow-sm sm:flex-row sm:items-center">
          <label className="relative sm:w-48">
            <span className="sr-only">工具类型</span>
            <select
              value={toolTypeFilter}
              onChange={(event) => setToolTypeFilter(event.target.value as ToolTypeFilter)}
              className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50/80 px-3.5 py-2.5 pr-9 text-[12px] font-medium text-zinc-700 outline-none transition hover:border-zinc-300 hover:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/[0.05]"
            >
              {TOOL_TYPE_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <i className="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-zinc-400" />
          </label>
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">搜索工具</span>
            <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400" />
            <input
              type="search"
              value={toolSearch}
              onChange={(event) => setToolSearch(event.target.value)}
              placeholder="搜索名称、厂商、简介、标签或工具类型…"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 py-2.5 pl-9 pr-9 text-[12px] text-zinc-700 outline-none transition placeholder:text-zinc-400 hover:border-zinc-300 hover:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/[0.05]"
            />
            {toolSearch ? (
              <button
                type="button"
                onClick={() => setToolSearch('')}
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-200/70 hover:text-zinc-700"
                aria-label="清空搜索"
              >
                <i className="fa-solid fa-xmark text-[10px]" />
              </button>
            ) : null}
          </label>
          <span className="shrink-0 px-2 text-[11px] tabular-nums text-zinc-400">
            {list.length} 个结果
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {list.length ? (
            list.map((t) => {
              const shelf = resolveToolMarketShelf(t);
              const showLogo = shelf === 'external' || shelf === 'internal';
              return (
                <div
                  key={t.id}
                  className="market-card apple-card flex flex-col px-3 py-2.5"
                  style={showLogo ? undefined : assetAccentBorderStyle(t.id)}
                >
                  <div className="flex items-start gap-2">
                    {showLogo ? (
                      <ToolLogo
                        name={t.name}
                        logoUrl={resolveToolLogoUrl(t)}
                        icon={t.icon}
                        size={28}
                        className="mt-0.5 rounded-lg"
                      />
                    ) : (
                      <AssetAccentMark id={t.id} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-[13px] font-semibold leading-tight text-zinc-900">
                          {t.name}
                        </h3>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[9px] font-semibold',
                              t.published
                                ? 'bg-claw-50 text-claw-700'
                                : 'bg-zinc-100 text-zinc-500',
                            )}
                          >
                            {t.published ? '已发布' : '草稿'}
                          </span>
                          {(t.sourceType === 'external' || isAiSaasTool(t)) && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                              {isAiSaasTool(t) ? 'AI SaaS' : '外部'}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-500">
                        {t.desc || '暂无描述'}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-zinc-400">
                        {(t.ownerDeptIds ?? []).slice(0, 2).map(getDeptLabel).join(' · ') ||
                          '未指定职能'}
                        {t.ownerRegionId ? ` · ${getRegionLabel(t.ownerRegionId)}` : ''}
                        {' · '}
                        {ASSET_VISIBILITY_LABELS[t.visibility ?? 'public']}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-zinc-400">
                        {t.publisher || t.author} · {t.invokes} 次
                      </p>
                      {t.tags.slice(0, 3).length ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {t.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] text-zinc-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 flex border-t border-black/[0.04] pt-2">
                    <button
                      type="button"
                      onClick={() => setEditorTarget(t.id)}
                      className="apple-btn-primary w-full rounded-md py-1 text-[11px] font-semibold text-white transition"
                    >
                      编辑
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <SharedCatalogEmptyHint assetLabel="工具" />
          )}
        </div>
      </div>

      <ToolEditorModal target={editorTarget} onClose={() => setEditorTarget(null)} />
    </div>
  );
}
