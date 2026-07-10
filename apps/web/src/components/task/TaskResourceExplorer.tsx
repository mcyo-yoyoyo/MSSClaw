import { ResourceExplorer } from '@/components/explorer/ResourceExplorer';
import type { ModuleId } from '@/domain/chat';
import type { AppView } from '@/domain/appView';
import type { WorkspaceResource } from '@/domain/workspace';
import { useConversationStore } from '@/stores/conversationStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useTaskStore } from '@/stores/taskStore';
import { navigateToTaskChat } from '@/hooks/useTaskRouteSync';

const MODULE_TO_VIEW: Partial<Record<ModuleId, AppView>> = {
  agent: 'agents',
  workflow: 'workflow',
  knowledge: 'kb',
  prompt: 'prompts',
  skill: 'skills',
  tool: 'tools',
  memory: 'memory',
  settings: 'admin',
};

interface TaskResourceExplorerProps {
  onWorkspaceSwitch: (workspaceId: string) => void;
}

export function TaskResourceExplorer({ onWorkspaceSwitch }: TaskResourceExplorerProps) {
  const open = useTaskStore((s) => s.resourceExplorerOpen);
  const close = useTaskStore((s) => s.closeResourceExplorer);

  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const expandedSections = useWorkspaceStore((s) => s.expandedSections);
  const selectedResourceId = useWorkspaceStore((s) => s.selectedResourceId);
  const toggleSection = useWorkspaceStore((s) => s.toggleSection);
  const selectResource = useWorkspaceStore((s) => s.selectResource);

  const chats = useConversationStore((s) => s.chats);
  const currentChatId = useConversationStore((s) => s.currentChatId);
  const setAppView = useAppViewStore((s) => s.setAppView);

  if (!open) return null;

  const handleOpenModule = (kind: ModuleId, resource: WorkspaceResource) => {
    selectResource(resource.id);
    setAppView(MODULE_TO_VIEW[kind] ?? 'home');
    close();
  };

  const handleSwitchChat = (chatId: string) => {
    navigateToTaskChat(chatId);
    close();
  };

  return (
    <>
      <button
        type="button"
        aria-label="关闭资源浏览器"
        className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-[1px]"
        onClick={close}
      />
      <div className="fixed left-0 top-12 z-[75] h-[calc(100vh-3rem)] shadow-2xl">
        <ResourceExplorer
          workspaceId={workspaceId}
          chats={chats}
          currentChatId={currentChatId}
          expandedSections={expandedSections}
          selectedResourceId={selectedResourceId}
          onWorkspaceSwitch={(id) => {
            onWorkspaceSwitch(id);
            close();
          }}
          onToggleSection={toggleSection}
          onSwitchChat={handleSwitchChat}
          onOpenModule={handleOpenModule}
        />
      </div>
    </>
  );
}
