import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PortalCasePreviewFile } from '@/domain/prototype/portalContent';
import {
  downloadPreviewFile,
  formatFileSize,
  hasPreviewPayload,
  previewKindIcon,
  previewKindLabel,
  resolvePreviewSrc,
} from '@/domain/casePreview';
import {
  parseOfficePreview,
  type OfficePreviewPayload,
} from '@/domain/caseOfficePreview';

interface CaseDocumentPreviewProps {
  file: PortalCasePreviewFile;
  /** 下载按钮指向的原件；缺省与 file 相同（双附件时传 PPT 原件） */
  downloadFile?: PortalCasePreviewFile | null;
  className?: string;
  /** immersive：近全屏预览区，隐藏次要控件 */
  variant?: 'default' | 'immersive';
  /** 隐藏顶栏文件信息（画廊自带标题时） */
  hideChrome?: boolean;
}

/** 场景案例附件在线预览：PDF/图片/视频原生；Office 本地解析正文；其它尝试嵌入 */
export function CaseDocumentPreview({
  file,
  downloadFile,
  className,
  variant = 'default',
  hideChrome = false,
}: CaseDocumentPreviewProps) {
  const [mode, setMode] = useState<'preview' | 'meta'>('preview');
  const kindLabel = previewKindLabel(file.kind);
  const immersive = variant === 'immersive';
  const downloadTarget = hasPreviewPayload(downloadFile) ? downloadFile! : file;
  const isTextOutlineKind = file.kind === 'pptx' || file.kind === 'docx';
  const previewModeLabel = isTextOutlineKind
    ? '文本大纲预览（非版式效果）'
    : '在线预览';
  const src = resolvePreviewSrc(file);

  return (
    <section
      className={cn(
        immersive ? 'flex h-full min-h-0 flex-col gap-2' : 'space-y-2',
        className,
      )}
    >
      {!hideChrome ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <i className={cn('fa-solid text-[11px]', previewKindIcon(file.kind))} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-zinc-800">{file.name}</p>
              <p className="text-[10px] text-zinc-400">
                {kindLabel} · {formatFileSize(file.size)} · {previewModeLabel}
                {downloadTarget !== file
                  ? ` · 原件 ${previewKindLabel(downloadTarget.kind)}`
                  : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {!immersive ? (
              <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
                {(
                  [
                    ['preview', isTextOutlineKind ? '文本大纲' : '在线预览'],
                    ['meta', '文件信息'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMode(id)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-[10px] font-semibold transition',
                      mode === id
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-800',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => downloadPreviewFile(downloadTarget)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-[10px] font-medium',
                isTextOutlineKind || downloadTarget !== file
                  ? 'bg-zinc-900 font-semibold text-white hover:bg-zinc-800'
                  : 'border border-black/8 text-zinc-600 hover:bg-black/[0.03]',
              )}
            >
              <i className="fa-solid fa-download mr-1" />
              下载原件
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'meta' && !immersive ? (
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
        </div>
      ) : (
        <PreviewBody file={file} immersive={immersive} kindLabel={kindLabel} src={src} />
      )}
    </section>
  );
}

function PreviewBody({
  file,
  immersive,
  kindLabel,
  src,
}: {
  file: PortalCasePreviewFile;
  immersive: boolean;
  kindLabel: string;
  src: string | null;
}) {
  const frame = cn(
    'w-full rounded-xl border border-zinc-200 bg-white',
    immersive ? 'min-h-0 flex-1' : 'h-[42vh] min-h-[280px]',
  );

  if (!src) {
    return (
      <div className={cn(frame, 'flex items-center justify-center text-[12px] text-zinc-500')}>
        无可预览内容
      </div>
    );
  }

  if (file.kind === 'pdf') {
    return <iframe title={file.name} src={src} className={frame} />;
  }

  if (file.kind === 'image') {
    return (
      <div
        className={cn(
          'flex items-center justify-center overflow-auto rounded-xl border border-zinc-200 bg-[#0f0f10]',
          immersive ? 'min-h-0 flex-1' : 'max-h-[42vh] p-3',
        )}
      >
        <img
          src={src}
          alt={file.name}
          className={cn(
            'object-contain',
            immersive ? 'max-h-full max-w-full' : 'mx-auto max-h-[38vh]',
          )}
        />
      </div>
    );
  }

  if (file.kind === 'video') {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-xl border border-zinc-200 bg-black',
          immersive ? 'min-h-0 flex-1' : 'h-[42vh] min-h-[280px]',
        )}
      >
        <video controls playsInline src={src} className="max-h-full max-w-full">
          <track kind="captions" />
        </video>
      </div>
    );
  }

  if (file.kind === 'docx' || file.kind === 'pptx' || file.kind === 'xlsx') {
    return <OfficePreviewBody file={file} immersive={immersive} kindLabel={kindLabel} />;
  }

  // other：尝试浏览器内嵌，失败则提示下载
  return (
    <div className={cn('flex flex-col gap-2', immersive && 'min-h-0 flex-1')}>
      <object data={src} type={file.mimeType || undefined} className={frame}>
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-[13px] text-zinc-600">
            当前浏览器无法直接预览「{kindLabel}」，请下载原件查看。
          </p>
          <button
            type="button"
            onClick={() => downloadPreviewFile(file)}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white"
          >
            下载 {kindLabel}
          </button>
        </div>
      </object>
    </div>
  );
}

function OfficePreviewBody({
  file,
  immersive,
  kindLabel,
}: {
  file: PortalCasePreviewFile;
  immersive: boolean;
  kindLabel: string;
}) {
  const [payload, setPayload] = useState<OfficePreviewPayload | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setPayload(null);
    void parseOfficePreview(file).then((parsed) => {
      if (cancelled) return;
      setLoading(false);
      if (!parsed) setError(true);
      else setPayload(parsed);
    });
    return () => {
      cancelled = true;
    };
  }, [file.dataUrl, file.url, file.kind, file.name]);

  const shell = cn(
    'overflow-y-auto rounded-xl border border-zinc-200 bg-[#f3f3f5] p-3',
    immersive ? 'min-h-0 flex-1' : 'max-h-[42vh]',
  );

  if (loading) {
    return (
      <div className={cn(shell, 'flex items-center justify-center text-[12px] text-zinc-500')}>
        正在解析 {kindLabel} 预览…
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className={cn(shell, 'flex flex-col items-center justify-center gap-3 text-center')}>
        <p className="text-[13px] text-zinc-600">无法解析该 {kindLabel}，请下载原件查看完整内容。</p>
        <button
          type="button"
          onClick={() => downloadPreviewFile(file)}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white"
        >
          下载完整 {kindLabel}
        </button>
      </div>
    );
  }

  if (payload.kind === 'docx') {
    return (
      <div className={shell}>
        <article
          className={cn(
            'mx-auto rounded-sm bg-white px-6 py-5 shadow-sm',
            immersive ? 'max-w-4xl' : 'max-w-[640px]',
          )}
        >
          <p className="mb-3 border-b border-zinc-100 pb-2 text-[10px] font-semibold text-zinc-500">
            文本大纲预览 · {file.name}
          </p>
          <div className="space-y-2.5 text-[13px] leading-relaxed text-zinc-700">
            {payload.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </article>
      </div>
    );
  }

  if (payload.kind === 'pptx') {
    return (
      <div className={shell}>
        <div
          className={cn(
            'mx-auto mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2',
            immersive ? 'max-w-4xl' : 'max-w-[640px]',
          )}
        >
          <p className="text-[11px] leading-snug text-amber-900/80">
            当前为文本大纲预览，不保留幻灯片版式、图表与动画。
          </p>
          <button
            type="button"
            onClick={() => downloadPreviewFile(file)}
            className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-zinc-800"
          >
            <i className="fa-solid fa-download mr-1" />
            下载原件查看幻灯片效果
          </button>
        </div>
        <div className="space-y-3">
          {payload.slides.map((slide, i) => (
            <div
              key={i}
              className={cn(
                'mx-auto rounded-sm bg-white px-6 py-5 shadow-sm',
                immersive ? 'min-h-[200px] max-w-4xl' : 'min-h-[160px] max-w-[640px]',
              )}
            >
              <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-2">
                <span className="text-[10px] font-semibold text-zinc-500">
                  文本大纲 · 第 {i + 1} 页（非幻灯片效果）
                </span>
                <span className="truncate text-[10px] text-zinc-300">{file.name}</span>
              </div>
              <p className="text-[14px] font-semibold text-zinc-900">{slide.title}</p>
              <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-zinc-600">
                {slide.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      {payload.sheets.map((sheet) => (
        <div key={sheet.name} className="mb-3 overflow-x-auto rounded-lg bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-3 py-2 text-[11px] font-semibold text-zinc-700">
            {sheet.name}
          </div>
          <table className="min-w-full border-collapse text-left text-[11px]">
            <tbody>
              {sheet.rows.map((row, ri) => (
                <tr key={ri} className={ri === 0 ? 'bg-zinc-50 font-semibold' : undefined}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="max-w-[180px] truncate border border-zinc-100 px-2 py-1.5 text-zinc-700"
                      title={cell}
                    >
                      {cell || ' '}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
