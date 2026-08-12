import { cn } from '@/lib/utils';
import { AgentAvatar } from '@/components/brand/AgentAvatar';
import { resolveAgentAvatarSrc } from '@/domain/agentAvatars';

interface AgentPortraitProps {
  agentId: string;
  name?: string;
  icon?: string;
  avatarUrl?: string | null;
  avatarPresetId?: string | null;
  size?: number;
  className?: string;
  title?: string;
}

/**
 * 数字员工形象：优先自定义/预设头像（含按 id 回退），否则回退到既有插画/图标。
 */
export function AgentPortrait({
  agentId,
  name,
  icon,
  avatarUrl,
  avatarPresetId,
  size = 40,
  className,
  title,
}: AgentPortraitProps) {
  const src = resolveAgentAvatarSrc({
    id: agentId,
    avatarUrl,
    avatarPresetId,
  });
  if (src) {
    return (
      <img
        src={src}
        alt={title || name || agentId}
        width={size}
        height={size}
        className={cn(className, 'rounded-full object-cover')}
        style={{ width: size, height: size }}
        title={title || name}
      />
    );
  }
  if (icon) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-zinc-900 text-white',
          className,
        )}
        style={{ width: size, height: size }}
        title={title || name}
      >
        <i className={cn('fa-solid text-[14px]', icon)} />
      </span>
    );
  }
  return <AgentAvatar agentId={agentId} size={size} className={className} title={title || name} />;
}
