import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  CenterModal,
  CenterPageHeader,
  CenterSearchInput,
  StatCardGrid,
} from '@/components/center/CenterShell';
import { CaseEditorModal } from '@/components/center/CaseEditorModal';
import { CaseOutcomePanel } from '@/components/content/CaseOutcomePanel';
import { EngagementActions, formatEngagementLine } from '@/components/content/EngagementActions';
import { isSystemAdmin } from '@/domain/currentUser';
import {
  ASSET_VISIBILITY_LABELS,
  getDeptLabel,
  getRegionLabel,
} from '@/domain/orgTaxonomy';
import {
  heatScore,
  RANK_MODE_OPTIONS,
  sortByRankMode,
  type RankMode,
} from '@/domain/contentEngagement';
import { toCaseOutcomeCard } from '@/domain/portalCase';
import {
  PORTAL_CONTENT_TYPE_LABELS,
  PORTAL_OPS_TYPE_OPTIONS,
  type PortalContentItem,
} from '@/domain/prototype/portalContent';
import { downloadCaseFile, parseCaseUpload } from '@/domain/caseExport';
import { useAppViewStore } from '@/stores/appViewStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import {
  ensureEngagementSeeds,
  forceQueueDemoSeeds,
  useContentEngagementStore,
} from '@/stores/contentEngagementStore';

type EditorTarget = string | 'new' | null;

export function PortalContentOpsPage() {
  const items = usePortalContentStore((s) => s.items);
  const upsertItem = usePortalContentStore((s) => s.upsertItem);
  const deleteItem = usePortalContentStore((s) => s.deleteItem);
  const togglePublished = usePortalContentStore((s) => s.togglePublished);
  const resetToSeeds = usePortalContentStore((s) => s.resetToSeeds);
  const showToast = usePortalContentStore((s) => s.showToast);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const skills = useMarketplaceStore((s) => s.skills);
  const agents = useMarketplaceStore((s) => s.agents);
  const engagementOf = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);
  const optimizationQueue = useContentEngagementStore((s) => s.optimizationQueue);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | PortalContentItem['type']>('all');
  const [rankMode, setRankMode] = useState<RankMode>('trending');
  const [editorTarget, setEditorTarget] = useState<EditorTarget>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const consumePortalType = useNavigationIntentStore((s) => s.consumePortalType);

  useEffect(() => {
    const t = consumePortalType();
    if (t) setTypeFilter(t);
  }, [consumePortalType]);

  const opsItems = useMemo(() => items, [items]);

  useEffect(() => {
    const ids = opsItems.map((i) => i.id);
    ensureEngagementSeeds(ids);
    if (ids.length >= 2) forceQueueDemoSeeds(ids);
  }, [opsItems]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = opsItems.filter((item) => {
      if (typeFilter !== 'all') {
        if (typeFilter === 'news') {
          if (item.type !== 'news' && item.type !== 'insight') return false;
        } else if (item.type !== typeFilter) {
          return false;
        }
      }
      if (!q) return true;
      return `${item.title} ${item.desc} ${item.publisher ?? ''} ${(item.scenarioTags ?? []).join(' ')}`
        .toLowerCase()
        .includes(q);
    });
    return sortByRankMode(filtered, rankMode, engagementOf);
  }, [opsItems, search, typeFilter, rankMode, engagementOf, engagementById]);

  const pendingOptimize = useMemo(() => {
    void engagementById;
    const queue = optimizationQueue();
    const titleOf = new Map(opsItems.map((i) => [i.id, i.title]));
    return queue
      .filter((e) => titleOf.has(e.id))
      .map((e) => ({ ...e, title: titleOf.get(e.id) ?? e.id }));
  }, [optimizationQueue, opsItems, engagementById]);

  const leaderboard = useMemo(() => {
    return sortByRankMode(opsItems, 'trending', engagementOf)
      .slice(0, 5)
      .map((item, idx) => {
        const e = engagementOf(item.id);
        return {
          rank: idx + 1,
          id: item.id,
          title: item.title,
          type: item.type,
          heat: Math.round(heatScore(e)),
          line: formatEngagementLine(e),
        };
      });
  }, [opsItems, engagementOf, engagementById]);

  const stats = useMemo(() => {
    const pub = opsItems.filter((i) => i.published !== false).length;
    let likes = 0;
    let downloads = 0;
    let uses = 0;
    for (const item of opsItems) {
      const e = engagementOf(item.id);
      likes += e.likes;
      downloads += e.downloads;
      uses += e.uses;
    }
    return [
      ['内容总数', opsItems.length],
      ['已上架', pub],
      ['累计点赞', likes],
      ['累计下载', downloads],
      ['近窗调用', uses],
      ['待优化', pendingOptimize.length],
    ] as [string, string | number][];
  }, [opsItems, engagementOf, engagementById, pendingOptimize.length]);

  const previewItem = useMemo(
    () => (previewId ? items.find((i) => i.id === previewId) ?? null : null),
    [previewId, items],
  );
  const previewCard = useMemo(
    () =>
      previewItem
        ? toCaseOutcomeCard(previewItem, PORTAL_CONTENT_TYPE_LABELS[previewItem.type])
        : null,
    [previewItem],
  );
  const previewSkill = previewCard?.skillId
    ? skills.find((s) => s.id === previewCard.skillId)
    : undefined;
  const previewAgent = previewCard?.agentId
    ? agents.find((a) => a.id === previewCard.agentId)
    : undefined;

  if (!isSystemAdmin()) {
    return (
      <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
            <i className="fa-solid fa-lock text-xl" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900">无权访问门户运营</h2>
          <p className="mt-2 text-[13px] text-zinc-500">仅系统管理员可维护场景地图内容与上架状态。</p>
          <button
            type="button"
            onClick={() => setAppView('home')}
            className="apple-btn-secondary mt-6 rounded-lg px-4 py-2 text-[12px] font-semibold"
          >
            返回工作台
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl">
        <CenterPageHeader
          title="门户运营"
          subtitle="案例样板间 · 洞察 / 培训 / 资讯上架 · 排行与成效字段"
          tip={
            <>
              金案例填写痛点 / 指标 / 三步走并绑定金牌 Skill，上架后出现在「案例 · 样板间」。下载导出为 .case.zip。
            </>
          }
          actions={
            <>
              <CenterSearchInput value={search} onChange={setSearch} placeholder="搜索内容…" />
              <label className="cursor-pointer rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]">
                导入案例包
                <input
                  type="file"
                  accept=".zip,.case.zip,.json,application/zip,application/json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    try {
                      const imported = await parseCaseUpload(file);
                      if (!imported.length) {
                        showToast('未能解析案例包');
                        return;
                      }
                      for (const item of imported) {
                        const exists = items.some((i) => i.id === item.id);
                        upsertItem(item, !exists);
                      }
                      showToast(`已导入 ${imported.length} 条案例内容`);
                    } catch {
                      showToast('导入失败，请检查文件格式');
                    }
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  resetToSeeds();
                  showToast('已重置为内置种子');
                }}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
              >
                重置种子
              </button>
              <button
                type="button"
                onClick={() => setAppView('ai-map')}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
              >
                预览样板间
              </button>
              <button
                type="button"
                onClick={() => setEditorTarget('new')}
                className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
              >
                <i className="fa-solid fa-plus mr-1" />
                新建内容
              </button>
            </>
          }
        />

        <StatCardGrid items={stats} />

        <div className="mb-4 grid gap-3 lg:grid-cols-2">
          <div className="apple-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[12px] font-semibold text-zinc-800">热度排行 TOP5</h3>
              <span className="text-[10px] text-zinc-400">热度 = 调用×0.7 + 赞×0.3</span>
            </div>
            <ol className="space-y-2">
              {leaderboard.map((row) => (
                <li key={row.id} className="flex items-start gap-2 text-[11px]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-[10px] font-semibold text-white">
                    {row.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-800">{row.title}</p>
                    <p className="text-[10px] text-zinc-400">
                      {PORTAL_CONTENT_TYPE_LABELS[row.type]} · {row.line}
                    </p>
                  </div>
                </li>
              ))}
              {!leaderboard.length ? (
                <p className="text-[11px] text-zinc-400">暂无排行数据</p>
              ) : null}
            </ol>
          </div>

          <div className="apple-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[12px] font-semibold text-zinc-800">待优化队列</h3>
              <span className="text-[10px] text-zinc-400">踩占比 ≥30% 且样本 ≥5</span>
            </div>
            <ul className="space-y-2">
              {pendingOptimize.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-amber-50/80 px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-zinc-800">{row.title}</p>
                    <p className="text-[10px] text-zinc-500">
                      赞 {row.likes} · 踩 {row.dislikes} · 建议复审或下架
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditorTarget(row.id)}
                    className="shrink-0 rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-[10px] font-medium text-amber-800 hover:bg-amber-50"
                  >
                    处理
                  </button>
                </li>
              ))}
              {!pendingOptimize.length ? (
                <p className="text-[11px] text-zinc-400">暂无待优化内容</p>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex gap-0.5 rounded-full bg-zinc-100/90 p-0.5">
            {RANK_MODE_OPTIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setRankMode(m.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[10px] font-medium transition',
                  rankMode === m.id
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-600',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={cn('filter-chip px-2.5 py-1 text-[11px] font-medium', typeFilter === 'all' && 'active')}
            >
              全部
            </button>
            {PORTAL_OPS_TYPE_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={cn('filter-chip px-2.5 py-1 text-[11px] font-medium', typeFilter === t && 'active')}
              >
                {PORTAL_CONTENT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {list.map((item) => (
            <div
              key={item.id}
              className="apple-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                    {PORTAL_CONTENT_TYPE_LABELS[item.type]}
                  </span>
                  {item.isGold ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      金案例
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      item.published !== false
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-zinc-100 text-zinc-500',
                    )}
                  >
                    {item.published !== false ? '已上架' : '已下架'}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {ASSET_VISIBILITY_LABELS[item.visibility ?? 'public']}
                  </span>
                </div>
                <h3 className="mt-1 text-[13px] font-semibold text-zinc-900">{item.title}</h3>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">{item.desc}</p>
                <p className="mt-1 text-[10px] text-zinc-400">
                  {(item.ownerDeptIds ?? []).map(getDeptLabel).join(' · ') || '未指定职能'}
                  {item.ownerRegionId ? ` · ${getRegionLabel(item.ownerRegionId)}` : ''}
                  {' · '}
                  {item.publishedAt}
                </p>
                <div className="mt-2">
                  <EngagementActions
                    contentId={item.id}
                    onDownload={() => {
                      downloadCaseFile(item);
                      showToast('已下载案例包');
                    }}
                  />
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewId(item.id)}
                  className="rounded-lg border border-black/8 px-3 py-1.5 text-[11px] font-medium hover:bg-black/[0.03]"
                >
                  预览
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadCaseFile(item);
                    showToast('已下载案例包');
                  }}
                  className="rounded-lg border border-black/8 px-3 py-1.5 text-[11px] font-medium hover:bg-black/[0.03]"
                >
                  导出
                </button>
                <button
                  type="button"
                  onClick={() => togglePublished(item.id)}
                  className="rounded-lg border border-black/8 px-3 py-1.5 text-[11px] font-medium hover:bg-black/[0.03]"
                >
                  {item.published !== false ? '下架' : '上架'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTarget(item.id)}
                  className="rounded-lg border border-black/8 px-3 py-1.5 text-[11px] font-medium hover:bg-black/[0.03]"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteItem(item.id);
                    showToast('已删除或下架');
                  }}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
          {!list.length && (
            <div className="apple-card p-8 text-center text-[12px] text-zinc-500">暂无匹配内容</div>
          )}
        </div>
      </div>

      <CenterModal
        open={!!previewCard}
        title={previewItem ? `预览 · ${previewItem.title}` : '内容预览'}
        onClose={() => setPreviewId(null)}
        size="lg"
        actions={
          <>
            <button
              type="button"
              onClick={() => setPreviewId(null)}
              className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium"
            >
              关闭
            </button>
            {previewItem ? (
              <button
                type="button"
                onClick={() => {
                  const id = previewItem.id;
                  setPreviewId(null);
                  setEditorTarget(id);
                }}
                className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
              >
                编辑此内容
              </button>
            ) : null}
          </>
        }
      >
        {previewCard && previewItem ? (
          <CaseOutcomePanel
            card={previewCard}
            skillLabel={previewSkill?.name}
            agentLabel={previewAgent?.name}
            onEdit={() => {
              const id = previewItem.id;
              setPreviewId(null);
              setEditorTarget(id);
            }}
            onDownload={() => {
              downloadCaseFile(previewItem);
              showToast('已下载案例包');
            }}
          />
        ) : null}
      </CenterModal>

      <CaseEditorModal target={editorTarget} onClose={() => setEditorTarget(null)} />
    </div>
  );
}
