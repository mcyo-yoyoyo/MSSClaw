import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export function ShineBorder({
  shineColor = ['#A07CFE', '#FE8FB5', '#FFBE7B'],
  duration = 8,
  borderWidth = 1,
  className,
}: {
  shineColor?: string | string[];
  duration?: number;
  borderWidth?: number;
  className?: string;
}) {
  const colors = Array.isArray(shineColor) ? shineColor : [shineColor];
  const style: CSSProperties = {
    padding: borderWidth,
    animationDuration: `${duration}s`,
    backgroundImage: `linear-gradient(115deg, transparent 36%, ${colors.join(', ')}, transparent 64%)`,
  };

  return <span aria-hidden className={cn('shine-border', className)} style={style} />;
}
