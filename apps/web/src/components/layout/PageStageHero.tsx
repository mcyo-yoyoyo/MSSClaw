import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PageStageTone = 'home' | 'external' | 'internal' | 'projects' | 'brief';

/** Apple / 华为海外站感：大标题舞台，仅视觉，不改布局职责 */
export function PageStageHero({
  tone,
  eyebrow,
  title,
  titleAside,
  subtitle,
  tip,
  actions,
  children,
  className,
}: {
  tone: PageStageTone;
  eyebrow?: ReactNode;
  title: ReactNode;
  /** 标题右侧附加（如学/用/造） */
  titleAside?: ReactNode;
  subtitle?: ReactNode;
  tip?: ReactNode;
  actions?: ReactNode;
  /** 右侧或下方附加区（如首页 AI 快讯露出） */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('page-stage', `page-stage--${tone}`, className)}>
      <div className="page-stage__glow" aria-hidden />
      <div className="page-stage__grid" aria-hidden />
      <div
        className={cn(
          'relative z-[1] flex flex-col gap-4',
          children && 'lg:flex-row lg:items-center lg:justify-between lg:gap-6',
        )}
      >
        <div className={cn('min-w-0', children ? 'lg:max-w-[48%] lg:flex-1' : 'flex-1')}>
          {eyebrow ? <p className="page-stage__eyebrow">{eyebrow}</p> : null}
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <h1 className="page-stage__title">{title}</h1>
            {titleAside}
          </div>
          {subtitle ? <p className="page-stage__subtitle">{subtitle}</p> : null}
          {tip ? <div className="page-stage__tip">{tip}</div> : null}
          {actions ? <div className="page-stage__actions">{actions}</div> : null}
        </div>
        {children ? (
          <div className="relative z-[1] min-w-0 lg:w-[min(100%,520px)] lg:max-w-[50%] lg:shrink-0">
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
