import { useEffect, useMemo, useState } from 'react';
import { CenterModal } from '@/components/center/CenterShell';
import { CaseDocumentPreview } from '@/components/content/CaseDocumentPreview';
import {
  PLAZA_GUIDE_TYPE_LABEL,
  type PlazaToolGuide,
} from '@/domain/plazaToolGuides';
import { isHowtoDataUrl, openHowtoResource } from '@/domain/howtoUpload';
import { groupGuidesIntoSteps } from '@/domain/howtoSteps';
import type { PortalCasePreviewFile } from '@/domain/prototype/portalContent';
import { cn } from '@/lib/utils';

function guideToPreviewFile(guide: PlazaToolGuide): PortalCasePreviewFile | null {
  const url = guide.url;
  if (!url || url === '#') return null;
  if (guide.type === 'pdf') {
    return {
      name: guide.fileName || `${guide.title || 'document'}.pdf`,
      mimeType: 'application/pdf',
      size: 0,
      dataUrl: url.startsWith('data:') ? url : undefined,
      url: url.startsWith('data:') ? undefined : url,
      kind: 'pdf',
    };
  }
  if (guide.type === 'ppt') {
    return {
      name: guide.fileName || `${guide.title || 'deck'}.pptx`,
      mimeType:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      size: 0,
      dataUrl: url.startsWith('data:') ? url : undefined,
      url: url.startsWith('data:') ? undefined : url,
      kind: 'pptx',
    };
  }
  if (guide.type === 'image') {
    return {
      name: guide.fileName || `${guide.title || 'image'}.png`,
      mimeType: 'image/png',
      size: 0,
      dataUrl: url.startsWith('data:') ? url : undefined,
      url: url.startsWith('data:') ? undefined : url,
      kind: 'image',
    };
  }
  return null;
}

function GuideList({
  guides,
  onOpenGuide,
}: {
  guides: PlazaToolGuide[];
  onOpenGuide: (g: PlazaToolGuide) => void;
}) {
  return (
    <div className="space-y-2">
      {guides.map((g) => (
        <button
          key={g.id}
          type="button"
          onClick={() => onOpenGuide(g)}
          className="flex w-full items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-white"
        >
          <span className="mt-0.5 shrink-0 rounded-md bg-zinc-900/90 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-white">
            {PLAZA_GUIDE_TYPE_LABEL[g.type] ?? g.type}
          </span>
          <span className="min-w-0">
            <span className="block text-[12px] font-semibold text-zinc-800">{g.title}</span>
            {g.blurb ? (
              <span className="mt-0.5 block text-[10px] leading-snug text-zinc-400">{g.blurb}</span>
            ) : g.type === 'text' && g.body ? (
              <span className="mt-0.5 block line-clamp-2 text-[10px] leading-snug text-zinc-400">
                {g.body}
              </span>
            ) : null}
          </span>
        </button>
      ))}
      {!guides.length ? (
        <p className="py-8 text-center text-[11px] text-zinc-400">
          暂无 How to，运营可在门户运营维护上手材料
        </p>
      ) : null}
    </div>
  );
}

/** 货架 / 找案例共用 · How to 侧栏（可选分步轨） */
export function HowToDrawer({
  title,
  subtitle,
  guides,
  stepped = false,
  onClose,
  onOpenGuide,
}: {
  title: string;
  subtitle?: string;
  guides: PlazaToolGuide[];
  /** 左侧步骤轨 · 准备/连接/上手 */
  stepped?: boolean;
  onClose: () => void;
  onOpenGuide: (g: PlazaToolGuide) => void;
}) {
  const steps = useMemo(() => groupGuidesIntoSteps(guides), [guides]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    setActiveStep(0);
  }, [title, guides.length]);

  const showSteps = stepped && steps.length > 1;
  const visibleGuides = showSteps ? steps[activeStep]?.guides ?? [] : guides;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <aside
        className={cn(
          'flex h-full w-full flex-col border-l border-zinc-200 bg-white shadow-xl',
          showSteps ? 'max-w-[420px]' : 'max-w-[320px]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3.5">
          <div className="min-w-0">
            <p className="font-serif text-[12px] italic text-zinc-400">How to</p>
            <h3 className="mt-0.5 truncate text-[14px] font-semibold text-zinc-900">{title}</h3>
            <p className="mt-0.5 text-[10px] text-zinc-400">
              {subtitle ??
                (showSteps
                  ? '快速上手 · 准备 / 连接 / 上手'
                  : '快速上手 · 图片 · PDF · PPT · 视频 · 链接 · 文字')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[12px] text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
          >
            关闭
          </button>
        </div>
        <div
          className={cn(
            'flex min-h-0 flex-1',
            showSteps ? 'flex-row' : 'flex-col overflow-y-auto px-4 py-3',
          )}
        >
          {showSteps ? (
            <>
              <ol className="w-[120px] shrink-0 space-y-1 overflow-y-auto border-r border-zinc-100 px-2 py-3">
                {steps.map((s, i) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setActiveStep(i)}
                      className={cn(
                        'flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold transition',
                        i === activeStep
                          ? 'bg-zinc-900 text-white'
                          : 'text-zinc-600 hover:bg-zinc-100',
                      )}
                    >
                      <span className="opacity-70">{i + 1}</span>
                      {s.label}
                    </button>
                  </li>
                ))}
              </ol>
              <div className="min-w-0 flex-1 overflow-y-auto px-3 py-3">
                <p className="mb-2 text-[10px] text-zinc-400">{steps[activeStep]?.hint}</p>
                <GuideList guides={visibleGuides} onOpenGuide={onOpenGuide} />
              </div>
            </>
          ) : (
            <GuideList guides={visibleGuides} onOpenGuide={onOpenGuide} />
          )}
        </div>
      </aside>
    </div>
  );
}

/** 单条指引预览（文字 / 图片 / 视频 / PDF / PPT） */
export function HowToGuidePreviewModal({
  guide,
  onClose,
}: {
  guide: PlazaToolGuide | null;
  onClose: () => void;
}) {
  if (!guide) return null;
  const docFile = guideToPreviewFile(guide);
  return (
    <CenterModal
      open={!!guide}
      title={`How to · ${guide.title}`}
      onClose={onClose}
      size="lg"
      elevate
      actions={
        <>
          {guide.url && guide.url !== '#' ? (
            <button
              type="button"
              onClick={() => openHowtoResource(guide)}
              className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium"
            >
              {isHowtoDataUrl(guide.url)
                ? guide.fileName
                  ? `下载 ${guide.fileName}`
                  : '下载文件'
                : '打开链接'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white"
          >
            关闭
          </button>
        </>
      }
    >
      {docFile && (guide.type === 'pdf' || guide.type === 'ppt' || guide.type === 'image') ? (
        <CaseDocumentPreview file={docFile} />
      ) : null}
      {guide.type === 'video' && guide.url && guide.url !== '#' ? (
        <video
          src={guide.url}
          controls
          className="mx-auto max-h-[70vh] w-full max-w-full rounded-xl bg-black"
        />
      ) : null}
      {guide.type === 'text' ? (
        <div className="space-y-3 text-left">
          {guide.blurb ? <p className="text-[12px] text-zinc-500">{guide.blurb}</p> : null}
          {guide.body ? (
            <pre className="whitespace-pre-wrap rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-[13px] leading-relaxed text-zinc-800">
              {guide.body}
            </pre>
          ) : null}
        </div>
      ) : null}
    </CenterModal>
  );
}

/** 打开指引：可预览类型进 Modal，其余直接打开资源 */
export function openGuideEntry(
  g: PlazaToolGuide,
  opts: {
    onPreview: (g: PlazaToolGuide) => void;
    onToast: (msg: string) => void;
  },
) {
  if (g.type === 'text') {
    if (g.body?.trim() || (g.url && g.url !== '#')) {
      opts.onPreview(g);
      return;
    }
    opts.onToast(`指引「${g.title}」尚未填写正文`);
    return;
  }
  if (g.type === 'image' && g.url && g.url !== '#') {
    opts.onPreview(g);
    return;
  }
  if (g.type === 'pdf' && g.url && g.url !== '#') {
    opts.onPreview(g);
    return;
  }
  if (g.type === 'ppt' && g.url && g.url !== '#') {
    opts.onPreview(g);
    return;
  }
  if (
    g.type === 'video' &&
    g.url &&
    g.url !== '#' &&
    (isHowtoDataUrl(g.url) || /\.(mp4|webm|mov)(\?|$)/i.test(g.url) || g.url.startsWith('blob:'))
  ) {
    opts.onPreview(g);
    return;
  }
  if (!g.url || g.url === '#') {
    opts.onToast(`指引「${g.title}」尚未配置文件或链接`);
    return;
  }
  const ok = openHowtoResource(g);
  if (!ok) opts.onToast(`无法打开「${g.title}」`);
}

/** 状态封装：抽屉 + 预览 */
export function useHowToPanel() {
  const [target, setTarget] = useState<{ title: string; guides: PlazaToolGuide[] } | null>(
    null,
  );
  const [preview, setPreview] = useState<PlazaToolGuide | null>(null);

  return {
    target,
    preview,
    open: (title: string, guides: PlazaToolGuide[]) => setTarget({ title, guides }),
    close: () => setTarget(null),
    setPreview,
    closePreview: () => setPreview(null),
  };
}
