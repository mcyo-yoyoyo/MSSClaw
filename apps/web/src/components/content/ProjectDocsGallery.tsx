import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PortalContentItem } from '@/domain/prototype/portalContent';
import {
  downloadPreviewFile,
  previewKindIcon,
  previewKindLabel,
} from '@/domain/casePreview';
import { CaseDocumentPreview } from '@/components/content/CaseDocumentPreview';

export type ProjectDocSlide = {
  id: string;
  title: string;
  kind: 'pdf' | 'pptx' | 'docx' | 'xlsx' | 'image' | 'video' | 'other' | 'link';
  previewFile?: NonNullable<PortalContentItem['previewFile']>;
  url?: string;
};

/** 从项目上架内容提取可预览文档 / 链接（扁平，无分类 Tab） */
export function buildProjectDocSlides(items: PortalContentItem[]): ProjectDocSlide[] {
  const slides: ProjectDocSlide[] = [];
  for (const item of items) {
    if (item.previewFile?.dataUrl) {
      slides.push({
        id: `${item.id}-file`,
        title: item.title || item.previewFile.name,
        kind: item.previewFile.kind,
        previewFile: item.previewFile,
        url: item.homepageUrl,
      });
      continue;
    }
    if (item.homepageUrl && item.homepageUrl !== '#') {
      slides.push({
        id: `${item.id}-link`,
        title: item.title,
        kind: 'link',
        url: item.homepageUrl,
      });
    }
  }
  return slides;
}

export function ProjectDocsGallery({
  items,
  initialItemId,
  className,
}: {
  items: PortalContentItem[];
  initialItemId?: string;
  className?: string;
}) {
  const slides = useMemo(() => buildProjectDocSlides(items), [items]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!slides.length) {
      setIndex(0);
      return;
    }
    if (initialItemId) {
      const i = slides.findIndex(
        (s) => s.id === `${initialItemId}-file` || s.id === `${initialItemId}-link`,
      );
      setIndex(i >= 0 ? i : 0);
      return;
    }
    setIndex(0);
  }, [slides, initialItemId]);

  const scrollTo = useCallback((i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(slides.length - 1, i));
    setIndex(clamped);
    const child = el.children[clamped] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [slides.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !slides.length) return;
    const child = el.children[index] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
  }, [slides.length]); // eslint-disable-line react-hooks/exhaustive-deps -- only re-snap when slides change

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth || 1;
      const next = Math.round(el.scrollLeft / w);
      setIndex((prev) => (next !== prev ? Math.max(0, Math.min(slides.length - 1, next)) : prev));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [slides.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollTo(index - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollTo(index + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, scrollTo]);

  if (!slides.length) {
    return (
      <div
        className={cn(
          'flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 text-center',
          className,
        )}
      >
        <i className="fa-solid fa-book-open mb-2 text-xl text-zinc-300" />
        <p className="text-[13px] font-medium text-zinc-600">暂无上传的项目文档</p>
        <p className="mt-1 text-[12px] text-zinc-400">
          运营侧上传 PPT / PDF / 图片 / 视频或配置链接后可在此预览
        </p>
      </div>
    );
  }

  const current = slides[index]!;

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-3', className)}>
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <i className={cn('fa-solid text-[11px]', previewKindIcon(current.kind))} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-zinc-900">{current.title}</p>
              <p className="text-[11px] text-zinc-400">
                {previewKindLabel(current.kind)} · {index + 1}/{slides.length}
                {slides.length > 1 ? ' · 左右滑动切换' : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {current.previewFile ? (
            <button
              type="button"
              onClick={() => downloadPreviewFile(current.previewFile!)}
              className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 transition hover:bg-zinc-50"
            >
              <i className="fa-solid fa-download mr-1 text-[10px]" />
              下载原件
            </button>
          ) : null}
          {current.url ? (
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 transition hover:bg-zinc-50"
            >
              打开链接 <i className="fa-solid fa-arrow-up-right-from-square ml-1 text-[9px]" />
            </a>
          ) : null}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {slides.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="上一份"
              disabled={index <= 0}
              onClick={() => scrollTo(index - 1)}
              className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 text-zinc-700 shadow-md transition hover:bg-white disabled:opacity-30"
            >
              <i className="fa-solid fa-chevron-left text-[12px]" />
            </button>
            <button
              type="button"
              aria-label="下一份"
              disabled={index >= slides.length - 1}
              onClick={() => scrollTo(index + 1)}
              className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 text-zinc-700 shadow-md transition hover:bg-white disabled:opacity-30"
            >
              <i className="fa-solid fa-chevron-right text-[12px]" />
            </button>
          </>
        ) : null}

        <div
          ref={scrollerRef}
          className="flex h-full snap-x snap-mandatory overflow-x-auto scroll-hidden"
        >
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="box-border flex h-full w-full min-w-full shrink-0 snap-center flex-col px-1"
            >
              {slide.previewFile ? (
                <CaseDocumentPreview
                  file={slide.previewFile}
                  variant="immersive"
                  hideChrome
                  className="h-full"
                />
              ) : (
                <LinkPreviewSlide title={slide.title} url={slide.url!} />
              )}
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 ? (
        <div className="flex shrink-0 gap-2 overflow-x-auto pb-0.5 scroll-hidden">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => scrollTo(i)}
              className={cn(
                'flex min-w-[140px] max-w-[180px] shrink-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition',
                i === index
                  ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50',
              )}
            >
              <i
                className={cn(
                  'fa-solid text-[11px]',
                  previewKindIcon(slide.kind),
                  i === index ? 'text-white/80' : 'text-zinc-400',
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold">{slide.title}</span>
                <span
                  className={cn(
                    'block text-[10px]',
                    i === index ? 'text-white/60' : 'text-zinc-400',
                  )}
                >
                  {previewKindLabel(slide.kind)}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LinkPreviewSlide({ title, url }: { title: string; url: string }) {
  const [iframeOk, setIframeOk] = useState(true);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
      {iframeOk ? (
        <iframe
          title={title}
          src={url}
          className="min-h-0 flex-1 w-full bg-white"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          onError={() => setIframeOk(false)}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <i className="fa-solid fa-link text-2xl text-zinc-300" />
          <p className="text-[14px] font-semibold text-zinc-800">{title}</p>
          <p className="max-w-md truncate text-[12px] text-zinc-500">{url}</p>
          <p className="text-[11px] text-zinc-400">该站点不允许嵌入预览，请在新窗口打开</p>
        </div>
      )}
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-zinc-200 bg-white px-3 py-2">
        <p className="min-w-0 truncate text-[11px] text-zinc-500">{url}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white"
        >
          新窗口打开
        </a>
      </div>
    </div>
  );
}
