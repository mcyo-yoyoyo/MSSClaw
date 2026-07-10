import { useMemo } from 'react';
import { KnowledgeCard } from '@/components/artifact/KnowledgeCard';
import { MarketingBoard } from '@/components/artifact/MarketingBoard';
import { buildDeliverables } from '@/domain/deliverables';
import type { KbArtifact } from '@/domain/kbSearch';
import { cn } from '@/lib/utils';

interface ArtifactPanelProps {
  ready: boolean;
  type: 'marketing' | 'knowledge' | null;
  query?: string;
  kbArtifact?: KbArtifact | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onExport: () => void;
  onPush: () => void;
  onCitationClick?: (docId: string, citationIndex: number, snippet: string) => void;
  onDeliverableDownload?: (name: string) => void;
  onRunExample?: (type: 'marketing' | 'knowledge' | 'warroom') => void;
}

export function ArtifactPanel({
  ready,
  type,
  query = '',
  kbArtifact = null,
  collapsed,
  onToggleCollapse,
  onExport,
  onPush,
  onCitationClick,
  onDeliverableDownload,
  onRunExample,
}: ArtifactPanelProps) {
  const deliverables = useMemo(
    () => (ready && type ? buildDeliverables(type, query) : []),
    [ready, type, query],
  );

  return (
    <>
      <section className={cn('artifact-panel z-20 border-l border-zinc-200/80', collapsed && 'collapsed')}>
        <div className="glass-bar flex h-[52px] shrink-0 items-center justify-between border-b border-zinc-200/80 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
              title="收起交付物预览"
            >
              <i className="fa-solid fa-chevron-right text-xs" />
            </button>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700">
              <i className="fa-solid fa-file-lines text-xs" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold leading-none text-zinc-900">交付物预览</p>
              <p className="mt-0.5 truncate text-[10px] text-zinc-500">看板 · 报告 · 引用溯源</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onExport}
              disabled={!ready}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-40"
            >
              <i className="fa-solid fa-file-export text-[10px] text-zinc-400" />
              导出
            </button>
            <button
              type="button"
              onClick={onPush}
              disabled={!ready}
              className="apple-btn-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
            >
              <i className="fa-solid fa-paper-plane text-[10px]" />
              推送作战室
            </button>
          </div>
        </div>

        {ready && deliverables.length > 0 && (
          <div className="flex shrink-0 items-center gap-3 border-b border-zinc-200/80 bg-white px-4 py-2">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">交付物</span>
            <div className="flex flex-1 flex-wrap gap-1.5">
              {deliverables.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    item.onDownload();
                    onDeliverableDownload?.(item.name);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] transition hover:border-zinc-300 hover:bg-white"
                >
                  <i className={cn('fa-solid text-[10px]', item.icon, item.iconClass)} />
                  <span className="font-medium text-zinc-700">{item.name}</span>
                  <span className="mono text-[10px] text-zinc-400">{item.size}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative min-h-0 flex-1 overflow-hidden p-4">
          {!ready && (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="canvas-empty-icon relative mb-4 flex h-20 w-20 items-center justify-center rounded-xl border border-zinc-200 shadow-sm">
                <i className="fa-solid fa-wand-magic-sparkles text-3xl text-zinc-400" />
              </div>
              <h3 className="mb-1.5 text-[15px] font-semibold text-zinc-900">等待 Agent 交付物</h3>
              <p className="max-w-sm text-center text-[12px] leading-relaxed text-zinc-500">
                描述任务并确认执行计划后，可验证的看板与报告将在此展示。
              </p>
              {onRunExample && (
                <div className="mt-4 grid w-full max-w-sm grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onRunExample('marketing')}
                    className="task-card apple-card rounded-xl p-3 text-left"
                  >
                    <p className="flex items-center gap-2 text-[12px] font-semibold text-zinc-800">
                      <i className="fa-solid fa-chart-column text-zinc-600" />
                      多源数据分析
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">/数据分析 · 代表处 SO 排名</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRunExample('knowledge')}
                    className="task-card apple-card rounded-xl p-3 text-left"
                  >
                    <p className="flex items-center gap-2 text-[12px] font-semibold text-zinc-800">
                      <i className="fa-solid fa-file-shield text-zinc-600" />
                      文档合规筛查
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">/合规筛查 · 医疗用语检查</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRunExample('warroom')}
                    className="task-card apple-card rounded-xl p-3 text-left"
                  >
                    <p className="flex items-center gap-2 text-[12px] font-semibold text-zinc-800">
                      <i className="fa-solid fa-tags text-zinc-600" />
                      价格监测周报
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">/价格监测 · 18 国 offer 比对</p>
                  </button>
                </div>
              )}
            </div>
          )}

          {ready && (
            <div className="scroll-hidden h-full overflow-y-auto">
              {type === 'marketing' ? (
                <MarketingBoard />
              ) : (
                <KnowledgeCard artifact={kbArtifact} onCitationClick={onCitationClick} />
              )}
            </div>
          )}
        </div>
      </section>

      {collapsed && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="artifact-panel-expand-tab visible flex flex-col items-center justify-center gap-1 text-[10px] font-semibold"
          title="展开交付物预览"
        >
          <i className="fa-solid fa-file-lines text-sm" />
          <span style={{ writingMode: 'vertical-rl' }}>预览</span>
        </button>
      )}
    </>
  );
}
