import type { PrototypeAgentSeed, PrototypeSkillSeed } from '@/domain/prototype/types';

import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { AgentAvatar } from '@/components/brand/AgentAvatar';



interface HomePickerModalProps {

  type: 'agent' | 'skill';

  onClose: () => void;

  onPickSkill: (skill: PrototypeSkillSeed) => void;

  onPickAgent: (agent: PrototypeAgentSeed) => void;

}



export function HomePickerModal({ type, onClose, onPickSkill, onPickAgent }: HomePickerModalProps) {

  const { getPublishedAgents, getPublishedSkills } = useMarketplaceStore();

  const skills = getPublishedSkills();

  const agents = getPublishedAgents();

  const items = type === 'skill' ? skills : agents;



  return (

    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/20 p-4 sm:items-center">

      <button type="button" aria-label="关闭" className="absolute inset-0" onClick={onClose} />

      <div className="relative max-h-[70vh] w-full max-w-lg overflow-hidden rounded-2xl border border-black/5 bg-white shadow-apple-lg">

        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-3">

          <h3 className="text-[14px] font-semibold text-[#1d1d1f]">

            {type === 'skill' ? '选择 Skill' : '选择 Agent'}

          </h3>

          <button type="button" onClick={onClose} className="text-[#86868b]">

            <i className="fa-solid fa-xmark" />

          </button>

        </div>

        <div className="scroll-hidden max-h-[60vh] overflow-y-auto p-2">

          {type === 'skill'

            ? skills.map((skill) => (

                <button

                  key={skill.id}

                  type="button"

                  onClick={() => onPickSkill(skill)}

                  className="cmd-item flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-zinc-50"

                >

                  <i className={`fa-solid ${skill.icon} w-5 text-center text-claw-600`} />

                  <div className="min-w-0">

                    <p className="font-medium text-[#1d1d1f]">{skill.command}</p>

                    <p className="truncate text-[11px] text-[#86868b]">{skill.desc}</p>

                  </div>

                </button>

              ))

            : agents.map((agent) => (

                <button

                  key={agent.id}

                  type="button"

                  onClick={() => onPickAgent(agent)}

                  className="cmd-item flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-zinc-50"

                >

                  <AgentAvatar agentId={agent.id} size={36} title={agent.name} />

                  <div className="min-w-0">

                    <p className="font-medium text-[#1d1d1f]">{agent.name}</p>

                    <p className="truncate text-[11px] text-[#86868b]">{agent.desc}</p>

                  </div>

                </button>

              ))}

          {!items.length && (

            <p className="px-4 py-8 text-center text-[13px] text-[#86868b]">暂无可用项</p>

          )}

        </div>

      </div>

    </div>

  );

}


