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
import { HomeCommandBox } from '@/components/home/HomeCommandBox';
import { HomeScenePortal } from '@/components/home/HomeScenePortal';
import { MssZhishuMark } from '@/components/brand/MssZhishuMark';
import { AgentAvatar } from '@/components/brand/AgentAvatar';
import { useHomeStore } from '@/stores/homeStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useSessionStore } from '@/stores/sessionStore';

interface HomePageProps {
  onSubmitTask: (text: string, agent?: PrototypeAgentSeed | null) => void;
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
  onAskKbDocument?: (doc: PrototypeKbDocument) => void;
}

const ASSISTANT_SUBTITLE =
  '集成多位数字员工，7*24小时随时待命，帮你实现个人提效，助力MSS实现组织提效！';
const PORTAL_SUBTITLE = '橱窗速览 · AI 工具分类直达 · 前沿洞察与培训赋能 · 完整样板间见案例';

export function HomePage({
  onSubmitTask,
  onInvokeAgent,
  onInvokeSkill,
}: HomePageProps) {
  const {
    homeMode,
    setHomeMode,
    axis,
    category,
    regionId,
    setAxis,
    setCategory,
    setRegionId,
    applyUserOrgDefaults,
  } = useHomeStore();
  const agents = useMarketplaceStore((s) => s.agents);
  const user = useSessionStore((s) => s.user);
  const [orgBrowseOpen, setOrgBrowseOpen] = useState(false);

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
    // 仅修正非法 regionId，不切换 axis（避免全球管理员被拉回一线区域）
    if (!visibleRegions.includes(regionId) && visibleRegions[0]) {
      useHomeStore.setState({ regionId: visibleRegions[0] });
    }
  }, [visibleRegions, regionId]);

  const featuredAgents = useMemo(() => {
    const ids =
      axis === 'region'
        ? (HOME_REGION_AGENTS[regionId] ?? [])
        : (HOME_BIZ_AGENTS[category] ?? []);
    const byId = new Map(agents.filter((a) => a.published).map((a) => [a.id, a]));
    return ids
      .map((id) => byId.get(id))
      .filter((a): a is PrototypeAgentSeed => Boolean(a))
      .filter((a) =>
        canViewAsset(a, {
          userId: user?.id,
          userName: user?.name,
          affiliation,
          role: user?.platformRole,
        }),
      )
      .slice(0, 3);
  }, [agents, axis, category, regionId, user, affiliation]);

  const emptyHint =
    axis === 'region' ? '该区域暂无相关 Agent' : '该业务线暂无相关 Agent';

  const deptChips = HOME_CATEGORIES.filter((c) => visibleDepts.includes(c.id));
  const regionChips = REGIONS.filter((r) => visibleRegions.includes(r.id));
  const orgContextLabel =
    axis === 'region'
      ? (REGIONS.find((r) => r.id === regionId)?.label ?? regionId)
      : (HOME_CATEGORIES.find((c) => c.id === category)?.label ?? category);

  return (
    <div className="home-surface flex min-h-0 flex-1 flex-col overflow-y-auto scroll-hidden">
      <div className="mx-auto flex w-full max-w-[880px] flex-1 flex-col px-5 py-4 md:px-6 md:py-5">
        <header className="mb-3 text-center">
          <div className="home-hero-mark mb-2">
            <MssZhishuMark size={48} />
          </div>
          <h1 className="home-slogan-art">
            <span className="home-slogan-gradient">MSS智枢，就是好用！</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-[12px] leading-relaxed text-zinc-500">
            {homeMode === 'assistant' ? ASSISTANT_SUBTITLE : PORTAL_SUBTITLE}
          </p>
        </header>

        <div className="mb-3 flex justify-center">
          <div className="inline-flex gap-1 rounded-full bg-zinc-100/90 p-1">
            {(
              [
                { id: 'assistant' as const, label: '智能助理', icon: 'fa-comment-dots' },
                { id: 'portal' as const, label: '场景导航', icon: 'fa-map' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHomeMode(tab.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold transition',
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

            <section className="mt-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[12px] font-semibold text-zinc-800">
                  相关 Agent
                  <span className="ml-1.5 font-normal text-zinc-400">· {orgContextLabel}</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setOrgBrowseOpen((v) => !v)}
                  className="rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
                >
                  {orgBrowseOpen ? '收起筛选' : '按组织浏览'}
                  <i
                    className={cn(
                      'fa-solid fa-chevron-down ml-1 text-[9px] transition',
                      orgBrowseOpen && 'rotate-180',
                    )}
                  />
                </button>
              </div>

              {orgBrowseOpen ? (
                <div className="mb-3 space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-2.5">
                  <div className="flex justify-center gap-1 rounded-full bg-zinc-100/80 p-1">
                    {(
                      [
                        { id: 'dept' as const, label: '机关职能' },
                        { id: 'region' as const, label: '一线区域' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setAxis(tab.id)}
                        className={cn(
                          'rounded-full px-3.5 py-1 text-[12px] font-medium transition',
                          axis === tab.id
                            ? 'bg-white text-zinc-900 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-700',
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {(axis === 'dept' ? deptChips : regionChips).map((item) => {
                      const id = item.id;
                      const active = axis === 'dept' ? category === id : regionId === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() =>
                            axis === 'dept'
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
                <p className="py-6 text-center text-[12px] text-zinc-400">{emptyHint}</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {featuredAgents.map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => onInvokeAgent(agent)}
                      className="flex items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-white p-2.5 text-left transition hover:border-zinc-300 hover:shadow-sm"
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
