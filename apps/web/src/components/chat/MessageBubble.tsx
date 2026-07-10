import type { ChatMessage } from '@/domain/chat';

interface MessageBubbleProps {
  message: ChatMessage;
  accentColor?: string;
  iconClass?: string;
  iconBg?: string;
}

export function MessageBubble({
  message,
  accentColor = 'claw',
  iconClass = 'fa-robot',
  iconBg,
}: MessageBubbleProps) {
  if (message.role === 'system') {
    return (
      <div className="my-4 flex justify-center">
        <span className="rounded-full bg-slate-200/50 px-3 py-1 text-[10px] font-medium text-[#86868b] backdrop-blur">
          {message.text}
        </span>
      </div>
    );
  }

  if (message.role === 'user') {
    return (
      <div className="mb-4 flex justify-end">
        <div className="flex max-w-[85%] flex-col items-end">
          <div className="bubble-user rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm">
            {message.text}
          </div>
          <span className="mono mt-1.5 text-[9px] text-[#aeaeb2]">刚刚 · 已送达</span>
        </div>
      </div>
    );
  }

  if (message.role === 'typing') {
    return (
      <div className="mb-4 flex max-w-[85%] gap-2">
        <Avatar color={accentColor} iconClass={iconClass} iconBg={iconBg} />
        <div className="bubble-agent flex items-center justify-center px-3.5 py-3">
          <div className="typing-indicator">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  if (message.role === 'other') {
    return (
      <div className="mb-4 flex max-w-[85%] gap-2">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${message.avatar ?? 'bg-[#fafafa]0'}`}
        >
          {message.name?.charAt(0)}
        </div>
        <div className="flex flex-col">
          <span className="mb-1 ml-1 text-[10px] font-bold text-[#86868b]">{message.name}</span>
          <div className="bubble-other px-3.5 py-2.5 text-[13px] leading-relaxed text-[#424245] shadow-sm">
            {message.text}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex max-w-[90%] gap-2">
      <Avatar color={accentColor} iconClass={iconClass} />
      <div className="flex flex-col">
          <span className="mb-1 ml-0.5 text-[10px] font-semibold text-[#86868b]">
            {message.name}{' '}
            <span className="rounded border border-zinc-200 bg-claw-50 px-1.5 py-0.5 text-[8px] font-bold text-zinc-700">
              Agent
            </span>
          </span>
          <div
            className="bubble-agent rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed text-[#424245]"
            dangerouslySetInnerHTML={{
              __html:
                (message.text ?? '')
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>') +
                (message.streaming
                  ? '<span class="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-claw-500 align-middle"></span>'
                  : ''),
            }}
          />
      </div>
    </div>
  );
}

function Avatar({
  color,
  iconClass,
  iconBg,
}: {
  color: string;
  iconClass: string;
  iconBg?: string;
}) {
  if (iconBg) {
    return (
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs text-white shadow-sm', iconBg)}>
        <i className={cn('fa-solid', iconClass)} />
      </div>
    );
  }
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-${color}-600 text-xs text-white shadow-sm`}>
      <i className={`fa-solid ${iconClass}`} />
    </div>
  );
}

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}
