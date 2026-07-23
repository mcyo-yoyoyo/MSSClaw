import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { PrototypeAgentSeed, PrototypeSkillSeed, PrototypeToolSeed } from '@/domain/prototype/types';
import {
  FEATURED_SCENARIOS,
  filterAiMapCards,
} from '@/domain/portalMap';
import {
  resolveCaseItemsForScenarioId,
  resolvePrimaryCaseIdForScenario,
} from '@/domain/portalCase';
import { downloadScenarioCasePack } from '@/domain/caseExport';
import {
  AI_TOOL_NAV_CATEGORIES,
  isHomeAiTool,
  type AiToolNavCategoryId,
} from '@/domain/aiToolCategories';
import { listFeaturedFindCaseTools } from '@/domain/plazaToolPicks';
import {
  getPlazaToolGuides,
  PLAZA_GUIDE_TYPE_LABEL,
  type PlazaToolGuide,
} from '@/domain/plazaToolGuides';
import {
  getBusinessScenarioMeta,
  getPrimaryBusinessScenario,
  scenarioBelongsToBusiness,
  type BusinessScenarioId,
} from '@/domain/businessScenarios';
import { BusinessScenarioFilterBar } from '@/components/home/BusinessScenarioFilterBar';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import {
  DISCOVER_SCENARIO_IDS,
  SCENARIO_PUBLISHED_AT,
  type DiscoverScenarioId,
} from '@/domain/scenarioCapabilities';
import { heatScore, sortByRankMode } from '@/domain/contentEngagement';
import {
  emptyOrgPerspectiveSelection,
  getScenarioOrgAxisTags,
  scenarioMatchesOrgPerspectiveSelection,
  type OrgPerspectiveSelection,
} from '@/domain/orgAxisTags';
import { ToolLogo } from '@/components/brand/ToolLogo';
import {
  CardPageCarousel,
  HOME_SECONDARY_PANEL_H,
  HomeFeedCard,
} from '@/components/home/CardPageCarousel';
import { OrgPerspectiveFilter } from '@/components/home/OrgPerspectiveFilter';
import { StationAnnounceBanner } from '@/components/home/StationAnnounceBanner';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useSessionStore } from '@/stores/sessionStore';
import {
  ensureEngagementSeeds,
  useContentEngagementStore,
} from '@/stores/contentEngagementStore';
import { isNewScenario } from '@/domain/contentBadges';
import { openResourceWithReturn } from '@/domain/openResourceNav';
import {
  HOME_FILTER_CHIP_ACTIVE,
  HOME_FILTER_CHIP_CLASS,
  HOME_FILTER_CHIP_IDLE,
  HOME_FILTER_TRACK_CLASS,
} from '@/components/home/homeFilterChrome';

interface HomeScenePortalProps {
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
}

/** 标题 + 同行筛选 + 右侧操作，压缩行高 */
/** 与 AI任务页工具条同高，切换 Tab 时标题行不跳动 */
export function SectionToolbar({
  title,
  filters,
  trailing,
  dense,
  /** center：补充意图等单行文案场景（与默认垂直居中一致，保留 API） */
  align = 'start',
}: {
  title: string;
  filters?: ReactNode;
  trailing?: ReactNode;
  dense?: boolean;
  align?: 'start' | 'center';
}) {
  void align;
  return (
    <div
      className={cn(
        'flex min-h-8 min-w-0 items-center gap-2.5',
        dense ? 'mb-1.5' : 'mb-3',
      )}
    >
      <h2
        className={cn(
          'shrink-0 font-semibold tracking-tight text-zinc-900',
          dense ? 'text-[13px]' : 'text-[14px]',
        )}
      >
        {title}
      </h2>
      {filters ? <div className="flex min-w-0 flex-1 items-center">{filters}</div> : null}
      {trailing ? (
        <div className="ml-auto flex shrink-0 items-center gap-2">{trailing}</div>
      ) : null}
    </div>
  );
}

function FilterTrack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(HOME_FILTER_TRACK_CLASS, className)}>{children}</div>;
}

function FilterChip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        HOME_FILTER_CHIP_CLASS,
        active ? HOME_FILTER_CHIP_ACTIVE : HOME_FILTER_CHIP_IDLE,
      )}
    >
      {children}
    </button>
  );
}

function ToolIconRow({
  tools,
  onOpen,
  onHowTo,
  emptyText = '暂无推荐',
}: {
  tools: PrototypeToolSeed[];
  onOpen: (id: string) => void;
  onHowTo: (tool: PrototypeToolSeed) => void;
  emptyText?: string;
}) {
  return (
    <div className="flex min-h-0 items-center gap-2 overflow-x-auto px-0.5 scroll-hidden">
      {tools.map((t) => {
        const hasGuide = getPlazaToolGuides(t.id).length > 0;
        return (
          <div key={t.id} className="flex shrink-0 items-center gap-1.5 px-0.5">
            <button
              type="button"
              title={t.desc}
              onClick={() => onOpen(t.id)}
              className="flex w-[52px] flex-col items-center justify-center gap-1 rounded-md py-0.5 transition hover:bg-zinc-100/70"
            >
              <ToolLogo name={t.name} logoUrl={t.logoUrl} icon={t.icon} size={22} />
              <span className="w-full truncate text-center text-[10px] font-semibold text-zinc-800">
                {t.name}
              </span>
            </button>
            {hasGuide ? (
              <button
                type="button"
                title="试用前有疑问？点此查看 How to 指引"
                onClick={() => onHowTo(t)}
                className="group flex flex-col items-start justify-center gap-0.5 rounded-md px-0.5 py-0.5 text-left transition"
              >
                <span className="font-serif text-[9px] italic leading-none tracking-wide text-zinc-300 transition group-hover:text-zinc-500">
                  How to
                </span>
                <span className="text-[8px] leading-none text-zinc-300/80 transition group-hover:text-zinc-400">
                  有疑问
                </span>
              </button>
            ) : null}
          </div>
        );
      })}
      {!tools.length ? <p className="px-2 py-1.5 text-[10px] text-zinc-400">{emptyText}</p> : null}
    </div>
  );
}

function HowToDrawer({
  toolName,
  guides,
  onClose,
  onOpenGuide,
}: {
  toolName: string;
  guides: PlazaToolGuide[];
  onClose: () => void;
  onOpenGuide: (g: PlazaToolGuide) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-[320px] flex-col border-l border-zinc-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3.5">
          <div className="min-w-0">
            <p className="font-serif text-[12px] italic text-zinc-400">How to</p>
            <h3 className="mt-0.5 truncate text-[14px] font-semibold text-zinc-900">{toolName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[12px] text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
          >
            关闭
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {guides.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onOpenGuide(g)}
              className="flex w-full items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-white"
            >
              <span className="mt-0.5 shrink-0 rounded-md bg-zinc-900/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                {PLAZA_GUIDE_TYPE_LABEL[g.type]}
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-zinc-800">{g.title}</span>
                {g.blurb ? (
                  <span className="mt-0.5 block text-[10px] leading-snug text-zinc-400">{g.blurb}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

export function HomeScenePortal({
  onInvokeAgent: _onInvokeAgent,
  onInvokeSkill: _onInvokeSkill,
}: HomeScenePortalProps) {
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const tools = useMarketplaceStore((s) => s.tools);
  const portalContent = usePortalContentStore((s) => s.items);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const user = useSessionStore((s) => s.user);

  const [businessFilter, setBusinessFilter] = useState<BusinessScenarioId | 'all'>('all');
  const pendingBusinessScenario = useNavigationIntentStore((s) => s.pendingBusinessScenario);
  const consumeBusinessScenario = useNavigationIntentStore((s) => s.consumeBusinessScenario);
  const [orgSelection, setOrgSelection] = useState<OrgPerspectiveSelection>(
    emptyOrgPerspectiveSelection,
  );

  useEffect(() => {
    if (!pendingBusinessScenario) return;
    const id = consumeBusinessScenario();
    if (id) setBusinessFilter(id);
  }, [pendingBusinessScenario, consumeBusinessScenario]);
  const [toolCat, setToolCat] = useState<AiToolNavCategoryId>('chat');
  const [howToTool, setHowToTool] = useState<PrototypeToolSeed | null>(null);

  const orgResetKey = useMemo(
    () =>
      [
        orgSelection.global.join(','),
        orgSelection.region.join(','),
        orgSelection.dept.join(','),
      ].join('|'),
    [orgSelection],
  );
  const focusScenario = useNavigationIntentStore((s) => s.focusScenario);
  const focusCase = useNavigationIntentStore((s) => s.focusCase);
  const engagementOf = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);
  const bumpUse = useContentEngagementStore((s) => s.bumpUse);

  const affiliation = useMemo(
    () => ({
      deptIds: user?.deptIds ?? [],
      regionId: user?.regionId ?? null,
    }),
    [user?.deptIds, user?.regionId],
  );

  const homeAiTools = useMemo(() => tools.filter(isHomeAiTool), [tools]);

  const pickedTools = useMemo(
    () => listFeaturedFindCaseTools(homeAiTools, toolCat, 2),
    [toolCat, homeAiTools],
  );

  const discoverScenarios = useMemo(
    () =>
      FEATURED_SCENARIOS.filter((s) =>
        (DISCOVER_SCENARIO_IDS as readonly string[]).includes(s.id),
      ),
    [],
  );

  const rankedScenarios = useMemo(() => {
    const mapped = discoverScenarios
      .filter((s) => scenarioBelongsToBusiness(s.id, businessFilter))
      .map((s) => {
        const caseId = resolvePrimaryCaseIdForScenario(s.id);
        const caseItem = caseId
          ? portalContent.find((p) => p.id === caseId)
          : undefined;
        const primarySkillId = caseItem?.primarySkillId || caseItem?.skillId || null;
        const ownerDeptIds = caseItem?.ownerDeptIds;
        const ownerRegionId = caseItem?.ownerRegionId ?? null;
        const businessId = getPrimaryBusinessScenario(s.id);
        const orgTags = getScenarioOrgAxisTags({
          primarySkillId,
          ownerDeptIds,
          ownerRegionId,
        });
        return {
          ...s,
          publishedAt: SCENARIO_PUBLISHED_AT[s.id as DiscoverScenarioId],
          primaryCaseId: caseId,
          primaryCaseTitle: caseItem?.title,
          primarySkillId,
          ownerDeptIds,
          ownerRegionId,
          businessId,
          businessLabel: businessId ? getBusinessScenarioMeta(businessId).label : null,
          orgTags,
        };
      })
      .filter((s) =>
        scenarioMatchesOrgPerspectiveSelection(
          {
            primarySkillId: s.primarySkillId,
            ownerDeptIds: s.ownerDeptIds,
            ownerRegionId: s.ownerRegionId,
          },
          orgSelection,
        ),
      );
    return sortByRankMode(mapped, 'trending', engagementOf);
  }, [discoverScenarios, businessFilter, orgSelection, engagementOf, engagementById, portalContent]);

  const hotTop3Ids = useMemo(() => {
    return [...rankedScenarios]
      .sort((a, b) => heatScore(engagementOf(b.id)) - heatScore(engagementOf(a.id)))
      .slice(0, 3)
      .map((s) => s.id);
  }, [rankedScenarios, engagementOf, engagementById]);

  const catalog = useMemo(
    () =>
      filterAiMapCards({
        agents,
        skills,
        tools,
        portalContent,
        affiliation,
        userId: user?.id ?? '',
        userName: user?.name ?? '',
        role: user?.platformRole,
        selection: { kind: 'all' },
        search: '',
      }),
    [agents, skills, tools, portalContent, affiliation, user],
  );

  useEffect(() => {
    const ids = [
      ...DISCOVER_SCENARIO_IDS,
      ...catalog.filter((c) => c.kind === 'news' || c.kind === 'training').map((c) => c.id),
      ...portalContent.filter((p) => p.type === 'news' || p.type === 'training').map((p) => p.id),
    ];
    ensureEngagementSeeds(ids);
  }, [catalog, portalContent]);

  const openTool = (toolId: string) => {
    const tool = tools.find((t) => t.id === toolId);
    if (!tool?.homepageUrl) {
      showToast('暂无入口链接');
      return;
    }
    const win = window.open(tool.homepageUrl, '_blank', 'noopener,noreferrer');
    useMarketplaceStore.getState().bumpToolInvokes(toolId);
    if (!win) {
      showToast('浏览器拦截了弹窗，请允许本站弹窗后重试，或复制链接手动打开');
      return;
    }
    showToast(`已打开：${tool.name}`);
  };

  const openHowTo = (tool: PrototypeToolSeed) => {
    setHowToTool(tool);
  };

  const openGuideResource = (g: PlazaToolGuide) => {
    if (!g.url || g.url === '#') {
      showToast(`指引「${g.title}」演示占位，后续可挂 PPT / 图片 / 视频`);
      return;
    }
    window.open(g.url, '_blank', 'noopener,noreferrer');
  };

  const openScenario = (scenarioId: string) => {
    bumpUse(scenarioId);
    const caseId = resolvePrimaryCaseIdForScenario(scenarioId);
    focusScenario(scenarioId);
    if (caseId) focusCase(caseId);
    openResourceWithReturn('ai-map');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-x-visible pb-2">
      <StationAnnounceBanner className="border-b border-zinc-100/90 pb-2" />

      {/* L1 · 场景案例 */}
      <section className="overflow-x-visible">
        <SectionToolbar
          title="场景案例"
          filters={
            <BusinessScenarioFilterBar value={businessFilter} onChange={setBusinessFilter} />
          }
          trailing={<OrgPerspectiveFilter value={orgSelection} onChange={setOrgSelection} />}
        />

        <CardPageCarousel
          items={rankedScenarios}
          getKey={(s) => s.id}
          resetKey={`${businessFilter}-${orgResetKey}`}
          emptyText="该场景下暂无案例"
          renderCard={(s) => (
            <HomeFeedCard
              title={s.label}
              tags={
                s.orgTags.length > 0
                  ? s.orgTags
                  : s.businessLabel
                    ? [{ axis: 'dept', id: 'biz', label: s.businessLabel }]
                    : []
              }
              description={s.primaryCaseTitle ? `代表案例：${s.primaryCaseTitle}` : s.desc}
              onClick={() => openScenario(s.id)}
              contentId={s.id}
              isNew={isNewScenario(s.id)}
              isHot={hotTop3Ids.includes(s.id)}
              onDownload={() => {
                const items = resolveCaseItemsForScenarioId(s.id);
                if (!items.length) {
                  showToast('该场景暂无可下载的案例包');
                  return;
                }
                downloadScenarioCasePack(s.label, items);
                const bump = useContentEngagementStore.getState().bumpDownload;
                items.forEach((i) => bump(i.id));
                showToast(
                  items.length === 1
                    ? `已下载案例包：${items[0]!.title}`
                    : `已下载场景案例包（${items.length} 个）`,
                );
              }}
              onAfterAction={(action) => {
                if (action === 'dislike') showToast('已反馈，运营将关注优化');
              }}
            />
          )}
        />
      </section>

      {/* L2 · 场景工具：与场景案例同宽同构，无外框 */}
      <section>
        <SectionToolbar
          title="场景工具（精选）"
          filters={
            <FilterTrack>
              {AI_TOOL_NAV_CATEGORIES.map((c) => (
                <FilterChip key={c.id} active={toolCat === c.id} onClick={() => setToolCat(c.id)}>
                  <i className={cn('fa-solid text-[9px]', c.icon)} />
                  {c.label}
                </FilterChip>
              ))}
            </FilterTrack>
          }
        />
        <div className={cn('grid grid-cols-1 gap-2 md:grid-cols-2', HOME_SECONDARY_PANEL_H)}>
          <div className="flex min-h-0 flex-col justify-center rounded-xl border border-zinc-200/80 bg-white px-2 py-1.5">
            <p className="mb-0.5 px-1 text-[10px] font-semibold leading-none text-zinc-400">外部</p>
            <ToolIconRow tools={pickedTools.external} onOpen={openTool} onHowTo={openHowTo} />
          </div>
          <div className="flex min-h-0 flex-col justify-center rounded-xl border border-zinc-200/80 bg-white px-2 py-1.5">
            <p className="mb-0.5 px-1 text-[10px] font-semibold leading-none text-zinc-400">内部</p>
            <ToolIconRow
              tools={pickedTools.internal}
              onOpen={openTool}
              onHowTo={openHowTo}
              emptyText="暂无内部推荐"
            />
          </div>
        </div>
      </section>

      {howToTool ? (
        <HowToDrawer
          toolName={howToTool.name}
          guides={getPlazaToolGuides(howToTool.id)}
          onClose={() => setHowToTool(null)}
          onOpenGuide={openGuideResource}
        />
      ) : null}
    </div>
  );
}
