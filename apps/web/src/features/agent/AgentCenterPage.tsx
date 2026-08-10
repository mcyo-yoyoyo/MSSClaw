import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getSkillLabels } from '@/domain/plan';
import type { PrototypeAgentSeed } from '@/domain/prototype/types';
import { ASSET_VISIBILITY_LABELS } from '@/domain/orgTaxonomy';
import { getAgentBusinessLabel } from '@/domain/agentBusinessScenarios';
import {
  CenterModal,
  CenterPageHeader,
  CenterSearchInput,
} from '@/components/center/CenterShell';
import { OrgAssetFilterBar } from '@/components/center/OrgAssetFilters';
import { AgentEditorModal, type AgentEditorTarget } from '@/components/center/AgentEditorModal';
import { SharedCatalogEmptyHint } from '@/components/common/SharedCatalogEmptyHint';
import { AssetAccentMark, assetAccentBorderStyle } from '@/components/brand/AssetAccentMark';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { downloadAgentFile, downloadAllAgentsFile } from '@/domain/agentExport';
import { getAgentPack } from '@/domain/agents/catalog';
import { buildAgentDemoPrompt, getPrimarySkill } from '@/domain/agents/runtime';
import { PROTOTYPE_SKILLS } from '@/domain/prototype/skills';
import { skillDisplayName } from '@/domain/skillDisplay';
import { useBusinessScenarioCatalogStore } from '@/stores/businessScenarioCatalogStore';

interface AgentCenterPageProps {
  onInvoke: (agent: PrototypeAgentSeed, prompt?: string) => void;
}

export function AgentCenterPage({ onInvoke }: AgentCenterPageProps) {
  const {
    agents,
    agentSearch,
    agentDeptFilter,
    agentRegionFilter,
    agentScopeFilter,
    agentBusinessFilter,
    setAgentSearch,
    setAgentDeptFilter,
    setAgentRegionFilter,
    setAgentScopeFilter,
    setAgentBusinessFilter,
    filteredAgents,
    bumpAgentInvokes,
    importAgentFile,
    showToast,
    skills,
  } = useMarketplaceStore();
  const hydrateBusinessCatalog = useBusinessScenarioCatalogStore((s) => s.hydrate);

  useEffect(() => {
    hydrateBusinessCatalog();
  }, [hydrateBusinessCatalog]);

  const [detail, setDetail] = useState<PrototypeAgentSeed | null>(null);
  const [editorTarget, setEditorTarget] = useState<AgentEditorTarget>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const list = filteredAgents();

  const handleInvoke = (agent: PrototypeAgentSeed) => {
    bumpAgentInvokes(agent.id);
    onInvoke(agent);
  };

  const skillName = (id: string) => {
    const hit =
      skills.find((s) => s.id === id) ?? PROTOTYPE_SKILLS.find((s) => s.id === id);
    return hit ? skillDisplayName(hit) : id;
  };

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
          title="配置Agent"
          subtitle="能力上架进目录；发布可选组织内 / 公开可见（默认公开）；勾选精选露出后出现在业务「做任务 · 场景专家」"
          tip={
            <>
              「调用」将发送演示任务并进入执行面（需已开放任务记录）。请配置服务端 LLM_* 或「模型与
              API」工作区密钥；未配置时执行会明确报错，不会静默假完成。可下载/导入 .agent.zip。
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
                      导入 Agent 包
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
                创建 Agent
              </button>
            </>
          }
        />

        <OrgAssetFilterBar
          deptFilter={agentDeptFilter}
          regionFilter={agentRegionFilter}
          businessFilter={agentBusinessFilter}
          scopeFilter={agentScopeFilter}
          onDeptChange={setAgentDeptFilter}
          onRegionChange={setAgentRegionFilter}
          onBusinessChange={setAgentBusinessFilter}
          onScopeChange={setAgentScopeFilter}
          showScope
        />

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {list.length ? (
            list.map((a) => {
              const pack = getAgentPack(a.id);
              const runnable = Boolean(a.systemPrompt || pack?.systemPrompt);
              return (
                <div
                  key={a.id}
                  className="market-card apple-card flex flex-col px-3 py-2.5"
                  style={assetAccentBorderStyle(a.id)}
                >
                  <div className="flex items-start gap-2">
                    <AssetAccentMark id={a.id} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-[13px] font-semibold leading-tight text-zinc-900">
                          {a.name}
                        </h3>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[9px] font-semibold',
                              a.published
                                ? 'bg-claw-50 text-claw-700'
                                : 'bg-zinc-100 text-zinc-500',
                            )}
                          >
                            {a.published ? '已发布' : '草稿'}
                          </span>
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-600">
                            {ASSET_VISIBILITY_LABELS[a.visibility ?? 'public']}
                          </span>
                          {runnable ? (
                            <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[9px] font-semibold text-sky-700">
                              可对话
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] font-semibold text-claw-600">
                        {getAgentBusinessLabel(a) || '未分类场景'}
                        {a.bizLine ? ` · ${a.bizLine}` : ''}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-500">
                        {a.desc || '暂无描述'}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-zinc-400">
                        {a.author} · {a.invokes.toLocaleString()} 次调用
                      </p>
                      {getSkillLabels(a.id).slice(0, 3).length ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {getSkillLabels(a.id)
                            .slice(0, 3)
                            .map((s) => (
                              <span
                                key={s}
                                className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] text-zinc-600"
                              >
                                {s}
                              </span>
                            ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1.5 border-t border-black/[0.04] pt-2">
                    <button
                      type="button"
                      onClick={() => handleInvoke(a)}
                      className="apple-btn-primary flex-1 rounded-md py-1 text-[11px] font-semibold text-white transition"
                    >
                      调用
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadAgentFile(a);
                        showToast(`已下载专家包 ${a.name}.agent.zip`);
                      }}
                      className="rounded-md border border-black/8 px-2.5 py-1 text-[11px] font-medium transition hover:bg-black/[0.03]"
                      title="下载专家包（AGENT.md + reference/templates）"
                    >
                      <i className="fa-solid fa-download" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetail(a)}
                      className="rounded-md border border-black/8 px-2.5 py-1 text-[11px] font-medium transition hover:bg-black/[0.03]"
                    >
                      详情
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTarget(a.id)}
                      className="rounded-md border border-black/8 px-2.5 py-1 text-[11px] font-medium transition hover:bg-black/[0.03]"
                    >
                      配置
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <SharedCatalogEmptyHint assetLabel="Agent" />
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
              {getAgentBusinessLabel(detail) || '未分类场景'}
              {detail.bizLine ? ` · ${detail.bizLine}` : ''} · {detail.invokes} 次调用
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
