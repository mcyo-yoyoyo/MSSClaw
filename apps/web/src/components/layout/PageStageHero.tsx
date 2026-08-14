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
  layout = 'split',
}: {
  tone: PageStageTone;
  eyebrow?: ReactNode;
  title: ReactNode;
  /** 标题右侧附加（如学/用/造） */
  titleAside?: ReactNode;
  subtitle?: ReactNode;
  tip?: ReactNode;
  actions?: ReactNode;
  /** 右侧（split）或标题下方（stack）附加区 */
  children?: ReactNode;
  className?: string;
  /** stack：标题 + 搜索上下排布，类似 AI 对话框 */
  layout?: 'split' | 'stack';
}) {
  const stacked = layout === 'stack';
  return (
    <section
      className={cn(
        'page-stage',
        `page-stage--${tone}`,
        stacked && 'page-stage--stack',
        className,
      )}
    >
      <div className="page-stage__glow" aria-hidden />
      <div className="page-stage__grid" aria-hidden />
      <div
        className={cn(
          'relative z-[1] flex flex-col gap-3',
          !stacked && children && 'lg:flex-row lg:items-start lg:justify-between lg:gap-5',
        )}
      >
        <div
          className={cn(
            'min-w-0',
            stacked
              ? 'w-full'
              : children
                ? 'lg:max-w-[32%] lg:shrink-0'
                : 'flex-1',
          )}
        >
          {stacked ? (
            <>
              <div className="page-stage__stack-head">
                <div className="page-stage__stack-side page-stage__stack-side--start">
                  {eyebrow ? <p className="page-stage__eyebrow mb-0">{eyebrow}</p> : null}
                </div>
                <h1 className="page-stage__title page-stage__stack-title">{title}</h1>
                <div className="page-stage__stack-side page-stage__stack-side--end">
                  {titleAside}
                </div>
              </div>
              {subtitle || tip ? (
                <p className="page-stage__stack-caption">
                  {subtitle}
                  {subtitle && tip ? (
                    <span className="page-stage__stack-sep" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  {tip}
                </p>
              ) : null}
            </>
          ) : (
            <>
              {eyebrow ? <p className="page-stage__eyebrow">{eyebrow}</p> : null}
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <h1 className="page-stage__title">{title}</h1>
                {titleAside}
              </div>
              {subtitle ? <p className="page-stage__subtitle">{subtitle}</p> : null}
              {tip ? <div className="page-stage__tip">{tip}</div> : null}
            </>
          )}
          {actions ? <div className="page-stage__actions">{actions}</div> : null}
        </div>
        {children ? (
          <div
            className={cn(
              'relative z-[1] min-w-0 w-full',
              stacked ? 'mx-auto max-w-3xl' : 'lg:min-w-0 lg:flex-1',
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
