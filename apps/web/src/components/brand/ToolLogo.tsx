import { useState } from 'react';
import { cn } from '@/lib/utils';
import { publicAssetUrl } from '@/domain/publicAssetUrl';

export { faviconUrl, resolveToolLogoUrl } from '@/domain/toolLogo';

interface ToolLogoProps {
  name: string;
  logoUrl?: string;
  icon?: string;
  size?: number;
  className?: string;
}

function initial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'AI';
  const ascii = trimmed.match(/[A-Za-z0-9]/);
  if (ascii) return ascii[0]!.toUpperCase();
  return trimmed.slice(0, 1);
}

/**
 * 外精选 / 公司推荐：品牌 Logo（可从品牌库选择、上传或由官网初始化）。
 * 无图时回退字标。
 */
export function ToolLogo({ name, logoUrl, icon, size = 32, className }: ToolLogoProps) {
  const src = logoUrl ? publicAssetUrl(logoUrl) : '';
  const [failedSrc, setFailedSrc] = useState('');
  const px = `${size}px`;

  if (src && src !== failedSrc) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn('shrink-0 rounded-lg bg-white object-contain p-0.5', className)}
        style={{ width: px, height: px }}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white',
        className,
      )}
      style={{ width: px, height: px }}
      title={name}
    >
      {icon ? (
        <i className={cn('fa-solid text-[11px]', icon)} />
      ) : (
        <span className="text-[11px] font-bold">{initial(name)}</span>
      )}
    </div>
  );
}
