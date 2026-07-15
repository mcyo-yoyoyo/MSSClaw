import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PrototypeToolSeed } from '@/domain/prototype/types';
import {
  ASSET_VISIBILITY_LABELS,
  getDeptLabel,
  getRegionLabel,
} from '@/domain/orgTaxonomy';
import {
  CenterModal,
  CenterPageHeader,
  CenterSearchInput,
  StatCardGrid,
} from '@/components/center/CenterShell';
import { OrgAssetFilterBar } from '@/components/center/OrgAssetFilters';
import { ToolEditorModal, type ToolEditorTarget } from '@/components/center/ToolEditorModal';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { isAiSaasTool } from '@/domain/portalNavigation';

function openTool(tool: PrototypeToolSeed) {
  if (tool.sourceType === 'external' && tool.homepageUrl) {
    window.open(tool.homepageUrl, '_blank', 'noopener,noreferrer');
    return true;
  }
  return false;
}

export function ToolCenterPage() {
  const {
    tools,
    toolSearch,
    setToolSearch,
    toolDeptFilter,
    toolRegionFilter,
    toolScopeFilter,
    toolEfficiencyFilter,
    setToolDeptFilter,
    setToolRegionFilter,
    setToolScopeFilter,
    setToolEfficiencyFilter,
    filteredTools,
    bumpToolInvokes,
    showToast,
  } = useMarketplaceStore();

  const consumeToolId = useNavigationIntentStore((s) => s.consumeToolId);
  const pendingToolId = useNavigationIntentStore((s) => s.pendingToolId);
  const [detail, setDetail] = useState<PrototypeToolSeed | null>(null);
  const [editorTarget, setEditorTarget] = useState<ToolEditorTarget>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const list = filteredTools();

  useEffect(() => {
    if (!pendingToolId) return;
    const id = consumeToolId();
    if (!id) return;
    const found = tools.find((t) => t.id === id);
    if (found) setDetail(found);
    else showToast(`未找到工具：${id}`);
  }, [pendingToolId, tools, consumeToolId, showToast]);

  const stats = useMemo(() => {
    const pub = tools.filter((t) => t.published).length;
    const external = tools.filter((t) => t.sourceType === 'external').length;
    const totalInvokes = tools.reduce((n, t) => n + t.invokes, 0);
    return [
      ['Tool 总数', tools.length],
      ['已发布', pub],
      ['外部工具', external],
      ['总打开/调用', totalInvokes.toLocaleString()],
    ] as [string, string | number][];
  }, [tools]);

  const handleOpen = (tool: PrototypeToolSeed) => {
    bumpToolInvokes(tool.id);
    if (openTool(tool)) {
      showToast(`已打开外部工具：${tool.name}`);
      return;
    }
    showToast(`已记录调用：${tool.name}（内部连接器）`);
  };

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl">
        <CenterPageHeader
          title="工具"
          subtitle="连接器与外部工具上架 · 按 NP / 区域发现与托管"
          tip={
            <>
              各 NP 与区域可将内外部工具登记上架。可见性：全员 / 本组织（有区域则同区域）/ 仅发布方。欧洲账号默认看不到拉美「本组织」工具，但可看到全员公开工具。
            </>
          }
          tip={
            <>
              各机关职能与一线区域可将内外部工具登记上架。可见性：全员 / 本组织（有区域则同区域）/ 仅发布方。欧洲账号默认看不到拉美「本组织」工具，但可看到全员公开工具。
            </>
          }
          actions={
            <>
              <CenterSearchInput value={toolSearch} onChange={setToolSearch} placeholder="搜索 Tool…" />
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
                        setEditorTarget('new');
                        setMoreOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-zinc-700 hover:bg-zinc-50"
                    >
                      <i className="fa-solid fa-plug w-3.5 text-[10px] text-zinc-400" />
                      登记连接器
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setEditorTarget('new-external')}
                className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition"
              >
                <i className="fa-solid fa-plus mr-1" />
                登记外部工具
              </button>
            </>
          }
        />

        <StatCardGrid items={stats} />

        <OrgAssetFilterBar
          deptFilter={toolDeptFilter}
          regionFilter={toolRegionFilter}
          efficiencyFilter={toolEfficiencyFilter === 'experience' ? 'all' : toolEfficiencyFilter}
          scopeFilter={toolScopeFilter}
          onDeptChange={setToolDeptFilter}
          onRegionChange={setToolRegionFilter}
          onEfficiencyChange={(id) => setToolEfficiencyFilter(id)}
          onScopeChange={setToolScopeFilter}
          showScope
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.length ? (
            list.map((t) => (
              <div key={t.id} className="market-card apple-card flex flex-col p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <ToolLogo name={t.name} logoUrl={t.logoUrl} icon={t.icon} size={36} />
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        t.published
                          ? 'border border-zinc-200 bg-claw-50 text-zinc-700'
                          : 'bg-black/[0.04] text-[#86868b]',
                      )}
                    >
                      {t.published ? '已发布' : '草稿'}
                    </span>
                    {(t.sourceType === 'external' || isAiSaasTool(t)) && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
                        {isAiSaasTool(t) ? 'AI SaaS' : '外部'}
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="text-[13px] font-semibold text-zinc-900">{t.name}</h3>
                <p className="mt-1 flex-1 text-[11px] text-zinc-500">{t.desc}</p>
                <p className="mt-1.5 text-[10px] text-zinc-400">
                  {(t.ownerDeptIds ?? []).slice(0, 2).map(getDeptLabel).join(' · ') || '未指定职能'}
                  {t.ownerRegionId ? ` · ${getRegionLabel(t.ownerRegionId)}` : ''}
                  {' · '}
                  {ASSET_VISIBILITY_LABELS[t.visibility ?? 'public']}
                </p>
                <p className="mt-1 text-[10px] text-zinc-400">
                  {t.publisher || t.author} · {t.invokes} 次
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[9px] text-[#1d1d1f]">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2 border-t border-black/[0.04] pt-2.5">
                  <button
                    type="button"
                    onClick={() => handleOpen(t)}
                    className="apple-btn-primary flex-1 rounded-lg py-1.5 text-[11px] font-semibold text-white transition"
                  >
                    {t.sourceType === 'external' ? '打开' : '调用'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetail(t)}
                    className="rounded-lg border border-black/8 px-2.5 py-1.5 text-[11px] font-medium transition hover:bg-black/[0.03]"
                  >
                    详情
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTarget(t.id)}
                    className="rounded-lg border border-black/8 px-2.5 py-1.5 text-[11px] font-medium transition hover:bg-black/[0.03]"
                  >
                    编辑
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="apple-card col-span-3 p-8 text-center text-[#86868b]">未找到匹配的 Tool</div>
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
                  handleOpen(detail);
                  setDetail(null);
                }}
                className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
              >
                {detail.sourceType === 'external' ? '打开链接' : '调用'}
              </button>
              <button type="button" onClick={() => setDetail(null)} className="rounded-xl border border-black/8 px-4 py-2 text-[12px]">
                关闭
              </button>
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-2 text-[13px]">
            <p className="text-[#86868b]">{detail.desc}</p>
            <p className="text-[11px] text-[#86868b]">
              发布方：{detail.publisher || detail.author}
              {detail.ownerRegionId ? ` · ${getRegionLabel(detail.ownerRegionId)}` : ''}
            </p>
            {detail.homepageUrl && (
              <p className="break-all text-[11px] text-claw-600">{detail.homepageUrl}</p>
            )}
          </div>
        )}
      </CenterModal>

      <ToolEditorModal target={editorTarget} onClose={() => setEditorTarget(null)} />
    </div>
  );
}
