import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  HOME_BIZ_SKILLS,
  HOME_CATEGORIES,
  HOME_REGION_SKILLS,
} from '@/domain/prototype/home';
import type {
  PrototypeAgentSeed,
  PrototypeKbDocument,
  PrototypeSkillSeed,
} from '@/domain/prototype/types';
import { REGIONS } from '@/domain/orgTaxonomy';
import {
  getVisibleHomeDepts,
  getVisibleHomeRegions,
} from '@/domain/rolePerspective';
import { canViewAsset } from '@/domain/assetVisibility';
import { canExecuteChat } from '@/domain/permissions';
import { SKILL_ROLE_BY_ID, SKILL_ROLE_CATEGORIES, type SkillRoleId } from '@/domain/skillRoles';
import { HomeCommandBox } from '@/components/home/HomeCommandBox';
import { HomeScenePortal } from '@/components/home/HomeScenePortal';
import { SkillAvatar } from '@/components/brand/SkillAvatar';
import { useHomeStore, type ExpertBrowseAxis } from '@/stores/homeStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useSessionStore } from '@/stores/sessionStore';
import { isNewSkill } from '@/domain/contentBadges';

interface HomePageProps {
  onSubmitTask: (text: string, agent?: PrototypeAgentSeed | null) => void;
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
  onAskKbDocument?: (doc: PrototypeKbDocument) => void;
}

/** AI任务 Tab：对齐场景库的高频意图（偏 Skill 命令） */
const INTENT_PROMPTS = [
  '/价格监测 分析本周竞品价格异动',
  '/评论分析 聚类本周电渠差评并给建议',
  '/培训内容 生成门店话术并准备陪练',
] as const;

const ASK_SUBTITLE = '说出来就干活 · 输入需求或点选技能，在对话框里直接调用';
const DISCOVER_SUBTITLE = '按业务场景找案例与工具 · 一键打样跑通专家团或主能力';

const SKILL_AXIS_TABS: { id: ExpertBrowseAxis; label: string }[] = [
  { id: 'agent', label: '全球' },
  { id: 'region', label: '区域' },
  { id: 'dept', label: '领域' },
];

export function HomePage({
  onSubmitTask,
  onInvokeAgent,
  onInvokeSkill,
}: HomePageProps) {
  const {
    homeMode,
    setHomeMode,
    expertAxis,
    agentRoleId,
    category,
    regionId,
    setExpertAxis,
    setAgentRoleId,
    setCategory,
    setRegionId,
    setDraftText,
    applyUserOrgDefaults,
  } = useHomeStore();
  const skills = useMarketplaceStore((s) => s.skills);
  const user = useSessionStore((s) => s.user);
  const executeAllowed = canExecuteChat(user?.platformRole);
  const [orgBrowseOpen, setOrgBrowseOpen] = useState(true);

  const affiliation = useMemo(
    () => ({
      deptIds: user?.deptIds ?? [],
      regionId: user?.regionId ?? null,
    }),
    [user?.deptIds, user?.regionId],
  );

  const visibleDepts = useMemo(
    () => getVisibleHomeDepts(affiliation, user?.platformRole),
    [affiliation, user?.platformRole],
  );
  const visibleRegions = useMemo(
    () => getVisibleHomeRegions(affiliation, user?.platformRole),
    [affiliation, user?.platformRole],
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
    if (!visibleDepts.includes(category) && visibleDepts[0]) {
      setCategory(visibleDepts[0]);
    }
  }, [visibleDepts, category, setCategory]);

  useEffect(() => {
    if (!visibleRegions.includes(regionId) && visibleRegions[0]) {
      useHomeStore.setState({ regionId: visibleRegions[0] });
    }
  }, [visibleRegions, regionId]);

  const featuredSkills = useMemo(() => {
    const byId = new Map(skills.filter((s) => s.published).map((s) => [s.id, s]));
    const ids: string[] =
      expertAxis === 'agent'
        ? Object.entries(SKILL_ROLE_BY_ID)
            .filter(([, role]) => role === agentRoleId)
            .map(([id]) => id)
        : expertAxis === 'region'
          ? (HOME_REGION_SKILLS[regionId] ?? [])
          : (HOME_BIZ_SKILLS[category] ?? []);

    const list = ids
      .map((id) => byId.get(id))
      .filter((s): s is PrototypeSkillSeed => Boolean(s))
      .filter((s) =>
        canViewAsset(s, {
          userId: user?.id,
          userName: user?.name,
          affiliation,
          role: user?.platformRole,
        }),
      );

    return expertAxis === 'agent' ? list.slice(0, 9) : list.slice(0, 3);
  }, [skills, expertAxis, agentRoleId, category, regionId, user, affiliation]);

  const emptyHint =
    expertAxis === 'agent'
      ? '该角色暂无相关技能'
      : expertAxis === 'region'
        ? '该区域暂无相关技能'
        : '该领域暂无相关技能';

  const deptChips = HOME_CATEGORIES.filter((c) => visibleDepts.includes(c.id));
  const regionChips = REGIONS.filter((r) => visibleRegions.includes(r.id));

  return (
    <div className="home-surface flex min-h-0 flex-1 flex-col overflow-y-auto scroll-hidden">
      <div className="mx-auto flex w-full max-w-[960px] flex-1 flex-col px-5 py-4 md:px-6 md:py-5">
        <header className="mb-3 text-center">
          <h1 className="home-slogan-art">
            <span className="home-slogan-gradient">MSS AI提效作战平台，好学又好用！</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-[12px] leading-relaxed text-zinc-500">
            {homeMode === 'assistant' ? ASK_SUBTITLE : DISCOVER_SUBTITLE}
          </p>
        </header>

        {executeAllowed ? (
          <div className="mb-4 flex justify-center">
            <div className="inline-flex gap-1 rounded-full bg-zinc-100/90 p-1">
              {(
                [
                  { id: 'portal' as const, label: 'AI广场', icon: 'fa-compass' },
                  { id: 'assistant' as const, label: 'AI任务', icon: 'fa-comment-dots' },
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
            当前为只读访客：可浏览案例与任务结果，不可发起执行
          </div>
        )}

        {executeAllowed && homeMode === 'assistant' ? (
          <>
            <HomeCommandBox
              onSubmit={(text) =>
                onSubmitTask(text, useHomeStore.getState().resolveAgentFromText(text))
              }
            />

            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {INTENT_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setDraftText(prompt)}
                  className="rounded-full border border-zinc-200/90 bg-white px-3 py-1 text-[11px] font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <section className="mt-8">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[12px] font-semibold text-zinc-800">推荐技能</h2>
                <button
                  type="button"
                  onClick={() => setOrgBrowseOpen((v) => !v)}
                  className="rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                >
                  {orgBrowseOpen ? '收起' : '筛选'}
                  <i
                    className={cn(
                      'fa-solid fa-chevron-down ml-1 text-[9px] transition',
                      orgBrowseOpen && 'rotate-180',
                    )}
                  />
                </button>
              </div>

              {orgBrowseOpen ? (
                <div className="mb-3 space-y-2 rounded-xl border border-zinc-200/60 bg-zinc-50/60 p-2.5">
                  <div className="flex justify-center gap-1 rounded-full bg-zinc-100/80 p-1">
                    {SKILL_AXIS_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setExpertAxis(tab.id)}
                        className={cn(
                          'rounded-full px-3.5 py-1 text-[12px] font-medium transition',
                          expertAxis === tab.id
                            ? 'bg-white text-zinc-900 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-700',
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {expertAxis === 'agent'
                      ? SKILL_ROLE_CATEGORIES.map((role) => {
                          const active = agentRoleId === role.id;
                          return (
                            <button
                              key={role.id}
                              type="button"
                              title={role.blurb}
                              onClick={() => setAgentRoleId(role.id as SkillRoleId)}
                              className={cn(
                                'subcat-chip inline-flex items-center gap-1 px-3 py-1 text-[11px] font-medium',
                                active && 'subcat-chip-active',
                              )}
                            >
                              <i className={cn('fa-solid text-[9px]', role.icon)} />
                              {role.label}
                            </button>
                          );
                        })
                      : (expertAxis === 'dept' ? deptChips : regionChips).map((item) => {
                          const id = item.id;
                          const active =
                            expertAxis === 'dept' ? category === id : regionId === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() =>
                                expertAxis === 'dept'
                                  ? setCategory(id as typeof category)
                                  : setRegionId(id as typeof regionId)
                              }
                              className={cn(
                                'subcat-chip px-3 py-1 text-[11px] font-medium',
                                active && 'subcat-chip-active',
                              )}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                  </div>
                </div>
              ) : null}

              {featuredSkills.length === 0 ? (
                <p className="py-4 text-center text-[12px] text-zinc-400">{emptyHint}</p>
              ) : (
                <div
                  className={cn(
                    'grid grid-cols-1 gap-2',
                    featuredSkills.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
                  )}
                >
                  {featuredSkills.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => onInvokeSkill(skill)}
                      className="relative flex items-start gap-2.5 rounded-xl border border-zinc-200/70 bg-white/80 p-2.5 text-left transition hover:border-zinc-300"
                    >
                      {isNewSkill(skill.id) ? (
                        <span
                          className="pointer-events-none absolute right-2 top-2 z-10 rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide text-white"
                          style={{ backgroundColor: '#C8102E' }}
                          title="新品"
                          aria-label="New"
                        >
                          New
                        </span>
                      ) : null}
                      <SkillAvatar
                        skillId={skill.id}
                        icon={skill.icon}
                        size={32}
                        title={skill.name}
                      />
                      <div className="min-w-0 flex-1 pr-8">
                        <p className="truncate text-[12px] font-semibold text-zinc-900">
                          {skill.name}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-claw-700">{skill.command}</p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-zinc-500">
                          {skill.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <HomeScenePortal onInvokeAgent={onInvokeAgent} onInvokeSkill={onInvokeSkill} />
        )}
      </div>
    </div>
  );
}
