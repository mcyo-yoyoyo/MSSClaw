import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getEfficiencyLabel } from '@/domain/prototype/constants';
import { getSkillLabels } from '@/domain/plan';
import type { PrototypeAgentSeed } from '@/domain/prototype/types';
import {
  CenterModal,
  CenterPageHeader,
  CenterSearchInput,
  EfficiencyFilterChips,
  LearningCallout,
} from '@/components/center/CenterShell';
import { AgentEditorModal, type AgentEditorTarget } from '@/components/center/AgentEditorModal';
import { AgentAvatar } from '@/components/brand/AgentAvatar';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';

interface AgentCenterPageProps {
  onInvoke: (agent: PrototypeAgentSeed, prompt?: string) => void;
}

export function AgentCenterPage({ onInvoke }: AgentCenterPageProps) {
  const setAppView = useAppViewStore((s) => s.setAppView);
  const showAgentStudio = useNavPresentationStore((s) => s.isViewEnabled('agent-studio'));
  const {
    agentFilter,
    agentSearch,
    setAgentFilter,
    setAgentSearch,
    filteredAgents,
    bumpAgentInvokes,
  } = useMarketplaceStore();

  const [detail, setDetail] = useState<PrototypeAgentSeed | null>(null);
  const [editorTarget, setEditorTarget] = useState<AgentEditorTarget>(null);
  const agents = filteredAgents();

  const handleInvoke = (agent: PrototypeAgentSeed) => {
    bumpAgentInvokes(agent.id);
    onInvoke(agent);
  };

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl">
        <CenterPageHeader
          title="Agent 中心"
          subtitle="定义营销服 Agent · 挂载 Skill · 发布至团队调用"
          actions={
            <>
              <CenterSearchInput value={agentSearch} onChange={setAgentSearch} placeholder="搜索 Agent…" />
              {showAgentStudio && (
                <button
                  type="button"
                  onClick={() => setAppView('agent-studio')}
                  className="apple-btn-secondary rounded-xl px-4 py-2 text-[12px] font-semibold"
                >
                  <i className="fa-solid fa-wand-magic-sparkles mr-1" />
                  专家 Studio
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditorTarget('new')}
                className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition"
              >
                <i className="fa-solid fa-plus mr-1" />
                创建 Agent
              </button>
            </>
          }
        />

        <LearningCallout icon="fa-robot">
          <strong>快速上手：</strong>
          点击「调用」进入任务中心对话；「专家 Studio」可配置 Persona 与 Skill 绑定；已发布 Agent 会出现在智能助理推荐区。
        </LearningCallout>

        <EfficiencyFilterChips value={agentFilter} onChange={(id) => setAgentFilter(id as typeof agentFilter)} />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {agents.length ? (
            agents.map((a) => (
              <div key={a.id} className="market-card apple-card flex flex-col p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <AgentAvatar agentId={a.id} size={36} title={a.name} />
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      a.published
                        ? 'border border-zinc-200 bg-claw-50 text-zinc-700'
                        : 'bg-black/[0.04] text-[#86868b]',
                    )}
                  >
                    {a.published ? '已发布' : '草稿'}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-claw-600">
                  {getEfficiencyLabel(a.category)} · {a.bizLine}
                </span>
                <h3 className="mt-0.5 text-[13px] font-semibold text-zinc-900">{a.name}</h3>
                <p className="mt-1 flex-1 text-[11px] leading-relaxed text-zinc-500">{a.desc}</p>
                <p className="mt-1.5 text-[10px] text-zinc-400">
                  {a.author} · {a.invokes.toLocaleString()} 次调用
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {getSkillLabels(a.id)
                    .slice(0, 4)
                    .map((s) => (
                      <span key={s} className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[9px] text-[#1d1d1f]">
                        {s}
                      </span>
                    ))}
                </div>
                <div className="mt-3 flex gap-2 border-t border-black/[0.04] pt-2.5">
                  <button
                    type="button"
                    onClick={() => handleInvoke(a)}
                    className="apple-btn-primary flex-1 rounded-lg py-1.5 text-[11px] font-semibold text-white transition"
                  >
                    调用
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetail(a)}
                    className="rounded-lg border border-black/8 px-2.5 py-1.5 text-[11px] font-medium transition hover:bg-black/[0.03]"
                  >
                    详情
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTarget(a.id)}
                    className="rounded-lg border border-black/8 px-2.5 py-1.5 text-[11px] font-medium transition hover:bg-black/[0.03]"
                  >
                    配置
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="apple-card col-span-3 p-8 text-center text-[#86868b]">未找到匹配的 Agent</div>
          )}
        </div>
      </div>

      <CenterModal
        open={!!detail}
        title={detail?.name ?? ''}
        onClose={() => setDetail(null)}
        actions={
          detail && (
            <>
              <button
                type="button"
                onClick={() => {
                  handleInvoke(detail);
                  setDetail(null);
                }}
                className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
              >
                调用 Agent
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = detail.id;
                  setDetail(null);
                  setEditorTarget(id);
                }}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px]"
              >
                配置
              </button>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px]"
              >
                关闭
              </button>
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-3 text-[13px] text-left">
            <p className="text-[#86868b]">{detail.desc}</p>
            {detail.systemPrompt && (
              <pre className="whitespace-pre-wrap rounded-xl bg-black/[0.03] p-3 text-[12px]">{detail.systemPrompt}</pre>
            )}
            <p className="text-[11px] text-[#86868b]">
              {getEfficiencyLabel(detail.category)} · {detail.bizLine} · {detail.invokes} 次调用
            </p>
          </div>
        )}
      </CenterModal>

      <AgentEditorModal target={editorTarget} onClose={() => setEditorTarget(null)} />
    </div>
  );
}
