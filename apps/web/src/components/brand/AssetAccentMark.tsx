import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { DEFAULT_SKILL_ACCENT } from '@/domain/skillAccent';

/** MSS 集市 / 能力列表：黑色色点（无品牌 Logo） */
export function AssetAccentMark({
  className,
  title = '标识',
}: {
  /** @deprecated 颜色已固定黑色，保留参数兼容调用方 */
  id?: string;
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full bg-zinc-900', className)}
      style={{ backgroundColor: DEFAULT_SKILL_ACCENT }}
      title={title}
      aria-hidden
    />
  );
}

export function assetAccentBorderStyle(_id?: string): CSSProperties {
  return { borderLeft: `3px solid ${DEFAULT_SKILL_ACCENT}` };
}
