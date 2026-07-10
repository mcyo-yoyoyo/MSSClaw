import { cn } from '@/lib/utils';

interface MssZhishuMarkProps {
  size?: number;
  className?: string;
  title?: string;
}

/** MSS智枢 品牌徽标 — 智枢 hub 轨道 + 连接节点 */
export function MssZhishuMark({ size = 56, className, title = 'MSS智枢' }: MssZhishuMarkProps) {
  const id = `mss-mark-${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('mss-zhishu-mark', className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={`${id}-bg`} x1="8" y1="4" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff8a9a" />
          <stop offset="0.35" stopColor="#e0122f" />
          <stop offset="1" stopColor="#7a0018" />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="14" y1="10" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient
          id={`${id}-core`}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(28 28) rotate(90) scale(10)"
        >
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#ffd4dc" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 底座 */}
      <rect x="3" y="3" width="50" height="50" rx="14" fill={`url(#${id}-bg)`} />
      <rect x="3" y="3" width="50" height="50" rx="14" fill={`url(#${id}-sheen)`} />

      {/* 外轨 — 智枢连接环 */}
      <g filter={`url(#${id}-glow)`} stroke="white" strokeLinecap="round">
        <ellipse
          cx="28"
          cy="28"
          rx="17"
          ry="11"
          strokeWidth="1.35"
          strokeOpacity="0.42"
          transform="rotate(-24 28 28)"
        />
        <ellipse
          cx="28"
          cy="28"
          rx="17"
          ry="11"
          strokeWidth="1.35"
          strokeOpacity="0.55"
          transform="rotate(36 28 28)"
        />
        <ellipse
          cx="28"
          cy="28"
          rx="17"
          ry="11"
          strokeWidth="1.15"
          strokeOpacity="0.32"
          transform="rotate(96 28 28)"
        />
      </g>

      {/* 枢纽臂 — 四向流动弧线 */}
      <g stroke="white" strokeLinecap="round" fill="none">
        <path d="M28 28 C28 20, 34 16, 40 18" strokeWidth="1.6" strokeOpacity="0.88" />
        <path d="M28 28 C36 28, 40 34, 38 40" strokeWidth="1.6" strokeOpacity="0.72" />
        <path d="M28 28 C28 36, 22 40, 16 38" strokeWidth="1.6" strokeOpacity="0.88" />
        <path d="M28 28 C20 28, 16 22, 18 16" strokeWidth="1.6" strokeOpacity="0.72" />
      </g>

      {/* 节点 */}
      <g fill="white">
        <circle cx="40" cy="18" r="2.2" opacity="0.95" />
        <circle cx="38" cy="40" r="1.8" opacity="0.78" />
        <circle cx="16" cy="38" r="2.2" opacity="0.95" />
        <circle cx="18" cy="16" r="1.8" opacity="0.78" />
      </g>

      {/* 核心 */}
      <circle cx="28" cy="28" r="5.2" fill={`url(#${id}-core)`} />
      <circle cx="28" cy="28" r="5.2" stroke="white" strokeOpacity="0.35" strokeWidth="0.75" />
      <circle cx="26.2" cy="26.3" r="1.1" fill="white" opacity="0.85" />
    </svg>
  );
}
