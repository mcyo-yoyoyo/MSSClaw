import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  CenterPageHeader,
  CenterSearchInput,
  StatCardGrid,
} from '@/components/center/CenterShell';
import { CaseEditorModal } from '@/components/center/CaseEditorModal';
import { OrgAssetFilterBar } from '@/components/center/OrgAssetFilters';
import { formatEngagementLine } from '@/components/content/EngagementActions';
import { isSystemAdmin } from '@/domain/currentUser';
import { ASSET_VISIBILITY_LABELS } from '@/domain/orgTaxonomy';
import type { DeptFilter, RegionFilter } from '@/domain/assetFilters';
import { heatScore } from '@/domain/contentEngagement';
import {
  buildScenarioContentPacks,
  listOrphanPortalItems,
  packCompletenessLabel,
  SCENARIO_PACK_SLOTS,
  type ScenarioPackSlotId,
  typeLabel,
} from '@/domain/scenarioPackOps';
import type { PortalContentItem } from '@/domain/prototype/portalContent';
import { parseCaseUpload } from '@/domain/caseExport';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { usePlazaToolGuideStore } from '@/stores/plazaToolGuideStore';
import { PortalHowToOpsPanel } from '@/features/ops/PortalHowToOpsPanel';
import { PortalMarketFeaturedPanel } from '@/features/ops/PortalMarketFeaturedPanel';
import { PortalStationAnnouncePanel } from '@/features/ops/PortalStationAnnouncePanel';
import { PortalTrafficPanel } from '@/features/ops/PortalTrafficPanel';
import { PortalAiNewsPanel } from '@/features/ops/PortalAiNewsPanel';
import { PortalSceneCategoryPanel } from '@/features/ops/PortalSceneCategoryPanel';
import { PortalBuildStatsCopyPanel } from '@/features/ops/PortalBuildStatsCopyPanel';
import { PortalAiBriefEmailPanel } from '@/features/ops/PortalAiBriefEmailPanel';
import { PortalExternalTaxonomyPanel } from '@/features/ops/PortalExternalTaxonomyPanel';
import { useBusinessScenarioCatalogStore } from '@/stores/businessScenarioCatalogStore';
import { useExternalTaxonomyCatalogStore } from '@/stores/externalTaxonomyCatalogStore';
import { useInternalOfficeSceneCatalogStore } from '@/stores/internalOfficeSceneCatalogStore';
import { useStationAnnouncementStore } from '@/stores/stationAnnouncementStore';
import { useAiNewsStore } from '@/stores/aiNewsStore';
import { useAiBriefEmailCopyStore } from '@/stores/aiBriefEmailCopyStore';

type EditorTarget = string | 'new' | null;
type OpsSurface =
  | 'packs'
  | 'howto'
  | 'featured'
  | 'extaxonomy'
  | 'traffic'
  | 'announce'
  | 'ainews'
  | 'aibrief'
  | 'scenes'
  | 'buildstats';

/** 运营视角：全部 / 只展开某负责人槽位 */
type SlotFocus = 'all' | ScenarioPackSlotId;

/** 与场景案例 OrgAssetFilterBar 同口径：未声明归属的内容在筛选时仍可见 */
function itemMatchesDeptRegion(
  item: PortalContentItem,
  deptFilter: DeptFilter,
  regionFilter: RegionFilter,
): boolean {
  if (deptFilter !== 'all') {
    const depts = item.ownerDeptIds ?? [];
    if (depts.length > 0 && !depts.includes(deptFilter)) return false;
  }
  if (regionFilter !== 'all') {
    const region = item.ownerRegionId ?? null;
    if (region && region !== regionFilter) return false;
  }
  return true;
}

export function PortalContentOpsPage() {
  const items = usePortalContentStore((s) => s.items);
  const upsertItem = usePortalContentStore((s) => s.upsertItem);
  const deleteItem = usePortalContentStore((s) => s.deleteItem);
  const togglePublished = usePortalContentStore((s) => s.togglePublished);
  const showToast = usePortalContentStore((s) => s.showToast);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const engagementOf = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);
  const optimizationQueue = useContentEngagementStore((s) => s.optimizationQueue);

  const [opsSurface, setOpsSurface] = useState<OpsSurface>('packs');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<DeptFilter>('all');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const [slotFocus, setSlotFocus] = useState<SlotFocus>('all');
  const [editorTarget, setEditorTarget] = useState<EditorTarget>(null);
  const [editorType, setEditorType] = useState<PortalContentItem['type']>('case');
  const [editorTags, setEditorTags] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const howtoToast = usePlazaToolGuideStore((s) => s.toast);
  const dismissHowtoToast = usePlazaToolGuideStore((s) => s.dismissToast);
  const bootstrapHowto = usePlazaToolGuideStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrapHowto();
    useBusinessScenarioCatalogStore.getState().hydrate();
    useExternalTaxonomyCatalogStore.getState().hydrate();
    useInternalOfficeSceneCatalogStore.getState().hydrate();
    useStationAnnouncementStore.getState().hydrate();
    useAiNewsStore.getState().hydrate();
    useAiBriefEmailCopyStore.getState().hydrate();
  }, [bootstrapHowto]);

  useEffect(() => {
    if (!howtoToast) return;
    const t = window.setTimeout(() => dismissHowtoToast(), 2800);
    return () => window.clearTimeout(t);
  }, [howtoToast, dismissHowtoToast]);

  const consumePortalType = useNavigationIntentStore((s) => s.consumePortalType);
  const consumePortalEditId = useNavigationIntentStore((s) => s.consumePortalEditId);
  const focusCase = useNavigationIntentStore((s) => s.focusCase);
  const focusScenario = useNavigationIntentStore((s) => s.focusScenario);

  useEffect(() => {
    const t = consumePortalType();
    if (!t) return;
    if (t === 'training') setSlotFocus('training');
    else if (t === 'case') setSlotFocus('case');
    else setSlotFocus('insight');
  }, [consumePortalType]);

  useEffect(() => {
    const id = consumePortalEditId();
    if (!id) return;
    setEditorTarget(id);
    const hit = items.find((i) => i.id === id);
    if (hit) {
      const pack = buildScenarioContentPacks(items).find((p) =>
        SCENARIO_PACK_SLOTS.some((s) => p.slots[s.id].items.some((x) => x.id === id)),
      );
      if (pack) setExpandedId(pack.scenario.id);
    }
  }, [consumePortalEditId, items]);

  const scopedItems = useMemo(
    () => items.filter((item) => itemMatchesDeptRegion(item, deptFilter, regionFilter)),
    [items, deptFilter, regionFilter],
  );

  const packs = useMemo(() => buildScenarioContentPacks(scopedItems), [scopedItems]);
  const orphans = useMemo(() => listOrphanPortalItems(scopedItems), [scopedItems]);
  const orgFilterActive = deptFilter !== 'all' || regionFilter !== 'all';

  /** 职能/区域筛选后的方案包（未开筛选时保留空包便于补齐） */
  const orgPacks = useMemo(
    () => (orgFilterActive ? packs.filter((p) => p.totalItems > 0) : packs),
    [packs, orgFilterActive],
  );

  const filteredPacks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orgPacks;
    return orgPacks.filter((pack) => {
      const blob = [
        pack.scenario.label,
        pack.scenario.desc,
        pack.scenario.matchTags.join(' '),
        ...SCENARIO_PACK_SLOTS.flatMap((s) =>
          pack.slots[s.id].items.map((i) => `${i.title} ${i.publisher ?? ''}`),
        ),
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [orgPacks, search]);

  const pendingOptimize = useMemo(() => {
    void engagementById;
    const scopedIds = new Set(scopedItems.map((i) => i.id));
    const titleOf = new Map(scopedItems.map((i) => [i.id, i.title]));
    return optimizationQueue()
      .filter((e) => scopedIds.has(e.id))
      .map((e) => ({ ...e, title: titleOf.get(e.id) ?? e.id }));
  }, [optimizationQueue, scopedItems, engagementById]);

  const stats = useMemo(() => {
    const complete = orgPacks.filter((p) => p.complete).length;
    const missing = orgPacks.filter((p) => !p.complete).length;
    const pub = scopedItems.filter((i) => i.published !== false).length;
    return [
      ['场景方案包', orgPacks.length],
      ['三槽齐全', complete],
      ['待补齐', missing],
      ['内容条数', scopedItems.length],
      ['已上架', pub],
      ['未挂场景', orphans.length],
    ] as [string, string | number][];
  }, [orgPacks, scopedItems, orphans.length]);

  const openUserPreview = (scenarioId: string, itemId?: string) => {
    focusScenario(scenarioId);
    if (itemId) focusCase(itemId);
    setAppView('ai-map');
  };

  const openNewInSlot = (
    createType: 'news' | 'case' | 'training',
    tags: string[],
    scenarioId: string,
  ) => {
    setEditorType(createType);
    setEditorTags(tags);
    setExpandedId(scenarioId);
    setEditorTarget('new');
  };

  if (!isSystemAdmin()) {
    return (
      <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
            <i className="fa-solid fa-lock text-xl" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900">无权访问门户运营</h2>
          <p className="mt-2 text-[13px] text-zinc-500">仅系统管理员可维护场景方案包内容。</p>
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
          subtitle={
            opsSurface === 'packs'
              ? '场景内容 · 方案包三槽分责维护'
              : opsSurface === 'featured'
                ? '货架运营 · 外精选上架置顶 / 公司办公场景字典'
                : opsSurface === 'extaxonomy'
                  ? '货架运营 · 外精选工具类型与工作场景字典'
                  : opsSurface === 'traffic'
                    ? '站点数据 · PV / UV 访问概览'
                    : opsSurface === 'announce'
                      ? '站点触达 · 首页站内公告跑马灯'
                      : opsSurface === 'ainews'
                        ? '站点触达 · 每日 / 每周 AI 新闻'
                        : opsSurface === 'aibrief'
                          ? '站点触达 · AI快讯邮件模板文案'
                          : opsSurface === 'scenes'
                            ? '场景分类字典 · 文案 / 图标 / 顺序'
                            : opsSurface === 'buildstats'
                              ? '站点触达 · MSS 建设概况口径'
                              : '货架运营 · 外部 / 公司工具 How to'
          }
          tip={
            opsSurface === 'packs' ? (
              <>
                业务用户在 <strong className="font-semibold">AI工具Hub</strong> 看到的是
                <strong className="font-semibold">场景分类 → 项目卡 → 文档预览 / How to</strong>
                。运营侧按三槽分责填写材料；「用户侧预览」打开对应场景学习内容。
              </>
            ) : opsSurface === 'featured' ? (
              <>
                外部工具：上架选品、场景标题与精选置顶。公司推荐：在此配置办公场景文案与工具绑定；链接/Logo
                请到「配置工具」，分类芯片请到「外精选分类」。
              </>
            ) : opsSurface === 'extaxonomy' ? (
              <>
                调整外精选筛选条上的工具类型与工作场景名称、可见性、顺序及场景关联类型。编码保持稳定以兼容工具主数据。
              </>
            ) : opsSurface === 'traffic' ? (
              <>
                查看门户页面 PV、区间去重 UV、每日趋势与页面明细。统计按北京时间切日，历史数据自功能上线日起记录。
              </>
            ) : opsSurface === 'announce' ? (
              <>
                维护首页横向站内公告。关闭演示内容后仍可配置真实公告；仅上架项对业务用户露出。
              </>
            ) : opsSurface === 'ainews' ? (
              <>
                维护每日 AI 新闻（每天一条）。上架后首页只露最新一期；历史在「AI新闻总览」累计。订阅为
                WeLink 二期预留。
              </>
            ) : opsSurface === 'aibrief' ? (
              <>
                配置 AI快讯页「下载」生成的 HTML 邮件壳：探索引导、进入平台按钮与落地链接。正文仍来自当日快讯。
              </>
            ) : opsSurface === 'scenes' ? (
              <>
                调整 MSS 集市场景分类的展示名、简介、图标与顺序。编码 S1–S8 固定，避免打断项目 /
                Skill 归属映射。
              </>
            ) : opsSurface === 'buildstats' ? (
              <>
                解释建设概况数字含义与建设目标文案；案例数 / 场景覆盖仍由真实列表推导。
              </>
            ) : (
              <>
                维护外部工具精选 / 内部办公推荐的 How to：可上传文件或填链接（图片 / PDF / PPT /
                短视频 / 文字），「链接」类型仅填 URL；保存后详情页「快速上手」与货架 How to 立即生效。
              </>
            )
          }
          actions={
            opsSurface === 'packs' ? (
              <>
                <CenterSearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="搜索场景或内容…"
                />
                <label className="cursor-pointer rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]">
                  导入
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
                          upsertItem(item, !items.some((i) => i.id === item.id));
                        }
                        showToast(`已导入 ${imported.length} 条`);
                      } catch {
                        showToast('导入失败，请检查文件格式');
                      }
                    }}
                  />
                </label>
              </>
            ) : null
          }
        />

        <div className="mb-4 flex flex-wrap gap-1.5">
          {(
            [
              { id: 'packs' as const, label: '场景内容', group: '场景' },
              { id: 'scenes' as const, label: '场景分类', group: '场景' },
              { id: 'featured' as const, label: '货架运营', group: '货架' },
              { id: 'extaxonomy' as const, label: '外精选分类', group: '货架' },
              { id: 'howto' as const, label: '工具 How to', group: '货架' },
              { id: 'traffic' as const, label: '访问数据', group: '站点' },
              { id: 'announce' as const, label: '站内公告', group: '站点' },
              { id: 'ainews' as const, label: 'AI新闻', group: '站点' },
              { id: 'aibrief' as const, label: 'AI快讯邮件', group: '站点' },
              { id: 'buildstats' as const, label: '建设概况口径', group: '站点' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setOpsSurface(tab.id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition',
                opsSurface === tab.id
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80',
              )}
              title={`${tab.group} · ${tab.label}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="mb-4 text-[10px] leading-relaxed text-zinc-400">
          分组：场景（内容/分类）→ 货架（外精选上架·置顶 / 公司办公场景 / 外精选分类 / How to）→ 站点（访问数据/公告/AI新闻/AI快讯邮件/建设口径）。工具主数据仍在「配置工具」。
        </p>

        {howtoToast ? (
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
            {howtoToast}
          </div>
        ) : null}

        {opsSurface === 'howto' ? <PortalHowToOpsPanel /> : null}
        {opsSurface === 'featured' ? <PortalMarketFeaturedPanel /> : null}
        {opsSurface === 'extaxonomy' ? <PortalExternalTaxonomyPanel /> : null}
        {opsSurface === 'traffic' ? <PortalTrafficPanel /> : null}
        {opsSurface === 'announce' ? <PortalStationAnnouncePanel /> : null}
        {opsSurface === 'ainews' ? <PortalAiNewsPanel /> : null}
        {opsSurface === 'aibrief' ? <PortalAiBriefEmailPanel /> : null}
        {opsSurface === 'scenes' ? <PortalSceneCategoryPanel /> : null}
        {opsSurface === 'buildstats' ? <PortalBuildStatsCopyPanel /> : null}

        {opsSurface === 'packs' ? <StatCardGrid items={stats} /> : null}

        {opsSurface === 'packs' ? (
        <div className="mb-4">
          <OrgAssetFilterBar
            deptFilter={deptFilter}
            regionFilter={regionFilter}
            onDeptChange={setDeptFilter}
            onRegionChange={setRegionFilter}
            collapsible
          />
        </div>
        ) : null}

        {opsSurface === 'packs' && pendingOptimize.length > 0 ? (
          <div className="mb-4 rounded-2xl border border-amber-200/80 bg-amber-50/50 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[12px] font-semibold text-amber-900">待优化</h3>
              <span className="text-[10px] text-amber-700/80">踩占比过高 · 建议复审</span>
            </div>
            <ul className="flex flex-wrap gap-2">
              {pendingOptimize.slice(0, 6).map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setEditorTarget(row.id)}
                    className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-50"
                  >
                    {row.title}
                    <span className="ml-1 text-[10px] text-amber-600">
                      · {formatEngagementLine(engagementOf(row.id))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {opsSurface === 'packs' ? (
        <>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-zinc-500">负责人视角</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSlotFocus('all')}
              className={cn(
                'filter-chip px-2.5 py-1 text-[11px] font-medium',
                slotFocus === 'all' && 'active',
              )}
            >
              全部槽位
            </button>
            {SCENARIO_PACK_SLOTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSlotFocus(s.id)}
                className={cn(
                  'filter-chip px-2.5 py-1 text-[11px] font-medium',
                  slotFocus === s.id && 'active',
                )}
                title={s.ownerHint}
              >
                {s.label}
                <span className="ml-1 text-[10px] opacity-60">{s.ownerHint.replace('负责人', '')}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredPacks.map((pack) => {
            const open = expandedId === pack.scenario.id;
            const heat = Math.round(
              SCENARIO_PACK_SLOTS.reduce((sum, s) => {
                return (
                  sum +
                  pack.slots[s.id].items.reduce(
                    (a, i) => a + heatScore(engagementOf(i.id)),
                    0,
                  )
                );
              }, 0),
            );
            const visibleSlots =
              slotFocus === 'all'
                ? SCENARIO_PACK_SLOTS
                : SCENARIO_PACK_SLOTS.filter((s) => s.id === slotFocus);

            return (
              <div
                key={pack.scenario.id}
                className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white"
              >
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(open ? null : pack.scenario.id)
                    }
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white">
                        <i className={cn('fa-solid text-[12px]', pack.scenario.icon)} />
                      </span>
                      <h3 className="text-[14px] font-semibold text-zinc-900">
                        {pack.scenario.label}
                      </h3>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          pack.complete
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-800',
                        )}
                      >
                        {pack.complete ? '方案包齐全' : `待补齐 · ${packCompletenessLabel(pack)}`}
                      </span>
                      {heat > 0 ? (
                        <span className="text-[10px] text-zinc-400">热度 {heat}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-1 text-[11px] text-zinc-500">
                      {pack.scenario.desc}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {SCENARIO_PACK_SLOTS.map((s) => {
                        const slot = pack.slots[s.id];
                        const filled = slot.items.length > 0;
                        return (
                          <span
                            key={s.id}
                            className={cn(
                              'rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                              filled
                                ? 'bg-zinc-100 text-zinc-700'
                                : 'bg-zinc-50 text-zinc-400 line-through decoration-zinc-300',
                              slotFocus === s.id && 'ring-1 ring-zinc-400',
                            )}
                          >
                            {s.label} {slot.publishedCount}/{slot.items.length || 0}
                          </span>
                        );
                      })}
                    </div>
                  </button>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openUserPreview(pack.scenario.id)}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white"
                    >
                      用户侧预览
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(open ? null : pack.scenario.id)
                      }
                      className="rounded-lg border border-black/8 px-3 py-1.5 text-[11px] font-medium hover:bg-black/[0.03]"
                    >
                      {open ? '收起' : '维护三槽'}
                    </button>
                  </div>
                </div>

                {open ? (
                  <div className="border-t border-zinc-100 bg-zinc-50/40 px-4 py-3">
                    <div
                      className={cn(
                        'grid gap-3',
                        slotFocus === 'all' ? 'lg:grid-cols-3' : 'grid-cols-1',
                      )}
                    >
                      {visibleSlots.map((meta) => {
                        const slot = pack.slots[meta.id];
                        return (
                          <div
                            key={meta.id}
                            className="rounded-xl border border-zinc-200/80 bg-white p-3"
                          >
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <div>
                                <p className="text-[12px] font-semibold text-zinc-900">
                                  {meta.label}
                                </p>
                                <p className="text-[10px] text-zinc-400">
                                  {meta.ownerHint} · {meta.blurb}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  openNewInSlot(
                                    meta.createType,
                                    [pack.primaryTag],
                                    pack.scenario.id,
                                  )
                                }
                                className="shrink-0 rounded-md border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-50"
                              >
                                + 添加
                              </button>
                            </div>
                            {slot.items.length === 0 ? (
                              <p className="rounded-lg border border-dashed border-zinc-200 px-2 py-4 text-center text-[11px] text-zinc-400">
                                本槽为空 · {meta.ownerHint}可添加
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {slot.items.map((item) => (
                                  <li
                                    key={item.id}
                                    className="rounded-lg border border-zinc-100 px-2.5 py-2"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="truncate text-[12px] font-medium text-zinc-800">
                                          {item.title}
                                        </p>
                                        <p className="mt-0.5 text-[10px] text-zinc-400">
                                          {item.published !== false ? '已上架' : '已下架'}
                                          {' · '}
                                          {
                                            ASSET_VISIBILITY_LABELS[
                                              item.visibility ?? 'public'
                                            ]
                                          }
                                          {item.publisher ? ` · ${item.publisher}` : ''}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openUserPreview(pack.scenario.id, item.id)
                                        }
                                        className="rounded-md px-2 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-100"
                                      >
                                        预览
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditorTarget(item.id)}
                                        className="rounded-md px-2 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-100"
                                      >
                                        编辑
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => togglePublished(item.id)}
                                        className="rounded-md px-2 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-100"
                                      >
                                        {item.published !== false ? '下架' : '上架'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          deleteItem(item.id);
                                          showToast('已删除或下架');
                                        }}
                                        className="rounded-md px-2 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-50"
                                      >
                                        删除
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[10px] text-zinc-400">
                      挂载标签需命中：{pack.scenario.matchTags.join(' · ')}（新建已预填「
                      {pack.primaryTag}」）
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
          {!filteredPacks.length ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-[12px] text-zinc-500">
              暂无匹配场景包
            </div>
          ) : null}
        </div>

        {orphans.length > 0 ? (
          <section className="mt-6 mb-8">
            <h3 className="mb-2 text-[12px] font-semibold text-zinc-800">
              未挂场景
              <span className="ml-2 text-[10px] font-normal text-zinc-400">
                场景标签未命中任何方案包 · 用户侧不可见
              </span>
            </h3>
            <div className="space-y-2">
              {orphans.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-xl border border-dashed border-zinc-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-zinc-800">
                      <span className="mr-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
                        {typeLabel(item.type)}
                      </span>
                      {item.title}
                    </p>
                    <p className="truncate text-[10px] text-zinc-400">
                      标签：{(item.scenarioTags ?? []).join(', ') || '无'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditorTarget(item.id)}
                    className="shrink-0 rounded-lg border border-black/8 px-3 py-1 text-[11px] font-medium hover:bg-black/[0.03]"
                  >
                    编辑挂载
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        </>
        ) : null}
      </div>

      <CaseEditorModal
        target={editorTarget}
        defaultType={editorType}
        defaultScenarioTags={editorTags}
        onClose={() => {
          setEditorTarget(null);
          setEditorTags([]);
        }}
      />
    </div>
  );
}
