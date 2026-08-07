import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** 与首页对齐的内容画布：侧栏收起后随主区变宽，上限 1360px */
export function PageCanvas({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'main';
}) {
  return <Tag className={cn('page-canvas', className)}>{children}</Tag>;
}
