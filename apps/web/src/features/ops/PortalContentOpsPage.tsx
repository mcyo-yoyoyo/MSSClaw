import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  CenterModal,
  CenterPageHeader,
  CenterSearchInput,
  StatCardGrid,
} from '@/components/center/CenterShell';
import {
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  ModalActions,
} from '@/components/center/CenterFormFields';
import { OwnershipFormFields } from '@/components/center/OrgAssetFilters';
import { EngagementActions, formatEngagementLine } from '@/components/content/EngagementActions';
import { isSystemAdmin } from '@/domain/currentUser';
import {
  ASSET_VISIBILITY_LABELS,
  getDeptLabel,
  getRegionLabel,
  type AssetVisibility,
  type DeptId,
  type RegionId,
} from '@/domain/orgTaxonomy';
import {
  heatScore,
  RANK_MODE_OPTIONS,
  sortByRankMode,
  type RankMode,
} from '@/domain/contentEngagement';
import {
  PORTAL_CONTENT_TYPE_LABELS,
  type PortalContentItem,
} from '@/domain/prototype/portalContent';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import {
  ensureEngagementSeeds,
  forceQueueDemoSeeds,
  useContentEngagementStore,
} from '@/stores/contentEngagementStore';

type EditorTarget = string | 'new' | null;

const TYPE_OPTIONS: PortalContentItem['type'][] = ['news', 'training'];

function emptyItem(): PortalContentItem {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: '',
    type: 'news',
    title: '',
    desc: '',
    icon: 'fa-newspaper',
    ownerDeptIds: [],
    ownerRegionId: null,
    visibility: 'public',
    publishedAt: today,
    scenarioTags: [],
    published: true,
  };
}

export function PortalContentOpsPage() {
  const items = usePortalContentStore((s) => s.items);
  const upsertItem = usePortalContentStore((s) => s.upsertItem);
  const deleteItem = usePortalContentStore((s) => s.deleteItem);
  const togglePublished = usePortalContentStore((s) => s.togglePublished);
  const resetToSeeds = usePortalContentStore((s) => s.resetToSeeds);
  const showToast = usePortalContentStore((s) => s.showToast);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const engagementOf = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);
  const optimizationQueue = useContentEngagementStore((s) => s.optimizationQueue);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | PortalContentItem['type']>('all');
  const [rankMode, setRankMode] = useState<RankMode>('trending');
  const [editorTarget, setEditorTarget] = useState<EditorTarget>(null);
  const [form, setForm] = useState<PortalContentItem>(emptyItem());
  const consumePortalType = useNavigationIntentStore((s) => s.consumePortalType);

  useEffect(() => {
    const t = consumePortalType();
    if (t) setTypeFilter(t);
  }, [consumePortalType]);

  const opsItems = useMemo(
    () => items.filter((i) => i.type === 'news' || i.type === 'training'),
    [items],
  );

  useEffect(() => {
    const ids = opsItems.map((i) => i.id);
    ensureEngagementSeeds(ids);
    if (ids.length >= 2) forceQueueDemoSeeds(ids);
  }, [opsItems]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = opsItems.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
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

  const openEditor = (target: EditorTarget) => {
    if (target === 'new') {
      setForm(emptyItem());
    } else if (target) {
      const existing = items.find((i) => i.id === target);
      setForm(existing ? { ...existing } : emptyItem());
    }
    setEditorTarget(target);
  };

  const handleSave = () => {
    const title = form.title.trim();
    if (!title) {
      showToast('请填写标题');
      return;
    }
    const isNew = editorTarget === 'new';
    upsertItem(
      {
        ...form,
        id: isNew ? `portal-ops-${Date.now()}` : (editorTarget as string),
        title,
        desc: form.desc.trim(),
        publishedAt: form.publishedAt || new Date().toISOString().slice(0, 10),
        ownerDeptIds: (form.ownerDeptIds ?? []) as DeptId[],
        ownerRegionId: (form.ownerRegionId ?? null) as RegionId | null,
        visibility: (form.visibility ?? 'public') as AssetVisibility,
        published: form.published !== false,
      },
      isNew,
    );
    showToast(form.published !== false ? '内容已保存并上架' : '内容已保存为草稿');
    setEditorTarget(null);
  };

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl">
        <CenterPageHeader
          title="门户运营"
          subtitle="维护首页前沿洞察与培训赋能 · 排行牵引 · 上架审核"
          tip={
            <>
              统一热度 / 赞踩 / 下载指标驱动发现默认序；点踩占比过高的内容进入「待优化」队列。
            </>
          }
          actions={
            <>
              <CenterSearchInput value={search} onChange={setSearch} placeholder="搜索内容…" />
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
                预览案例
              </button>
              <button
                type="button"
                onClick={() => openEditor('new')}
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
                    onClick={() => openEditor(row.id)}
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
            {TYPE_OPTIONS.map((t) => (
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
                  <EngagementActions contentId={item.id} />
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => togglePublished(item.id)}
                  className="rounded-lg border border-black/8 px-3 py-1.5 text-[11px] font-medium hover:bg-black/[0.03]"
                >
                  {item.published !== false ? '下架' : '上架'}
                </button>
                <button
                  type="button"
                  onClick={() => openEditor(item.id)}
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
        open={!!editorTarget}
        title={editorTarget === 'new' ? '新建门户内容' : '编辑门户内容'}
        onClose={() => setEditorTarget(null)}
        actions={<ModalActions onCancel={() => setEditorTarget(null)} onSave={handleSave} />}
      >
        <div className="space-y-3 text-left">
          <FormField label="标题">
            <FormInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </FormField>
          <FormField label="描述">
            <FormTextarea
              rows={2}
              value={form.desc}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="类型">
              <FormSelect
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as PortalContentItem['type'] })
                }
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {PORTAL_CONTENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </FormSelect>
            </FormField>
            <FormField label="发布日期">
              <FormInput
                type="date"
                value={form.publishedAt}
                onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label="图标 class（Font Awesome）">
            <FormInput
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="fa-lightbulb"
            />
          </FormField>
          <FormField label="场景标签（逗号分隔）">
            <FormInput
              value={(form.scenarioTags ?? []).join(', ')}
              onChange={(e) =>
                setForm({
                  ...form,
                  scenarioTags: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="关联 Agent ID">
              <FormInput
                value={form.agentId ?? ''}
                onChange={(e) => setForm({ ...form, agentId: e.target.value || undefined })}
              />
            </FormField>
            <FormField label="关联 Skill ID">
              <FormInput
                value={form.skillId ?? ''}
                onChange={(e) => setForm({ ...form, skillId: e.target.value || undefined })}
              />
            </FormField>
            <FormField label="关联 Tool ID">
              <FormInput
                value={form.toolId ?? ''}
                onChange={(e) => setForm({ ...form, toolId: e.target.value || undefined })}
              />
            </FormField>
            <FormField label="关联知识库文档 ID">
              <FormInput
                value={form.kbDocId ?? ''}
                onChange={(e) => setForm({ ...form, kbDocId: e.target.value || undefined })}
              />
            </FormField>
          </div>

          <OwnershipFormFields
            ownerDeptIds={form.ownerDeptIds ?? []}
            ownerRegionId={form.ownerRegionId ?? null}
            sourceType="internal"
            visibility={(form.visibility ?? 'public') as AssetVisibility}
            homepageUrl={form.homepageUrl}
            onChange={(patch) =>
              setForm({
                ...form,
                ...patch,
                ownerDeptIds: (patch.ownerDeptIds as DeptId[] | undefined) ?? form.ownerDeptIds,
                ownerRegionId:
                  patch.ownerRegionId !== undefined
                    ? (patch.ownerRegionId as RegionId | null)
                    : form.ownerRegionId,
              })
            }
          />

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="accent-claw-600"
              checked={form.published !== false}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
            />
            <span className="text-[13px]">上架到场景地图样板间 / 首页门户</span>
          </label>
        </div>
      </CenterModal>
    </div>
  );
}
