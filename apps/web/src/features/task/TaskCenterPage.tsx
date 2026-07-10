import { useEffect, useRef, useState } from 'react';
import { TaskListPanel } from '@/components/task/TaskListPanel';
import { CreateTaskDialog } from '@/components/task/CreateTaskDialog';
import { WarRoomMembersModal } from '@/components/task/WarRoomMembersModal';
import { TaskResourceExplorer } from '@/components/task/TaskResourceExplorer';
import { TaskChatPanel } from '@/components/chat/TaskChatPanel';
import { ArtifactPanel } from '@/components/artifact/ArtifactPanel';
import { KbCitationPreviewModal } from '@/components/knowledge/KbCitationPreviewModal';
import { useConversationStore } from '@/stores/conversationStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useTaskStore } from '@/stores/taskStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { getAgentById } from '@/domain/plan';
import { buildAppRoute } from '@/domain/appRoute';
import { canUseWarRoomAi, isWarRoom } from '@/domain/chat';

interface TaskCenterPageProps {
  onWorkspaceSwitch?: (workspaceId: string) => void;
}

export function TaskCenterPage({ onWorkspaceSwitch }: TaskCenterPageProps) {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const {
    taskListCollapsed,
    artifactPanelCollapsed,
    toggleTaskList,
    toggleArtifactPanel,
    createDialogOpen,
    openCreateDialog,
    closeCreateDialog,
    toggleResourceExplorer,
  } = useTaskStore();

  const chats = useConversationStore((s) => s.chats);
  const currentChatId = useConversationStore((s) => s.currentChatId);
  const switchChat = useConversationStore((s) => s.switchChat);
  const sendMessage = useConversationStore((s) => s.sendMessage);
  const approvePlan = useConversationStore((s) => s.approvePlan);
  const savePlanSteps = useConversationStore((s) => s.savePlanSteps);
  const isAgentTyping = useConversationStore((s) => s.isAgentTyping);
  const streamStatus = useConversationStore((s) => s.streamStatus);
  const cancelStream = useConversationStore((s) => s.cancelStream);
  const sandboxReady = useConversationStore((s) => s.sandboxReady);
  const sandboxType = useConversationStore((s) => s.sandboxType);
  const sandboxQuery = useConversationStore((s) => s.sandboxQuery);
  const openExport = useConversationStore((s) => s.openExport);
  const pushToGroup = useConversationStore((s) => s.pushToGroup);
  const pinCurrentChat = useConversationStore((s) => s.pinCurrentChat);
  const exportChatJson = useConversationStore((s) => s.exportChatJson);
  const clearSandbox = useConversationStore((s) => s.clearSandbox);
  const kbArtifact = useConversationStore((s) => s.kbArtifact);
  const kbPreviewDocId = useConversationStore((s) => s.kbPreviewDocId);
  const openKbPreview = useConversationStore((s) => s.openKbPreview);
  const closeKbPreview = useConversationStore((s) => s.closeKbPreview);
  const consumePendingTaskSubmit = useConversationStore((s) => s.consumePendingTaskSubmit);
  const createAgentTaskSession = useConversationStore((s) => s.createAgentTaskSession);
  const createWarRoomSession = useConversationStore((s) => s.createWarRoomSession);
  const deleteTaskSession = useConversationStore((s) => s.deleteTaskSession);
  const renameTaskSession = useConversationStore((s) => s.renameTaskSession);
  const runTaskExample = useConversationStore((s) => s.runTaskExample);
  const addWarRoomMember = useConversationStore((s) => s.addWarRoomMember);
  const removeWarRoomMember = useConversationStore((s) => s.removeWarRoomMember);
  const setWarRoomMemberAi = useConversationStore((s) => s.setWarRoomMemberAi);

  const [draft, setDraft] = useState('');
  const [citationSnippet, setCitationSnippet] = useState('');
  const [citationIndex, setCitationIndex] = useState<number>();
  const [membersOpen, setMembersOpen] = useState(false);
  const pendingHandled = useRef<string | null>(null);
  const kbDocs = useMarketplaceStore((s) => s.kbDocs);

  const chat = chats[currentChatId];
  const previewDoc = kbPreviewDocId ? kbDocs.find((d) => d.id === kbPreviewDocId) ?? null : null;
  const aiAllowed = chat ? canUseWarRoomAi(chat) : false;

  useEffect(() => {
    const pending = consumePendingTaskSubmit();
    if (!pending || pending.chatId !== currentChatId) return;
    const key = `${pending.chatId}:${pending.message}:${pending.autoSend}`;
    if (pendingHandled.current === key) return;
    pendingHandled.current = key;

    if (pending.autoSend) {
      void sendMessage(pending.message, workspaceId);
    } else {
      setDraft(pending.message);
    }
  }, [currentChatId, consumePendingTaskSubmit, sendMessage, workspaceId]);

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <TaskListPanel
        chats={chats}
        currentChatId={currentChatId}
        onSwitch={switchChat}
        onCreate={openCreateDialog}
        onOpenResources={toggleResourceExplorer}
        collapsed={taskListCollapsed}
        onToggleCollapse={toggleTaskList}
        onDelete={(id) => deleteTaskSession(id)}
        onRename={(id, title) => renameTaskSession(id, title)}
      />

      {chat ? (
        <>
          <TaskChatPanel
            chat={chat}
            draft={draft}
            onDraftChange={setDraft}
            onSend={(text) => void sendMessage(text, workspaceId)}
            isAgentTyping={isAgentTyping}
            streamStatus={streamStatus}
            onCancelStream={cancelStream}
            onApprovePlan={(planId, steps) => void approvePlan(planId, steps)}
            onSavePlan={savePlanSteps}
            onPinChat={pinCurrentChat}
            onExportChat={exportChatJson}
            onShareChat={() => {
              const link = `${window.location.origin}${window.location.pathname}${buildAppRoute({ view: 'task', chat: currentChatId })}`;
              void navigator.clipboard.writeText(link).then(
                () => useConversationStore.setState({ pushToast: '任务链接已复制到剪贴板' }),
                () => useConversationStore.setState({ pushToast: '复制失败，请手动复制地址栏' }),
              );
            }}
            onDeleteChat={() => deleteTaskSession(currentChatId)}
            onClearSandbox={clearSandbox}
            onManageMembers={isWarRoom(chat) ? () => setMembersOpen(true) : undefined}
            aiAllowed={aiAllowed}
            previewCollapsed={artifactPanelCollapsed}
          />

          <ArtifactPanel
            ready={sandboxReady}
            type={sandboxType}
            query={sandboxQuery}
            kbArtifact={kbArtifact}
            collapsed={artifactPanelCollapsed}
            onToggleCollapse={toggleArtifactPanel}
            onExport={openExport}
            onPush={() => void pushToGroup()}
            onCitationClick={(docId, index, snippet) => {
              setCitationSnippet(snippet);
              setCitationIndex(index);
              openKbPreview(docId);
            }}
            onDeliverableDownload={(name) =>
              useConversationStore.setState({ pushToast: `已开始下载 ${name}` })
            }
            onRunExample={runTaskExample}
          />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-[#86868b]">
          当前 Workspace 暂无任务会话 · 点击左侧 + 新建
        </div>
      )}

      <KbCitationPreviewModal
        doc={previewDoc}
        citationIndex={citationIndex}
        snippet={citationSnippet}
        onClose={() => {
          closeKbPreview();
          setCitationSnippet('');
          setCitationIndex(undefined);
        }}
      />

      {onWorkspaceSwitch && <TaskResourceExplorer onWorkspaceSwitch={onWorkspaceSwitch} />}

      <CreateTaskDialog
        open={createDialogOpen}
        onClose={closeCreateDialog}
        onCreateWarRoom={(title) => createWarRoomSession(title)}
        onCreateAgent={(title, agentId) => {
          const agent = agentId ? getAgentById(agentId) : null;
          createAgentTaskSession({
            title,
            agentName: agent?.name,
            agentIcon: agent?.icon,
            agentId: agent?.id,
          });
        }}
      />

      {chat && isWarRoom(chat) && (
        <WarRoomMembersModal
          open={membersOpen}
          chat={chat}
          workspaceId={workspaceId}
          onClose={() => setMembersOpen(false)}
          onAddMember={(member) => addWarRoomMember(chat.id, member)}
          onRemoveMember={(memberId) => removeWarRoomMember(chat.id, memberId)}
          onToggleAi={(memberId, canUseAi) => setWarRoomMemberAi(chat.id, memberId, canUseAi)}
        />
      )}
    </div>
  );
}
