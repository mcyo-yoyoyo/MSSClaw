import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { PptSlide } from '@/domain/pptSlides';

/** 华为风演示色板：红强调 + 深灰标题 + 白底卡片 */
const HW = {
  red: '#CF0A2C',
  redDark: '#A10822',
  ink: '#1A1A1A',
  mute: '#595959',
  line: '#E5E5E5',
  soft: '#F7F7F7',
  white: '#FFFFFF',
};

function SlideChrome({
  index,
  total,
  title,
  children,
}: {
  index: number;
  total: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)] ring-1 ring-black/5">
      <div className="flex items-center gap-1.5 border-b border-zinc-200 bg-[#f7f7f8] px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
        <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
        <span className="h-2 w-2 rounded-full bg-[#28c840]" />
        <span className="ml-2 truncate text-[10px] text-zinc-500">
          幻灯片 {index + 1} / {total} · {title}
        </span>
      </div>
      <div className="relative aspect-[16/9] w-full overflow-hidden">{children}</div>
    </div>
  );
}

function CoverSlide({ slide }: { slide: PptSlide }) {
  return (
    <div className="absolute inset-0 flex" style={{ background: HW.white }}>
      {/* 左侧红条 + 几何块，接近华为封面气质 */}
      <div className="relative w-[8%] shrink-0" style={{ background: HW.red }}>
        <div
          className="absolute bottom-0 left-0 h-[38%] w-full opacity-90"
          style={{
            background: `linear-gradient(160deg, ${HW.redDark} 0%, ${HW.red} 100%)`,
            clipPath: 'polygon(0 35%, 100% 0, 100% 100%, 0 100%)',
          }}
        />
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col justify-between px-9 py-8">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-[0.18em]" style={{ color: HW.red }}>
            HUAWEI STYLE · MSS CLAW
          </p>
          <div className="h-1.5 w-10" style={{ background: HW.red }} />
        </div>

        <div className="max-w-[90%]">
          <p className="text-[12px] font-medium" style={{ color: HW.mute }}>
            {slide.subtitle || '智能交付汇报'}
          </p>
          <h3
            className="mt-3 text-[30px] font-bold leading-[1.2] tracking-tight"
            style={{ color: HW.ink }}
          >
            {slide.title}
          </h3>
          <div className="mt-5 h-[3px] w-16" style={{ background: HW.red }} />
          {slide.meta?.length ? (
            <ul className="mt-6 space-y-2">
              {slide.meta.slice(0, 3).map((m) => (
                <li key={m} className="flex items-center gap-2 text-[12.5px]" style={{ color: HW.mute }}>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: HW.red }} />
                  {m}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex items-end justify-between">
          <p className="text-[10px]" style={{ color: '#8c8c8c' }}>
            Confidential · For Internal Discussion
          </p>
          <div className="flex gap-1">
            <span className="h-2 w-8" style={{ background: HW.red }} />
            <span className="h-2 w-3 bg-zinc-300" />
            <span className="h-2 w-3 bg-zinc-200" />
          </div>
        </div>

        {/* 右下角几何装饰 */}
        <div
          className="pointer-events-none absolute -bottom-6 -right-4 h-36 w-36 opacity-[0.12]"
          style={{
            background: HW.red,
            clipPath: 'polygon(40% 0, 100% 0, 100% 100%, 0 100%)',
          }}
        />
      </div>
    </div>
  );
}

function ClosingSlide({ slide }: { slide: PptSlide }) {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: HW.white }}>
      <div className="h-2 w-full" style={{ background: HW.red }} />
      <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="mb-4 h-1 w-14" style={{ background: HW.red }} />
        <h3 className="text-[48px] font-bold tracking-tight" style={{ color: HW.ink }}>
          {slide.title || '谢谢'}
        </h3>
        <p className="mt-2 text-[16px] font-medium tracking-[0.2em]" style={{ color: HW.red }}>
          {slide.subtitle || 'Thank You'}
        </p>
        {slide.bullets.length ? (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {slide.bullets.slice(0, 2).map((b) => (
              <span
                key={b}
                className="rounded-full border px-4 py-1.5 text-[12px]"
                style={{ borderColor: HW.line, color: HW.mute }}
              >
                {b}
              </span>
            ))}
          </div>
        ) : null}
        {slide.meta?.length ? (
          <p className="mt-8 text-[11px]" style={{ color: '#8c8c8c' }}>
            {slide.meta.join(' · ')}
          </p>
        ) : null}
      </div>
      <div className="flex h-10 items-center justify-between px-8" style={{ background: HW.soft }}>
        <span className="text-[10px] font-semibold" style={{ color: HW.red }}>
          MSS Claw
        </span>
        <span className="text-[10px]" style={{ color: HW.mute }}>
          欢迎提问与讨论
        </span>
      </div>
    </div>
  );
}

function ContentCards({ bullets, layout }: { bullets: string[]; layout: PptSlide['layout'] }) {
  const items = bullets.slice(0, layout === 'metrics' ? 6 : 6);
  if (layout === 'metrics') {
    return (
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-2.5 content-start">
        {items.map((b, i) => {
          const m = b.match(/([+-]?\d+(?:\.\d+)?%|#\d+|第\s*\d+)/);
          const value = m?.[1] || `${i + 1}`;
          const label = b.replace(value, '').replace(/^[:：\s-]+/, '').trim() || b;
          return (
            <div
              key={`${i}-${b.slice(0, 16)}`}
              className="flex flex-col justify-between rounded-xl border px-3 py-3"
              style={{ borderColor: HW.line, background: i % 2 === 0 ? HW.soft : HW.white }}
            >
              <span className="text-[10px] font-semibold" style={{ color: HW.mute }}>
                {label.slice(0, 28)}
              </span>
              <span className="mt-2 text-[22px] font-bold tracking-tight" style={{ color: HW.red }}>
                {value}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (layout === 'list') {
    return (
      <ul className="min-h-0 flex-1 space-y-2 overflow-hidden">
        {items.map((b, i) => (
          <li
            key={`${i}-${b.slice(0, 16)}`}
            className="flex gap-3 rounded-lg border px-3 py-2.5"
            style={{ borderColor: HW.line, background: HW.soft }}
          >
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
              style={{ background: HW.red }}
            >
              {i + 1}
            </span>
            <span className="text-[12.5px] leading-relaxed" style={{ color: HW.ink }}>
              {b}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  // cards：2 列图文框
  return (
    <div className="grid min-h-0 flex-1 grid-cols-2 gap-2.5 content-start">
      {items.map((b, i) => (
        <div
          key={`${i}-${b.slice(0, 16)}`}
          className="relative overflow-hidden rounded-xl border px-3.5 py-3"
          style={{ borderColor: HW.line, background: HW.white }}
        >
          <div className="absolute left-0 top-0 h-full w-1" style={{ background: HW.red }} />
          <div className="flex items-start gap-2.5 pl-1">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
              style={{ background: i === 0 ? HW.red : HW.ink }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <p className="text-[12.5px] leading-relaxed" style={{ color: HW.ink }}>
              {b}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContentSlide({ slide, page, total }: { slide: PptSlide; page: number; total: number }) {
  const isAgenda = slide.role === 'agenda';
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: HW.white }}>
      <div className="h-[3px] w-full" style={{ background: HW.red }} />
      <div className="flex min-h-0 flex-1 flex-col px-7 py-5">
        <div className="mb-3 flex items-end justify-between gap-3 border-b pb-3" style={{ borderColor: HW.line }}>
          <div className="min-w-0">
            {slide.subtitle || isAgenda ? (
              <p className="text-[10px] font-semibold tracking-[0.16em]" style={{ color: HW.red }}>
                {slide.subtitle || 'AGENDA'}
              </p>
            ) : (
              <p className="text-[10px] font-semibold tracking-[0.14em]" style={{ color: HW.mute }}>
                KEY POINTS
              </p>
            )}
            <h3 className="mt-1 text-[20px] font-bold leading-snug tracking-tight" style={{ color: HW.ink }}>
              {slide.title}
            </h3>
          </div>
          <div className="h-8 w-8 shrink-0 rounded-md" style={{ background: HW.red }} />
        </div>

        <ContentCards bullets={slide.bullets} layout={slide.layout || (isAgenda ? 'cards' : 'cards')} />

        <div
          className="mt-3 flex items-center justify-between border-t pt-2 text-[10px]"
          style={{ borderColor: HW.line, color: HW.mute }}
        >
          <span>
            <span className="font-semibold" style={{ color: HW.red }}>
              MSS Claw
            </span>
            <span className="mx-1.5 text-zinc-300">|</span>
            智能交付件
          </span>
          <span>
            {page} / {total}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PptDeckPreview({ slides }: { slides: PptSlide[] }) {
  if (!slides.length) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-[12px] text-zinc-500">
        暂无幻灯片
      </div>
    );
  }

  return (
    <div className={cn('space-y-4 rounded-xl p-3')} style={{ background: '#eceff3' }}>
      {slides.map((slide, i) => (
        <SlideChrome key={`${slide.role}-${slide.title}-${i}`} index={i} total={slides.length} title={slide.title}>
          {slide.role === 'cover' || slide.layout === 'cover' ? (
            <CoverSlide slide={slide} />
          ) : slide.role === 'closing' || slide.layout === 'closing' ? (
            <ClosingSlide slide={slide} />
          ) : (
            <ContentSlide slide={slide} page={i + 1} total={slides.length} />
          )}
        </SlideChrome>
      ))}
    </div>
  );
}
