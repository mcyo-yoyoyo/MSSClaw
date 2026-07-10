import { cn } from '@/lib/utils';

import type { PrototypeAgentSeed, PrototypeSkillSeed } from '@/domain/prototype/types';

import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { AgentAvatar } from '@/components/brand/AgentAvatar';



interface HomeSlashMenuProps {

  mode: '/' | '@';

  query?: string;

  onSelectSkill: (skill: PrototypeSkillSeed) => void;

  onSelectAgent: (agent: PrototypeAgentSeed) => void;

  onClose: () => void;

}



export function HomeSlashMenu({ mode, query = '', onSelectSkill, onSelectAgent, onClose }: HomeSlashMenuProps) {

  const { getPublishedSkills, getPublishedAgents } = useMarketplaceStore();

  const q = query.trim().toLowerCase();



  const skills = getPublishedSkills()

    .filter((s) => {

      if (!q) return true;

      return (

        s.name.toLowerCase().includes(q) ||

        s.command.toLowerCase().includes(q) ||

        s.desc.toLowerCase().includes(q)

      );

    })

    .slice(0, 8);



  const agents = getPublishedAgents()

    .filter((a) => {

      if (!q) return true;

      const shortName = a.name.replace(/\s*Agent\s*/i, '');

      return (

        a.name.toLowerCase().includes(q) ||

        shortName.toLowerCase().includes(q) ||

        a.desc.toLowerCase().includes(q)

      );

    })

    .slice(0, 8);



  const items = mode === '/' ? skills : agents;



  return (

    <div className="slash-menu max-h-48 overflow-y-auto border-t border-black/[0.06]">

      {mode === '/'

        ? skills.map((skill) => (

            <button

              key={skill.id}

              type="button"

              onClick={() => {

                onSelectSkill(skill);

                onClose();

              }}

              className="cmd-item flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] hover:bg-zinc-50"

            >

              <i className={cn('fa-solid w-5 text-center text-claw-600', skill.icon)} />

              <div className="min-w-0">

                <p className="truncate font-medium text-[#1d1d1f]">{skill.command}</p>

                <p className="truncate text-[11px] text-[#86868b]">{skill.desc}</p>

              </div>

            </button>

          ))

        : agents.map((agent) => (

            <button

              key={agent.id}

              type="button"

              onClick={() => {

                onSelectAgent(agent);

                onClose();

              }}

              className="cmd-item flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] hover:bg-zinc-50"

            >

              <AgentAvatar agentId={agent.id} size={28} title={agent.name} />

              <div className="min-w-0">

                <p className="truncate font-medium text-[#1d1d1f]">{agent.name}</p>

                <p className="truncate text-[11px] text-[#86868b]">{agent.desc}</p>

              </div>

            </button>

          ))}

      {!items.length && (

        <p className="px-4 py-3 text-[12px] text-[#86868b]">暂无匹配项</p>

      )}

    </div>

  );

}


