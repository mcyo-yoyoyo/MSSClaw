import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getSkillLabels } from '@/domain/plan';
import type { PrototypeAgentSeed } from '@/domain/prototype/types';
import { ASSET_VISIBILITY_LABELS } from '@/domain/orgTaxonomy';
import { getAgentBusinessLabel } from '@/domain/agentBusinessScenarios';
import {
  CenterPageHeader,
  CenterSearchInput,
} from '@/components/center/CenterShell';
import { OrgAssetFilterBar } from '@/components/center/OrgAssetFilters';
import { AgentEditorModal, type AgentEditorTarget } from '@/components/center/AgentEditorModal';
import { SharedCatalogEmptyHint } from '@/components/common/SharedCatalogEmptyHint';
import { AgentPortrait } from '@/components/brand/AgentPortrait';
import { CatalogAgentDetailModal } from '@/features/market/CatalogAgentDetailModal';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { downloadAgentFile, downloadAllAgentsFile } from '@/domain/agentExport';
import { getAgentPack } from '@/domain/agents/catalog';
import { useBusinessScenarioCatalogStore } from '@/stores/businessScenarioCatalogStore';
import { PACKAGE_UPLOAD_MAX_LABEL } from '@/domain/packageUpload';

interface AgentCenterPageProps {
  onInvoke: (agent: PrototypeAgentSeed, prompt?: string) => void;
}

const cardBtn =
  'min-w-0 flex-1 basis-[calc(50%-0.2rem)] rounded-lg border border-zinc-200 bg-white px-1 py-1.5 text-[10px] font-semibold text-zinc-800 transition hover:bg-zinc-50 sm:basis-0 sm:text-[11px]';

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
              「执行」将发送演示任务并进入 AI 任务（完整产品）或任务记录。请配置服务端 LLM_* 或工作区模型密钥；可下载/导入
              .agent.zip（≤{PACKAGE_UPLOAD_MAX_LABEL}）。详情弹层与集市用户视角一致。
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
                      title={`导入为新专家（≤${PACKAGE_UPLOAD_MAX_LABEL}）`}
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
                >
                  <button
                    type="button"
                    onClick={() => setDetail(a)}
                    className="flex w-full flex-1 items-start gap-2.5 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-claw-500/40"
                    aria-label={`查看 ${a.name} 详情`}
                  >
                    <AgentPortrait
                      agentId={a.id}
                      name={a.name}
                      icon={a.icon}
                      avatarUrl={a.avatarUrl}
                      avatarPresetId={a.avatarPresetId}
                      size={40}
                      className="shrink-0 rounded-xl"
                    />
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
                  </button>
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-black/[0.04] pt-2">
                    <button
                      type="button"
                      onClick={() => setEditorTarget(a.id)}
                      className={cardBtn}
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadAgentFile(a);
                        showToast(`已下载专家包 ${a.name}.agent.zip`);
                      }}
                      className={cardBtn}
                      title="下载专家包"
                    >
                      下载
                    </button>
                    <button type="button" onClick={() => handleInvoke(a)} className={cardBtn}>
                      执行
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

      {detail ? (
        <CatalogAgentDetailModal
          agent={detail}
          canRun={Boolean(detail.systemPrompt || getAgentPack(detail.id)?.systemPrompt)}
          onClose={() => setDetail(null)}
          onRun={(a) => {
            handleInvoke(a);
            setDetail(null);
          }}
          onToast={showToast}
          adminActions={{
            onEdit: () => {
              const id = detail.id;
              setDetail(null);
              setEditorTarget(id);
            },
          }}
        />
      ) : null}

      <AgentEditorModal target={editorTarget} onClose={() => setEditorTarget(null)} />
    </div>
  );
}
