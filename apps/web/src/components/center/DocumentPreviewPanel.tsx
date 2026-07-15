import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export interface DocumentPreviewMeta {
  title: string;
  typeLabel: string;
  author?: string;
  updatedAt?: string;
  size?: string;
  pages?: number;
  summary: string;
  /** 模拟在线预览正文（多段） */
  bodyParagraphs?: string[];
}

interface DocumentPreviewPanelProps {
  meta: DocumentPreviewMeta;
  className?: string;
}

/** 知识库 / 案例库共用的「概要 + 在线预览」详情模式 */
export function DocumentPreviewPanel({ meta, className }: DocumentPreviewPanelProps) {
  const [mode, setMode] = useState<'summary' | 'preview'>('preview');
  const pages = Math.max(1, meta.pages ?? 3);

  const paragraphs = useMemo(() => {
    if (meta.bodyParagraphs?.length) return meta.bodyParagraphs;
    const base = meta.summary.trim() || '暂无正文内容。';
    return [
      base,
      `【第 2 节】本文档「${meta.title}」已纳入企业知识库，支持 RAG 检索与引用溯源。以下为演示用在线预览排版，真实环境将渲染原文件页。`,
      `【附录】密级与分发范围以权限策略为准；打印、下载与外发需遵循公司信息安全规范。更新时间：${meta.updatedAt ?? '—'}。`,
    ];
  }, [meta]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
          {meta.typeLabel}
        </span>
        {meta.size ? (
          <span className="text-[10px] text-zinc-400">{meta.size}</span>
        ) : null}
        {meta.author ? (
          <span className="text-[10px] text-zinc-400">作者 {meta.author}</span>
        ) : null}
        {meta.updatedAt ? (
          <span className="text-[10px] text-zinc-400">更新 {meta.updatedAt}</span>
        ) : null}
      </div>

      <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
        {(
          [
            ['preview', '在线预览'],
            ['summary', '文档概要'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              'rounded-md px-3 py-1 text-[11px] font-semibold transition',
              mode === id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'summary' ? (
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 text-[12px] leading-relaxed text-zinc-600 whitespace-pre-wrap">
          {meta.summary}
        </div>
      ) : (
        <div className="max-h-[52vh] space-y-3 overflow-y-auto rounded-xl border border-zinc-200 bg-[#f3f3f5] p-3">
          {Array.from({ length: Math.min(pages, 4) }, (_, i) => (
            <article
              key={i}
              className="mx-auto min-h-[180px] max-w-xl rounded-sm bg-white px-8 py-7 shadow-sm ring-1 ring-black/5"
            >
              <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-2">
                <p className="truncate text-[11px] font-semibold text-zinc-800">{meta.title}</p>
                <p className="shrink-0 text-[10px] text-zinc-400">
                  {i + 1} / {pages}
                </p>
              </div>
              <p className="text-[12px] leading-7 text-zinc-700">{paragraphs[i % paragraphs.length]}</p>
              {i === 0 ? (
                <div className="mt-6 space-y-2">
                  <div className="h-2 w-full rounded bg-zinc-100" />
                  <div className="h-2 w-11/12 rounded bg-zinc-100" />
                  <div className="h-2 w-4/5 rounded bg-zinc-100" />
                </div>
              ) : null}
            </article>
          ))}
          <p className="text-center text-[10px] text-zinc-400">演示预览 · 正式环境将加载原文件流</p>
        </div>
      )}
    </div>
  );
}
