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
import {
  listVisibleBusinessScenarioCategories,
  type BusinessScenarioId,
} from '@/domain/businessScenarios';
import { useBusinessScenarioCatalogStore } from '@/stores/businessScenarioCatalogStore';
import {
  emptyOrgPerspectiveSelection,
  isOrgPerspectiveEmpty,
  skillMatchesOrgPerspectiveSelection,
} from '@/domain/orgAxisTags';
import {
  getSkillBusinessLabel,
  listFeaturedDoTaskSkillIds,
  resolveSkillBusinessScenario,
} from '@/domain/skillBusinessScenarios';
import { getDeptLabel, getRegionLabel } from '@/domain/orgTaxonomy';
import { canViewAsset } from '@/domain/assetVisibility';
import { downloadSkillFile } from '@/domain/skillExport';
import { useMssBuildStatsCopyStore } from '@/stores/mssBuildStatsCopyStore';
import {
  AI_TOOL_NAV_CATEGORIES,
  toolBelongsToNavCategory,
  type AiToolNavCategoryId,
} from '@/domain/aiToolCategories';
import { openMarketToolDetail } from '@/domain/openHomeJourney';
import { MarketShelfCard } from '@/components/market/MarketShelfCard';
import { buildProjectHowtoGuides } from '@/domain/projectHowto';
import { downloadScenarioUnifiedPack } from '@/domain/caseExport';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useMarketFilterStore } from '@/stores/marketFilterStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { ProjectDocsGallery } from '@/components/content/ProjectDocsGallery';
import { CenterModal } from '@/components/center/CenterShell';
import { resolveCaseItemsForScenarioId } from '@/domain/portalCase';
import {
  buildScenarioBundles,
  FEATURED_SCENARIOS,
  type ScenarioBundle,
} from '@/domain/portalMap';
import { getScenarioEnv } from '@/domain/scenarioEnv';
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
import { MarketSkillSubmitModal } from '@/features/market/MarketSkillSubmitModal';
import { CaseEditorModal } from '@/components/center/CaseEditorModal';
import { MarketShelfFilterBar } from '@/components/market/MarketShelfFilterBar';
import type { PlazaToolGuide } from '@/domain/plazaToolGuides';
import type { PrototypeAgentSeed, PrototypeSkillSeed } from '@/domain/prototype/types';
import {
  resolveScenarioDemoPlan,
  runScenarioBundleDemo,
  type ScenarioDemoPlan,
} from '@/domain/scenarioPipeline';
import { useRecentMarketStore } from '@/stores/recentMarketStore';
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
  const setBusinessFilter = useMarketFilterStore((s) => s.setBusinessFilter);
  const search = useMarketFilterStore((s) => s.search);
  const pushRecent = useRecentMarketStore((s) => s.push);
  const getEngagement = useContentEngagementStore((s) => s.get);
  const bumpDownload = useContentEngagementStore((s) => s.bumpDownload);
  const guideRecords = usePlazaToolGuideStore((s) => s.records);
  const featuredPins = useMarketFeaturedStore((s) => s.pins);
  const hydrateFeaturedPins = useMarketFeaturedStore((s) => s.hydrate);

  const [showcaseId, setShowcaseId] = useState<string | null>(null);
  const [howTo, setHowTo] = useState<{ title: string; guides: PlazaToolGuide[] } | null>(null);
  const [guidePreview, setGuidePreview] = useState<PlazaToolGuide | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [aiCategory, setAiCategory] = useState<AiToolNavCategoryId | 'all'>('all');
  /** MSS 集市二级面：场景案例 | 场景技能 */
  const [mssSurface, setMssSurface] = useState<'projects' | 'skills'>('projects');
  const [skillDetail, setSkillDetail] = useState<PrototypeSkillSeed | null>(null);

  const caseSubmitDefaultBusinessId =
    kind === 'projects' && businessFilter !== 'all' ? businessFilter : undefined;
  const buildStatsCopy = useMssBuildStatsCopyStore((s) => s.copy);
  const hydrateBuildStatsCopy = useMssBuildStatsCopyStore((s) => s.hydrate);

  const canSubmit = canExecuteChat(user?.platformRole);
  const canRunProjects =
    kind === 'projects' &&
    canSubmit &&
    Boolean(onInvokeSkill && onInvokeAgent && onStartExpertTeam);
  const canRunSkills = kind === 'projects' && canSubmit && Boolean(onInvokeSkill);

  useEffect(() => {
    ensurePlazaToolGuidesBootstrapped();
    hydrateFeaturedPins();
    useBusinessScenarioCatalogStore.getState().hydrate();
    hydrateBuildStatsCopy();
  }, [hydrateFeaturedPins, hydrateBuildStatsCopy]);

  useEffect(() => {
    setAiCategory('all');
    setMssSurface('projects');
  }, [kind]);

  const sceneCatalog = useBusinessScenarioCatalogStore((s) => s.categories);

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

  /** external/internal ignore left org; MSS applies in-page org filter */
  const listOrg =
    kind === 'projects' ? orgSelection : emptyOrgPerspectiveSelection();
  const listBusiness: BusinessScenarioId | 'all' =
    kind === 'projects' ? businessFilter : 'all';

  const cards = useMemo(() => {
    const eng = (id: string) => getEngagement(id);
    const raw =
      kind === 'projects'
        ? listMarketProjectCards(listOrg, listBusiness, eng, portalByScenario).map((c) => {
            const runnable = Boolean(c.scenarioId && runnableByScenario.get(c.scenarioId));
            return {
              ...c,
              runnable,
              primaryAction: (runnable ? 'run' : 'detail') as MarketShelfCardModel['primaryAction'],
            };
          })
        : listMarketToolCards(tools, kind, viewer, listOrg, listBusiness, eng, howtoToolIds);

    let working = raw;
    if (kind === 'external' && aiCategory !== 'all') {
      working = working.filter((c) => {
        const tool = tools.find((x) => x.id === c.id);
        return tool ? toolBelongsToNavCategory(tool, aiCategory) : false;
      });
    }

    const pinned =
      kind === 'internal'
        ? working.map((c) => ({ ...c, featured: false }))
        : applyMarketFeaturedPins(working, featuredPins[kind] ?? []);

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
    listOrg,
    listBusiness,
    search,
    aiCategory,
    getEngagement,
    howtoToolIds,
    portalByScenario,
    runnableByScenario,
  ]);

  const showSceneHub = kind === 'projects' && businessFilter === 'all';
  // 场景分类改为 Chip 筛选，页内始终展示精选 + 列表（不再先进入分类枢纽）
  const showMssSceneChips = kind === 'projects';

  const sceneCategories = useMemo(() => {
    if (kind !== 'projects') return [];
    const eng = (id: string) => getEngagement(id);
    return listVisibleBusinessScenarioCategories().map((cat) => {
      const projects = listMarketProjectCards(
        orgSelection,
        cat.id,
        eng,
        portalByScenario,
      ).map((c) => ({
        ...c,
        runnable: Boolean(c.scenarioId && runnableByScenario.get(c.scenarioId)),
      }));
      return {
        ...cat,
        count: projects.length,
        runnableCount: projects.filter((p) => p.runnable).length,
      };
    });
  }, [kind, orgSelection, getEngagement, portalByScenario, runnableByScenario, sceneCatalog]);

  const hubStats = useMemo(() => {
    if (kind !== 'projects') return null;
    const eng = (id: string) => getEngagement(id);
    const all = listMarketProjectCards(
      orgSelection,
      businessFilter === 'all' ? 'all' : businessFilter,
      eng,
      portalByScenario,
    ).map((c) => ({
      ...c,
      runnable: Boolean(c.scenarioId && runnableByScenario.get(c.scenarioId)),
    }));
    const sceneCovered =
      businessFilter === 'all'
        ? sceneCategories.filter((s) => s.count > 0).length
        : all.length > 0
          ? 1
          : 0;
    return {
      projectCount: all.length,
      runnableCount: all.filter((p) => p.runnable).length,
      sceneCovered,
      sceneTotal: listVisibleBusinessScenarioCategories().length,
    };
  }, [
    kind,
    orgSelection,
    businessFilter,
    getEngagement,
    portalByScenario,
    runnableByScenario,
    sceneCategories,
    sceneCatalog,
  ]);

  const mssSkills = useMemo(() => {
    if (kind !== 'projects') return [] as PrototypeSkillSeed[];
    const ids = listFeaturedDoTaskSkillIds(skills, businessFilter, 64);
    const q = search.trim().toLowerCase();
    return ids
      .map((id) => skills.find((s) => s.id === id))
      .filter((s): s is PrototypeSkillSeed => Boolean(s))
      .filter((s) => canViewAsset(s, viewer))
      .filter((s) => skillMatchesOrgPerspectiveSelection(s, orgSelection))
      .filter((s) => {
        if (!q) return true;
        return `${s.name} ${s.desc} ${s.command ?? ''}`.toLowerCase().includes(q);
      });
  }, [kind, skills, businessFilter, search, viewer, orgSelection]);

  const skillSceneCategories = useMemo(() => {
    if (kind !== 'projects') return [];
    return listVisibleBusinessScenarioCategories().map((cat) => {
      const ids = listFeaturedDoTaskSkillIds(skills, cat.id, 64);
      const count = ids
        .map((id) => skills.find((s) => s.id === id))
        .filter((s): s is PrototypeSkillSeed => Boolean(s))
        .filter((s) => canViewAsset(s, viewer))
        .filter((s) => skillMatchesOrgPerspectiveSelection(s, orgSelection)).length;
      return { ...cat, count };
    });
  }, [kind, skills, viewer, orgSelection, sceneCatalog]);

  const skillHubStats = useMemo(() => {
    if (kind !== 'projects') return null;
    const covered =
      businessFilter === 'all'
        ? skillSceneCategories.filter((s) => s.count > 0).length
        : mssSkills.length > 0
          ? 1
          : 0;
    return {
      skillCount: mssSkills.length,
      sceneCovered: covered,
      sceneTotal: listVisibleBusinessScenarioCategories().length,
    };
  }, [kind, businessFilter, mssSkills, skillSceneCategories, sceneCatalog]);

  const skillCards = useMemo((): MarketShelfCardModel[] => {
    return mssSkills.map((s) => {
      const biz = resolveSkillBusinessScenario(s);
      const bizLabel = getSkillBusinessLabel(s);
      const badges: MarketShelfCardModel['badges'] = [];
      if (bizLabel) badges.push({ label: bizLabel, tone: 'dept' });
      if (s.ownerDeptIds?.[0]) {
        badges.push({ label: getDeptLabel(s.ownerDeptIds[0]), tone: 'dept' });
      }
      if (s.ownerRegionId) {
        badges.push({ label: getRegionLabel(s.ownerRegionId), tone: 'region' });
      }
      badges.push({ label: '场景技能', tone: 'type' });
      return {
        id: s.id,
        kind: 'internal',
        title: s.name,
        description: s.desc,
        icon: s.icon || 'fa-cube',
        badges,
        featured: true,
        heat: s.invokes ?? 0,
        hasHowto: false,
        runnable: Boolean(s.published && (s.instructions || s.command)),
        primaryAction: 'run',
        scenarioId: biz ?? undefined,
      };
    });
  }, [mssSkills]);

  const orgScopeLabel = useMemo(() => {
    const parts: string[] = [];
    if (orgSelection.dept[0]) parts.push(getDeptLabel(orgSelection.dept[0]));
    if (orgSelection.region[0]) parts.push(getRegionLabel(orgSelection.region[0]));
    return parts.join(' \u00b7 ') || '\u5168\u90e8';
  }, [orgSelection]);

  const featuredLimit = kind === 'external' ? 4 : 8;
  const { featured, rest } = splitFeaturedAndRest(cards, featuredLimit);
  const { featured: skillFeatured, rest: skillRest } = splitFeaturedAndRest(skillCards, 4);
  const showFeaturedStrip =
    kind !== 'internal' &&
    (kind === 'projects' && mssSurface === 'skills'
      ? skillFeatured.length > 0
      : featured.length > 0);
  const activeFeatured =
    kind === 'projects' && mssSurface === 'skills' ? skillFeatured : featured;

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
    if (!win) {
      showToast(
        '\u6d4f\u89c8\u5668\u62e6\u622a\u4e86\u5f39\u7a97\uff0c\u8bf7\u5141\u8bb8\u540e\u91cd\u8bd5',
      );
    } else {
      showToast(`\u5df2\u6253\u5f00\uff1a${card.title}`);
    }
    return true;
  };

  const executeProject = (bundle?: ScenarioBundle | null) => {
    if (!bundle || !onInvokeAgent || !onInvokeSkill || !onStartExpertTeam) return;
    const plan = resolveScenarioDemoPlan(bundle);
    if (!plan) {
      showToast(
        '\u6682\u65e0\u53ef\u6267\u884c\u6f14\u793a\uff0c\u8bf7\u5148\u67e5\u770b How to',
      );
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
    if (!guides.length) {
      showToast('\u6682\u65e0 How to\uff0c\u53ef\u5728\u95e8\u6237\u8fd0\u8425\u7ef4\u62a4');
    }
  };

  const openToolHowTo = (card: MarketShelfCardModel) => {
    const guides = guidesForTool(card.id);
    setHowTo({ title: card.title, guides });
    if (!guides.length) {
      showToast(
        `\u300c${card.title}\u300d\u6682\u65e0 How to\uff0c\u53ef\u5728\u95e8\u6237\u8fd0\u8425\u7ef4\u62a4`,
      );
    }
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

  const downloadUseProject = (card: MarketShelfCardModel) => {
    if (!card.scenarioId) return;
    const bundle = projectBundles.find((b) => b.id === card.scenarioId) ?? null;
    if (canRunProjects && card.runnable) {
      executeProject(bundle);
      return;
    }
    const items = portalByScenario(card.scenarioId);
    const label =
      FEATURED_SCENARIOS.find((s) => s.id === card.scenarioId)?.label ||
      bundle?.label ||
      card.title;
    const hasAnything =
      items.length > 0 ||
      Boolean(bundle?.env || getScenarioEnv(card.scenarioId)) ||
      (bundle?.agents.length ?? 0) +
        (bundle?.skills.length ?? 0) +
        (bundle?.tools.length ?? 0) +
        (bundle?.architectureDocs.length ?? 0) >
        0;
    if (!hasAnything) {
      openProjectHowTo(card);
      showToast(
        '\u8be5\u9879\u76ee\u6682\u65e0\u53ef\u4e0b\u8f7d\u5185\u5bb9\uff0c\u8bf7\u5148\u67e5\u770b How to',
      );
      return;
    }
    downloadScenarioUnifiedPack({
      scenarioId: card.scenarioId,
      scenarioLabel: label,
      learnItems: items,
      env: bundle?.env ?? getScenarioEnv(card.scenarioId),
      agents: bundle?.agents ?? [],
      skills: bundle?.skills ?? [],
      tools: bundle?.tools ?? [],
      architectureDocs: bundle?.architectureDocs ?? [],
      caseItems: items.filter((i) => i.type === 'case'),
    });
    items.forEach((i) => bumpDownload(i.id));
    rememberCard(card);
    showToast(`\u5df2\u4e0b\u8f7d How to \u5b66\u4e60\u5305\uff1a${card.title}`);
  };

  const runSkill = (skill: PrototypeSkillSeed) => {
    if (!onInvokeSkill || !canRunSkills) {
      downloadSkillFile(skill);
      showToast(`已下载技能包：${skill.name}`);
      return;
    }
    onInvokeSkill(skill);
    rememberCard({
      id: skill.id,
      kind: 'internal',
      title: skill.name,
      description: skill.desc,
      icon: skill.icon || 'fa-cube',
      badges: [],
      featured: true,
      heat: skill.invokes ?? 0,
      hasHowto: false,
      runnable: true,
      primaryAction: 'run',
    });
    showToast(`已启动技能：${skill.name}`);
  };

  const openPrimary = (card: MarketShelfCardModel) => {
    if (kind === 'projects' && mssSurface === 'skills') {
      const skill = skills.find((s) => s.id === card.id);
      if (skill) runSkill(skill);
      return;
    }
    if (card.kind === 'projects') {
      downloadUseProject(card);
      return;
    }
    if (openToolUrl(card)) return;
    openToolHowTo(card);
    if (!card.hasHowto) {
      showToast(`「${card.title}」暂无可用链接与 How to`);
    }
  };

  const emptyHint =
    search.trim() || !isOrgPerspectiveEmpty(orgSelection) || businessFilter !== 'all'
      ? '当前筛选下暂无内容。可重置左侧领域/区域、切换场景分类，或调整搜索关键词。'
      : '权限范围内暂无上架内容。若预期应可见，请联系运营确认可见性与上架状态。';

  const gridCards =
    kind === 'projects' && mssSurface === 'skills'
      ? showFeaturedStrip
        ? skillRest
        : skillCards
      : showFeaturedStrip
        ? rest
        : cards;

  const buildStatsTooltip = [buildStatsCopy.coverageBlurb, buildStatsCopy.goalBlurb]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="center-surface flex min-h-0 flex-1 flex-col overflow-y-auto scroll-hidden">
      <div className="mx-auto w-full max-w-7xl px-5 py-6 md:px-7">
        <header className="mb-5 rounded-2xl border border-zinc-200/80 bg-gradient-to-b from-zinc-50 to-white px-4 py-4 md:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-[20px] font-semibold tracking-tight text-zinc-900 md:text-[22px]">
                {meta.label}
              </h1>
              <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-zinc-500 md:text-[13px]">
                {kind === 'projects'
                  ? mssSurface === 'skills'
                    ? '场景技能 · 按业务场景筛选 · 使用或下载技能包'
                    : '场景案例 · How to 上手 · 可执行打样 · 详情可下载学习包'
                  : kind === 'external'
                    ? '按 AI 能力浏览精选外链工具 · How to 快速上手'
                    : '公司办公工具 · 权限范围可见 · How to 上手'}
              </p>
              {kind === 'external' ? (
                <p className="mt-1.5 max-w-2xl text-[11px] leading-relaxed text-amber-800/80">
                  <i className="fa-solid fa-shield-halved mr-1 text-[10px]" />
                  使用外部工具时请遵守公司信息安全规范，勿上传敏感或未授权数据。
                </p>
              ) : null}
              {kind === 'projects' ? (
                <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                  <div className="inline-flex h-9 w-fit items-center rounded-xl border border-zinc-200 bg-zinc-50/80 p-1">
                    {(
                      [
                        { id: 'projects' as const, label: '场景案例' },
                        { id: 'skills' as const, label: '场景技能' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setMssSurface(tab.id)}
                        className={cn(
                          'inline-flex h-full items-center rounded-lg px-3.5 text-[12px] font-semibold transition',
                          mssSurface === tab.id
                            ? 'bg-white text-zinc-900 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-800',
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  {(mssSurface === 'skills' ? skillHubStats : hubStats) ? (
                    <div className="inline-flex h-9 max-w-full flex-wrap items-center gap-x-2.5 gap-y-0 rounded-xl border border-zinc-200/90 bg-white px-3 text-[12px] text-zinc-600">
                      <span className="inline-flex items-center gap-1 font-semibold tracking-tight text-zinc-800">
                        {buildStatsCopy.title}
                        {buildStatsTooltip ? (
                          <span className="group relative inline-flex">
                            <button
                              type="button"
                              aria-label="建设概况口径说明"
                              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-zinc-400 transition hover:text-zinc-700"
                            >
                              <i className="fa-solid fa-circle-info text-[11px]" />
                            </button>
                            <span
                              role="tooltip"
                              className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left text-[11px] font-normal leading-relaxed text-zinc-600 opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100 sm:left-1/2 sm:-translate-x-1/2 md:w-72"
                            >
                              {buildStatsTooltip}
                            </span>
                          </span>
                        ) : null}
                      </span>
                      <span className="text-zinc-300">·</span>
                      <span className="text-zinc-400">{orgScopeLabel}</span>
                      {mssSurface === 'skills' && skillHubStats ? (
                        <>
                          <span className="text-zinc-300">·</span>
                          <span>
                            <span className="font-semibold tabular-nums text-zinc-900">
                              {skillHubStats.skillCount}
                            </span>{' '}
                            技能
                          </span>
                          {showSceneHub ? (
                            <>
                              <span className="text-zinc-300">·</span>
                              <span>
                                <span className="font-semibold tabular-nums text-zinc-900">
                                  {skillHubStats.sceneCovered}
                                </span>
                                <span className="text-zinc-400">/{skillHubStats.sceneTotal}</span>{' '}
                                场景
                              </span>
                            </>
                          ) : null}
                        </>
                      ) : hubStats ? (
                        <>
                          <span className="text-zinc-300">·</span>
                          <span>
                            <span className="font-semibold tabular-nums text-zinc-900">
                              {hubStats.projectCount}
                            </span>{' '}
                            案例
                          </span>
                          <span className="text-zinc-300">·</span>
                          <span>
                            <span className="font-semibold tabular-nums text-zinc-900">
                              {hubStats.runnableCount}
                            </span>{' '}
                            可执行
                          </span>
                          {showSceneHub ? (
                            <>
                              <span className="text-zinc-300">·</span>
                              <span>
                                <span className="font-semibold tabular-nums text-zinc-900">
                                  {hubStats.sceneCovered}
                                </span>
                                <span className="text-zinc-400">/{hubStats.sceneTotal}</span>{' '}
                                场景
                              </span>
                            </>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
              <MarketShelfFilterBar className="min-w-0 flex-1 sm:min-w-[240px] lg:w-[280px] lg:flex-none" />
              {canSubmit ? (
                <button
                  type="button"
                  onClick={() => setSubmitOpen(true)}
                  className="shrink-0 rounded-xl bg-zinc-900 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-zinc-800"
                >
                  {kind === 'projects'
                    ? mssSurface === 'skills'
                      ? '提报技能'
                      : '提报案例'
                    : '提报工具'}
                </button>
              ) : null}
            </div>
          </div>
        </header>

        {kind === 'external' ? (
          <div className="mb-6 flex justify-center px-1">
            <div className="inline-flex min-h-[64px] max-w-full flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-zinc-200/80 bg-white px-5 py-3.5 shadow-[0_8px_24px_-20px_rgba(24,24,27,0.35)] md:min-h-[72px] md:gap-3 md:px-8 md:py-4">
              <button
                type="button"
                onClick={() => setAiCategory('all')}
                className={cn(
                  'rounded-xl px-4 py-2.5 text-[14px] font-semibold transition md:text-[15px]',
                  aiCategory === 'all'
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                )}
              >
                全部
              </button>
              {AI_TOOL_NAV_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.blurb}
                  onClick={() => setAiCategory(c.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold transition md:text-[15px]',
                    aiCategory === c.id
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                  )}
                >
                  <i className={cn('fa-solid text-[13px]', c.icon)} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {showMssSceneChips ? (
          <div className="mb-6 flex justify-center px-1">
            <div className="inline-flex min-h-[64px] max-w-full flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-zinc-200/80 bg-white px-5 py-3.5 shadow-[0_8px_24px_-20px_rgba(24,24,27,0.35)] md:min-h-[72px] md:gap-3 md:px-8 md:py-4">
              <button
                type="button"
                onClick={() => setBusinessFilter('all')}
                className={cn(
                  'rounded-xl px-4 py-2.5 text-[14px] font-semibold transition md:text-[15px]',
                  businessFilter === 'all'
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                )}
              >
                全部
              </button>
              {(mssSurface === 'skills' ? skillSceneCategories : sceneCategories).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.blurb}
                  onClick={() => setBusinessFilter(c.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold transition md:text-[15px]',
                    businessFilter === c.id
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                  )}
                >
                  {c.icon ? <i className={cn('fa-solid text-[13px]', c.icon)} /> : null}
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {showFeaturedStrip ? (
          <section className="mb-7">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-[13px] font-semibold text-zinc-800">精选推荐</h2>
              <span className="text-[11px] text-zinc-400">{activeFeatured.length} 项</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {activeFeatured.map((c) => {
                if (kind === 'projects' && mssSurface === 'skills') {
                  const skill = skills.find((s) => s.id === c.id);
                  return (
                    <MarketShelfCard
                      key={`hot-${c.id}`}
                      card={c}
                      primaryLabel={canRunSkills ? '使用' : '下载'}
                      howToLabel="下载"
                      onOpen={() => skill && setSkillDetail(skill)}
                      onPrimary={() => openPrimary(c)}
                      onHowTo={
                        skill
                          ? () => {
                              downloadSkillFile(skill);
                              showToast(`已下载技能包：${skill.name}`);
                            }
                          : undefined
                      }
                    />
                  );
                }
                return (
                  <MarketShelfCard
                    key={`hot-${c.id}`}
                    card={c}
                    onOpen={() => openCard(c)}
                    onPrimary={() => openPrimary(c)}
                    onHowTo={() => openHowTo(c)}
                  />
                );
              })}
            </div>
          </section>
        ) : null}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-zinc-800">
              {showFeaturedStrip ? '更多' : '全部'}
              <span className="ml-1.5 font-normal text-zinc-400">{gridCards.length}</span>
            </h2>
          </div>
          {gridCards.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {gridCards.map((c) => {
                if (kind === 'projects' && mssSurface === 'skills') {
                  const skill = skills.find((s) => s.id === c.id);
                  return (
                    <MarketShelfCard
                      key={c.id}
                      card={c}
                      primaryLabel={canRunSkills ? '使用' : '下载'}
                      howToLabel="下载"
                      onOpen={() => skill && setSkillDetail(skill)}
                      onPrimary={() => openPrimary(c)}
                      onHowTo={
                        skill
                          ? () => {
                              downloadSkillFile(skill);
                              showToast(`已下载技能包：${skill.name}`);
                            }
                          : undefined
                      }
                    />
                  );
                }
                return (
                  <MarketShelfCard
                    key={c.id}
                    card={c}
                    onOpen={() => openCard(c)}
                    onPrimary={() => openPrimary(c)}
                    onHowTo={() => openHowTo(c)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-14 text-center text-[13px] text-zinc-400">
              {emptyHint}
            </div>
          )}
        </section>
      </div>

      <MarketSubmitModal
        kind={kind}
        open={
          submitOpen &&
          kind !== 'projects'
        }
        onClose={() => setSubmitOpen(false)}
      />
      <CaseEditorModal
        target={
          submitOpen && kind === 'projects' && mssSurface === 'projects'
            ? 'new'
            : null
        }
        variant="submit"
        defaultType="case"
        defaultBusinessId={caseSubmitDefaultBusinessId}
        onClose={() => setSubmitOpen(false)}
      />      <MarketSkillSubmitModal
        open={submitOpen && kind === 'projects' && mssSurface === 'skills'}
        onClose={() => setSubmitOpen(false)}
      />

      {skillDetail ? (
        <CenterModal
          open
          title={skillDetail.name}
          onClose={() => setSkillDetail(null)}
          size="md"
          actions={
            <>
              <button
                type="button"
                onClick={() => {
                  downloadSkillFile(skillDetail);
                  showToast(`已下载技能包：${skillDetail.name}`);
                }}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium"
              >
                下载技能包
              </button>
              {canRunSkills ? (
                <button
                  type="button"
                  onClick={() => {
                    const s = skillDetail;
                    setSkillDetail(null);
                    runSkill(s);
                  }}
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white"
                >
                  使用
                </button>
              ) : null}
            </>
          }
        >
          <div className="space-y-3 text-left">
            <p className="text-[13px] leading-relaxed text-zinc-600">{skillDetail.desc}</p>
            <div className="flex flex-wrap gap-1.5">
              {getSkillBusinessLabel(skillDetail) ? (
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
                  {getSkillBusinessLabel(skillDetail)}
                </span>
              ) : null}
              {skillDetail.command ? (
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-500">
                  {skillDetail.command}
                </span>
              ) : null}
            </div>
          </div>
        </CenterModal>
      ) : null}

      {howTo ? (
        <HowToDrawer
          title={howTo.title}
          subtitle={
            kind === 'projects'
              ? '学习包 · 案例 / 教程 / 架构说明'
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
        size="fullscreen"
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
                    showcaseBundle?.label ||
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
              onClick={() => {
                if (!showcaseId) return;
                const card: MarketShelfCardModel = {
                  id: showcaseId,
                  kind: 'projects',
                  title:
                    FEATURED_SCENARIOS.find((s) => s.id === showcaseId)?.label ||
                    showcaseBundle?.label ||
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
                downloadUseProject(card);
              }}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-zinc-800"
            >
              {'\u4e0b\u8f7d\u4f7f\u7528'}
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
          <ProjectDocsGallery
            items={showcaseItems}
            initialItemId={showcaseItems[0]?.id}
            className="h-full"
          />
        ) : null}
      </CenterModal>
    </div>
  );
}
