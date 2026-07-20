import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { PortalCasePreviewFile } from '@/domain/prototype/portalContent';
import {
  downloadPreviewFile,
  formatFileSize,
  previewKindIcon,
  previewKindLabel,
} from '@/domain/casePreview';

interface CaseDocumentPreviewProps {
  file: PortalCasePreviewFile;
  className?: string;
}

/** 场景案例附件在线预览：PDF/图片原生预览，Office 文档演示态排版 + 原文件下载 */
export function CaseDocumentPreview({ file, className }: CaseDocumentPreviewProps) {
  const [mode, setMode] = useState<'preview' | 'meta'>('preview');
  const kindLabel = previewKindLabel(file.kind);

  return (
    <section className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <i className={cn('fa-solid text-[11px]', previewKindIcon(file.kind))} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-zinc-800">{file.name}</p>
            <p className="text-[10px] text-zinc-400">
              {kindLabel} · {formatFileSize(file.size)} · 在线预览
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
            {(
              [
                ['preview', '在线预览'],
                ['meta', '文件信息'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[10px] font-semibold transition',
                  mode === id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => downloadPreviewFile(file)}
            className="rounded-lg border border-black/8 px-2.5 py-1 text-[10px] font-medium text-zinc-600 hover:bg-black/[0.03]"
          >
            <i className="fa-solid fa-download mr-1" />
            下载原件
          </button>
        </div>
      </div>

      {mode === 'meta' ? (
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3 text-[12px] text-zinc-600">
          <p>
            <span className="text-zinc-400">文件名：</span>
            {file.name}
          </p>
          <p className="mt-1">
            <span className="text-zinc-400">类型：</span>
            {kindLabel}（{file.mimeType || '未知 MIME'}）
          </p>
          <p className="mt-1">
            <span className="text-zinc-400">大小：</span>
            {formatFileSize(file.size)}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
            演示环境将附件保存在本地浏览器；正式环境可对接对象存储与 Office Online / PDF 渲染服务。
          </p>
        </div>
      ) : file.kind === 'pdf' ? (
        <iframe
          title={file.name}
          src={file.dataUrl}
          className="h-[42vh] min-h-[280px] w-full rounded-xl border border-zinc-200 bg-white"
        />
      ) : file.kind === 'image' ? (
        <div className="max-h-[42vh] overflow-auto rounded-xl border border-zinc-200 bg-[#f3f3f5] p-3">
          <img src={file.dataUrl} alt={file.name} className="mx-auto max-h-[38vh] object-contain" />
        </div>
      ) : (
        <div className="max-h-[42vh] space-y-3 overflow-y-auto rounded-xl border border-zinc-200 bg-[#f3f3f5] p-3">
          {[1, 2, 3].map((page) => (
            <div
              key={page}
              className="mx-auto min-h-[180px] max-w-[520px] rounded-sm bg-white px-6 py-5 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-2">
                <span className="text-[10px] font-semibold text-zinc-500">
                  {kindLabel} 预览 · 第 {page} 页
                </span>
                <span className="text-[10px] text-zinc-300">{file.name}</span>
              </div>
              <p className="text-[13px] font-semibold text-zinc-800">
                {page === 1 ? file.name.replace(/\.[^.]+$/, '') : `续页 ${page}`}
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-zinc-600">
                {page === 1
                  ? `本页为「${kindLabel}」在线预览演示排版。已上传原文件，可点击右上角「下载原件」查看完整 Office 内容；正式环境将嵌入 Office Online / 本地渲染组件。`
                  : '演示预览仅展示版式骨架，正文与图表以原文件为准。可用于总裁演示时快速对照场景案例成效卡。'}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 rounded-md bg-gradient-to-br from-zinc-100 to-zinc-50"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
