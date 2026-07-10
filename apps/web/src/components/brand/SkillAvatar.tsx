import { cn } from '@/lib/utils';

interface SkillAvatarProps {
  skillId: string;
  icon: string;
  size?: number;
  className?: string;
  title?: string;
}

/** 每个 Skill 固定配色，保证列表里一眼可辨 */
const SKILL_COLORS: Record<string, { from: string; to: string }> = {
  'skill-data-analysis': { from: '#3b82f6', to: '#1d4ed8' },
  'skill-doc-gen': { from: '#64748b', to: '#334155' },
  'skill-doc-compliance': { from: '#f59e0b', to: '#b45309' },
  'skill-file-archive': { from: '#14b8a6', to: '#0f766e' },
  'skill-ppt-gen': { from: '#f97316', to: '#c2410c' },
  'skill-meeting-minutes': { from: '#8b5cf6', to: '#6d28d9' },
  'skill-work-summary': { from: '#6366f1', to: '#4338ca' },
  'skill-doc-parser': { from: '#0ea5e9', to: '#0369a1' },
  'skill-launch-sentiment': { from: '#f43f5e', to: '#be123c' },
  'skill-survey-insight': { from: '#06b6d4', to: '#0e7490' },
  'skill-review-cluster': { from: '#eab308', to: '#a16207' },
  'skill-retail-insight': { from: '#22c55e', to: '#15803d' },
  'skill-price-monitor': { from: '#10b981', to: '#047857' },
  'skill-so-report': { from: '#3b82f6', to: '#1e40af' },
  'skill-jd-parser': { from: '#a855f7', to: '#6b21a8' },
  'skill-resume-screen': { from: '#8b5cf6', to: '#5b21b6' },
  'skill-interview-analysis': { from: '#d946ef', to: '#a21caf' },
  'skill-training-gen': { from: '#818cf8', to: '#4338ca' },
  'skill-rag': { from: '#38bdf8', to: '#0284c7' },
  'skill-rerank': { from: '#2dd4bf', to: '#0f766e' },
  'skill-retail-coach': { from: '#fb923c', to: '#c2410c' },
  'skill-complaint-sop': { from: '#fb7185', to: '#e11d48' },
  'skill-wecom': { from: '#34d399', to: '#059669' },
};

const FALLBACK_PALETTE = [
  { from: '#3b82f6', to: '#1d4ed8' },
  { from: '#f97316', to: '#c2410c' },
  { from: '#22c55e', to: '#15803d' },
  { from: '#8b5cf6', to: '#6d28d9' },
  { from: '#06b6d4', to: '#0e7490' },
  { from: '#f43f5e', to: '#be123c' },
  { from: '#eab308', to: '#a16207' },
  { from: '#14b8a6', to: '#0f766e' },
];

function colorForSkill(skillId: string) {
  if (SKILL_COLORS[skillId]) return SKILL_COLORS[skillId];
  let hash = 0;
  for (let i = 0; i < skillId.length; i += 1) hash = (hash * 31 + skillId.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

export function SkillAvatar({ skillId, icon, size = 36, className, title }: SkillAvatarProps) {
  const { from, to } = colorForSkill(skillId);
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-[10px] text-white shadow-sm',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, ${from}, ${to})`,
      }}
      title={title}
      aria-hidden={!title}
    >
      <i className={cn('fa-solid', icon)} style={{ fontSize: Math.max(11, Math.round(size * 0.38)) }} />
    </div>
  );
}
