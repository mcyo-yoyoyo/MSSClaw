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
import { skillDisplayName, skillTechnicalName } from '@/domain/skillDisplay';
import { getDeptLabel, getRegionLabel } from '@/domain/orgTaxonomy';
import { canViewAsset } from '@/domain/assetVisibility';
import { downloadSkillFile } from '@/domain/skillExport';
import { MarketSkillDetailModal } from '@/features/market/MarketSkillDetailModal';
import { useMssBuildStatsCopyStore } from '@/stores/mssBuildStatsCopyStore';
import {
  type ExternalFilterMode,
  type ExternalToolTypeId,
  type ExternalWorkSceneId,
} from '@/domain/externalToolTaxonomy';
import {
  listVisibleExternalToolTypes,
  listVisibleExternalWorkScenes,
  toolMatchesExternalSceneCatalog,
  toolMatchesExternalTypeCatalog,
} from '@/domain/externalTaxonomyCatalog';
import { useExternalTaxonomyCatalogStore } from '@/stores/externalTaxonomyCatalogStore';
import { openMarketToolDetail } from '@/domain/openHomeJourney';
import { MarketShelfCard } from '@/components/market/MarketShelfCard';
import { PageCanvas } from '@/components/layout/PageCanvas';
import { PageStageHero } from '@/components/layout/PageStageHero';
import { ExternalMarketFilters } from '@/components/market/ExternalMarketFilters';
import { InternalOfficeSceneGrid } from '@/components/market/InternalOfficeSceneGrid';
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
  preferAgentHubFeaturedOrder,
  withAgentHubCasePreview,
} from '@/domain/agentHubCasePresets';
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
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { allowsMarketScenarioRun } from '@/domain/marketRunCapability';

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
  const engagementById = useContentEngagementStore((s) => s.byId);
  const bumpDownload = useContentEngagementStore((s) => s.bumpDownload);
  const bumpUse = useContentEngagementStore((s) => s.bumpUse);
  const guideRecords = usePlazaToolGuideStore((s) => s.records);
  const featuredPins = useMarketFeaturedStore((s) => s.pins);
  const externalTaxonomy = useExternalTaxonomyCatalogStore((s) => s.catalog);
  const hydrateFeaturedPins = useMarketFeaturedStore((s) => s.hydrate);

  const [showcaseId, setShowcaseId] = useState<string | null>(null);
  const [howTo, setHowTo] = useState<{ title: string; guides: PlazaToolGuide[] } | null>(null);
  const [guidePreview, setGuidePreview] = useState<PlazaToolGuide | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [externalFilterMode, setExternalFilterMode] = useState<ExternalFilterMode>('scene');
  const [externalScene, setExternalScene] = useState<ExternalWorkSceneId | 'all'>('all');
  const [externalType, setExternalType] = useState<ExternalToolTypeId | 'all'>('all');
  /** MSS 集市二级面：Skill Hub | Agent Hub（默认 Skill Hub） */
  const [mssSurface, setMssSurface] = useState<'projects' | 'skills'>('skills');
  const [skillDetail, setSkillDetail] = useState<PrototypeSkillSeed | null>(null);

  const caseSubmitDefaultBusinessId =
    kind === 'projects' && businessFilter !== 'all' ? businessFilter : undefined;
  const buildStatsCopy = useMssBuildStatsCopyStore((s) => s.copy);
  const hydrateBuildStatsCopy = useMssBuildStatsCopyStore((s) => s.hydrate);

  const canSubmit = canExecuteChat(user?.platformRole);
  const navPreset = useNavPresentationStore((s) => s.preset);
  const allowScenarioRun = allowsMarketScenarioRun(navPreset);
  const canRunProjects =
    kind === 'projects' &&
    allowScenarioRun &&
    canSubmit &&
    Boolean(onInvokeSkill && onInvokeAgent && onStartExpertTeam);
  const canRunSkills =
    kind === 'projects' && allowScenarioRun && canSubmit && Boolean(onInvokeSkill);

  useEffect(() => {
    ensurePlazaToolGuidesBootstrapped();
    hydrateFeaturedPins();
    useBusinessScenarioCatalogStore.getState().hydrate();
    hydrateBuildStatsCopy();
  }, [hydrateFeaturedPins, hydrateBuildStatsCopy]);

  useEffect(() => {
    setExternalFilterMode('scene');
    setExternalScene('all');
    setExternalType('all');
    setMssSurface('skills');
  }, [kind]);

  /** 运营隐藏类型/场景后，清除已失效的筛选态 */
  useEffect(() => {
    if (kind !== 'external') return;
    const scenes = listVisibleExternalWorkScenes(externalTaxonomy);
    if (
      externalScene !== 'all' &&
      !scenes.some((s) => s.id === externalScene)
    ) {
      setExternalScene('all');
    }
    const types = listVisibleExternalToolTypes(externalTaxonomy);
    if (externalType !== 'all' && !types.some((t) => t.id === externalType)) {
      setExternalType('all');
    }
  }, [kind, externalTaxonomy, externalScene, externalType]);

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
            const runnable =
              canRunProjects && Boolean(c.scenarioId && runnableByScenario.get(c.scenarioId));
            return {
              ...c,
              runnable,
              primaryAction: 'detail' as MarketShelfCardModel['primaryAction'],
            };
          })
        : listMarketToolCards(tools, kind, viewer, listOrg, listBusiness, eng, howtoToolIds);

    let working = raw;
    if (kind === 'external') {
      if (externalFilterMode === 'scene') {
        working = working.filter((c) =>
          toolMatchesExternalSceneCatalog(
            { id: c.id, toolTypeId: c.toolTypeId },
            externalScene === 'all' ? 'all' : externalScene,
            externalTaxonomy,
          ),
        );
      } else {
        working = working.filter((c) =>
          toolMatchesExternalTypeCatalog(c.toolTypeId, externalType),
        );
      }
    }

    const pinned =
      kind === 'internal'
        ? working.map((c) => ({ ...c, featured: false }))
        : applyMarketFeaturedPins(working, featuredPins[kind] ?? []);

    const ordered =
      kind === 'projects' && !(featuredPins.projects?.length)
        ? preferAgentHubFeaturedOrder(pinned)
        : pinned;

    const q = search.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.productName?.toLowerCase().includes(q) ?? false) ||
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
    externalFilterMode,
    externalScene,
    externalType,
    externalTaxonomy,
    getEngagement,
    engagementById,
    howtoToolIds,
    portalByScenario,
    runnableByScenario,
    canRunProjects,
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
      );
      return {
        ...cat,
        count: projects.length,
      };
    });
  }, [kind, orgSelection, getEngagement, portalByScenario, sceneCatalog]);

  const hubStats = useMemo(() => {
    if (kind !== 'projects') return null;
    const eng = (id: string) => getEngagement(id);
    const all = listMarketProjectCards(
      orgSelection,
      businessFilter === 'all' ? 'all' : businessFilter,
      eng,
      portalByScenario,
    );
    const sceneCovered =
      businessFilter === 'all'
        ? sceneCategories.filter((s) => s.count > 0).length
        : all.length > 0
          ? 1
          : 0;
    return {
      projectCount: all.length,
      sceneCovered,
      sceneTotal: listVisibleBusinessScenarioCategories().length,
    };
  }, [
    kind,
    orgSelection,
    businessFilter,
    getEngagement,
    portalByScenario,
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
      const eng = getEngagement(s.id);
      const badges: MarketShelfCardModel['badges'] = [];
      if (bizLabel) badges.push({ label: bizLabel, tone: 'dept' });
      if (s.ownerDeptIds?.[0]) {
        badges.push({ label: getDeptLabel(s.ownerDeptIds[0]), tone: 'dept' });
      }
      if (s.ownerRegionId) {
        badges.push({ label: getRegionLabel(s.ownerRegionId), tone: 'region' });
      }
      badges.push({ label: 'Skill', tone: 'type' });
      return {
        id: s.id,
        kind: 'projects',
        title: skillDisplayName(s),
        description: (s.desc || '').replace(/^【[^】]+】/, '').trim(),
        productName: skillTechnicalName(s),
        icon: s.icon || 'fa-cube',
        badges,
        featured: true,
        heat: s.invokes ?? 0,
        likes: eng.likes,
        downloads: eng.downloads,
        hasHowto: Boolean(s.instructions || s.command),
        runnable: canRunSkills && Boolean(s.published && (s.instructions || s.command)),
        primaryAction: 'detail',
        scenarioId: biz ?? undefined,
      };
    });
  }, [mssSkills, canRunSkills, getEngagement, engagementById]);

  const orgScopeLabel = useMemo(() => {
    const parts: string[] = [];
    if (orgSelection.dept[0]) parts.push(getDeptLabel(orgSelection.dept[0]));
    if (orgSelection.region[0]) parts.push(getRegionLabel(orgSelection.region[0]));
    return parts.join(' \u00b7 ') || '\u5168\u90e8';
  }, [orgSelection]);

  const featuredLimit = kind === 'external' ? 12 : 8;
  const { featured, rest } = splitFeaturedAndRest(cards, featuredLimit);
  const { featured: skillFeatured, rest: skillRest } = splitFeaturedAndRest(skillCards, 4);
  const showFeaturedStrip =
    kind !== 'internal' &&
    (kind === 'projects' && mssSurface === 'skills'
      ? skillFeatured.length > 0
      : featured.length > 0);
  const activeFeatured =
    kind === 'projects' && mssSurface === 'skills' ? skillFeatured : featured;

  const externalFeaturedOverseas = useMemo(
    () =>
      kind === 'external'
        ? activeFeatured.filter((c) => c.region === 'overseas').slice(0, 6)
        : [],
    [kind, activeFeatured],
  );
  const externalFeaturedDomestic = useMemo(
    () =>
      kind === 'external'
        ? activeFeatured.filter((c) => c.region === 'domestic').slice(0, 6)
        : [],
    [kind, activeFeatured],
  );

  const externalFilterStats = useMemo(() => {
    if (kind !== 'external') return { total: 0, overseas: 0, domestic: 0 };
    return {
      total: cards.length,
      overseas: cards.filter((c) => c.region === 'overseas').length,
      domestic: cards.filter((c) => c.region === 'domestic').length,
    };
  }, [kind, cards]);

  const showcaseBundle = useMemo(() => {
    if (!showcaseId) return null;
    return projectBundles.find((b) => b.id === showcaseId) ?? null;
  }, [showcaseId, projectBundles]);

  const showcaseDemoPlan = useMemo(
    () => (showcaseBundle ? resolveScenarioDemoPlan(showcaseBundle) : null),
    [showcaseBundle],
  );

  const showcaseItems = useMemo(() => {
    if (!showcaseId) return [];
    return withAgentHubCasePreview(showcaseId, resolveCaseItemsForScenarioId(showcaseId));
  }, [showcaseId]);

  const rememberCard = (card: MarketShelfCardModel) => {
    pushRecent({
      id: card.id,
      kind: card.kind,
      title: card.title,
      icon: card.icon,
      logoUrl: card.logoUrl,
    });
  };

  const trackToolClick = (id: string) => {
    bumpUse(id);
  };

  const openToolUrl = (card: MarketShelfCardModel) => {
    if (!card.homepageUrl || card.homepageUrl === '#') return false;
    const win = window.open(card.homepageUrl, '_blank', 'noopener,noreferrer');
    bumpToolInvokes(card.id);
    trackToolClick(card.id);
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
        '\u6682\u65e0\u53ef\u6267\u884c\u6f14\u793a\uff0c\u8bf7\u5148\u67e5\u770b\u5feb\u901f\u4e0a\u624b',
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
      showToast('\u6682\u65e0\u5feb\u901f\u4e0a\u624b\u6750\u6599\uff0c\u53ef\u5728\u95e8\u6237\u8fd0\u8425\u7ef4\u62a4');
    }
  };

  const openToolHowTo = (card: MarketShelfCardModel) => {
    trackToolClick(card.id);
    rememberCard(card);
    openMarketToolDetail(card.id, kind === 'projects' ? 'external' : kind, { tab: 'howto' });
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
    trackToolClick(card.id);
    rememberCard(card);
    openMarketToolDetail(card.id, kind === 'projects' ? 'external' : kind);
  };

  const openInternalToolDetail = (
    tool: { id: string; name: string; logoUrl?: string },
    tab?: 'overview' | 'howto',
  ) => {
    const catalog = tools.find((t) => t.id === tool.id);
    // 员工助手下载页允许在主数据暂缺时仍按 id 打开（场景预留入口）
    const allowAssistantFallback = tool.id === 'tool-hw-assistant';
    if ((!catalog || catalog.published === false) && !allowAssistantFallback) {
      showToast('该工具主数据不存在或已下架');
      return;
    }
    trackToolClick(tool.id);
    pushRecent({
      id: tool.id,
      kind: 'internal',
      title: catalog?.name?.trim() || tool.name,
      icon: 'fa-cube',
      logoUrl: tool.logoUrl || catalog?.logoUrl,
    });
    openMarketToolDetail(tool.id, 'internal', tab ? { tab } : undefined);
  };

  const downloadUseProject = (card: MarketShelfCardModel) => {
    if (!card.scenarioId) return;
    const bundle = projectBundles.find((b) => b.id === card.scenarioId) ?? null;
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
      showToast('该项目暂无可下载内容，请先查看快速上手');
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
    showToast(`已下载学习包：${card.title}`);
  };

  const runProjectDemo = (card: MarketShelfCardModel) => {
    if (!canRunProjects || !card.scenarioId) {
      downloadUseProject(card);
      return;
    }
    const bundle = projectBundles.find((b) => b.id === card.scenarioId) ?? null;
    if (!bundle || !resolveScenarioDemoPlan(bundle)) {
      showToast('暂无可执行打样链路，已改为下载学习包');
      downloadUseProject(card);
      return;
    }
    executeProject(bundle);
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
      kind: 'projects',
      title: skill.name,
      description: skill.desc,
      icon: skill.icon || 'fa-cube',
      badges: [],
      featured: true,
      heat: skill.invokes ?? 0,
      hasHowto: true,
      runnable: true,
      primaryAction: 'detail',
    });
    showToast(`已启动技能：${skill.name}`);
  };

  const openPrimary = (card: MarketShelfCardModel) => {
    if (kind === 'projects' && mssSurface === 'skills') {
      const skill = skills.find((s) => s.id === card.id);
      if (!skill) return;
      if (canRunSkills) {
        runSkill(skill);
        return;
      }
      downloadSkillFile(skill);
      showToast(`已下载技能包：${skill.name}`);
      return;
    }
    if (card.kind === 'projects') {
      if (canRunProjects) {
        runProjectDemo(card);
        return;
      }
      downloadUseProject(card);
      return;
    }
    if (openToolUrl(card)) return;
    openToolHowTo(card);
    if (!card.hasHowto) {
      showToast(`「${card.title}」暂无可用链接与快速上手材料`);
    }
  };

  /** 标准/完整：案例主按钮一律「去打样」；MVP 为「下载」 */
  const casePrimaryLabel = canRunProjects ? '去打样' : '下载';
  const skillPrimaryLabel = canRunSkills ? '去执行' : '下载';

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

  const restOverseas =
    kind === 'external' ? gridCards.filter((c) => c.region === 'overseas') : [];
  const restDomestic =
    kind === 'external' ? gridCards.filter((c) => c.region === 'domestic') : [];

  const buildStatsTooltip = [buildStatsCopy.coverageBlurb, buildStatsCopy.goalBlurb]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cn(
        'center-surface flex min-h-0 flex-1 flex-col',
        kind === 'internal' ? 'overflow-hidden' : 'overflow-y-auto scroll-hidden',
      )}
    >
      <PageCanvas
        className={cn(
          'flex flex-col py-6',
          kind === 'internal' && 'min-h-0 flex-1',
        )}
      >
        <PageStageHero
          className="mb-5 shrink-0"
          tone={kind === 'projects' ? 'projects' : kind}
          title={meta.label}
          subtitle={
            kind === 'projects'
              ? mssSurface === 'skills'
                ? allowScenarioRun
                  ? 'Skill Hub · 快速上手 / 去执行 · 亦可下载技能包'
                  : 'Skill Hub · 快速上手 / 下载技能包'
                : allowScenarioRun
                  ? 'Agent Hub · 快速上手 / 可执行则去打样 · 否则下载学习包'
                  : 'Agent Hub · 快速上手 / 下载学习包'
              : kind === 'external'
                ? '从工作场景出发，浏览全球领先 AI · 海外 / 国内精选对照 · 快速上手'
                : '不用先学会复杂工具，从「记、读、写、问」等日常动作开始'
          }
          tip={
            kind === 'external' ? (
              <>
                <i className="fa-solid fa-shield-halved mr-1 text-[10px]" />
                外部工具为第三方服务，内网请勿输入涉密或未授权数据，请遵从公司规定使用。
              </>
            ) : kind === 'projects' ? (
              <>
                <i className="fa-solid fa-circle-info mr-1 text-[10px]" />
                {allowScenarioRun
                  ? '当前方案支持一键打样与对话执行，亦可下载学习包自学。'
                  : 'MVP 版本 Skill Hub、Agent Hub 仅提供下载学习；长期规划平台可一键打样与对话执行。'}
              </>
            ) : (
              <>
                <i className="fa-solid fa-building-lock mr-1 text-[10px]" />
                公司内部工具需经组织统一入口访问；请在授权范围内使用，勿将敏感业务数据外传。
              </>
            )
          }
        >
          <div className="flex h-full w-full flex-col justify-center gap-2 sm:flex-row sm:items-center">
            <MarketShelfFilterBar className="min-w-0 flex-1 sm:min-w-[220px]" />
            {canSubmit && (kind === 'external' || kind === 'internal') ? (
              <button
                type="button"
                onClick={() => setSubmitOpen(true)}
                className="shrink-0 rounded-xl bg-[#1d1d1f] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#2c2c2e]"
              >
                提报工具
              </button>
            ) : null}
            {canSubmit && kind === 'projects' && mssSurface === 'skills' ? (
              <button
                type="button"
                onClick={() => setSubmitOpen(true)}
                className="shrink-0 rounded-xl bg-[#1d1d1f] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#2c2c2e]"
              >
                提报 Skill
              </button>
            ) : null}
            {canSubmit && kind === 'projects' && mssSurface === 'projects' ? (
              <button
                type="button"
                onClick={() => setSubmitOpen(true)}
                className="shrink-0 rounded-xl bg-[#1d1d1f] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#2c2c2e]"
              >
                提报案例
              </button>
            ) : null}
          </div>
        </PageStageHero>

        {kind === 'external' ? (
          <ExternalMarketFilters
            mode={externalFilterMode}
            scene={externalScene}
            type={externalType}
            stats={externalFilterStats}
            onModeChange={setExternalFilterMode}
            onSceneChange={setExternalScene}
            onTypeChange={setExternalType}
          />
        ) : null}

        {kind === 'projects' ? (
          <div className="mb-2.5 flex flex-wrap items-center justify-center gap-2.5 px-1">
            <div className="market-mode-switch market-mode-switch--mss" role="tablist" aria-label="MSS 集市面">
              {(
                [
                  { id: 'skills' as const, label: 'Skill Hub' },
                  { id: 'projects' as const, label: 'Agent Hub' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={mssSurface === tab.id}
                  onClick={() => setMssSurface(tab.id)}
                  className={cn(
                    'market-mode-switch__btn md:text-[15px]',
                    mssSurface === tab.id && 'is-active',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {(mssSurface === 'skills' ? skillHubStats : hubStats) ? (
              <div className="market-stats-pill md:text-[13px]">
                <span className="inline-flex items-center gap-1 font-semibold tracking-tight text-[#1d1d1f]">
                  {buildStatsCopy.title}
                  {buildStatsTooltip ? (
                    <span className="group relative inline-flex">
                      <button
                        type="button"
                        aria-label="建设概况口径说明"
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[#86868b] transition hover:text-[#1d1d1f]"
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
                <span className="text-[#d4d4d8]">·</span>
                <span className="text-[#86868b]">{orgScopeLabel}</span>
                {mssSurface === 'skills' && skillHubStats ? (
                  <>
                    <span className="text-zinc-300">·</span>
                    <span>
                      <span className="text-[15px] font-semibold tabular-nums leading-none text-zinc-900 md:text-[16px]">
                        {skillHubStats.skillCount}
                      </span>{' '}
                      技能
                    </span>
                    {showSceneHub ? (
                      <>
                        <span className="text-zinc-300">·</span>
                        <span>
                          <span className="text-[15px] font-semibold tabular-nums leading-none text-zinc-900 md:text-[16px]">
                            {skillHubStats.sceneCovered}
                          </span>
                          <span className="text-zinc-400">/{skillHubStats.sceneTotal}</span> 场景
                        </span>
                      </>
                    ) : null}
                  </>
                ) : hubStats ? (
                  <>
                    <span className="text-zinc-300">·</span>
                    <span>
                      <span className="text-[15px] font-semibold tabular-nums leading-none text-zinc-900 md:text-[16px]">
                        {hubStats.projectCount}
                      </span>{' '}
                      案例
                    </span>
                    {showSceneHub ? (
                      <>
                        <span className="text-zinc-300">·</span>
                        <span>
                          <span className="text-[15px] font-semibold tabular-nums leading-none text-zinc-900 md:text-[16px]">
                            {hubStats.sceneCovered}
                          </span>
                          <span className="text-zinc-400">/{hubStats.sceneTotal}</span> 场景
                        </span>
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {showMssSceneChips ? (
          <div className="mb-5 w-full px-1">
            <div className="market-chip-rail" role="tablist" aria-label="业务场景">
              <button
                type="button"
                onClick={() => setBusinessFilter('all')}
                className={cn(
                  'market-chip-rail__btn',
                  businessFilter === 'all' && 'is-active',
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
                    'market-chip-rail__btn',
                    businessFilter === c.id && 'is-active',
                  )}
                >
                  {c.icon ? <i className={cn('fa-solid hidden text-[10px] sm:inline', c.icon)} /> : null}
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {kind === 'internal' ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <InternalOfficeSceneGrid
              search={search}
              catalogTools={tools}
              onOpenDetail={(tool) => openInternalToolDetail(tool)}
              onHowTo={(tool) => openInternalToolDetail(tool, 'howto')}
              onEmptyAction={(scene) =>
                showToast(`「${scene.label}」暂无已发布工具，请运营完成绑定`)
              }
              onExperience={(tool) => {
                if (!tool.homepageUrl || tool.homepageUrl === '#') {
                  showToast('暂无可用链接，请查看快速上手');
                  openInternalToolDetail(tool, 'howto');
                  return;
                }
                trackToolClick(tool.id);
                pushRecent({
                  id: tool.id,
                  kind: 'internal',
                  title: tool.name,
                  icon: 'fa-cube',
                  logoUrl: tool.logoUrl,
                });
                const win = window.open(tool.homepageUrl, '_blank', 'noopener,noreferrer');
                bumpToolInvokes(tool.id);
                if (!win) showToast('浏览器拦截了弹窗，请允许后重试');
                else showToast(`已打开：${tool.name}`);
              }}
            />
          </div>
        ) : null}

        {kind !== 'internal' && showFeaturedStrip ? (
          <section className="mb-7">
            {kind === 'external' ? (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  {(
                    [
                      {
                        key: 'overseas',
                        title: '海外精选',
                        sub: 'GLOBAL TOP 6',
                        items: externalFeaturedOverseas,
                      },
                      {
                        key: 'domestic',
                        title: '国内精选',
                        sub: 'CHINA TOP 6',
                        items: externalFeaturedDomestic,
                      },
                    ] as const
                  ).map((col) => (
                    <div
                      key={col.key}
                      className={cn(
                        'min-w-0',
                        col.key === 'overseas' ? 'market-rail-stage--overseas' : 'market-rail-stage--domestic',
                      )}
                    >
                      <div className="mb-3 flex items-baseline justify-between gap-2 px-0.5">
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-[18px] font-semibold tracking-tight text-[#1d1d1f]">
                            {col.title}
                          </h3>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#86868b]">
                            {col.sub}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {col.items.map((c) => (
                          <MarketShelfCard
                            key={`hot-${c.id}`}
                            card={c}
                            variant="compact"
                            showHot
                            howToLabel="快速上手"
                            onOpen={() => openCard(c)}
                            onPrimary={() => openPrimary(c)}
                            onHowTo={() => openHowTo(c)}
                          />
                        ))}
                      </div>
                      {!col.items.length ? (
                        <div className="rounded-xl border border-dashed border-black/10 bg-white/50 px-3 py-8 text-center text-[12px] text-[#86868b]">
                          当前筛选下暂无
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <h2 className="text-[15px] font-semibold tracking-tight text-[#1d1d1f]">精选推荐</h2>
                  <span className="text-[12px] text-[#86868b]">{activeFeatured.length} 项</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {activeFeatured.map((c) => {
                    if (kind === 'projects' && mssSurface === 'skills') {
                      const skill = skills.find((s) => s.id === c.id);
                      return (
                        <MarketShelfCard
                          key={`hot-${c.id}`}
                          card={c}
                          showHot
                          primaryLabel={skillPrimaryLabel}
                          howToLabel="快速上手"
                          onOpen={() => skill && setSkillDetail(skill)}
                          onPrimary={() => openPrimary(c)}
                          onHowTo={skill ? () => setSkillDetail(skill) : undefined}
                        />
                      );
                    }
                    return (
                      <MarketShelfCard
                        key={`hot-${c.id}`}
                        card={c}
                        showHot
                        primaryLabel={kind === 'projects' ? casePrimaryLabel : undefined}
                        onOpen={() => openCard(c)}
                        onPrimary={() => openPrimary(c)}
                        onHowTo={() => openHowTo(c)}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </section>
        ) : null}

        {kind !== 'internal' ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold tracking-tight text-[#1d1d1f]">
              {showFeaturedStrip ? '更多' : '全部'}
              <span className="ml-1.5 font-normal text-[#86868b]">{gridCards.length}</span>
            </h2>
          </div>
          {kind === 'external' ? (
            gridCards.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {(
                  [
                    {
                      key: 'overseas',
                      title: '海外工具',
                      sub: 'MORE',
                      items: restOverseas,
                    },
                    {
                      key: 'domestic',
                      title: '国内工具',
                      sub: 'MORE',
                      items: restDomestic,
                    },
                  ] as const
                ).map((col) => (
                  <div
                    key={col.key}
                    className={cn(
                      'min-w-0',
                      col.key === 'overseas' ? 'market-rail-stage--overseas' : 'market-rail-stage--domestic',
                    )}
                  >
                    <div className="mb-3 flex items-baseline gap-2 px-0.5">
                      <h3 className="text-[18px] font-semibold tracking-tight text-[#1d1d1f]">
                        {col.title}
                      </h3>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#86868b]">
                        {col.sub}
                      </span>
                      <span className="text-[12px] text-[#86868b]">{col.items.length}</span>
                    </div>
                    {col.items.length ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {col.items.map((c) => (
                          <MarketShelfCard
                            key={c.id}
                            card={c}
                            variant="compact"
                            howToLabel="快速上手"
                            onOpen={() => openCard(c)}
                            onPrimary={() => openPrimary(c)}
                            onHowTo={() => openHowTo(c)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-black/10 bg-white/50 px-3 py-8 text-center text-[12px] text-[#86868b]">
                        当前筛选下暂无
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-14 text-center text-[13px] text-[#86868b]">
                {emptyHint}
              </div>
            )
          ) : gridCards.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {gridCards.map((c) => {
                if (kind === 'projects' && mssSurface === 'skills') {
                  const skill = skills.find((s) => s.id === c.id);
                  return (
                    <MarketShelfCard
                      key={c.id}
                      card={c}
                      primaryLabel={skillPrimaryLabel}
                      howToLabel="快速上手"
                      onOpen={() => skill && setSkillDetail(skill)}
                      onPrimary={() => openPrimary(c)}
                      onHowTo={skill ? () => setSkillDetail(skill) : undefined}
                    />
                  );
                }
                return (
                  <MarketShelfCard
                    key={c.id}
                    card={c}
                    primaryLabel={kind === 'projects' ? casePrimaryLabel : undefined}
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
        ) : null}
      </PageCanvas>

      <MarketSubmitModal
        kind={kind}
        open={submitOpen && (kind === 'external' || kind === 'internal')}
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
      />
      <MarketSkillSubmitModal
        open={submitOpen && kind === 'projects' && mssSurface === 'skills'}
        onClose={() => setSubmitOpen(false)}
      />

      {skillDetail ? (
        <MarketSkillDetailModal
          skill={skillDetail}
          canRun={canRunSkills}
          onClose={() => setSkillDetail(null)}
          onRun={(s) => {
            setSkillDetail(null);
            runSkill(s);
          }}
          onToast={showToast}
        />
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
                    '项目',
                  description: '',
                  icon: 'fa-map',
                  badges: [],
                  featured: true,
                  heat: 0,
                  scenarioId: showcaseId,
                  hasHowto: true,
                  runnable: canRunProjects && Boolean(showcaseDemoPlan),
                  primaryAction: 'detail',
                };
                setShowcaseId(null);
                openProjectHowTo(card);
              }}
              className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium"
            >
              快速上手
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
                    '项目',
                  description: '',
                  icon: 'fa-map',
                  badges: [],
                  featured: true,
                  heat: 0,
                  scenarioId: showcaseId,
                  hasHowto: true,
                  runnable: canRunProjects && Boolean(showcaseDemoPlan),
                  primaryAction: 'detail',
                };
                downloadUseProject(card);
              }}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-zinc-800"
            >
              下载
            </button>
            {canRunProjects && showcaseDemoPlan ? (
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
                      '项目',
                    description: '',
                    icon: 'fa-map',
                    badges: [],
                    featured: true,
                    heat: 0,
                    scenarioId: showcaseId,
                    hasHowto: true,
                    runnable: true,
                    primaryAction: 'run',
                  };
                  setShowcaseId(null);
                  runProjectDemo(card);
                }}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-[12px] font-semibold text-emerald-800"
              >
                去打样
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowcaseId(null)}
              className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium"
            >
              关闭
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
