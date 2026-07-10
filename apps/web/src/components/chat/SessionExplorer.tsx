import type { ChatConfig } from '@/domain/chat';
import { cn } from '@/lib/utils';

interface SessionExplorerProps {
  chats: Record<string, ChatConfig>;
  currentChatId: string;
  onSwitch: (chatId: string) => void;
}

export function SessionExplorer({ chats, currentChatId, onSwitch }: SessionExplorerProps) {
  const starred = Object.values(chats).filter((chat) => chat.type === 'group');
  const agents = Object.values(chats).filter((chat) => chat.type === 'bot');

  return (
    <aside className="studio-list-panel w-wide z-40">
      <div className="border-b border-black/[0.05] p-4">
        <div className="relative">
          <i className="fa-solid fa-search absolute left-3 top-2.5 text-sm text-[#aeaeb2]" />
          <input
            type="text"
            placeholder="搜索会话、Agent 或消息..."
            className="w-full rounded-lg bg-black/[0.04] py-2 pl-9 pr-4 text-sm transition focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>
      </div>

      <div className="scroll-hidden flex-grow overflow-y-auto">
        <Section title="星标会话 (3C 业务)">
          {starred.map((chat) => (
            <SessionItem
              key={chat.id}
              chat={chat}
              active={currentChatId === chat.id}
              onClick={() => onSwitch(chat.id)}
              showBadge={chat.sessionGroup === 'pinned' && currentChatId !== chat.id}
            />
          ))}
        </Section>

        <Section title="企业级 Agents">
          {agents.map((chat) => (
            <SessionItem
              key={chat.id}
              chat={chat}
              active={currentChatId === chat.id}
              onClick={() => onSwitch(chat.id)}
            />
          ))}
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <div className="mt-2 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#aeaeb2]">
        {title}
      </div>
      {children}
    </>
  );
}

function SessionItem({
  chat,
  active,
  onClick,
  showBadge,
}: {
  chat: ChatConfig;
  active: boolean;
  onClick: () => void;
  showBadge?: boolean;
}) {
  const isGroup = chat.type === 'group';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-lg p-3 text-left transition',
        active ? 'border-l-4 border-zinc-900 bg-black/[0.04]' : 'hover:bg-black/[0.03]',
      )}
    >
      <div
        className={cn(
          'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm',
          isGroup ? 'bg-gradient-to-br from-zinc-600 to-zinc-800' : `bg-${chat.color}-600`,
        )}
      >
        <i className={cn('fa-solid text-sm', chat.icon)} />
        {!isGroup && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
        )}
      </div>

      <div className="min-w-0 flex-grow overflow-hidden">
        <div className="mb-0.5 flex items-baseline justify-between">
          <span className="truncate text-sm font-bold text-[#1d1d1f]">{chat.title}</span>
          <span className={cn('shrink-0 text-[10px]', isGroup ? 'text-[#aeaeb2]' : `text-${chat.color}-600 font-medium`)}>
            {isGroup ? '14:02' : 'Bot'}
          </span>
        </div>
        <p className={cn('truncate text-xs', active && !isGroup ? `text-${chat.color}-600` : 'text-[#86868b]')}>
          {chat.status}
        </p>
      </div>

      {showBadge && <div className="absolute right-3 top-8 h-2 w-2 rounded-full bg-red-500" />}
    </button>
  );
}
