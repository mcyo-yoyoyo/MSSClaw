import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { canExecuteChat } from '@/domain/permissions';
import { orderExternalFeaturedItems } from '@/domain/externalFeaturedOrder';
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
  getBusinessScenarioMeta,
  listVisibleBusinessScenarioCategories,
  type BusinessScenarioId,
} from '@/domain/businessScenarios';
import {
  resolveSkillBusinessScenario,
  resolveSkillFeaturedInMssMarket,
} from '@/domain/skillBusinessScenarios';
import { resolveAgentFeaturedInDoTask } from '@/domain/agentBusinessScenarios';
import {
  hasSkillExecutionBody,
  isSkillCallable,
  isSkillRunnable,
} from '@/domain/skillRuntime';
import { useBusinessScenarioCatalogStore } from '@/stores/businessScenarioCatalogStore';
import { useInternalOfficeSceneCatalogStore } from '@/stores/internalOfficeSceneCatalogStore';
import {
  emptyOrgPerspectiveSelection,
  isOrgPerspectiveEmpty,
  skillMatchesOrgPerspectiveSelection,
} from '@/domain/orgAxisTags';
import { skillDisplayDesc, skillDisplayName } from '@/domain/skillDisplay';
import {
  matchesSkillHubSearch,
  SKILL_HUB_SEARCH_HINTS,
} from '@/domain/skillHubSearch';
import {
  AGENT_HUB_SEARCH_HINTS,
  matchesAgentHubSearch,
} from '@/domain/agentHubSearch';
import {
  getAgentCapabilityTypeLabel,
  resolveAgentCapabilityTypes,
} from '@/domain/agentHubFilters';
import {
  getAssetRegionLabel,
  getDeptLabel,
  getRegionLabel,
} from '@/domain/orgTaxonomy';
import { canViewAsset } from '@/domain/assetVisibility';
import { downloadSkillFile } from '@/domain/skillExport';
import { MarketSkillDetailModal } from '@/features/market/MarketSkillDetailModal';
import { CatalogAgentDetailModal } from '@/features/market/CatalogAgentDetailModal';
import { MarketAgentDetailModal } from '@/features/market/MarketAgentDetailModal';
import { useMssBuildStatsCopyStore } from '@/stores/mssBuildStatsCopyStore';
import {
  type ExternalToolTypeId,
} from '@/domain/externalToolTaxonomy';
import {
  listVisibleExternalToolTypes,
  toolMatchesExternalTypeCatalog,
} from '@/domain/externalTaxonomyCatalog';
import { useExternalTaxonomyCatalogStore } from '@/stores/externalTaxonomyCatalogStore';
import { openMarketToolDetail } from '@/domain/openHomeJourney';
import {
  executionTrustBlockedMessage,
  executionTrustFailMessage,
  resolveAgentExecutionTrust,
  resolveSkillExecutionTrust,
} from '@/domain/executionTrust';
import { getScenarioEnv, isScenarioEnvFilled } from '@/domain/scenarioEnv';
import { MarketShelfCard } from '@/components/market/MarketShelfCard';
import {
  MarketCompareDock,
  MarketCompareDrawer,
} from '@/components/market/MarketCompareDrawer';
import { PageCanvas } from '@/components/layout/PageCanvas';
import { PageStageHero } from '@/components/layout/PageStageHero';
import { ExternalMarketFilters } from '@/components/market/ExternalMarketFilters';
import { InternalOfficeSceneGrid } from '@/components/market/InternalOfficeSceneGrid';
import { ShelfSectionHead } from '@/components/market/ShelfRankSelect';
import { buildProjectHowtoGuides } from '@/domain/projectHowto';
import { downloadScenarioUnifiedPack } from '@/domain/caseExport';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useMarketFilterStore } from '@/stores/marketFilterStore';
import { useSessionStore } from '@/stores/sessionStore';
import {
  AGENT_HUB_RANK_TABS,
  sortByRankMode,
  type RankMode,
} from '@/domain/contentEngagement';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { useMarketHiddenStore } from '@/stores/marketHiddenStore';
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
import { StageIntentDock } from '@/components/market/StageIntentDock';
import {
  capabilityKey,
  searchCapabilitiesByIntent,
} from '@/domain/capabilityIntentSearch';
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
  const favoritesOnly = useMarketFilterStore((s) => s.favoritesOnly);
  const favoriteItems = useMarketFavoriteStore((s) => s.items);
  const hydrateFavorites = useMarketFavoriteStore((s) => s.hydrate);
  const hiddenKeys = useMarketHiddenStore((s) => s.keys);
  const hydrateHidden = useMarketHiddenStore((s) => s.hydrate);
  const pushRecent = useRecentMarketStore((s) => s.push);
  const getEngagement = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);
  const bumpDownload = useContentEngagementStore((s) => s.bumpDownload);
  const bumpView = useContentEngagementStore((s) => s.bumpView);
  const bumpUse = useContentEngagementStore((s) => s.bumpUse);
  const guideRecords = usePlazaToolGuideStore((s) => s.records);
  const featuredPins = useMarketFeaturedStore((s) => s.pins);
  const externalTaxonomy = useExternalTaxonomyCatalogStore((s) => s.catalog);
  const hydrateFeaturedPins = useMarketFeaturedStore((s) => s.hydrate);

  const [showcaseId, setShowcaseId] = useState<string | null>(null);
  const [howTo, setHowTo] = useState<{ title: string; guides: PlazaToolGuide[] } | null>(null);
  const [guidePreview, setGuidePreview] = useState<PlazaToolGuide | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [externalType, setExternalType] = useState<ExternalToolTypeId | 'all'>('all');
  /** MSS 集市二级面：Skill Hub | Agent Hub（默认 Skill Hub） */
  const [mssSurface, setMssSurface] = useState<'projects' | 'skills'>('skills');
  const [rankMode, setRankMode] = useState<RankMode>('most_viewed');
  /** Agent Hub 单独一套排序项（推荐优先 / 下载量 / 点赞量 / 更新时间） */
  const [agentRankMode, setAgentRankMode] = useState<RankMode>('recommended');
  const [skillDetail, setSkillDetail] = useState<PrototypeSkillSeed | null>(null);
  const [agentDetail, setAgentDetail] = useState<PrototypeAgentSeed | null>(null);

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
    hydrateFavorites();
    hydrateHidden();
    useBusinessScenarioCatalogStore.getState().hydrate();
    // 内部办公推荐的办公场景网格读该字典；启动时若未连后端会是空的，进页面再拉一次
    useInternalOfficeSceneCatalogStore.getState().hydrate();
    hydrateBuildStatsCopy();
  }, [hydrateFeaturedPins, hydrateFavorites, hydrateHidden, hydrateBuildStatsCopy]);

  useEffect(() => {
    setExternalType('all');
    setMssSurface('skills');
    // 外部工具按 Excel 清单序、公司工具按办公场景字典序；MSS 集市才按互动量
    setRankMode(kind === 'projects' ? 'most_viewed' : 'excel_order');
  }, [kind]);

  /** 运营隐藏类型后，清除已失效的筛选态 */
  useEffect(() => {
    if (kind !== 'external') return;
    const types = listVisibleExternalToolTypes(externalTaxonomy);
    if (externalType !== 'all' && !types.some((t) => t.id === externalType)) {
      setExternalType('all');
    }
  }, [kind, externalTaxonomy, externalType]);

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

  const scopedCards = useMemo(() => {
    const eng = (id: string) => getEngagement(id);
    const raw =
      kind === 'projects'
        ? listMarketProjectCards(listOrg, listBusiness, eng, portalByScenario).map((c) => {
            const hasDemo = Boolean(c.scenarioId && runnableByScenario.get(c.scenarioId));
            const runnable = canRunProjects && hasDemo;
            const bundle = c.scenarioId
              ? projectBundles.find((b) => b.id === c.scenarioId)
              : undefined;
            const envFilled = Boolean(
              bundle?.env
                ? isScenarioEnvFilled(bundle.env)
                : c.scenarioId && isScenarioEnvFilled(getScenarioEnv(c.scenarioId)),
            );
            return {
              ...c,
              runnable,
              executionTrust: resolveAgentExecutionTrust({
                canRun: runnable,
                hasDemoPlan: hasDemo,
                envFilled,
              }),
              primaryAction: 'detail' as MarketShelfCardModel['primaryAction'],
            };
          })
        : listMarketToolCards(tools, kind, viewer, listOrg, listBusiness, eng, howtoToolIds);

    let working = raw;
    if (kind === 'external') {
      working = working.filter((c) =>
        toolMatchesExternalTypeCatalog(
          c.toolTypeIds?.length ? c.toolTypeIds : c.toolTypeId,
          externalType,
          externalTaxonomy,
        ),
      );
      working = working.map((card) => ({
        ...card,
        sourceOrder:
          externalType === 'all'
            ? card.externalSortOrder
            : card.externalCategoryRanks?.[externalType] ?? card.externalSortOrder,
      }));
    }

    const pinned =
      kind === 'internal'
        ? working.map((c) => ({ ...c, featured: false }))
        : applyMarketFeaturedPins(working, featuredPins[kind] ?? []);

    const ordered =
      kind === 'projects' && !(featuredPins.projects?.length)
        ? preferAgentHubFeaturedOrder(pinned)
        : pinned;

    return ordered;
  }, [
    kind,
    featuredPins,
    tools,
    viewer,
    listOrg,
    listBusiness,
    externalType,
    externalTaxonomy,
    getEngagement,
    engagementById,
    howtoToolIds,
    portalByScenario,
    runnableByScenario,
    projectBundles,
    canRunProjects,
  ]);

  const favoriteKeys = useMemo(
    () => new Set(favoriteItems.map((f) => `${f.kind}:${f.id}`)),
    [favoriteItems],
  );

  const filteredCards = useMemo(() => {
    const q = search.trim();
    let next = scopedCards;
    if (q) {
      const hits = searchCapabilitiesByIntent(q, scopedCards, scopedCards.length, { favoriteKeys });
      next = hits.map((h) => h.card);
    }
    if (favoritesOnly) {
      next = next.filter((c) => favoriteKeys.has(capabilityKey(c)));
    }
    next = next.filter((c) => !hiddenKeys.includes(`${c.kind}:${c.id}`));
    const ranked = sortByRankMode(next, rankMode, getEngagement);
    return kind === 'external' && rankMode === 'excel_order'
      ? orderExternalFeaturedItems(
          ranked,
          featuredPins.external ?? [],
          (card) => card.sourceOrder,
        )
      : ranked;
  }, [
    scopedCards,
    search,
    favoritesOnly,
    favoriteKeys,
    hiddenKeys,
    rankMode,
    getEngagement,
    engagementById,
    kind,
    featuredPins.external,
  ]);

  const isAgentHub = kind === 'projects' && mssSurface === 'projects';
  const sectionRankMode = isAgentHub ? agentRankMode : rankMode;
  const setSectionRankMode = isAgentHub ? setAgentRankMode : setRankMode;
  const sectionRankOptions = isAgentHub ? AGENT_HUB_RANK_TABS : undefined;

  const showSceneHub = kind === 'projects' && businessFilter === 'all';
  // 场景分类改为 Chip 筛选，页内始终展示精选 + 列表（不再先进入分类枢纽）
  const showMssSceneChips = kind === 'projects';

  const scopedMssAgents = useMemo(() => {
    if (kind !== 'projects') return [] as PrototypeAgentSeed[];
    const q = search.trim().toLowerCase();
    const favSet = favoritesOnly
      ? new Set(favoriteItems.filter((item) => item.kind === 'projects').map((item) => item.id))
      : null;
    return agents
      .filter((agent) => agent.published)
      .filter((agent) => canViewAsset(agent, viewer))
      .filter((agent) => {
        const deptOk =
          !orgSelection.dept.length ||
          (agent.ownerDeptIds ?? []).some((id) => orgSelection.dept.includes(id));
        const regionOk =
          !orgSelection.region.length ||
          (agent.ownerRegionIds ?? []).some((id) => orgSelection.region.includes(id));
        return deptOk && regionOk;
      })
      .filter((agent) => {
        const businessScenarioLabel = agent.businessScenarioId
          ? getBusinessScenarioMeta(agent.businessScenarioId).label
          : '';
        const tagLabels = [
          ...(agent.scenarioTags ?? []),
          agent.bizLine,
          businessScenarioLabel,
          ...(agent.ownerDeptIds ?? []).map(getDeptLabel),
          ...(agent.ownerRegionIds ?? []).map(getRegionLabel),
          ...resolveAgentCapabilityTypes(agent).map(getAgentCapabilityTypeLabel),
          ...(agent.targetUsers ?? []),
          ...(agent.environment?.platforms ?? []),
        ].filter(Boolean);
        return matchesAgentHubSearch(
          { title: agent.name, description: agent.desc, tags: tagLabels },
          q,
        );
      })
      .filter((agent) => (favSet ? favSet.has(agent.id) : true));
  }, [kind, agents, viewer, orgSelection, search, favoritesOnly, favoriteItems]);

  const mssAgents = useMemo(
    () =>
      scopedMssAgents.filter(
        (agent) =>
          businessFilter === 'all' || agent.businessScenarioId === businessFilter,
      ),
    [scopedMssAgents, businessFilter],
  );

  const caseAgentOptions = useMemo(
    () =>
      agents
        .filter((agent) => agent.published && canViewAsset(agent, viewer))
        .map((agent) => ({ id: agent.id, name: agent.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
    [agents, viewer],
  );

  const submittedAgentCases = useMemo(
    () =>
      agentDetail
        ? portalContent.filter(
            (item) =>
              item.type === 'case' &&
              item.published !== false &&
              item.agentId === agentDetail.id &&
              canViewAsset(item, viewer),
          )
        : [],
    [agentDetail, portalContent, viewer],
  );

  const sceneCategories = useMemo(() => {
    if (kind !== 'projects') return [];
    return listVisibleBusinessScenarioCategories().map((category) => ({
      ...category,
      count: scopedMssAgents.filter(
        (agent) => agent.businessScenarioId === category.id,
      ).length,
    }));
  }, [kind, scopedMssAgents, sceneCatalog]);

  const hubStats = useMemo(() => {
    if (kind !== 'projects') return null;
    const sceneCovered =
      businessFilter === 'all'
        ? sceneCategories.filter((s) => s.count > 0).length
        : mssAgents.length > 0
          ? 1
          : 0;
    return {
      projectCount: mssAgents.length,
      sceneCovered,
      sceneTotal: listVisibleBusinessScenarioCategories().length,
    };
  }, [
    kind,
    businessFilter,
    mssAgents,
    sceneCategories,
    sceneCatalog,
  ]);

  const mssSkills = useMemo(() => {
    if (kind !== 'projects') return [] as PrototypeSkillSeed[];
    const q = search.trim().toLowerCase();
    const favSet = favoritesOnly
      ? new Set(favoriteItems.filter((f) => f.kind === 'projects').map((f) => f.id))
      : null;
    return skills
      .filter((skill) => skill.published)
      .filter(
        (skill) =>
          businessFilter === 'all' ||
          resolveSkillBusinessScenario(skill) === businessFilter,
      )
      .filter((s) => canViewAsset(s, viewer))
      .filter((s) => skillMatchesOrgPerspectiveSelection(s, orgSelection))
      .filter((s) => {
        return matchesSkillHubSearch(
          {
            title: [skillDisplayName(s), s.name, s.nameZh, s.nameEn]
              .filter(Boolean)
              .join(' '),
            description: [skillDisplayDesc(s), s.desc, s.descZh, s.descEn]
              .filter(Boolean)
              .join(' '),
            instructions: s.instructions,
          },
          q,
        );
      })
      .filter((s) => (favSet ? favSet.has(s.id) : true));
  }, [
    kind,
    skills,
    businessFilter,
    search,
    viewer,
    orgSelection,
    favoritesOnly,
    favoriteItems,
  ]);

  const skillSceneCategories = useMemo(() => {
    if (kind !== 'projects') return [];
    return listVisibleBusinessScenarioCategories().map((cat) => {
      const count = skills
        .filter((skill) => skill.published)
        .filter((skill) => resolveSkillBusinessScenario(skill) === cat.id)
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
    const mapped = mssSkills.map((s) => {
      const biz = resolveSkillBusinessScenario(s);
      const bizLabel = biz ? getBusinessScenarioMeta(biz).label : null;
      const eng = getEngagement(s.id);
      const badges: MarketShelfCardModel['badges'] = [];
      // 平级：领域(dept) · 区域 · 业务场景（需求「职能=领域」）
      if (s.ownerDeptIds?.[0]) {
        badges.push({ label: getDeptLabel(s.ownerDeptIds[0]), tone: 'dept' });
      }
      badges.push({ label: getAssetRegionLabel(s.ownerRegionId), tone: 'region' });
      if (bizLabel) badges.push({ label: bizLabel, tone: 'type' });
      const runnable = canRunSkills && isSkillRunnable(s);
      return {
        id: s.id,
        kind: 'projects' as const,
        title: skillDisplayName(s),
        description: (s.desc || '').replace(/^【[^】]+】/, '').trim(),
        outcomeHint: (s.desc || '').replace(/^【[^】]+】/, '').trim() || skillDisplayName(s),
        sceneTags: bizLabel ? [bizLabel] : undefined,
        securityLevel: 'mss' as const,
        icon: s.icon || 'fa-cube',
        badges,
        featured: resolveSkillFeaturedInMssMarket(s),
        heat: s.invokes ?? 0,
        likes: eng.likes,
        dislikes: eng.dislikes,
        downloads: eng.downloads,
        scopeBadge: ((s.visibility ?? 'public') === 'public' ? 'public' : 'scoped') as
          | 'public'
          | 'scoped',
        hasHowto: Boolean(s.instructions || s.command),
        runnable,
        executionTrust: resolveSkillExecutionTrust(runnable),
        primaryAction: 'detail' as const,
        scenarioId: biz ?? undefined,
        ownerDeptIds: s.ownerDeptIds,
        ownerRegionId: s.ownerRegionId,
      };
    });
    return sortByRankMode(
      mapped.filter((c) => !hiddenKeys.includes(`${c.kind}:${c.id}`)),
      rankMode,
      getEngagement,
    );
  }, [mssSkills, canRunSkills, getEngagement, engagementById, hiddenKeys, rankMode]);

  const agentCards = useMemo((): MarketShelfCardModel[] => {
    const mapped = mssAgents.map((agent) => {
      const bizLabel = agent.businessScenarioId
        ? getBusinessScenarioMeta(agent.businessScenarioId).label
        : null;
      const engagement = getEngagement(agent.id);
      const badges: MarketShelfCardModel['badges'] = [];
      if (agent.ownerDeptIds?.[0]) {
        badges.push({ label: getDeptLabel(agent.ownerDeptIds[0]), tone: 'dept' });
      }
      if (agent.ownerRegionIds?.[0]) {
        badges.push({ label: getRegionLabel(agent.ownerRegionIds[0]), tone: 'region' });
      }
      if (bizLabel) badges.push({ label: bizLabel, tone: 'type' });
      const runnable = canRunProjects && Boolean(agent.published && agent.skillIds?.length);
      return {
        id: agent.id,
        kind: 'projects' as const,
        title: agent.name,
        description: agent.desc,
        outcomeHint: agent.desc,
        sceneTags: bizLabel ? [bizLabel] : agent.scenarioTags?.slice(0, 3),
        securityLevel: 'mss' as const,
        icon: agent.icon || 'fa-robot',
        badges,
        featured: resolveAgentFeaturedInDoTask(agent),
        heat: agent.invokes ?? 0,
        likes: engagement.likes,
        dislikes: engagement.dislikes,
        downloads: engagement.downloads,
        scopeBadge: ((agent.visibility ?? 'public') === 'public' ? 'public' : 'scoped') as
          | 'public'
          | 'scoped',
        hasHowto: Boolean(agent.systemPrompt || agent.skillIds?.length),
        runnable,
        executionTrust: resolveAgentExecutionTrust({
          canRun: runnable,
          hasDemoPlan: runnable,
          envFilled: true,
        }),
        primaryAction: 'detail' as const,
        ownerDeptIds: agent.ownerDeptIds,
        updatedAt: agent.updatedAt,
      };
    });
    const visible = mapped.filter((card) => !hiddenKeys.includes(`${card.kind}:${card.id}`));
    const sorted = sortByRankMode(visible, agentRankMode, getEngagement);
    // 推荐优先：运营置顶排在最前，其余保持热度序
    return agentRankMode === 'recommended' && featuredPins.projects?.length
      ? applyMarketFeaturedPins(sorted, featuredPins.projects)
      : sorted;
  }, [
    mssAgents,
    canRunProjects,
    getEngagement,
    engagementById,
    hiddenKeys,
    agentRankMode,
    featuredPins,
  ]);

  const orgScopeLabel = useMemo(() => {
    const parts: string[] = [];
    if (orgSelection.dept[0]) parts.push(getDeptLabel(orgSelection.dept[0]));
    if (orgSelection.region[0]) parts.push(getRegionLabel(orgSelection.region[0]));
    return parts.join(' \u00b7 ') || '\u5168\u90e8';
  }, [orgSelection]);

  const featuredLimit = 8;
  const { featured, rest } = splitFeaturedAndRest(filteredCards, featuredLimit);
  const { featured: skillFeatured, rest: skillRest } = splitFeaturedAndRest(skillCards, 4);
  const { featured: agentFeatured, rest: agentRest } = splitFeaturedAndRest(agentCards, 4);
  const showFeaturedStrip =
    kind !== 'internal' &&
    (kind === 'projects'
      ? mssSurface === 'skills'
        ? skillFeatured.length > 0
        : agentFeatured.length > 0
      : featured.length > 0);
  const activeFeatured =
    kind === 'projects'
      ? mssSurface === 'skills'
        ? skillFeatured
        : agentFeatured
      : featured;

  const externalFeaturedOverseas = useMemo(
    () =>
      kind === 'external'
        ? activeFeatured.filter((c) => c.region === 'overseas').slice(0, 4)
        : [],
    [kind, activeFeatured],
  );
  const externalFeaturedDomestic = useMemo(
    () =>
      kind === 'external'
        ? activeFeatured.filter((c) => c.region === 'domestic').slice(0, 4)
        : [],
    [kind, activeFeatured],
  );

  const externalFilterStats = useMemo(() => {
    if (kind !== 'external') return { total: 0, overseas: 0, domestic: 0 };
    return {
      total: filteredCards.length,
      overseas: filteredCards.filter((c) => c.region === 'overseas').length,
      domestic: filteredCards.filter((c) => c.region === 'domestic').length,
    };
  }, [kind, filteredCards]);

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
    bumpView(id);
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

  const openCard = (card: MarketShelfCardModel) => {
    trackToolClick(card.id);
    if (card.kind === 'projects') {
      const agent = agents.find((item) => item.id === card.id);
      if (agent) {
        rememberCard(card);
        setAgentDetail(agent);
        return;
      }
    }
    if (card.kind === 'projects' && card.scenarioId) {
      rememberCard(card);
      setShowcaseId(card.scenarioId);
      return;
    }
    rememberCard(card);
    openMarketToolDetail(card.id, kind === 'projects' ? 'external' : kind);
  };

  const openAgentDetail = (card: MarketShelfCardModel) => {
    const agent = agents.find((item) => item.id === card.id);
    if (!agent) return;
    trackToolClick(card.id);
    rememberCard(card);
    setAgentDetail(agent);
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
    const trust =
      card.executionTrust ??
      resolveAgentExecutionTrust({
        canRun: Boolean(canRunProjects && card.scenarioId),
        hasDemoPlan: Boolean(card.scenarioId && runnableByScenario.get(card.scenarioId)),
      });
    if (!canRunProjects || !card.scenarioId) {
      showToast(executionTrustBlockedMessage(trust, '暂不可在线试用，已改为下载学习包'));
      downloadUseProject(card);
      return;
    }
    const bundle = projectBundles.find((b) => b.id === card.scenarioId) ?? null;
    if (!bundle || !resolveScenarioDemoPlan(bundle)) {
      showToast(executionTrustBlockedMessage('download_only', '暂无可执行打样链路，已改为下载学习包'));
      downloadUseProject(card);
      return;
    }
    try {
      executeProject(bundle);
    } catch {
      showToast(executionTrustFailMessage(trust));
    }
  };

  const runSkill = (skill: PrototypeSkillSeed) => {
    const currentSkill = useMarketplaceStore
      .getState()
      .skills.find((item) => item.id === skill.id);
    if (!currentSkill) {
      showToast('该 Skill 已不在当前工作区，请刷新后重试');
      return;
    }
    const can = Boolean(onInvokeSkill && canRunSkills && isSkillRunnable(currentSkill));
    const trust = resolveSkillExecutionTrust(can);
    if (!can) {
      downloadSkillFile(currentSkill);
      const reason = !isSkillCallable(currentSkill)
        ? '该 Skill 已发布展示，但尚未启用在线调用'
        : !hasSkillExecutionBody(currentSkill)
          ? '该 Skill 缺少执行正文，暂不可在线调用'
          : `已下载技能包：${currentSkill.name}`;
      showToast(executionTrustBlockedMessage(trust, reason));
      return;
    }
    try {
      onInvokeSkill!(currentSkill);
      rememberCard({
        id: currentSkill.id,
        kind: 'projects',
        title: currentSkill.name,
        description: currentSkill.desc,
        icon: currentSkill.icon || 'fa-cube',
        badges: [],
        featured: resolveSkillFeaturedInMssMarket(currentSkill),
        heat: currentSkill.invokes ?? 0,
        hasHowto: true,
        runnable: true,
        executionTrust: trust,
        primaryAction: 'detail',
      });
      showToast(`已进入 AI 任务试用：${currentSkill.name}`);
    } catch {
      showToast(executionTrustFailMessage(trust));
    }
  };

  const emptyHint =
    search.trim() ||
    !isOrgPerspectiveEmpty(orgSelection) ||
    businessFilter !== 'all'
      ? '当前筛选下暂无内容。可重置左侧领域/区域、切换场景分类，或调整搜索关键词。'
      : '权限范围内暂无上架内容。若预期应可见，请联系运营确认可见性与上架状态。';

  const gridCards =
    kind === 'projects'
      ? mssSurface === 'skills'
        ? showFeaturedStrip
          ? skillRest
          : skillCards
        : showFeaturedStrip
          ? agentRest
          : agentCards
      : showFeaturedStrip
        ? rest
        : filteredCards;

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
        'center-surface flex min-h-0 flex-1 flex-col overflow-y-auto scroll-hidden',
      )}
    >
      <PageCanvas className="flex flex-col py-6 pb-8">
        <PageStageHero
          className="mb-4 shrink-0"
          layout="stack"
          tone={kind === 'projects' ? 'projects' : kind}
          title={meta.label}
          subtitle={
            kind === 'external'
              ? null
              : kind === 'internal'
                ? '按场景选公司工具'
                : '暂不支持在线执行，相关能力敬请期待，可下载文件包使用'
          }
          tip={
            kind === 'external'
              ? (
                  <span className="font-medium text-[#d92d20]">
                    外部工具为第三方服务，禁止将公司内部信息上传到外部AI网站
                  </span>
                )
              : kind === 'internal'
                ? '经组织统一入口访问，授权范围内使用，勿外传敏感数据'
                : null
          }
          titleAside={
            canSubmit && kind === 'projects' ? (
              <button
                type="button"
                onClick={() => setSubmitOpen(true)}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-[#a1a1aa] transition hover:bg-black/[0.04] hover:text-[#52525b]"
              >
                {kind === 'projects'
                  ? mssSurface === 'skills'
                    ? '提报 Skill'
                    : '提报案例'
                  : '提报工具'}
              </button>
            ) : null
          }
        >
          <StageIntentDock
            scope={kind}
            suggestions={
              kind === 'projects'
                ? mssSurface === 'skills'
                  ? SKILL_HUB_SEARCH_HINTS
                  : AGENT_HUB_SEARCH_HINTS
                : undefined
            }
            placeholder={
              kind === 'external'
                ? 'ChatGPT、Gamma、即梦… 或说要做 PPT / 写方案'
                : kind === 'internal'
                  ? '云笔记、W3、员工助手… 或说写报告 / 查制度'
                  : mssSurface === 'skills'
                    ? '信息洞察、隐私合规、工作总结、VOC… 或输入 Skill 名称'
                    : '洞察、VOC、内容生成… 或输入 Agent 名称'
            }
          />
        </PageStageHero>

        {kind === 'external' ? (
          <ExternalMarketFilters
            type={externalType}
            stats={externalFilterStats}
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
          <div className="flex flex-col">
            <InternalOfficeSceneGrid
              search={search}
              catalogTools={tools}
              rankMode={rankMode}
              onRankModeChange={setRankMode}
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
                bumpUse(tool.id);
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
                <ShelfSectionHead
                  title="精选推荐"
                  count={activeFeatured.length}
                  rankMode={rankMode}
                  onRankChange={setRankMode}
                  showExcelOrder
                />
                <div className="grid gap-4 lg:grid-cols-2">
                  {(
                    [
                      {
                        key: 'overseas',
                        title: '海外精选',
                        sub: `GLOBAL TOP ${externalFeaturedOverseas.length}`,
                        items: externalFeaturedOverseas,
                      },
                      {
                        key: 'domestic',
                        title: '国内精选',
                        sub: `CHINA TOP ${externalFeaturedDomestic.length}`,
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
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {col.items.map((c) => (
                          <MarketShelfCard
                            key={`hot-${c.id}`}
                            card={c}
                            variant="compact"
                            showHot
                            onOpen={() => openCard(c)}
                            onPrimary={() => openCard(c)}
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
                <ShelfSectionHead
                  title="精选推荐"
                  count={activeFeatured.length}
                  rankMode={sectionRankMode}
                  onRankChange={setSectionRankMode}
                  rankOptions={sectionRankOptions}
                />
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {activeFeatured.map((c) => {
                    if (kind === 'projects' && mssSurface === 'skills') {
                      const skill = skills.find((s) => s.id === c.id);
                      return (
                        <MarketShelfCard
                          key={`hot-${c.id}`}
                          card={c}
                          showHot
                          onOpen={() => skill && setSkillDetail(skill)}
                          onPrimary={() => skill && setSkillDetail(skill)}
                        />
                      );
                    }
                    return (
                      <MarketShelfCard
                        key={`hot-${c.id}`}
                        card={c}
                        showHot
                        onOpen={() => (kind === 'projects' ? openAgentDetail(c) : openCard(c))}
                        onPrimary={() => (kind === 'projects' ? openAgentDetail(c) : openCard(c))}
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
          <ShelfSectionHead
            title={showFeaturedStrip ? '更多' : '全部'}
            count={gridCards.length}
            rankMode={sectionRankMode}
            onRankChange={setSectionRankMode}
            showExcelOrder={kind === 'external'}
            rankOptions={sectionRankOptions}
          />
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
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {col.items.map((c) => (
                          <MarketShelfCard
                            key={c.id}
                            card={c}
                            variant="compact"
                            onOpen={() => openCard(c)}
                            onPrimary={() => openCard(c)}
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
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {gridCards.map((c) => {
                if (kind === 'projects' && mssSurface === 'skills') {
                  const skill = skills.find((s) => s.id === c.id);
                  return (
                    <MarketShelfCard
                      key={c.id}
                      card={c}
                      onOpen={() => skill && setSkillDetail(skill)}
                      onPrimary={() => skill && setSkillDetail(skill)}
                    />
                  );
                }
                return (
                  <MarketShelfCard
                    key={c.id}
                    card={c}
                    onOpen={() => (kind === 'projects' ? openAgentDetail(c) : openCard(c))}
                    onPrimary={() => (kind === 'projects' ? openAgentDetail(c) : openCard(c))}
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
      <MarketCompareDock />
      <MarketCompareDrawer onOpenCard={openCard} />
      <CaseEditorModal
        target={
          submitOpen && kind === 'projects' && mssSurface === 'projects'
            ? 'new'
            : null
        }
        variant="submit"
        defaultType="case"
        defaultBusinessId={caseSubmitDefaultBusinessId}
        agentOptions={caseAgentOptions}
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

      {agentDetail ? (
        <CatalogAgentDetailModal
          agent={agentDetail}
          submittedCases={submittedAgentCases}
          canRun={canRunProjects}
          onClose={() => setAgentDetail(null)}
          onRun={(agent) => {
            setAgentDetail(null);
            onInvokeAgent?.(agent);
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

      {showcaseId ? (
        <MarketAgentDetailModal
          scenarioId={showcaseId}
          title={
            FEATURED_SCENARIOS.find((s) => s.id === showcaseId)?.label ||
            showcaseBundle?.label ||
            '项目详情'
          }
          description={
            FEATURED_SCENARIOS.find((s) => s.id === showcaseId)?.desc ||
            showcaseBundle?.desc ||
            ''
          }
          icon={
            FEATURED_SCENARIOS.find((s) => s.id === showcaseId)?.icon ||
            showcaseBundle?.icon ||
            'fa-map'
          }
          badges={scopedCards.find((c) => c.scenarioId === showcaseId)?.badges ?? []}
          bundle={showcaseBundle}
          items={showcaseItems}
          canRun={canRunProjects}
          demoPlan={showcaseDemoPlan}
          onClose={() => setShowcaseId(null)}
          onDownload={() => {
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
          onRun={() => {
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
          onToast={showToast}
        />
      ) : null}
    </div>
  );
}
