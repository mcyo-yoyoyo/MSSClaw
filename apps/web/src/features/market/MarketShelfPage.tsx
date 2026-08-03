import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { canExecuteChat } from '@/domain/permissions';
import {
  applyMarketFeaturedPins,
  listMarketProjectCards,
  listMarketToolCards,
  MARKET_SHELF_META,
  splitFeaturedAndRest,
  type MarketShelfCard as MarketShelfCardModel,
  type MarketShelfKind,
} from '@/domain/marketShelf';
import { openMarketToolDetail } from '@/domain/openHomeJourney';
import { MarketShelfCard } from '@/components/market/MarketShelfCard';
import { buildProjectHowtoGuides } from '@/domain/projectHowto';
import { downloadScenarioUnifiedPack } from '@/domain/caseExport';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useMarketFilterStore } from '@/stores/marketFilterStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { ScenarioShowcasePanel } from '@/components/content/ScenarioShowcasePanel';
import { CenterModal } from '@/components/center/CenterShell';
import { resolveCaseItemsForScenarioId } from '@/domain/portalCase';
import {
  buildScenarioBundles,
  FEATURED_SCENARIOS,
  type ScenarioBundle,
} from '@/domain/portalMap';
import { getScenarioEnv } from '@/domain/scenarioEnv';
import { showcaseTabOf } from '@/domain/scenarioShowcase';
import {
  ensurePlazaToolGuidesBootstrapped,
  usePlazaToolGuideStore,
} from '@/stores/plazaToolGuideStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import {
  HowToDrawer,
  HowToGuidePreviewModal,
  openGuideEntry,
} from '@/components/market/HowToPanel';
import { MarketSubmitModal } from '@/features/market/MarketSubmitModal';
import { MarketShelfFilterBar } from '@/components/market/MarketShelfFilterBar';
import type { PlazaToolGuide } from '@/domain/plazaToolGuides';
import type { PrototypeAgentSeed, PrototypeSkillSeed } from '@/domain/prototype/types';
import {
  resolveScenarioDemoPlan,
  runScenarioBundleDemo,
  type ScenarioDemoPlan,
} from '@/domain/scenarioPipeline';
import { useRecentMarketStore } from '@/stores/recentMarketStore';
import { useMarketFavoriteStore } from '@/stores/marketFavoriteStore';
import { useMarketFeaturedStore } from '@/stores/marketFeaturedStore';

export type MarketShelfPageProps = {
  kind: MarketShelfKind;
  onInvokeAgent?: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill?: (skill: PrototypeSkillSeed) => void;
  onStartExpertTeam?: (plan: ScenarioDemoPlan, fromIndex?: number) => void;
};

export function MarketShelfPage({
  kind,
  onInvokeAgent,
  onInvokeSkill,
  onStartExpertTeam,
}: MarketShelfPageProps) {
  const meta = MARKET_SHELF_META[kind];
  const tools = useMarketplaceStore((s) => s.tools);
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const bumpToolInvokes = useMarketplaceStore((s) => s.bumpToolInvokes);
  const portalContent = usePortalContentStore((s) => s.items);
  const user = useSessionStore((s) => s.user);
  const orgSelection = useMarketFilterStore((s) => s.orgSelection);
  const businessFilter = useMarketFilterStore((s) => s.businessFilter);
  const search = useMarketFilterStore((s) => s.search);
  const pushRecent = useRecentMarketStore((s) => s.push);
  const getEngagement = useContentEngagementStore((s) => s.get);
  const bumpDownload = useContentEngagementStore((s) => s.bumpDownload);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const focusScenario = useNavigationIntentStore((s) => s.focusScenario);
  const guideRecords = usePlazaToolGuideStore((s) => s.records);
  const favoriteItems = useMarketFavoriteStore((s) => s.items);
  const hydrateFavorites = useMarketFavoriteStore((s) => s.hydrate);
  const toggleFavorite = useMarketFavoriteStore((s) => s.toggle);
  const featuredPins = useMarketFeaturedStore((s) => s.pins);
  const hydrateFeaturedPins = useMarketFeaturedStore((s) => s.hydrate);

  const [showcaseId, setShowcaseId] = useState<string | null>(null);
  const [howTo, setHowTo] = useState<{ title: string; guides: PlazaToolGuide[] } | null>(null);
  const [guidePreview, setGuidePreview] = useState<PlazaToolGuide | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const canSubmit = canExecuteChat(user?.platformRole);
  const canRunProjects =
    kind === 'projects' &&
    canSubmit &&
    Boolean(onInvokeSkill && onInvokeAgent && onStartExpertTeam);

  useEffect(() => {
    ensurePlazaToolGuidesBootstrapped();
    hydrateFavorites();
    hydrateFeaturedPins();
  }, [hydrateFavorites, hydrateFeaturedPins]);

  const viewer = useMemo(
    () => ({
      userId: user?.id,
      userName: user?.name,
      affiliation: {
        deptIds: user?.deptIds ?? [],
        regionId: user?.regionId ?? null,
      },
      role: user?.platformRole,
    }),
    [user],
  );

  const howtoToolIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of guideRecords) ids.add(r.toolId);
    return ids;
  }, [guideRecords]);

  const portalByScenario = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof resolveCaseItemsForScenarioId>>();
    return (scenarioId: string) => {
      if (!cache.has(scenarioId)) {
        cache.set(scenarioId, resolveCaseItemsForScenarioId(scenarioId));
      }
      return cache.get(scenarioId)!;
    };
  }, [portalContent]);

  const affiliation = useMemo(
    () => ({
      deptIds: user?.deptIds ?? [],
      regionId: user?.regionId ?? null,
    }),
    [user],
  );

  const projectBundles = useMemo(() => {
    if (kind !== 'projects') return [] as ScenarioBundle[];
    return buildScenarioBundles({
      agents,
      skills,
      tools,
      portalContent,
      affiliation,
      userId: user?.id ?? '',
      userName: user?.name ?? '',
      role: user?.platformRole,
      filter: 'all',
      search: '',
    });
  }, [kind, agents, skills, tools, portalContent, affiliation, user]);

  const runnableByScenario = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const b of projectBundles) {
      map.set(b.id, Boolean(resolveScenarioDemoPlan(b)));
    }
    return map;
  }, [projectBundles]);

  const cards = useMemo(() => {
    const eng = (id: string) => getEngagement(id);
    const raw =
      kind === 'projects'
        ? listMarketProjectCards(orgSelection, businessFilter, eng, portalByScenario).map(
            (c) => {
              const runnable = Boolean(c.scenarioId && runnableByScenario.get(c.scenarioId));
              return {
                ...c,
                runnable,
                primaryAction: (runnable ? 'run' : 'detail') as MarketShelfCardModel['primaryAction'],
              };
            },
          )
        : listMarketToolCards(
            tools,
            kind,
            viewer,
            orgSelection,
            businessFilter,
            eng,
            howtoToolIds,
          );
    const pinned = applyMarketFeaturedPins(raw, featuredPins[kind] ?? []);
    const q = search.trim().toLowerCase();
    if (!q) return pinned;
    return pinned.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.badges.some((b) => b.label.toLowerCase().includes(q)),
    );
  }, [
    kind,
    featuredPins,
    tools,
    viewer,
    orgSelection,
    businessFilter,
    search,
    getEngagement,
    howtoToolIds,
    portalByScenario,
    runnableByScenario,
  ]);

  const { featured, rest } = splitFeaturedAndRest(cards);

  const showcaseBundle = useMemo(() => {
    if (!showcaseId) return null;
    return projectBundles.find((b) => b.id === showcaseId) ?? null;
  }, [showcaseId, projectBundles]);

  const showcaseDemoPlan = useMemo(
    () => (showcaseBundle ? resolveScenarioDemoPlan(showcaseBundle) : null),
    [showcaseBundle],
  );

  const showcaseItems = showcaseId ? resolveCaseItemsForScenarioId(showcaseId) : [];

  const guidesForTool = (toolId: string): PlazaToolGuide[] =>
    guideRecords.filter((r) => r.toolId === toolId).map(({ toolId: _t, ...g }) => g);

  const isFavorited = (card: MarketShelfCardModel) =>
    favoriteItems.some((x) => x.id === card.id && x.kind === card.kind);

  const onToggleFavorite = (card: MarketShelfCardModel) => {
    const added = toggleFavorite({
      id: card.id,
      kind: card.kind,
      title: card.title,
      icon: card.icon,
      logoUrl: card.logoUrl,
    });
    showToast(added ? `????${card.title}` : `??????${card.title}`);
  };

  const rememberCard = (card: MarketShelfCardModel) => {
    pushRecent({
      id: card.id,
      kind: card.kind,
      title: card.title,
      icon: card.icon,
      logoUrl: card.logoUrl,
    });
  };

  const openToolUrl = (card: MarketShelfCardModel) => {
    if (!card.homepageUrl || card.homepageUrl === '#') return false;
    const win = window.open(card.homepageUrl, '_blank', 'noopener,noreferrer');
    bumpToolInvokes(card.id);
    rememberCard(card);
    if (!win) showToast('???????????????');
    else showToast(`????${card.title}`);
    return true;
  };

  const executeProject = (bundle?: ScenarioBundle | null) => {
    if (!bundle || !onInvokeAgent || !onInvokeSkill || !onStartExpertTeam) return;
    const plan = resolveScenarioDemoPlan(bundle);
    if (!plan) {
      showToast('???????????? How to');
      return;
    }
    rememberCard({
      id: bundle.id,
      kind: 'projects',
      title: bundle.label,
      description: '',
      icon: 'fa-map',
      badges: [],
      featured: false,
      heat: 0,
      scenarioId: bundle.id,
      hasHowto: true,
      runnable: true,
      primaryAction: 'run',
    });
    const msg = runScenarioBundleDemo(bundle, {
      onInvokeAgent,
      onInvokeSkill,
      onStartExpertTeam,
    });
    if (msg) showToast(msg);
  };

  const openProjectHowTo = (card: MarketShelfCardModel) => {
    if (!card.scenarioId) return;
    const items = portalByScenario(card.scenarioId);
    const bundle = projectBundles.find((b) => b.id === card.scenarioId) ?? null;
    const guides = buildProjectHowtoGuides({
      scenarioId: card.scenarioId,
      label: card.title,
      items,
      bundle,
    });
    setHowTo({ title: card.title, guides });
    if (!guides.length) showToast('?? How to?????????');
  };

  const openToolHowTo = (card: MarketShelfCardModel) => {
    const guides = guidesForTool(card.id);
    setHowTo({ title: card.title, guides });
    if (!guides.length) showToast(`?${card.title}??? How to?????????`);
  };

  const openHowTo = (card: MarketShelfCardModel) => {
    if (card.kind === 'projects') openProjectHowTo(card);
    else openToolHowTo(card);
  };

  const openCard = (card: MarketShelfCardModel) => {
    if (card.kind === 'projects' && card.scenarioId) {
      rememberCard(card);
      setShowcaseId(card.scenarioId);
      return;
    }
    rememberCard(card);
    openMarketToolDetail(card.id, kind === 'projects' ? 'external' : kind);
  };

  const openPrimary = (card: MarketShelfCardModel) => {
    if (card.kind === 'projects') {
      openCard(card);
      return;
    }
    if (openToolUrl(card)) return;
    openToolHowTo(card);
    if (!card.hasHowto) {
      showToast(`?${card.title}???????? How to`);
    }
  };

  const downloadProjectPack = () => {
    if (!showcaseId) return;
    const items = showcaseItems;
    const label =
      FEATURED_SCENARIOS.find((s) => s.id === showcaseId)?.label ||
      showcaseBundle?.label ||
      '\u573a\u666f';
    const hasAnything =
      items.length > 0 ||
      Boolean(showcaseBundle?.env || getScenarioEnv(showcaseId)) ||
      (showcaseBundle?.agents.length ?? 0) +
        (showcaseBundle?.skills.length ?? 0) +
        (showcaseBundle?.tools.length ?? 0) +
        (showcaseBundle?.architectureDocs.length ?? 0) >
        0;
    if (!hasAnything) {
      showToast('\u8be5\u9879\u76ee\u6682\u65e0\u53ef\u4e0b\u8f7d\u5185\u5bb9');
      return;
    }
    downloadScenarioUnifiedPack({
      scenarioId: showcaseId,
      scenarioLabel: label,
      learnItems: items,
      env: showcaseBundle?.env ?? getScenarioEnv(showcaseId),
      agents: showcaseBundle?.agents ?? [],
      skills: showcaseBundle?.skills ?? [],
      tools: showcaseBundle?.tools ?? [],
      architectureDocs: showcaseBundle?.architectureDocs ?? [],
      caseItems: items.filter((i) => i.type === 'case'),
    });
    items.forEach((i) => bumpDownload(i.id));
    showToast('??? How to ???');
  };

  const emptyHint =
    search.trim() ||
    orgSelection.dept.length ||
    orgSelection.region.length ||
    businessFilter !== 'all'
      ? '\u5f53\u524d\u7b5b\u9009\u4e0b\u6682\u65e0\u5185\u5bb9\u3002\u53ef\u6e05\u7a7a\u5de6\u4fa7\u9886\u57df/\u533a\u57df/\u573a\u666f\uff0c\u6216\u8c03\u6574\u641c\u7d22\u5173\u952e\u8bcd\u3002'
      : '\u6743\u9650\u8303\u56f4\u5185\u6682\u65e0\u4e0a\u67b6\u5185\u5bb9\u3002\u82e5\u9884\u671f\u5e94\u53ef\u89c1\uff0c\u8bf7\u8054\u7cfb\u8fd0\u8425\u786e\u8ba4\u53ef\u89c1\u6027\u4e0e\u4e0a\u67b6\u72b6\u6001\u3002';

  return (
    <div className="center-surface flex min-h-0 flex-1 flex-col overflow-y-auto scroll-hidden">
      <div className="mx-auto w-full max-w-7xl px-5 py-6 md:px-7">
        <header className="mb-6 rounded-2xl border border-zinc-200/80 bg-gradient-to-b from-zinc-50 to-white px-5 py-5 md:px-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                MSS AI {'\u5de5\u5177\u5e73\u53f0'}
              </p>
              <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-zinc-900 md:text-[24px]">
                {meta.label}
              </h1>
              <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-zinc-500">
                {kind === 'projects'
                  ? '\u6837\u677f\u9879\u76ee\u00b7How to \u4e0a\u624b\u00b7\u5df2\u6302\u8f7d\u53ef\u6267\u884c\u00b7\u8be6\u60c5\u53ef\u4e0b\u8f7d\u5b66\u4e60\u5305'
                  : '\u5e94\u7528\u5e02\u573a\u5361\u7247\u00b7\u6743\u9650\u8303\u56f4\u53ef\u89c1\u00b7How to \u4e0a\u624b\u00b7\u7acb\u5373\u4f7f\u7528\u6253\u5f00'}
              </p>
            </div>
          </div>
          <MarketShelfFilterBar
            trailing={
              canSubmit ? (
                <button
                  type="button"
                  onClick={() => setSubmitOpen(true)}
                  className="rounded-xl bg-zinc-900 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-zinc-800"
                >
                  {kind === 'projects' ? '\u63d0\u62a5\u9879\u76ee' : '\u63d0\u62a5\u5de5\u5177'}
                </button>
              ) : null
            }
          />
        </header>

        {featured.length > 0 ? (
          <section className="mb-8">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-[13px] font-semibold text-zinc-800">{'\u7cbe\u9009\u63a8\u8350'}</h2>
              <span className="text-[11px] text-zinc-400">{featured.length} {'\u9879'}</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-1 scroll-hidden">
              {featured.map((c) => (
                <div key={`hot-${c.id}`} className="w-[300px] shrink-0 sm:w-[320px] lg:w-[340px]">
                  <MarketShelfCard
                    card={c}
                    variant="featured"
                    favorited={isFavorited(c)}
                    onOpen={() => openCard(c)}
                    onPrimary={() => openPrimary(c)}
                    onHowTo={() => openHowTo(c)}
                    onFavorite={() => onToggleFavorite(c)}
                    onRun={
                      canRunProjects && c.scenarioId
                        ? () =>
                            executeProject(
                              projectBundles.find((b) => b.id === c.scenarioId),
                            )
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-zinc-800">
              {featured.length ? '\u66f4\u591a' : '\u5168\u90e8'}
              <span className="ml-1.5 font-normal text-zinc-400">{rest.length}</span>
            </h2>
          </div>
          {rest.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {rest.map((c) => (
                <MarketShelfCard
                  key={c.id}
                  card={c}
                  favorited={isFavorited(c)}
                  onOpen={() => openCard(c)}
                  onPrimary={() => openPrimary(c)}
                  onHowTo={() => openHowTo(c)}
                  onFavorite={() => onToggleFavorite(c)}
                  onRun={
                    canRunProjects && c.scenarioId
                      ? () =>
                          executeProject(
                            projectBundles.find((b) => b.id === c.scenarioId),
                          )
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-14 text-center text-[13px] text-zinc-400">
              {emptyHint}
            </div>
          )}
        </section>
      </div>

      <MarketSubmitModal kind={kind} open={submitOpen} onClose={() => setSubmitOpen(false)} />

      {howTo ? (
        <HowToDrawer
          title={howTo.title}
          subtitle={
            kind === 'projects'
              ? '??? ? ?? / ?? / ????'
              : undefined
          }
          guides={howTo.guides}
          stepped
          onClose={() => setHowTo(null)}
          onOpenGuide={(g) =>
            openGuideEntry(g, { onPreview: setGuidePreview, onToast: showToast })
          }
        />
      ) : null}

      <HowToGuidePreviewModal guide={guidePreview} onClose={() => setGuidePreview(null)} />

      <CenterModal
        open={!!showcaseId}
        title={
          FEATURED_SCENARIOS.find((s) => s.id === showcaseId)?.label ||
          showcaseBundle?.label ||
          '\u9879\u76ee\u8be6\u60c5'
        }
        onClose={() => setShowcaseId(null)}
        size="lg"
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                if (!showcaseId) return;
                const card: MarketShelfCardModel = {
                  id: showcaseId,
                  kind: 'projects',
                  title:
                    FEATURED_SCENARIOS.find((s) => s.id === showcaseId)?.label ||
                    '\u9879\u76ee',
                  description: '',
                  icon: 'fa-map',
                  badges: [],
                  featured: true,
                  heat: 0,
                  scenarioId: showcaseId,
                  hasHowto: true,
                  runnable: Boolean(showcaseDemoPlan),
                  primaryAction: showcaseDemoPlan ? 'run' : 'detail',
                };
                setShowcaseId(null);
                openProjectHowTo(card);
              }}
              className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium"
            >
              How to
            </button>
            <button
              type="button"
              onClick={downloadProjectPack}
              className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium"
            >
              <i className="fa-solid fa-download mr-1 text-[10px]" />
              {'\u4e0b\u8f7d\u5b66\u4e60\u5305'}
            </button>
            {canRunProjects && showcaseDemoPlan ? (
              <button
                type="button"
                onClick={() => executeProject(showcaseBundle)}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-[12px] font-semibold text-white hover:bg-emerald-800"
              >
                {'\u6267\u884c'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (!showcaseId) return;
                focusScenario(showcaseId);
                setAppView('ai-map');
                setShowcaseId(null);
              }}
              className={cn(
                'rounded-xl px-4 py-2 text-[12px] font-semibold',
                canRunProjects && showcaseDemoPlan
                  ? 'border border-black/8 font-medium text-zinc-700'
                  : 'bg-zinc-900 text-white',
              )}
            >
              {'\u6df1\u5165\u63a2\u7d22'}
            </button>
            <button
              type="button"
              onClick={() => setShowcaseId(null)}
              className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium"
            >
              {'\u5173\u95ed'}
            </button>
          </>
        }
      >
        {showcaseId ? (
          <ScenarioShowcasePanel
            scenarioLabel={
              FEATURED_SCENARIOS.find((s) => s.id === showcaseId)?.label || '\u9879\u76ee'
            }
            items={showcaseItems}
            bundle={
              showcaseBundle ?? {
                label:
                  FEATURED_SCENARIOS.find((s) => s.id === showcaseId)?.label || '\u9879\u76ee',
                layers: {
                  thought: showcaseItems.length > 0,
                  toolkit: Boolean(getScenarioEnv(showcaseId)),
                  capability: false,
                },
                agents: [],
                skills: [],
                tools: [],
                env: getScenarioEnv(showcaseId) ?? null,
              }
            }
            initialTab={showcaseItems[0] ? showcaseTabOf(showcaseItems[0].type) : undefined}
            initialItemId={showcaseItems[0]?.id}
          />
        ) : null}
      </CenterModal>
    </div>
  );
}
