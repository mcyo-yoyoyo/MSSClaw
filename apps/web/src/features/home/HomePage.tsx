import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type {
  PrototypeAgentSeed,
  PrototypeKbDocument,
  PrototypeSkillSeed,
} from '@/domain/prototype/types';
import { canViewAsset } from '@/domain/assetVisibility';
import { canExecuteChat } from '@/domain/permissions';
import type { BusinessScenarioId } from '@/domain/businessScenarios';
import { BusinessScenarioFilterBar } from '@/components/home/BusinessScenarioFilterBar';
import {
  getSkillBusinessLabel,
  listFeaturedDoTaskSkillIds,
} from '@/domain/skillBusinessScenarios';
import { listDoTaskSceneExperts } from '@/domain/agentBusinessScenarios';
import { buildAgentDemoPrompt } from '@/domain/agents/runtime';
import { isDoTaskSceneExpertsVisible } from '@/domain/homeCapabilityFlags';
import {
  emptyOrgPerspectiveSelection,
  getSkillOrgAxisTags,
  isOrgPerspectiveEmpty,
  skillMatchesOrgPerspectiveSelection,
  type OrgPerspectiveSelection,
} from '@/domain/orgAxisTags';
import { HomeCommandBox } from '@/components/home/HomeCommandBox';
import { HomeScenePortal, SectionToolbar } from '@/components/home/HomeScenePortal';
import { SceneExpertPanel } from '@/components/home/SceneExpertPanel';
import {
  CardPageCarousel,
  HOME_SECONDARY_PANEL_H,
  HomeFeedCard,
} from '@/components/home/CardPageCarousel';
import { OrgPerspectiveFilter } from '@/components/home/OrgPerspectiveFilter';
import { StationAnnounceBanner } from '@/components/home/StationAnnounceBanner';
import { useHomeStore } from '@/stores/homeStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { useSessionStore } from '@/stores/sessionStore';
import {
  ensureEngagementSeeds,
  useContentEngagementStore,
} from '@/stores/contentEngagementStore';
import { heatScore } from '@/domain/contentEngagement';
import { isNewSkill } from '@/domain/contentBadges';
import { downloadSkillFile } from '@/domain/skillExport';

interface HomePageProps {
  onSubmitTask: (text: string, agent?: PrototypeAgentSeed | null) => void;
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
  onAskKbDocument?: (doc: PrototypeKbDocument) => void;
}

const ASK_SUBTITLE_SKILLS = '选场景技能 · 再补充意图 · 对话到执行';
const ASK_SUBTITLE_WITH_EXPERTS =
  '选场景技能，或选营销 / 知识专家 · 点选填入 · 补充意图后执行';
const DISCOVER_SUBTITLE = '看场景案例 · 学样板做法 · 再到做任务';

export function HomePage({
  onSubmitTask,
  onInvokeAgent,
  onInvokeSkill: _onInvokeSkill,
}: HomePageProps) {
  const {
    homeMode,
    setHomeMode,
    setDraftText,
    requestComposerFocus,
    applyUserOrgDefaults,
  } = useHomeStore();
  const skills = useMarketplaceStore((s) => s.skills);
  const agents = useMarketplaceStore((s) => s.agents);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const user = useSessionStore((s) => s.user);
  const executeAllowed = canExecuteChat(user?.platformRole);
  const roleEnabled = useNavPresentationStore((s) => s.roleEnabled);
  const engagementOf = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);
  const [businessFilter, setBusinessFilter] = useState<BusinessScenarioId | 'all'>('all');
  const pendingBusinessScenario = useNavigationIntentStore((s) => s.pendingBusinessScenario);
  const consumeBusinessScenario = useNavigationIntentStore((s) => s.consumeBusinessScenario);
  const [orgSelection, setOrgSelection] = useState<OrgPerspectiveSelection>(
    emptyOrgPerspectiveSelection,
  );
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const showSceneExperts = useMemo(() => {
    void roleEnabled;
    return isDoTaskSceneExpertsVisible();
  }, [roleEnabled]);

  useEffect(() => {
    if (homeMode !== 'assistant' || !pendingBusinessScenario) return;
    const id = consumeBusinessScenario();
    if (id) {
      setBusinessFilter(id);
      setSelectedSkillId(null);
      setSelectedAgentId(null);
    }
  }, [homeMode, pendingBusinessScenario, consumeBusinessScenario]);

  const affiliation = useMemo(
    () => ({
      deptIds: user?.deptIds ?? [],
      regionId: user?.regionId ?? null,
    }),
    [user?.deptIds, user?.regionId],
  );

  const orgResetKey = useMemo(
    () =>
      [
        orgSelection.global.join(','),
        orgSelection.region.join(','),
        orgSelection.dept.join(','),
      ].join('|'),
    [orgSelection],
  );

  useEffect(() => {
    if (!executeAllowed && homeMode === 'assistant') {
      setHomeMode('portal');
    }
  }, [executeAllowed, homeMode, setHomeMode]);

  useEffect(() => {
    if (!user) return;
    applyUserOrgDefaults(
      {
        deptIds: user.deptIds,
        regionId: user.regionId,
      },
      user.platformRole,
    );
  }, [user?.id, user?.deptIds?.join(','), user?.regionId, user?.platformRole, applyUserOrgDefaults]);

  useEffect(() => {
    if (!showSceneExperts && selectedAgentId) {
      setSelectedAgentId(null);
    }
  }, [showSceneExperts, selectedAgentId]);

  const featuredSkills = useMemo(() => {
    const byId = new Map(skills.map((s) => [s.id, s]));
    const ids = listFeaturedDoTaskSkillIds(skills, businessFilter, 24);

    return ids
      .map((id) => byId.get(id))
      .filter((s): s is PrototypeSkillSeed => Boolean(s))
      .filter((s) =>
        canViewAsset(s, {
          userId: user?.id,
          userName: user?.name,
          affiliation,
          role: user?.platformRole,
        }),
      )
      .filter((s) => skillMatchesOrgPerspectiveSelection(s, orgSelection));
  }, [skills, businessFilter, orgSelection, user, affiliation]);

  const featuredAgents = useMemo(() => {
    if (!showSceneExperts) return [];
    // 场景专家为全域门面：只按上架/精选/ACL，不按区域·领域·数字员工过滤
    return listDoTaskSceneExperts(agents).filter((a) =>
      canViewAsset(a, {
        userId: user?.id,
        userName: user?.name,
        affiliation,
        role: user?.platformRole,
      }),
    );
  }, [agents, user, affiliation, showSceneExperts]);

  useEffect(() => {
    ensureEngagementSeeds(featuredSkills.map((s) => s.id));
  }, [featuredSkills]);

  useEffect(() => {
    if (featuredAgents.length) ensureEngagementSeeds(featuredAgents.map((a) => a.id));
  }, [featuredAgents]);

  const hotSkillIds = useMemo(() => {
    void engagementById;
    return [...featuredSkills]
      .sort(
        (a, b) =>
          heatScore({ ...engagementOf(b.id), uses: engagementOf(b.id).uses + (b.invokes ?? 0) }) -
          heatScore({ ...engagementOf(a.id), uses: engagementOf(a.id).uses + (a.invokes ?? 0) }),
      )
      .slice(0, 3)
      .map((s) => s.id);
  }, [featuredSkills, engagementOf, engagementById]);

  useEffect(() => {
    if (selectedSkillId && !featuredSkills.some((s) => s.id === selectedSkillId)) {
      setSelectedSkillId(null);
    }
  }, [featuredSkills, selectedSkillId]);

  useEffect(() => {
    if (selectedAgentId && !featuredAgents.some((a) => a.id === selectedAgentId)) {
      setSelectedAgentId(null);
    }
  }, [featuredAgents, selectedAgentId]);

  const selectSkill = (skill: PrototypeSkillSeed) => {
    setSelectedSkillId(skill.id);
    setSelectedAgentId(null);
    setDraftText(`${skill.command} `);
    requestComposerFocus();
  };

  const selectAgent = (agent: PrototypeAgentSeed) => {
    setSelectedAgentId(agent.id);
    setSelectedSkillId(null);
    setDraftText(`${buildAgentDemoPrompt(agent)} `);
    requestComposerFocus();
  };

  const emptyHint =
    businessFilter !== 'all' && !featuredSkills.length
      ? '该业务场景暂无场景技能（建设中）'
      : !isOrgPerspectiveEmpty(orgSelection)
        ? '当前视角下暂无匹配技能'
        : '暂无场景技能';

  const agentEmptyHint = '暂无精选专家，可先用上方场景技能';

  const selectedSkill = featuredSkills.find((s) => s.id === selectedSkillId) ?? null;
  const selectedAgent = featuredAgents.find((a) => a.id === selectedAgentId) ?? null;
  const composerTarget = selectedSkill ?? selectedAgent;
  const askSubtitle = showSceneExperts ? ASK_SUBTITLE_WITH_EXPERTS : ASK_SUBTITLE_SKILLS;

  return (
    <div className="home-surface flex min-h-0 flex-1 flex-col overflow-y-auto scroll-hidden">
      <div className="mx-auto flex w-full max-w-[960px] flex-1 flex-col overflow-x-visible px-8 py-4 md:px-11 md:py-5">
        <header className="mb-3 text-center">
          <h1 className="home-slogan-art">
            <span className="home-slogan-gradient">MSS AI提效作战平台，好学又好用！</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-[12px] leading-relaxed text-zinc-500">
            {homeMode === 'assistant' ? askSubtitle : DISCOVER_SUBTITLE}
          </p>
        </header>

        {executeAllowed ? (
          <div className="mb-4 flex justify-center">
            <div className="inline-flex gap-1 rounded-full bg-zinc-100/90 p-1">
              {(
                [
                  { id: 'portal' as const, label: '学 · 找案例', icon: 'fa-compass' },
                  { id: 'assistant' as const, label: '干 · 做任务', icon: 'fa-list-check' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setHomeMode(tab.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-5 py-1.5 text-[12px] font-semibold transition',
                    homeMode === tab.id
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700',
                  )}
                >
                  <i className={cn('fa-solid text-[10px]', tab.icon)} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-center text-[11px] leading-relaxed text-amber-900">
            当前为只读访客：可浏览案例，不可发起执行
          </div>
        )}

        {executeAllowed && homeMode === 'assistant' ? (
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-x-visible pb-2">
            <StationAnnounceBanner className="border-b border-zinc-100/90 pb-2" />

            <section className="overflow-x-visible">
              <SectionToolbar
                title="场景技能"
                filters={
                  <BusinessScenarioFilterBar value={businessFilter} onChange={setBusinessFilter} />
                }
                trailing={<OrgPerspectiveFilter value={orgSelection} onChange={setOrgSelection} />}
              />

              <CardPageCarousel
                items={featuredSkills}
                getKey={(s) => s.id}
                resetKey={`${businessFilter}-${orgResetKey}`}
                emptyText={emptyHint}
                renderCard={(skill) => {
                  const orgTags = getSkillOrgAxisTags(skill);
                  const bizLabel = getSkillBusinessLabel(skill);
                  const titleTags =
                    orgTags.length > 0
                      ? orgTags
                      : bizLabel
                        ? [{ axis: 'dept', id: 'biz', label: bizLabel }]
                        : [];
                  return (
                    <HomeFeedCard
                      title={skill.name}
                      tags={titleTags}
                      description={skill.desc}
                      active={selectedSkillId === skill.id}
                      onClick={() => selectSkill(skill)}
                      contentId={skill.id}
                      baseUses={skill.invokes ?? 0}
                      isNew={isNewSkill(skill.id)}
                      isHot={hotSkillIds.includes(skill.id)}
                      onDownload={() => {
                        downloadSkillFile(skill);
                        showToast(`已下载技能包：${skill.name}`);
                      }}
                      onAfterAction={(action) => {
                        if (action === 'dislike') showToast('已反馈，运营将关注优化');
                      }}
                    />
                  );
                }}
              />
            </section>

            {showSceneExperts ? (
              <SceneExpertPanel
                agents={featuredAgents}
                selectedId={selectedAgentId}
                onSelect={selectAgent}
                emptyText={agentEmptyHint}
              />
            ) : null}

            {/* 选中技能或专家后出现；置于场景专家下方，高度对齐场景工具 */}
            {composerTarget ? (
              <section>
                <SectionToolbar
                  title="补充意图"
                  align="center"
                  filters={
                    <p className="truncate leading-none text-[11px] text-zinc-500">
                      已选{' '}
                      <span className="font-medium text-zinc-700">
                        {selectedSkill?.name ?? selectedAgent?.name}
                      </span>
                      {selectedAgent ? (
                        <span className="text-zinc-400"> · 专家</span>
                      ) : (
                        <span className="text-zinc-400"> · 技能</span>
                      )}
                    </p>
                  }
                  trailing={
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSkillId(null);
                        setSelectedAgentId(null);
                        setDraftText('');
                      }}
                      className="text-[11px] font-medium leading-none text-zinc-400 transition hover:text-zinc-700"
                    >
                      取消
                    </button>
                  }
                />
                <div
                  className={cn(
                    'overflow-hidden rounded-xl border border-zinc-200/80 bg-white',
                    HOME_SECONDARY_PANEL_H,
                  )}
                >
                  <HomeCommandBox
                    compact
                    placeholder={
                      selectedSkill
                        ? `补充意图，例如：${selectedSkill.command} 本周重点市场…`
                        : `补充意图后发送，将调用专家「${selectedAgent?.name ?? ''}」`
                    }
                    onSubmit={(text) => {
                      if (selectedAgent) {
                        onSubmitTask(text, selectedAgent);
                        return;
                      }
                      onSubmitTask(text, useHomeStore.getState().resolveAgentFromText(text));
                    }}
                  />
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <HomeScenePortal onInvokeAgent={onInvokeAgent} onInvokeSkill={_onInvokeSkill} />
        )}
      </div>
    </div>
  );
}
