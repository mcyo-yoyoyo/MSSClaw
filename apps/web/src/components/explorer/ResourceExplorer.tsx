import type { ChatConfig } from '@/domain/chat';
import type { ModuleId } from '@/domain/chat';
import {
  getResourcesByKind,
  getStatusClass,
  getStatusLabel,
  type ExplorerSection,
  type WorkspaceResource,
} from '@/domain/workspace';
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { cn } from '@/lib/utils';

interface ResourceExplorerProps {
  workspaceId: string;
  chats: Record<string, ChatConfig>;
  currentChatId: string;
  expandedSections: Record<ExplorerSection, boolean>;
  selectedResourceId: string | null;
  onWorkspaceSwitch: (workspaceId: string) => void;
  onToggleSection: (section: ExplorerSection) => void;
  onSwitchChat: (chatId: string) => void;
  onOpenModule: (module: ModuleId, resource: WorkspaceResource) => void;
}

export function ResourceExplorer({
  workspaceId,
  chats,
  currentChatId,
  expandedSections,
  selectedResourceId,
  onWorkspaceSwitch,
  onToggleSection,
  onSwitchChat,
  onOpenModule,
}: ResourceExplorerProps) {
  const catalog = useWorkspaceStore((state) => state.getCatalog(workspaceId));
  const conversations = Object.values(chats);
  const starred = conversations.filter((chat) => chat.type === 'group');
  const directAgents = conversations.filter((chat) => chat.type === 'bot');

  return (
    <aside className="studio-list-panel w-[300px] z-40">
      <WorkspaceSwitcher current={catalog.workspace} onSwitch={onWorkspaceSwitch} />

      <div className="border-b border-black/[0.05] px-3 pb-3">
        <div className="relative">
          <i className="fa-solid fa-search absolute left-3 top-2.5 text-sm text-[#aeaeb2]" />
          <input
            type="text"
            placeholder="搜索资源、会话或 Prompt..."
            className="w-full rounded-lg bg-black/[0.04] py-2 pl-9 pr-4 text-sm transition focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>
      </div>

      <div className="scroll-hidden flex-grow overflow-y-auto pb-4">
        <TreeSection
          title="Conversations"
          section="conversations"
          expanded={expandedSections.conversations}
          onToggle={onToggleSection}
        >
          {starred.map((chat) => (
            <ConversationItem
              key={chat.id}
              chat={chat}
              active={currentChatId === chat.id}
              onClick={() => onSwitchChat(chat.id)}
              badge={chat.sessionGroup === 'pinned' && currentChatId !== chat.id}
            />
          ))}
          {directAgents.map((chat) => (
            <ConversationItem
              key={chat.id}
              chat={chat}
              active={currentChatId === chat.id}
              onClick={() => onSwitchChat(chat.id)}
            />
          ))}
        </TreeSection>

        <TreeSection
          title="Agents"
          section="agents"
          expanded={expandedSections.agents}
          onToggle={onToggleSection}
        >
          {getResourcesByKind(catalog, 'agent').map((resource) => (
            <ResourceItem
              key={resource.id}
              resource={resource}
              active={selectedResourceId === resource.id || currentChatId === resource.chatId}
              onClick={() => {
                if (resource.chatId) onSwitchChat(resource.chatId);
                else onOpenModule('agent', resource);
              }}
            />
          ))}
        </TreeSection>

        <TreeSection
          title="Workflows"
          section="workflows"
          expanded={expandedSections.workflows}
          onToggle={onToggleSection}
        >
          {getResourcesByKind(catalog, 'workflow').map((resource) => (
            <ResourceItem
              key={resource.id}
              resource={resource}
              active={selectedResourceId === resource.id}
              onClick={() => onOpenModule('workflow', resource)}
            />
          ))}
        </TreeSection>

        <TreeSection
          title="Knowledge"
          section="knowledge"
          expanded={expandedSections.knowledge}
          onToggle={onToggleSection}
        >
          {getResourcesByKind(catalog, 'knowledge').map((resource) => (
            <ResourceItem
              key={resource.id}
              resource={resource}
              active={selectedResourceId === resource.id}
              onClick={() => onOpenModule('knowledge', resource)}
            />
          ))}
        </TreeSection>

        <TreeSection
          title="Prompts"
          section="prompts"
          expanded={expandedSections.prompts}
          onToggle={onToggleSection}
        >
          {getResourcesByKind(catalog, 'prompt').map((resource) => (
            <ResourceItem
              key={resource.id}
              resource={resource}
              active={selectedResourceId === resource.id}
              onClick={() => onOpenModule('prompt', resource)}
            />
          ))}
        </TreeSection>
      </div>
    </aside>
  );
}

function TreeSection({
  title,
  section,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  section: ExplorerSection;
  expanded: boolean;
  onToggle: (section: ExplorerSection) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="px-2 pt-2">
      <button
        type="button"
        onClick={() => onToggle(section)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] font-bold uppercase tracking-wider text-[#aeaeb2] hover:bg-black/[0.03]"
      >
        <i className={cn('fa-solid fa-chevron-right text-[10px] transition', expanded && 'rotate-90')} />
        {title}
      </button>
      {expanded && <div className="mt-1 space-y-1">{children}</div>}
    </section>
  );
}

function ConversationItem({
  chat,
  active,
  onClick,
  badge,
}: {
  chat: ChatConfig;
  active: boolean;
  onClick: () => void;
  badge?: boolean;
}) {
  const avatarClass =
    chat.type === 'group'
      ? 'bg-gradient-to-br from-zinc-600 to-zinc-800'
      : ({
          indigo: 'bg-claw-600',
          emerald: 'bg-emerald-600',
          violet: 'bg-violet-600',
          amber: 'bg-amber-600',
          cyan: 'bg-cyan-600',
        }[chat.color] ?? 'bg-claw-600');

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition',
        active ? 'border-l-4 border-zinc-900 bg-black/[0.04]' : 'hover:bg-black/[0.03]',
      )}
    >
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white', avatarClass)}>
        <i className={cn('fa-solid text-xs', chat.icon)} />
      </div>
      <div className="min-w-0 flex-grow">
        <p className="truncate text-[13px] font-semibold text-[#1d1d1f]">{chat.title}</p>
        <p className="truncate text-[10px] text-[#86868b]">{chat.type === 'group' ? 'Group Chat' : 'Direct Agent'}</p>
      </div>
      {badge && <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />}
    </button>
  );
}

function ResourceItem({
  resource,
  active,
  onClick,
}: {
  resource: WorkspaceResource;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition',
        active ? 'bg-claw-50 ring-1 ring-claw-200' : 'hover:bg-black/[0.03]',
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] text-[#6e6e73]">
        <i className={cn('fa-solid text-xs', resource.icon)} />
      </div>
      <div className="min-w-0 flex-grow">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-semibold text-[#1d1d1f]">{resource.name}</p>
          {resource.version && <span className="text-[9px] text-[#aeaeb2]">{resource.version}</span>}
        </div>
        <p className="truncate text-[10px] text-[#86868b]">{resource.description ?? resource.kind}</p>
      </div>
      <span className={cn('shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold', getStatusClass(resource.status))}>
        {getStatusLabel(resource.status)}
      </span>
    </button>
  );
}
