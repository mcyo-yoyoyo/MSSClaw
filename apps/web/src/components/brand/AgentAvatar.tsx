import { cn } from '@/lib/utils';
import type { ReactElement } from 'react';

interface AgentAvatarProps {
  agentId: string;
  size?: number;
  className?: string;
  title?: string;
}

type IconRenderer = (uid: string) => ReactElement;

const GRADIENTS: Record<string, { from: string; to: string; accent?: string }> = {
  'agent-data-analysis': { from: '#60a5fa', to: '#1d4ed8' },
  'agent-doc-review': { from: '#94a3b8', to: '#334155', accent: '#fbbf24' },
  'agent-file-organize': { from: '#2dd4bf', to: '#0f766e' },
  'agent-ppt': { from: '#fb923c', to: '#c2410c' },
  'agent-meeting': { from: '#a78bfa', to: '#6d28d9' },
  'agent-launch-sentiment': { from: '#fb7185', to: '#be123c' },
  'agent-survey': { from: '#22d3ee', to: '#0e7490' },
  'agent-review-collect': { from: '#34d399', to: '#065f46' },
  'agent-review-translate': { from: '#38bdf8', to: '#075985' },
  'agent-review': { from: '#fbbf24', to: '#b45309' },
  'agent-retail-insight': { from: '#4ade80', to: '#15803d' },
  'agent-price-monitor': { from: '#34d399', to: '#047857' },
  'agent-hr-resume': { from: '#a78bfa', to: '#5b21b6' },
  'agent-training': { from: '#818cf8', to: '#4338ca' },
  'agent-knowledge': { from: '#38bdf8', to: '#0369a1' },
  'agent-retail-coach': { from: '#fdba74', to: '#c2410c' },
  'agent-insight': { from: '#fcd34d', to: '#b45309' },
  'agent-rd-rag': { from: '#67e8f9', to: '#0e7490' },
};

const ICONS: Record<string, IconRenderer> = {
  'agent-data-analysis': (uid) => (
    <>
      <path d="M20 11v9" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      <path
        d="M20 20 L27 24 A8 8 0 0 0 20 11 Z"
        fill="white"
        fillOpacity="0.95"
      />
      <path
        d="M20 20 L13 17 A8 8 0 0 0 20 11 Z"
        fill="white"
        fillOpacity="0.55"
      />
      <path
        d="M20 20 L20 28 A8 8 0 0 0 27 24 Z"
        fill="white"
        fillOpacity="0.75"
      />
      <circle cx="20" cy="20" r="2.2" fill={`url(#${uid}-core)`} />
    </>
  ),
  'agent-doc-review': (uid) => (
    <>
      <rect x="11" y="10" width="14" height="18" rx="2" fill="white" fillOpacity="0.92" />
      <path d="M14 15h8M14 19h6M14 23h5" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
      <path
        d="M24 12l4 4v10a2 2 0 0 1-2 2h-2"
        stroke="white"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />
      <circle cx="27" cy="27" r="5.5" fill={`url(#${uid}-accent)`} />
      <path d="M25.2 27l1.3 1.3 2.8-2.8" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'agent-file-organize': (uid) => (
    <>
      <path d="M10 14h9l2 2h9v14a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V14z" fill="white" fillOpacity="0.35" />
      <path d="M12 18h16M12 22h13M12 26h10" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
      <path d="M14 11h7l2 2h7v12a1.5 1.5 0 0 1-1.5 1.5H14" fill="white" fillOpacity="0.78" />
      <path d="M16 16h10M16 20h8" stroke="#0f766e" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="28" cy="13" r="2" fill={`url(#${uid}-core)`} />
    </>
  ),
  'agent-ppt': (uid) => (
    <>
      <rect x="10" y="12" width="16" height="11" rx="1.5" fill="white" fillOpacity="0.35" transform="translate(2 4)" />
      <rect x="10" y="12" width="16" height="11" rx="1.5" fill="white" fillOpacity="0.65" transform="translate(1 2)" />
      <rect x="10" y="12" width="16" height="11" rx="1.5" fill="white" fillOpacity="0.95" />
      <rect x="13" y="15" width="5" height="4" rx="0.8" fill="#fb923c" fillOpacity="0.85" />
      <path d="M20 15h6M20 18h4" stroke="#c2410c" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="28" cy="24" r="2.5" fill={`url(#${uid}-core)`} />
    </>
  ),
  'agent-meeting': (uid) => (
    <>
      <rect x="11" y="13" width="18" height="14" rx="2" fill="white" fillOpacity="0.25" />
      <path d="M14 18h12M14 22h9M14 26h6" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
      <rect x="13" y="11" width="14" height="10" rx="1.5" fill="white" fillOpacity="0.9" />
      <path d="M16 15h8M16 18h5" stroke="#6d28d9" strokeWidth="1.1" strokeLinecap="round" />
      <path
        d="M27 24v4a1.5 1.5 0 0 0 2.4 1.2l2-1.5"
        stroke="white"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="20" cy="28" r="2" fill={`url(#${uid}-core)`} />
    </>
  ),
  'agent-launch-sentiment': (uid) => (
    <>
      <path d="M12 24c2-4 5-6 8-6s6 2 8 6" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" fill="none" />
      <path d="M14 27c1.5-2.5 3.8-4 6-4s4.5 1.5 6 4" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" fill="none" />
      <path d="M14 18l-2 6h4l-1 5 7-8h-4l2-6z" fill="white" fillOpacity="0.95" />
      <circle cx="28" cy="14" r="2.2" fill={`url(#${uid}-core)`} />
    </>
  ),
  'agent-survey': (uid) => (
    <>
      <rect x="12" y="24" width="3.5" height="6" rx="1" fill="white" fillOpacity="0.55" />
      <rect x="17" y="19" width="3.5" height="11" rx="1" fill="white" fillOpacity="0.75" />
      <rect x="22" y="14" width="3.5" height="16" rx="1" fill="white" fillOpacity="0.95" />
      <rect x="27" y="21" width="3.5" height="9" rx="1" fill="white" fillOpacity="0.7" />
      <path d="M11 30h20" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      <circle cx="20" cy="10" r="2.5" fill={`url(#${uid}-core)`} />
    </>
  ),
  'agent-review-collect': () => (
    <>
      <path d="M20 10v14" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 18l6 6 6-6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M12 28h16" stroke="white" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
    </>
  ),
  'agent-review-translate': () => (
    <>
      <circle cx="15" cy="18" r="5.5" stroke="white" strokeWidth="1.3" fill="none" opacity="0.7" />
      <circle cx="25" cy="22" r="5.5" stroke="white" strokeWidth="1.3" fill="white" fillOpacity="0.2" />
      <path d="M12 18h6M15 15v6" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M22 22h6" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
    </>
  ),
  'agent-review': (uid) => (
    <>
      <path
        d="M12 16c0-1.5 1.2-3 3-3h4c1.2 0 2.2 1 2.2 2.2 0 .8-.4 1.5-1 2 1.2.5 2 1.7 2 3.1 0 1.9-1.5 3.4-3.4 3.4H14"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      <path
        d="M22 18c0-1.2 1-2.2 2.2-2.2H27c1.5 0 2.8 1.2 2.8 2.8 0 1-.5 1.9-1.3 2.5 1.5.6 2.5 2 2.5 3.7 0 2.2-1.8 4-4 4h-4.5"
        fill="white"
        fillOpacity="0.88"
      />
      <path
        d="M18 11l1.2 2.5 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4z"
        fill={`url(#${uid}-accent)`}
      />
    </>
  ),
  'agent-retail-insight': (uid) => (
    <>
      <path d="M11 28h20" stroke="white" strokeWidth="1.3" strokeLinecap="round" opacity="0.45" />
      <path d="M13 28V18l7-6 7 6v10" stroke="white" strokeWidth="1.4" strokeLinejoin="round" fill="none" opacity="0.55" />
      <rect x="17" y="22" width="6" height="6" rx="0.8" fill="white" fillOpacity="0.85" />
      <path d="M14 26l4-5 3 3 5-7" stroke="#15803d" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="28" cy="12" r="2.2" fill={`url(#${uid}-core)`} />
    </>
  ),
  'agent-price-monitor': (uid) => (
    <>
      <path
        d="M14 12l6-3 6 3v8l-6 3-6-3z"
        stroke="white"
        strokeWidth="1.3"
        strokeLinejoin="round"
        fill="white"
        fillOpacity="0.25"
      />
      <path d="M20 9v14M14 12l6 3 6-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
      <text x="20" y="21" textAnchor="middle" fill="white" fontSize="8" fontWeight="700">
        ¥
      </text>
      <circle cx="28" cy="27" r="2.2" fill={`url(#${uid}-core)`} />
    </>
  ),
  'agent-hr-resume': (uid) => (
    <>
      <circle cx="17" cy="16" r="3.2" fill="white" fillOpacity="0.9" />
      <path d="M11 28c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <rect x="22" y="12" width="10" height="14" rx="1.5" fill="white" fillOpacity="0.35" />
      <rect x="23" y="13" width="8" height="12" rx="1" fill="white" fillOpacity="0.9" />
      <path d="M25 17h4M25 20h3" stroke="#5b21b6" strokeWidth="1" strokeLinecap="round" />
      <circle cx="29" cy="27" r="3.5" fill={`url(#${uid}-accent)`} />
      <path d="M27.5 27l1 1 2.5-2.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'agent-training': (uid) => (
    <>
      <path d="M10 18l10-5 10 5-10 5z" fill="white" fillOpacity="0.95" />
      <path d="M30 18v6l-10 5-10-5v-6" stroke="white" strokeWidth="1.2" strokeLinejoin="round" fill="none" opacity="0.55" />
      <rect x="18" y="24" width="4" height="5" rx="0.5" fill="white" fillOpacity="0.75" />
      <circle cx="28" cy="13" r="2" fill={`url(#${uid}-core)`} />
      <path d="M24 11h3" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),
  'agent-knowledge': (uid) => (
    <>
      <path d="M11 14c3-1 5-1 8 0s5 1 8 0v14c-3 1-5 1-8 0s-5-1-8 0V14z" fill="white" fillOpacity="0.35" />
      <path d="M19 14v14" stroke="white" strokeWidth="1.1" opacity="0.45" />
      <path d="M11 14c3-1 5-1 8 0s5 1 8 0" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.65" />
      <circle cx="27" cy="24" r="5" fill="white" fillOpacity="0.92" />
      <circle cx="27" cy="24" r="3" stroke="#0369a1" strokeWidth="1.2" fill="none" />
      <path d="M30.5 27.5l3 3" stroke="#0369a1" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="27" cy="24" r="1.2" fill={`url(#${uid}-core)`} />
    </>
  ),
  'agent-retail-coach': (uid) => (
    <>
      <path
        d="M12 22c0-4 3.6-7 8-7s8 3 8 7"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />
      <path d="M14 22h12" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="17" y="13" width="6" height="4" rx="1.2" fill="white" fillOpacity="0.9" />
      <circle cx="13" cy="24" r="2.5" fill="white" fillOpacity="0.85" />
      <circle cx="27" cy="24" r="2.5" fill="white" fillOpacity="0.85" />
      <circle cx="20" cy="11" r="2" fill={`url(#${uid}-core)`} />
    </>
  ),
  'agent-insight': (uid) => (
    <>
      <path d="M20 10c-3.5 0-6 2.8-6 6.2 0 2.2 1.2 4.1 3 5.2V26h6v-4.6c1.8-1.1 3-3 3-5.2C26 12.8 23.5 10 20 10z" fill="white" fillOpacity="0.92" />
      <path d="M17 28h6" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.65" />
      <path d="M18 28h4" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="20" cy="15" r="2" fill={`url(#${uid}-accent)`} />
    </>
  ),
  'agent-rd-rag': (uid) => (
    <>
      <path d="M16 12h8l2 4v12a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V14a2 2 0 0 1 2-2z" fill="white" fillOpacity="0.35" />
      <path d="M17 12v-2a3 3 0 0 1 6 0v2" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.55" />
      <rect x="17" y="14" width="10" height="12" rx="1.5" fill="white" fillOpacity="0.9" />
      <circle cx="20" cy="24" r="1.5" fill="#0e7490" />
      <circle cx="24" cy="21" r="1.5" fill="#0e7490" opacity="0.7" />
      <path d="M19 18h6" stroke="#0e7490" strokeWidth="1" strokeLinecap="round" />
      <circle cx="28" cy="11" r="2" fill={`url(#${uid}-core)`} />
    </>
  ),
};

function DefaultAgentIcon(uid: string) {
  return (
    <>
      <circle cx="20" cy="16" r="4.5" fill="white" fillOpacity="0.9" />
      <path d="M11 30c0-4 4-7 9-7s9 3 9 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="28" cy="12" r="2" fill={`url(#${uid}-core)`} />
      <path d="M12 12l3-2M28 12l3-2" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
    </>
  );
}

/** Agent 专属彩色艺术图标 */
export function AgentAvatar({ agentId, size = 36, className, title }: AgentAvatarProps) {
  const uid = `agent-av-${agentId}-${size}`;
  const palette = GRADIENTS[agentId] ?? { from: '#a1a1aa', to: '#52525b' };
  const renderIcon = ICONS[agentId] ?? DefaultAgentIcon;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('agent-avatar shrink-0', className)}
      role="img"
      aria-label={title ?? agentId}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={`${uid}-bg`} x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor={palette.from} />
          <stop offset="1" stopColor={palette.to} />
        </linearGradient>
        <radialGradient id={`${uid}-core`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(20 20) scale(4)">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.55" />
        </radialGradient>
        <linearGradient id={`${uid}-accent`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fde68a" />
          <stop offset="1" stopColor={palette.accent ?? '#ffffff'} />
        </linearGradient>
        <linearGradient id={`${uid}-sheen`} x1="8" y1="6" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="10" fill={`url(#${uid}-bg)`} />
      <rect x="2" y="2" width="36" height="36" rx="10" fill={`url(#${uid}-sheen)`} />
      {renderIcon(uid)}
    </svg>
  );
}
