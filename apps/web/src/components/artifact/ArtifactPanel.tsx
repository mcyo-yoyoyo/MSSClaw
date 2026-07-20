import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildDeliverablePreviews,
  downloadDeliverable,
  generateDeliverableFromMarkdown,
  hasDeliverableContent,
  isGeneratableKind,
  type DeliverablePreview,
} from '@/domain/deliverables';
import type { KbArtifact } from '@/domain/kbSearch';
import { isLlmConfigured } from '@/api/llmClient';
import { cn } from '@/lib/utils';
import { PptDeckPreview } from '@/components/artifact/PptDeckPreview';
import type { PptSlide } from '@/domain/pptSlides';

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

/** 交付件 HTML 预览：用 srcDoc，避免 blob URL + sandbox 在部分环境空白 */
function HtmlDeliverableFrame({ title, html }: { title: string; html: string }) {
  return (
    <iframe
      title={title}
      srcDoc={html}
      sandbox=""
      className="h-[min(72vh,640px)] w-full rounded-xl border border-zinc-200 bg-white"
    />
  );
}

function DeliverablePreviewView({ item }: { item: DeliverablePreview }) {
  if (item.kind === 'markdown' && item.markdown) {
    return (
      <div
        className="rounded-xl border border-zinc-200/80 bg-white p-4"
        dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(item.markdown) }}
      />
    );
  }

  if (item.kind === 'html' && item.html) {
    return <HtmlDeliverableFrame title={item.title} html={item.html} />;
  }

  if (item.kind === 'ppt' && item.slides) {
    return <PptDeckPreview slides={item.slides as PptSlide[]} />;
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
  onPush,
  onDeliverableDownload,
  onRunExample,
}: ArtifactPanelProps) {
  const baseDeliverables = useMemo(
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

  /** 任务上下文变化时重置已生成的 HTML/PPT */
  const contextKey = `${type}|${query}|${agentName}|${agentReply.slice(0, 80)}`;
  const [overrides, setOverrides] = useState<Record<string, Partial<DeliverablePreview>>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setOverrides({});
    setGenerateError(null);
    abortRef.current?.abort();
    abortRef.current = null;
    setGeneratingId(null);
  }, [contextKey]);

  const deliverables = useMemo(
    () =>
      baseDeliverables.map((item) => {
        const patch = overrides[item.id];
        return patch ? { ...item, ...patch, pendingGenerate: false } : item;
      }),
    [baseDeliverables, overrides],
  );

  useEffect(() => {
    if (!deliverables.length) {
      setActiveId(null);
      return;
    }
    if (!activeId || !deliverables.some((d) => d.id === activeId)) {
      setActiveId(deliverables[0]!.id);
    }
  }, [deliverables, activeId]);

  const active = deliverables.find((d) => d.id === activeId) ?? null;
  const markdownSource = deliverables.find((d) => d.kind === 'markdown')?.markdown ?? '';
  const activeHasContent = active ? hasDeliverableContent(active) : false;
  const canGenerate =
    active &&
    isGeneratableKind(active.kind) &&
    !activeHasContent &&
    Boolean(markdownSource.trim());

  const handleGenerate = async () => {
    if (!active || !type || !isGeneratableKind(active.kind) || !markdownSource.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setGeneratingId(active.id);
    setGenerateError(null);

    try {
      const generated = await generateDeliverableFromMarkdown(
        active.kind,
        markdownSource,
        { type, query, agentName, skills, agentReply, kbArtifact },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setOverrides((prev) => ({
        ...prev,
        [active.id]: {
          ...generated,
          pendingGenerate: false,
        },
      }));
    } catch (err) {
      if (controller.signal.aborted) return;
      setGenerateError(err instanceof Error ? err.message : '生成失败，请重试');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setGeneratingId((id) => (id === active.id ? null : id));
    }
  };

  return (
    <>
      <section className={cn('artifact-panel z-20 border-l border-zinc-200/80', collapsed && 'collapsed')}>
        <div className="glass-bar flex h-[52px] shrink-0 items-center justify-between border-b border-zinc-200/80 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
              title="收起交付件预览"
            >
              <i className="fa-solid fa-chevron-right text-xs" />
            </button>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700">
              <i className="fa-solid fa-file-lines text-xs" />
            </div>
            <p className="truncate text-[11px] font-semibold leading-none text-zinc-900">交付件预览</p>
          </div>
          <button
            type="button"
            onClick={onPush}
            disabled={!ready}
            className="apple-btn-primary flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
          >
            <i className="fa-solid fa-paper-plane text-[10px]" />
            推送
          </button>
        </div>

        {ready && deliverables.length > 0 && (
          <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200/80 bg-white px-3 py-2">
            <div className="flex flex-1 gap-1.5 overflow-x-auto scroll-hidden">
              {deliverables.map((item) => {
                const filled = hasDeliverableContent(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveId(item.id);
                      setGenerateError(null);
                    }}
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
                    {!filled && item.kind !== 'markdown' ? (
                      <span
                        className={cn(
                          'rounded px-1 text-[9px]',
                          activeId === item.id ? 'bg-white/15 text-white/70' : 'bg-zinc-200/80 text-zinc-500',
                        )}
                      >
                        空
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {active && activeHasContent ? (
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
              <h3 className="mb-1.5 text-[15px] font-semibold text-zinc-900">等待 Agent 交付件</h3>
              <p className="max-w-sm text-center text-[12px] leading-relaxed text-zinc-500">
                确认执行计划后，将先生成 Markdown；可再切换到 HTML / PPT，基于全文点击「开始生成」预览。
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

              {generatingId === active.id ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-16 text-center">
                  <i className="fa-solid fa-spinner fa-spin mb-3 text-2xl text-zinc-400" />
                  <p className="text-[13px] font-semibold text-zinc-800">
                    正在基于 Markdown 生成 {active.name}…
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {active.kind === 'html'
                      ? isLlmConfigured()
                        ? '模型提炼分析看板 · 本地模板排版中'
                        : '本地转写 HTML 报告中'
                      : isLlmConfigured()
                        ? '调用 AI 模型提炼幻灯片结构'
                        : '正在按章节拆解为幻灯片'}
                  </p>
                  <button
                    type="button"
                    onClick={() => abortRef.current?.abort()}
                    className="mt-4 rounded-lg border border-zinc-200 px-3 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
                  >
                    取消
                  </button>
                </div>
              ) : canGenerate ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-14 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500">
                    <i className={cn('fa-solid text-lg', active.icon)} />
                  </div>
                  <p className="text-[13px] font-semibold text-zinc-800">{active.name} 尚未生成</p>
                  <p className="mt-1.5 max-w-xs text-[11px] leading-relaxed text-zinc-500">
                    {active.kind === 'html'
                      ? isLlmConfigured()
                        ? '模型按场景提炼 KPI/发现/风险/行动，再用现有精美模板排版；正文仍完整保留 Markdown。'
                        : '将把当前 Markdown 全文排版为可预览 HTML 报告（未配置模型时走本地转写）。'
                      : `将按章节把 Markdown 拆成 16:9 幻灯片${isLlmConfigured() ? '（可调用模型提炼要点）' : ''}。`}
                  </p>
                  {generateError ? (
                    <p className="mt-2 max-w-xs text-[11px] text-red-600">{generateError}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleGenerate()}
                    className="apple-btn-primary mt-4 rounded-lg px-4 py-2 text-[12px] font-semibold text-white"
                  >
                    开始生成
                  </button>
                </div>
              ) : (
                <DeliverablePreviewView item={active} />
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
          title="展开交付件预览"
        >
          <i className="fa-solid fa-file-lines text-sm" />
          <span style={{ writingMode: 'vertical-rl' }}>预览</span>
        </button>
      )}
    </>
  );
}
