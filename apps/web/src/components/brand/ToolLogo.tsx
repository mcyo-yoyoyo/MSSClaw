import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ToolLogoProps {
  name: string;
  logoUrl?: string;
  icon?: string;
  size?: number;
  className?: string;
}

const BRAND_COLORS = [
  'bg-zinc-800',
  'bg-emerald-700',
  'bg-sky-700',
  'bg-violet-700',
  'bg-amber-700',
  'bg-rose-700',
  'bg-teal-700',
];

function brandColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % BRAND_COLORS.length;
  return BRAND_COLORS[h]!;
}

function initial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'AI';
  const ascii = trimmed.match(/[A-Za-z0-9]/);
  if (ascii) return ascii[0]!.toUpperCase();
  return trimmed.slice(0, 1);
}

/** 工具品牌 Logo：优先 logoUrl，失败回退字标 / FA 图标 */
export function ToolLogo({ name, logoUrl, icon, size = 32, className }: ToolLogoProps) {
  const [failed, setFailed] = useState(false);
  const px = `${size}px`;

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        className={cn('shrink-0 rounded-lg bg-white object-contain p-0.5', className)}
        style={{ width: px, height: px }}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg text-white',
        brandColor(name),
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

/** 业界 SaaS favicon 助手 */
export function faviconUrl(domain: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}
