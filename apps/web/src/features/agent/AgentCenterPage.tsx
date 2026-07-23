import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getEfficiencyLabel } from '@/domain/prototype/constants';
import { getSkillLabels } from '@/domain/plan';
import type { PrototypeAgentSeed } from '@/domain/prototype/types';
import {
  CenterModal,
  CenterPageHeader,
  CenterSearchInput,
} from '@/components/center/CenterShell';
import { OrgAssetFilterBar } from '@/components/center/OrgAssetFilters';
import { AgentEditorModal, type AgentEditorTarget } from '@/components/center/AgentEditorModal';
import { AgentAvatar } from '@/components/brand/AgentAvatar';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import type { EfficiencyFilter } from '@/domain/assetFilters';
import { downloadAgentFile, downloadAllAgentsFile } from '@/domain/agentExport';
import { getAgentPack } from '@/domain/agents/catalog';
import { buildAgentDemoPrompt, getPrimarySkill } from '@/domain/agents/runtime';
import { PROTOTYPE_SKILLS } from '@/domain/prototype/skills';

interface AgentCenterPageProps {
  onInvoke: (agent: PrototypeAgentSeed, prompt?: string) => void;
}

export function AgentCenterPage({ onInvoke }: AgentCenterPageProps) {
  const {
    agents,
    agentFilter,
    agentSearch,
    agentDeptFilter,
    agentRegionFilter,
    agentScopeFilter,
    setAgentFilter,
    setAgentSearch,
    setAgentDeptFilter,
    setAgentRegionFilter,
    setAgentScopeFilter,
    filteredAgents,
    bumpAgentInvokes,
    importAgentFile,
    showToast,
    skills,
  } = useMarketplaceStore();

  const [detail, setDetail] = useState<PrototypeAgentSeed | null>(null);
  const [editorTarget, setEditorTarget] = useState<AgentEditorTarget>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const list = filteredAgents();

  const handleInvoke = (agent: PrototypeAgentSeed) => {
    bumpAgentInvokes(agent.id);
    onInvoke(agent);
  };

  const skillName = (id: string) =>
    skills.find((s) => s.id === id)?.name ??
    PROTOTYPE_SKILLS.find((s) => s.id === id)?.name ??
    id;

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <input
        ref={importInputRef}
        type="file"
        accept=".zip,.agent.zip,.json,application/zip,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          void (async () => {
            const imported = await importAgentFile(file);
            if (imported[0]) {
              setAgentScopeFilter('mine');
              setAgentSearch(imported[0].name);
              setDetail(imported[0]);
            }
          })();
          e.target.value = '';
        }}
      />

      <div className="mx-auto max-w-6xl">
        <CenterPageHeader
          title="配置专家"
          subtitle="能力上架进目录；勾选精选露出后出现在业务「做任务 · 场景专家」"
          tip={
            <>
              「调用」将自动发送演示任务并挂载主 Skill；可下载/导入 .agent.zip（含 AGENT.md）。配置 LLM
              后走真实模型执行，否则为演示 Mock。
            </>
          }
          actions={
            <>
              <CenterSearchInput value={agentSearch} onChange={setAgentSearch} placeholder="搜索 Agent…" />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
                >
                  更多
                  <i className="fa-solid fa-chevron-down ml-1 text-[9px]" />
                </button>
                {moreOpen ? (
                  <div className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        importInputRef.current?.click();
                        setMoreOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-zinc-700 hover:bg-zinc-50"
                      title="导入为新专家"
                    >
                      <i className="fa-solid fa-file-import w-3.5 text-[10px] text-zinc-400" />
                      导入专家包
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadAllAgentsFile(agents);
                        showToast(`已导出 ${agents.length} 个专家清单（JSON）`);
                        setMoreOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-zinc-700 hover:bg-zinc-50"
                    >
                      <i className="fa-solid fa-file-export w-3.5 text-[10px] text-zinc-400" />
                      导出全部清单
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setEditorTarget('new')}
                className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition"
              >
                <i className="fa-solid fa-plus mr-1" />
                创建专家
              </button>
            </>
          }
        />

        <OrgAssetFilterBar
          deptFilter={agentDeptFilter}
          regionFilter={agentRegionFilter}
          efficiencyFilter={agentFilter === 'experience' ? 'all' : (agentFilter as EfficiencyFilter)}
          scopeFilter={agentScopeFilter}
          onDeptChange={setAgentDeptFilter}
          onRegionChange={setAgentRegionFilter}
          onEfficiencyChange={(id) => setAgentFilter(id)}
          onScopeChange={setAgentScopeFilter}
          showScope
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.length ? (
            list.map((a) => {
              const pack = getAgentPack(a.id);
              const runnable = Boolean(a.systemPrompt || pack?.systemPrompt);
              return (
                <div key={a.id} className="market-card apple-card flex flex-col p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <AgentAvatar agentId={a.id} size={36} title={a.name} />
                    <div className="flex flex-col items-end gap-1">
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
                      {runnable ? (
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-semibold text-sky-700">
                          可对话执行
                        </span>
                      ) : null}
                    </div>
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
                        <span
                          key={s}
                          className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[9px] text-[#1d1d1f]"
                        >
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
                      onClick={() => {
                        downloadAgentFile(a);
                        showToast(`已下载专家包 ${a.name}.agent.zip`);
                      }}
                      className="rounded-lg border border-black/8 px-2.5 py-1.5 text-[11px] font-medium transition hover:bg-black/[0.03]"
                      title="下载专家包（AGENT.md + reference/templates）"
                    >
                      <i className="fa-solid fa-download" />
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
              );
            })
          ) : (
            <div className="apple-card col-span-3 p-8 text-center text-[#86868b]">未找到匹配的 Agent</div>
          )}
        </div>
      </div>

      <CenterModal
        open={!!detail}
        title={detail?.name ?? ''}
        size="lg"
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
                调用
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadAgentFile(detail);
                  showToast(`已下载专家包 ${detail.name}.agent.zip`);
                }}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px]"
              >
                下载包
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
            <p className="text-[11px] text-[#86868b]">
              {getEfficiencyLabel(detail.category)} · {detail.bizLine} · {detail.invokes} 次调用
            </p>
            {(detail.systemPrompt || getAgentPack(detail.id)?.systemPrompt) && (
              <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3">
                <p className="mb-1.5 text-[11px] font-semibold text-sky-800">Persona（对话注入）</p>
                <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-700">
                  {detail.systemPrompt || getAgentPack(detail.id)?.systemPrompt}
                </pre>
              </div>
            )}
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
              <p className="mb-1.5 text-[11px] font-semibold text-zinc-700">挂载 Skills</p>
              <ul className="space-y-1 text-[11px] text-zinc-600">
                {detail.skillIds.map((id) => (
                  <li key={id}>
                    {skillName(id)}
                    {(detail.primarySkillId || getPrimarySkill(detail)?.id) === id ? (
                      <span className="ml-1 text-sky-700">· 主</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            {(detail.planSteps?.length || getAgentPack(detail.id)?.planSteps?.length) && (
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                <p className="mb-1.5 text-[11px] font-semibold text-zinc-700">编排计划</p>
                <ol className="list-decimal space-y-1 pl-4 text-[11px] text-zinc-600">
                  {(detail.planSteps?.length
                    ? detail.planSteps
                    : getAgentPack(detail.id)?.planSteps ?? []
                  ).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-3">
              <p className="mb-1.5 text-[11px] font-semibold text-zinc-700">演示任务（调用自动发送）</p>
              <pre className="whitespace-pre-wrap text-[11px] text-zinc-600">
                {detail.demoPrompt || buildAgentDemoPrompt(detail)}
              </pre>
            </div>
          </div>
        )}
      </CenterModal>

      <AgentEditorModal target={editorTarget} onClose={() => setEditorTarget(null)} />
    </div>
  );
}
