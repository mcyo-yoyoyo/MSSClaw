import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PresentationData, SlideData } from '@office-kit/pptx';
import { apiAuthHeaders, apiUrl } from '@/api/client';
import type { PortalCasePreviewFile } from '@/domain/prototype/portalContent';
import { resolvePreviewSrc } from '@/domain/casePreview';
import { inspectPackageZip } from '@/domain/safeZip';
import { cn } from '@/lib/utils';

type LoadedDocument =
  | {
      kind: 'pdf';
      document: PDFDocumentProxy;
      annotationModeDisabled: number;
    }
  | {
      kind: 'pptx';
      presentation: PresentationData;
      slides: readonly SlideData[];
      renderSlide: (
        presentation: PresentationData,
        slide: SlideData,
      ) => string;
    };

type PanPosition = { x: number; y: number };

interface RestrictedDocumentViewerProps {
  file: PortalCasePreviewFile;
  className?: string;
  /** false 时保留外层组件提供的下载能力，仅复用页面渲染、全屏与拖拽。 */
  restricted?: boolean;
}

const MAX_PPTX_ENTRIES = 1_500;
const MAX_DOCUMENT_BYTES = 12 * 1024 * 1024;
const MAX_PPTX_SAFE_EXPANDED_BYTES = 32 * 1024 * 1024;
const PPTX_RATIO_CHECK_MIN_BYTES = 1024 * 1024;
const MAX_PPTX_COMPRESSION_RATIO = 100;
const MAX_PDF_CANVAS_DIMENSION = 8_192;
const MAX_PDF_CANVAS_PIXELS = 16 * 1024 * 1024;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

function isPortalApiUrl(src: string): boolean {
  if (typeof window === 'undefined' || src.startsWith('data:') || src.startsWith('blob:')) {
    return false;
  }
  try {
    const target = new URL(src, window.location.origin);
    const apiRoot = new URL(apiUrl('/api/v1/'), window.location.origin);
    return target.origin === apiRoot.origin && target.pathname.startsWith(apiRoot.pathname);
  } catch {
    return false;
  }
}

async function loadFileBytes(
  file: PortalCasePreviewFile,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const src = resolvePreviewSrc(file);
  if (!src) throw new Error('missing_preview_source');
  const response = await fetch(src, {
    headers: isPortalApiUrl(src) ? apiAuthHeaders() : undefined,
    signal,
  });
  if (!response.ok) throw new Error(`preview_fetch_failed:${response.status}`);
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_DOCUMENT_BYTES) {
    throw new Error('preview_file_too_large');
  }
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_DOCUMENT_BYTES) throw new Error('preview_file_too_large');
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_DOCUMENT_BYTES) {
        await reader.cancel('preview_file_too_large');
        throw new Error('preview_file_too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.byteLength - 4, 1_024);
  for (let index = 0; index < limit; index += 1) {
    if (
      bytes[index] === 0x25 &&
      bytes[index + 1] === 0x50 &&
      bytes[index + 2] === 0x44 &&
      bytes[index + 3] === 0x46 &&
      bytes[index + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

function hasZipSignature(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    ((bytes[2] === 0x03 && bytes[3] === 0x04) ||
      (bytes[2] === 0x05 && bytes[3] === 0x06) ||
      (bytes[2] === 0x07 && bytes[3] === 0x08))
  );
}

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
}

/** PDF.js legacy build 仍会使用 AbortSignal.any；给较旧的企业浏览器补最小实现。 */
function ensureAbortSignalAny(): void {
  const signalConstructor = AbortSignal as typeof AbortSignal & {
    any?: (signals: AbortSignal[]) => AbortSignal;
  };
  if (typeof signalConstructor.any === 'function') return;
  Object.defineProperty(signalConstructor, 'any', {
    configurable: true,
    value(signals: AbortSignal[]) {
      const controller = new AbortController();
      const listeners = new Map<AbortSignal, () => void>();
      const cleanup = () => {
        for (const [signal, listener] of listeners) {
          signal.removeEventListener('abort', listener);
        }
        listeners.clear();
      };
      const abortFrom = (signal: AbortSignal) => {
        cleanup();
        controller.abort(signal.reason);
      };
      for (const signal of signals) {
        if (signal.aborted) {
          abortFrom(signal);
          break;
        }
        const listener = () => abortFrom(signal);
        listeners.set(signal, listener);
        signal.addEventListener('abort', listener, { once: true });
      }
      return controller.signal;
    },
  });
}

/** office-kit 的中文断行会调用 Array.prototype.at；兼容仍在使用 Safari 14 的内网终端。 */
function ensureArrayAt(): void {
  const arrayPrototype = Array.prototype as unknown as {
    at?: (index: number) => unknown;
  };
  if (typeof arrayPrototype.at === 'function') return;
  Object.defineProperty(arrayPrototype, 'at', {
    configurable: true,
    writable: true,
    value(this: unknown[], index: number) {
      const numericIndex = Number(index);
      const relativeIndex = Number.isNaN(numericIndex) ? 0 : Math.trunc(numericIndex);
      const resolvedIndex = relativeIndex < 0 ? this.length + relativeIndex : relativeIndex;
      if (resolvedIndex < 0 || resolvedIndex >= this.length) return undefined;
      return this[resolvedIndex];
    },
  });
}

/**
 * PDF / PPTX 受限阅读器：自定义页面渲染，不加载浏览器原生下载、打印或批注工具。
 * 这是产品交互限制，不是 DRM；浏览器收到的页面仍无法阻止截图或开发者工具抓取。
 */
export function RestrictedDocumentViewer({
  file,
  className,
  restricted = true,
}: RestrictedDocumentViewerProps) {
  const [loaded, setLoaded] = useState<LoadedDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<PanPosition>({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const viewerRef = useRef<HTMLElement>(null);
  const pageNumberRef = useRef(pageNumber);

  useEffect(() => {
    pageNumberRef.current = pageNumber;
  }, [pageNumber]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let pdfDocument: PDFDocumentProxy | null = null;
    let pdfLoadingTask: PDFDocumentLoadingTask | null = null;

    setLoaded(null);
    setLoading(true);
    setError(false);
    setPageNumber(1);
    setZoom(1);
    setPan({ x: 0, y: 0 });

    void (async () => {
      try {
        const bytes = await loadFileBytes(file, controller.signal);
        if (!active) return;
        if (file.kind === 'pdf') {
          if (!hasPdfSignature(bytes)) throw new Error('invalid_pdf_signature');
          ensureAbortSignalAny();
          const [pdfjs, workerModule] = await Promise.all([
            import('pdfjs-dist/legacy/build/pdf.mjs'),
            import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
          ]);
          if (!active) return;
          pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
          pdfLoadingTask = pdfjs.getDocument({
            data: bytes,
            stopAtErrors: false,
            maxImageSize: MAX_PDF_CANVAS_PIXELS,
            canvasMaxAreaInBytes: MAX_PDF_CANVAS_PIXELS * 4,
          });
          pdfDocument = await pdfLoadingTask.promise;
          if (!active) {
            await pdfLoadingTask.destroy();
            return;
          }
          setLoaded({
            kind: 'pdf',
            document: pdfDocument,
            annotationModeDisabled: pdfjs.AnnotationMode.DISABLE,
          });
        } else if (file.kind === 'pptx') {
          if (!hasZipSignature(bytes)) throw new Error('invalid_pptx_signature');
          const inspection = await inspectPackageZip(bytes);
          if (!active) return;
          if (
            inspection.entries.length > MAX_PPTX_ENTRIES ||
            inspection.totalUncompressedBytes > MAX_PPTX_SAFE_EXPANDED_BYTES ||
            inspection.entries.some(
              (entry) =>
                !entry.isDirectory &&
                entry.uncompressedSize >= PPTX_RATIO_CHECK_MIN_BYTES &&
                entry.uncompressedSize >
                  Math.max(1, entry.compressedSize) * MAX_PPTX_COMPRESSION_RATIO,
            )
          ) {
            throw new Error('pptx_expansion_limit');
          }
          ensureArrayAt();
          const [{ loadPresentation, getSlides }, preview] = await Promise.all([
            import('@office-kit/pptx'),
            import('@office-kit/pptx-preview'),
          ]);
          if (!active) return;
          const presentation = await loadPresentation(bytes);
          const slides = getSlides(presentation);
          if (!slides.length) throw new Error('pptx_has_no_slides');
          if (!active) return;
          setLoaded({
            kind: 'pptx',
            presentation,
            slides,
            renderSlide: (pres, slide) =>
              preview.renderSlideToSvg(pres, slide, {
                textLayout: 'svg',
                measureText: preview.defaultMeasurer,
              }),
          });
        } else {
          throw new Error('unsupported_restricted_document');
        }
        if (active) setLoading(false);
      } catch (loadError) {
        if (!active || controller.signal.aborted) return;
        void loadError;
        setLoading(false);
        setError(true);
      }
    })();

    return () => {
      active = false;
      controller.abort();
      if (pdfLoadingTask) void pdfLoadingTask.destroy();
    };
  }, [file.dataUrl, file.kind, file.name, file.url, reloadToken]);

  const pageCount = loaded
    ? loaded.kind === 'pdf'
      ? loaded.document.numPages
      : loaded.slides.length
    : 0;

  useEffect(() => {
    if (!pageCount) return;
    setPageNumber((current) => Math.min(Math.max(1, current), pageCount));
  }, [pageCount]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const goToPage = useCallback(
    (next: number) => {
      if (!pageCount) return;
      setPageNumber(Math.min(pageCount, Math.max(1, next)));
      setPan({ x: 0, y: 0 });
    },
    [pageCount],
  );

  const changeZoom = useCallback((next: number) => {
    setZoom(clampZoom(next));
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => viewerRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        restricted &&
        (event.metaKey || event.ctrlKey) &&
        ['p', 's'].includes(event.key.toLowerCase())
      ) {
        event.preventDefault();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setFullscreen(false);
      } else if (event.key === 'Tab') {
        const focusable = Array.from(
          viewerRef.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
          ) ?? [],
        ).filter((element) => element !== viewerRef.current);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) {
          event.preventDefault();
          viewerRef.current?.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === viewerRef.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        goToPage(pageNumberRef.current - 1);
      } else if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        goToPage(pageNumberRef.current + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.requestAnimationFrame(() => viewerRef.current?.focus());
    };
  }, [fullscreen, goToPage, restricted]);

  const viewer = (
    <ViewerShell
      viewerRef={viewerRef}
      file={file}
      loaded={loaded}
      loading={loading}
      error={error}
      pageNumber={pageNumber}
      pageCount={pageCount}
      zoom={zoom}
      pan={pan}
      fullscreen={fullscreen}
      restricted={restricted}
      className={className}
      onPanChange={setPan}
      onPageChange={goToPage}
      onZoomChange={changeZoom}
      onResetView={resetView}
      onRetry={() => setReloadToken((value) => value + 1)}
      onFullscreen={() => setFullscreen(true)}
      onCloseFullscreen={() => setFullscreen(false)}
    />
  );

  if (!fullscreen || typeof document === 'undefined') return viewer;
  return createPortal(viewer, document.body);
}

function ViewerShell({
  viewerRef,
  file,
  loaded,
  loading,
  error,
  pageNumber,
  pageCount,
  zoom,
  pan,
  fullscreen,
  restricted,
  className,
  onPanChange,
  onPageChange,
  onZoomChange,
  onResetView,
  onRetry,
  onFullscreen,
  onCloseFullscreen,
}: {
  viewerRef: React.RefObject<HTMLElement | null>;
  file: PortalCasePreviewFile;
  loaded: LoadedDocument | null;
  loading: boolean;
  error: boolean;
  pageNumber: number;
  pageCount: number;
  zoom: number;
  pan: PanPosition;
  fullscreen: boolean;
  restricted: boolean;
  className?: string;
  onPanChange: (next: PanPosition) => void;
  onPageChange: (next: number) => void;
  onZoomChange: (next: number) => void;
  onResetView: () => void;
  onRetry: () => void;
  onFullscreen: () => void;
  onCloseFullscreen: () => void;
}) {
  return (
    <section
      ref={viewerRef}
      role={fullscreen ? 'dialog' : 'region'}
      aria-modal={fullscreen || undefined}
      aria-label={`${file.name} ${restricted ? '受限' : ''}文档预览`}
      tabIndex={0}
      onContextMenu={restricted ? (event) => event.preventDefault() : undefined}
      onKeyDown={(event) => {
        if (
          restricted &&
          (event.metaKey || event.ctrlKey) &&
          ['p', 's'].includes(event.key.toLowerCase())
        ) {
          event.preventDefault();
        }
      }}
      className={cn(
        'flex min-h-0 select-none flex-col overflow-hidden bg-[#111113] text-white outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70',
        !fullscreen && 'min-h-[280px] w-full rounded-xl border border-white/10',
        className,
        !fullscreen && 'bg-[#111113]',
        fullscreen
          ? 'fixed inset-0 z-[300] h-dvh w-screen rounded-none border-0 bg-[#111113]'
          : null,
      )}
    >
      <div className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/80">
            <i
              className={cn(
                'fa-solid text-[11px]',
                file.kind === 'pdf' ? 'fa-file-pdf' : 'fa-file-powerpoint',
              )}
            />
          </span>
          <div className="min-w-0">
            <p className="max-w-[32vw] truncate text-[11px] font-semibold text-white/90">
              {file.name}
            </p>
            <p className="text-[9px] text-white/45">
              {restricted ? '仅浏览 · 不提供下载、打印与绘制' : '文档页面预览'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ToolbarButton
            label="上一页"
            icon="fa-chevron-left"
            disabled={!pageCount || pageNumber <= 1}
            onClick={() => onPageChange(pageNumber - 1)}
          />
          <span className="min-w-[52px] text-center text-[10px] tabular-nums text-white/65">
            {pageCount ? `${pageNumber} / ${pageCount}` : '— / —'}
          </span>
          <ToolbarButton
            label="下一页"
            icon="fa-chevron-right"
            disabled={!pageCount || pageNumber >= pageCount}
            onClick={() => onPageChange(pageNumber + 1)}
          />
          <span className="mx-1 h-5 w-px bg-white/10" />
          <ToolbarButton
            label="缩小"
            icon="fa-minus"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => onZoomChange(zoom - 0.25)}
          />
          <button
            type="button"
            onClick={onResetView}
            className="min-w-[48px] rounded-md px-2 py-1.5 text-[10px] font-medium tabular-nums text-white/65 transition hover:bg-white/10 hover:text-white"
            title="适应窗口并复位"
          >
            {Math.round(zoom * 100)}%
          </button>
          <ToolbarButton
            label="放大"
            icon="fa-plus"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => onZoomChange(zoom + 0.25)}
          />
          <ToolbarButton label="复位" icon="fa-arrows-to-dot" onClick={onResetView} />
          <span className="mx-1 h-5 w-px bg-white/10" />
          {fullscreen ? (
            <ToolbarButton label="退出全屏" icon="fa-compress" onClick={onCloseFullscreen} />
          ) : (
            <ToolbarButton label="全屏浏览" icon="fa-expand" onClick={onFullscreen} />
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {loading ? (
          <ViewerMessage icon="fa-spinner fa-spin" text={`正在加载 ${file.kind === 'pdf' ? 'PDF' : 'PPTX'} 页面…`} />
        ) : error || !loaded ? (
          <ViewerMessage
            icon="fa-triangle-exclamation"
            text="该附件暂时无法安全预览，请联系管理员重新上传。"
            action="重试"
            onAction={onRetry}
          />
        ) : (
          <PanStage pan={pan} zoom={zoom} onPanChange={onPanChange}>
            {loaded.kind === 'pdf' ? (
              <PdfPageCanvas
                document={loaded.document}
                pageNumber={pageNumber}
                zoom={zoom}
                annotationModeDisabled={loaded.annotationModeDisabled}
              />
            ) : (
              <PptxSlidePage
                presentation={loaded.presentation}
                slide={loaded.slides[pageNumber - 1]!}
                pageNumber={pageNumber}
                renderSlide={loaded.renderSlide}
              />
            )}
          </PanStage>
        )}
      </div>
    </section>
  );
}

function ToolbarButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md text-white/65 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
    >
      <i className={cn('fa-solid text-[10px]', icon)} />
    </button>
  );
}

function ViewerMessage({
  icon,
  text,
  action,
  onAction,
}: {
  icon: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <i className={cn('fa-solid text-xl text-white/35', icon)} />
      <p className="text-[12px] text-white/55">{text}</p>
      {action && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/80 transition hover:bg-white/15"
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

function PanStage({
  pan,
  zoom,
  onPanChange,
  children,
}: {
  pan: PanPosition;
  zoom: number;
  onPanChange: (next: PanPosition) => void;
  children: React.ReactNode;
}) {
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: PanPosition;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
  };

  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_center,#29292d_0,#161618_65%,#111113_100%)] touch-none',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
      )}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          origin: pan,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        onPanChange({
          x: drag.origin.x + event.clientX - drag.startX,
          y: drag.origin.y + event.clientY - drag.startY,
        });
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDragStart={(event) => event.preventDefault()}
    >
      <div
        className="absolute inset-5 flex items-center justify-center will-change-transform"
        style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}
      >
        {children}
      </div>
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-2.5 py-1 text-[9px] text-white/40 backdrop-blur-sm">
        按住鼠标拖动页面位置
      </div>
    </div>
  );
}

function PdfPageCanvas({
  document,
  pageNumber,
  zoom,
  annotationModeDisabled,
}: {
  document: PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
  annotationModeDisabled: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [rendering, setRendering] = useState(true);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    let active = true;
    let resolvedPage: PDFPageProxy | null = null;
    setPage(null);
    setRendering(true);
    setRenderError(false);
    void document
      .getPage(pageNumber)
      .then((nextPage) => {
        resolvedPage = nextPage;
        if (active) setPage(nextPage);
        else {
          nextPage.cleanup();
          resolvedPage = null;
        }
      })
      .catch(() => {
        if (active) {
          setRendering(false);
          setRenderError(true);
        }
      });
    return () => {
      active = false;
      if (resolvedPage) {
        const pageToCleanup = resolvedPage;
        queueMicrotask(() => {
          try {
            pageToCleanup.cleanup();
          } catch {
            // renderTask cleanup may finish one microtask later; document.destroy is the final fallback.
          }
        });
      }
    };
  }, [document, pageNumber]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !page) return;
    let renderTask: ReturnType<PDFPageProxy['render']>;
    try {
      const desiredScale = Math.min(3, Math.max(1.5, 1.5 * zoom));
      const unitViewport = page.getViewport({ scale: 1 });
      if (
        !Number.isFinite(unitViewport.width) ||
        !Number.isFinite(unitViewport.height) ||
        unitViewport.width <= 0 ||
        unitViewport.height <= 0
      ) {
        throw new Error('invalid_pdf_page_dimensions');
      }
      const dimensionScale = Math.min(
        MAX_PDF_CANVAS_DIMENSION / unitViewport.width,
        MAX_PDF_CANVAS_DIMENSION / unitViewport.height,
      );
      const pixelScale = Math.sqrt(
        MAX_PDF_CANVAS_PIXELS / (unitViewport.width * unitViewport.height),
      );
      const renderScale = Math.min(desiredScale, dimensionScale, pixelScale);
      if (!Number.isFinite(renderScale) || renderScale <= 0) {
        throw new Error('invalid_pdf_render_scale');
      }
      const viewport = page.getViewport({ scale: renderScale });
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      renderTask = page.render({
        canvas,
        viewport,
        intent: 'display',
        annotationMode: annotationModeDisabled,
        background: '#ffffff',
      });
    } catch {
      setRendering(false);
      setRenderError(true);
      return;
    }
    let active = true;
    setRendering(true);
    setRenderError(false);
    void renderTask.promise
      .then(() => {
        if (active) setRendering(false);
      })
      .catch((renderFailure: unknown) => {
        if (!active) return;
        if (
          renderFailure instanceof Error &&
          renderFailure.name === 'RenderingCancelledException'
        ) {
          return;
        }
        setRendering(false);
        setRenderError(true);
      });
    return () => {
      active = false;
      renderTask.cancel();
    };
  }, [annotationModeDisabled, page, zoom]);

  if (renderError) {
    return <p className="text-[12px] text-white/55">本页渲染失败，请切换页面后重试。</p>;
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <canvas
        ref={canvasRef}
        aria-label={`PDF 第 ${pageNumber} 页`}
        className={cn(
          'h-auto max-h-full w-auto max-w-full bg-white shadow-[0_18px_60px_rgba(0,0,0,0.45)] transition-opacity',
          rendering ? 'opacity-45' : 'opacity-100',
        )}
      />
      {rendering ? (
        <i className="fa-solid fa-spinner fa-spin absolute text-lg text-white/65" />
      ) : null}
    </div>
  );
}

function PptxSlidePage({
  presentation,
  slide,
  pageNumber,
  renderSlide,
}: {
  presentation: PresentationData;
  slide: SlideData;
  pageNumber: number;
  renderSlide: (presentation: PresentationData, slide: SlideData) => string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [hasFallback, setHasFallback] = useState(false);

  const slideKey = useMemo(() => `${pageNumber}`, [pageNumber]);

  useEffect(() => {
    let objectUrl: string | null = null;
    setSrc(null);
    setError(false);
    setHasFallback(false);
    const timer = window.setTimeout(() => {
      try {
        const svg = renderSlide(presentation, slide);
        setHasFallback(svg.includes('data-pptx-fallback'));
        objectUrl = URL.createObjectURL(
          new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
        );
        setSrc(objectUrl);
      } catch {
        setError(true);
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [presentation, renderSlide, slide, slideKey]);

  if (error) return <p className="text-[12px] text-white/55">本页幻灯片渲染失败。</p>;

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {src ? (
        <img
          src={src}
          alt={`PPTX 第 ${pageNumber} 页`}
          draggable={false}
          className="h-auto max-h-full w-auto max-w-full bg-white object-contain shadow-[0_18px_60px_rgba(0,0,0,0.45)]"
        />
      ) : (
        <i className="fa-solid fa-spinner fa-spin text-lg text-white/65" />
      )}
      {hasFallback ? (
        <span className="absolute bottom-1 right-1 rounded-md bg-amber-500/90 px-2 py-1 text-[9px] font-medium text-black">
          部分特殊对象已简化显示
        </span>
      ) : null}
    </div>
  );
}
