import { useEffect, useMemo, useState } from 'react';
import { KnowledgeCard } from '@/components/artifact/KnowledgeCard';
import { MarketingBoard } from '@/components/artifact/MarketingBoard';
import {
  buildDeliverablePreviews,
  downloadDeliverable,
  type DeliverablePreview,
} from '@/domain/deliverables';
import type { KbArtifact } from '@/domain/kbSearch';
import { cn } from '@/lib/utils';

interface ArtifactPanelProps {
  ready: boolean;
  type: 'marketing' | 'knowledge' | null;
  query?: string;
  agentName?: string;
  skills?: string[];
  agentReply?: string;
  kbArtifact?: KbArtifact | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onExport: () => void;
  onPush: () => void;
  onCitationClick?: (docId: string, citationIndex: number, snippet: string) => void;
  onDeliverableDownload?: (name: string) => void;
  onRunExample?: (type: 'marketing' | 'knowledge' | 'warroom') => void;
}

function renderSimpleMarkdown(md: string): string {
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.*)$/gm, '<h3 class="mt-3 mb-1 text-[13px] font-semibold text-zinc-900">$1</h3>')
    .replace(/^## (.*)$/gm, '<h2 class="mt-4 mb-1.5 text-[15px] font-semibold text-zinc-900">$1</h2>')
    .replace(/^# (.*)$/gm, '<h1 class="mb-2 text-[17px] font-bold text-zinc-900">$1</h1>')
    .replace(/^> (.*)$/gm, '<p class="my-2 rounded-lg bg-zinc-100 px-3 py-2 text-[12px] text-zinc-600">$1</p>')
    .replace(/^\- (.*)$/gm, '<li class="ml-4 list-disc text-[12px] leading-relaxed text-zinc-700">$1</li>')
    .replace(/^\d+\. (.*)$/gm, '<li class="ml-4 list-decimal text-[12px] leading-relaxed text-zinc-700">$1</li>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr class="my-3 border-zinc-200"/>')
    .replace(/\n\n/g, '<br/><br/>');
}

function DeliverablePreviewView({
  item,
  kbArtifact,
  onCitationClick,
}: {
  item: DeliverablePreview;
  kbArtifact?: KbArtifact | null;
  onCitationClick?: (docId: string, citationIndex: number, snippet: string) => void;
}) {
  if (item.kind === 'board') return <MarketingBoard />;
  if (item.kind === 'knowledge') {
    return <KnowledgeCard artifact={kbArtifact} onCitationClick={onCitationClick} />;
  }

  if (item.kind === 'markdown' && item.markdown) {
    return (
      <div
        className="rounded-xl border border-zinc-200/80 bg-white p-4"
        dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(item.markdown) }}
      />
    );
  }

  if (item.kind === 'html' && item.html) {
    return (
      <iframe
        title={item.title}
        srcDoc={item.html}
        sandbox=""
        className="h-[min(70vh,560px)] w-full rounded-xl border border-zinc-200 bg-white"
      />
    );
  }

  if (item.kind === 'pdf' && item.pdfPages) {
    return (
      <div className="space-y-3 rounded-xl bg-[#f3f3f5] p-3">
        {item.pdfPages.map((page, i) => (
          <article
            key={i}
            className="mx-auto min-h-[200px] max-w-lg rounded-sm bg-white px-8 py-7 shadow-sm ring-1 ring-black/5"
          >
            <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="text-[13px] font-semibold text-zinc-900">{page.heading}</h3>
              <span className="text-[10px] text-zinc-400">
                {i + 1} / {item.pdfPages!.length}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-[12px] leading-7 text-zinc-700">{page.body}</p>
          </article>
        ))}
      </div>
    );
  }

  if (item.kind === 'ppt' && item.slides) {
    return (
      <div className="space-y-3">
        {item.slides.map((slide, i) => (
          <div
            key={i}
            className="aspect-[16/9] overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-900 to-zinc-700 p-6 text-white shadow-sm"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
              Slide {i + 1}
            </p>
            <h3 className="mt-2 text-[18px] font-semibold">{slide.title}</h3>
            <ul className="mt-4 space-y-2 text-[13px] text-white/85">
              {slide.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  if (item.kind === 'xlsx' && item.table) {
    return (
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[360px] text-left text-[12px]">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-[10px] font-bold uppercase text-zinc-500">
            <tr>
              {item.table.headers.map((h) => (
                <th key={h} className="px-3 py-2.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {item.table.rows.map((row, i) => (
              <tr key={i} className="border-b border-zinc-100 last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2.5 text-zinc-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-[12px] text-zinc-500">
      暂无可预览内容
    </div>
  );
}

export function ArtifactPanel({
  ready,
  type,
  query = '',
  agentName = '',
  skills = [],
  agentReply = '',
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
    () =>
      ready && type
        ? buildDeliverablePreviews({
            type,
            query,
            agentName,
            skills,
            agentReply,
            kbArtifact,
          })
        : [],
    [ready, type, query, agentName, skills, agentReply, kbArtifact],
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!deliverables.length) {
      setActiveId(null);
      return;
    }
    if (!activeId || !deliverables.some((d) => d.id === activeId)) {
      setActiveId(deliverables[0].id);
    }
  }, [deliverables, activeId]);

  const active = deliverables.find((d) => d.id === activeId) ?? null;

  const contextLine = [
    agentName || null,
    skills.length ? skills.slice(0, 2).join('、') : null,
    query ? (query.length > 28 ? `${query.slice(0, 28)}…` : query) : null,
  ]
    .filter(Boolean)
    .join(' · ');

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
              <p className="mt-0.5 truncate text-[10px] text-zinc-500">
                {ready ? contextLine || 'Markdown · HTML · PDF · PPT' : '等待任务执行后展示'}
              </p>
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
          <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200/80 bg-white px-3 py-2">
            <div className="flex flex-1 gap-1.5 overflow-x-auto scroll-hidden">
              {deliverables.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition',
                    activeId === item.id
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white',
                  )}
                >
                  <i
                    className={cn(
                      'text-[10px]',
                      item.icon.startsWith('fa-') ? `fa-solid ${item.icon}` : item.icon,
                      activeId === item.id ? 'text-white/80' : item.iconClass,
                    )}
                  />
                  <span className="font-medium">{item.name}</span>
                </button>
              ))}
            </div>
            {active ? (
              <button
                type="button"
                onClick={() => {
                  downloadDeliverable(active, query);
                  onDeliverableDownload?.(active.name);
                }}
                className="shrink-0 rounded-lg border border-zinc-200 px-2 py-1.5 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50"
                title="下载当前交付件"
              >
                <i className="fa-solid fa-download" />
              </button>
            ) : null}
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
                确认执行计划后，将按所选 Agent / Skill 生成 Markdown、HTML、PDF、PPT 等可预览交付件。
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

          {ready && active && (
            <div className="scroll-hidden h-full overflow-y-auto">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-zinc-800">{active.title}</p>
                <span className="text-[10px] text-zinc-400">{active.size}</span>
              </div>
              <DeliverablePreviewView
                item={active}
                kbArtifact={kbArtifact}
                onCitationClick={onCitationClick}
              />
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
