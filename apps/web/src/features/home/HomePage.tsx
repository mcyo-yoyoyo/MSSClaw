import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { HOME_BIZ_AGENTS, HOME_CATEGORIES, HOME_REGION_AGENTS } from '@/domain/prototype/home';
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
import {
  AGENT_ROLE_BY_ID,
  AGENT_ROLE_CATEGORIES,
  type AgentRoleId,
} from '@/domain/agentRoles';
import { HomeCommandBox } from '@/components/home/HomeCommandBox';
import { HomeScenePortal } from '@/components/home/HomeScenePortal';
import { AgentAvatar } from '@/components/brand/AgentAvatar';
import { useHomeStore, type ExpertBrowseAxis } from '@/stores/homeStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useSessionStore } from '@/stores/sessionStore';

interface HomePageProps {
  onSubmitTask: (text: string, agent?: PrototypeAgentSeed | null) => void;
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
  onAskKbDocument?: (doc: PrototypeKbDocument) => void;
}

/** AI助手 Tab：对齐场景库的高频意图 */
const INTENT_PROMPTS = [
  '帮我分析本周竞品价格异动',
  '聚类本周电渠差评并给出改进建议',
  '生成门店培训话术并翻译成西语',
] as const;

const ASK_SUBTITLE = '说出来就干活 · 输入需求，智枢帮你调度专家与技能';
const DISCOVER_SUBTITLE = '按业务场景找工具与样板 · 精选内容在下方';

const EXPERT_AXIS_TABS: { id: ExpertBrowseAxis; label: string }[] = [
  { id: 'agent', label: 'Agent' },
  { id: 'dept', label: 'NP' },
  { id: 'region', label: '区域' },
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
  const agents = useMarketplaceStore((s) => s.agents);
  const user = useSessionStore((s) => s.user);
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

  const featuredAgents = useMemo(() => {
    const byId = new Map(agents.filter((a) => a.published).map((a) => [a.id, a]));
    const ids: string[] =
      expertAxis === 'agent'
        ? Object.entries(AGENT_ROLE_BY_ID)
            .filter(([, role]) => role === agentRoleId)
            .map(([id]) => id)
        : expertAxis === 'region'
          ? (HOME_REGION_AGENTS[regionId] ?? [])
          : (HOME_BIZ_AGENTS[category] ?? []);

    const list = ids
      .map((id) => byId.get(id))
      .filter((a): a is PrototypeAgentSeed => Boolean(a))
      .filter((a) =>
        canViewAsset(a, {
          userId: user?.id,
          userName: user?.name,
          affiliation,
          role: user?.platformRole,
        }),
      );

    return expertAxis === 'agent' ? list : list.slice(0, 3);
  }, [agents, expertAxis, agentRoleId, category, regionId, user, affiliation]);

  const emptyHint =
    expertAxis === 'agent'
      ? '该角色暂无相关专家'
      : expertAxis === 'region'
        ? '该区域暂无相关专家'
        : '该业务线暂无相关专家';

  const deptChips = HOME_CATEGORIES.filter((c) => visibleDepts.includes(c.id));
  const regionChips = REGIONS.filter((r) => visibleRegions.includes(r.id));

  return (
    <div className="home-surface flex min-h-0 flex-1 flex-col overflow-y-auto scroll-hidden">
      <div className="mx-auto flex w-full max-w-[960px] flex-1 flex-col px-5 py-4 md:px-6 md:py-5">
        <header className="mb-3 text-center">
          <h1 className="home-slogan-art">
            <span className="home-slogan-gradient">MSS AI提效作战平台：智枢，就是好用！</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-[12px] leading-relaxed text-zinc-500">
            {homeMode === 'assistant' ? ASK_SUBTITLE : DISCOVER_SUBTITLE}
          </p>
        </header>

        <div className="mb-4 flex justify-center">
          <div className="inline-flex gap-1 rounded-full bg-zinc-100/90 p-1">
            {(
              [
                { id: 'assistant' as const, label: 'AI助手', icon: 'fa-comment-dots' },
                { id: 'portal' as const, label: 'AI广场', icon: 'fa-compass' },
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

        {homeMode === 'assistant' ? (
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
                <h2 className="text-[12px] font-semibold text-zinc-800">推荐专家</h2>
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
                    {EXPERT_AXIS_TABS.map((tab) => (
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
                      ? AGENT_ROLE_CATEGORIES.map((role) => {
                          const active = agentRoleId === role.id;
                          return (
                            <button
                              key={role.id}
                              type="button"
                              title={role.blurb}
                              onClick={() => setAgentRoleId(role.id as AgentRoleId)}
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

              {featuredAgents.length === 0 ? (
                <p className="py-4 text-center text-[12px] text-zinc-400">{emptyHint}</p>
              ) : (
                <div
                  className={cn(
                    'grid grid-cols-1 gap-2',
                    featuredAgents.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
                  )}
                >
                  {featuredAgents.map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => onInvokeAgent(agent)}
                      className="flex items-start gap-2.5 rounded-xl border border-zinc-200/70 bg-white/80 p-2.5 text-left transition hover:border-zinc-300"
                    >
                      <AgentAvatar agentId={agent.id} size={32} title={agent.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-zinc-900">{agent.name}</p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-zinc-500">
                          {agent.desc}
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
