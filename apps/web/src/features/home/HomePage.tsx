import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { HOME_BIZ_AGENTS, HOME_CATEGORIES } from '@/domain/prototype/home';
import type { PrototypeAgentSeed, PrototypeSkillSeed } from '@/domain/prototype/types';
import { HomeCommandBox } from '@/components/home/HomeCommandBox';
import { MssZhishuMark } from '@/components/brand/MssZhishuMark';
import { AgentAvatar } from '@/components/brand/AgentAvatar';
import { useHomeStore } from '@/stores/homeStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

interface HomePageProps {
  onSubmitTask: (text: string, agent?: PrototypeAgentSeed | null) => void;
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
}

export function HomePage({ onSubmitTask, onInvokeAgent }: HomePageProps) {
  const { category, setCategory } = useHomeStore();
  const agents = useMarketplaceStore((s) => s.agents);

  const featuredAgents = useMemo(() => {
    const ids = HOME_BIZ_AGENTS[category] ?? [];
    const byId = new Map(agents.filter((a) => a.published).map((a) => [a.id, a]));
    return ids.map((id) => byId.get(id)).filter((a): a is PrototypeAgentSeed => Boolean(a));
  }, [agents, category]);

  return (
    <div className="home-surface flex min-h-0 flex-1 flex-col overflow-y-auto scroll-hidden">
      <div className="mx-auto flex w-full max-w-[880px] flex-1 flex-col justify-center px-5 py-5 md:px-6 md:py-6">
        <header className="mb-5 text-center">
          <div className="home-hero-mark mb-3">
            <MssZhishuMark size={58} />
          </div>
          <h1 className="home-slogan-art">
            <span className="home-slogan-gradient">MSS智枢，就是好用！</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[13px] leading-relaxed text-zinc-500">
            集成多位数字员工，7*24小时随时待命，帮你实现个人提效，助力MSS实现组织提效！
          </p>
        </header>

        <HomeCommandBox
          onSubmit={(text) => onSubmitTask(text, useHomeStore.getState().resolveAgentFromText(text))}
        />

        <div className="mt-5">
          <div className="flex flex-wrap justify-center gap-1.5">
            {HOME_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={cn(
                  'wb-cat-pill px-3 py-1.5 text-[12px] font-medium',
                  category === cat.id && 'active',
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <section className="mt-5">
          <h2 className="mb-2.5 text-[11px] font-semibold tracking-wide text-zinc-400">相关 Agent</h2>
          {featuredAgents.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {featuredAgents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => onInvokeAgent(agent)}
                  className="group flex items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-white p-2.5 text-left transition hover:border-zinc-300 hover:shadow-apple"
                >
                  <AgentAvatar agentId={agent.id} size={32} title={agent.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-zinc-900">{agent.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-zinc-500">{agent.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-zinc-500">该业务线暂无相关 Agent</p>
          )}
        </section>
      </div>
    </div>
  );
}
