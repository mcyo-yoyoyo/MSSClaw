import { useEffect, useRef, useState } from 'react';
import { WarRoomMembersModal } from '@/components/task/WarRoomMembersModal';
import { TaskChatPanel } from '@/components/chat/TaskChatPanel';
import { ArtifactPanel } from '@/components/artifact/ArtifactPanel';
import { PushDeliverableModal } from '@/components/artifact/PushDeliverableModal';
import { KbCitationPreviewModal } from '@/components/knowledge/KbCitationPreviewModal';
import { useConversationStore } from '@/stores/conversationStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useTaskStore } from '@/stores/taskStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { getAgentById } from '@/domain/plan';
import { buildAppRoute } from '@/domain/appRoute';
import { canUseWarRoomAi, isWarRoom } from '@/domain/chat';
import { openAiAssistantForNewTask } from '@/domain/openNewTask';
import { getMembersByWorkspace } from '@/domain/rbac';

interface TaskCenterPageProps {
  onWorkspaceSwitch?: (workspaceId: string) => void;
}

export function TaskCenterPage(_props: TaskCenterPageProps) {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const [pushOpen, setPushOpen] = useState(false);
  const {
    artifactPanelCollapsed,
    focusBannerVisible,
    toggleArtifactPanel,
    dismissFocusBanner,
  } = useTaskStore();

  const chats = useConversationStore((s) => s.chats);
  const currentChatId = useConversationStore((s) => s.currentChatId);
  const sendMessage = useConversationStore((s) => s.sendMessage);
  const approvePlan = useConversationStore((s) => s.approvePlan);
  const savePlanSteps = useConversationStore((s) => s.savePlanSteps);
  const isAgentTyping = useConversationStore((s) => s.isAgentTyping);
  const streamStatus = useConversationStore((s) => s.streamStatus);
  const cancelStream = useConversationStore((s) => s.cancelStream);
  const sandboxReady = useConversationStore((s) => s.sandboxReady);
  const sandboxType = useConversationStore((s) => s.sandboxType);
  const sandboxQuery = useConversationStore((s) => s.sandboxQuery);
  const sandboxAgentName = useConversationStore((s) => s.sandboxAgentName);
  const sandboxSkills = useConversationStore((s) => s.sandboxSkills);
  const sandboxAgentReply = useConversationStore((s) => s.sandboxAgentReply);
  const pushToGroup = useConversationStore((s) => s.pushToGroup);
  const pinCurrentChat = useConversationStore((s) => s.pinCurrentChat);
  const exportChatJson = useConversationStore((s) => s.exportChatJson);
  const clearSandbox = useConversationStore((s) => s.clearSandbox);
  const kbArtifact = useConversationStore((s) => s.kbArtifact);
  const kbPreviewDocId = useConversationStore((s) => s.kbPreviewDocId);
  const openKbPreview = useConversationStore((s) => s.openKbPreview);
  const closeKbPreview = useConversationStore((s) => s.closeKbPreview);
  const pendingTaskSubmit = useConversationStore((s) => s.pendingTaskSubmit);
  const expertTeamRelay = useConversationStore((s) => s.expertTeamRelay);
  const consumePendingTaskSubmit = useConversationStore((s) => s.consumePendingTaskSubmit);
  const deleteTaskSession = useConversationStore((s) => s.deleteTaskSession);
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
  /** 无交付物时强制收起预览，聊天全宽 */
  const hasDeliverable = sandboxReady;
  const effectiveArtifactCollapsed = artifactPanelCollapsed || !hasDeliverable;
  const prevReadyRef = useRef(false);

  useEffect(() => {
    if (!pendingTaskSubmit || pendingTaskSubmit.chatId !== currentChatId) return;
    const pending = consumePendingTaskSubmit();
    if (!pending) return;
    const key = `${pending.chatId}:${pending.message}:${pending.autoSend}`;
    if (pendingHandled.current === key) return;
    pendingHandled.current = key;

    if (pending.autoSend) {
      void sendMessage(pending.message, workspaceId);
    } else {
      setDraft(pending.message);
    }
  }, [currentChatId, pendingTaskSubmit, consumePendingTaskSubmit, sendMessage, workspaceId]);

  useEffect(() => {
    if (sandboxReady && !prevReadyRef.current && artifactPanelCollapsed) {
      useConversationStore.setState({
        pushToast: '交付件已就绪 · 点击右侧「预览」查看',
      });
    }
    prevReadyRef.current = sandboxReady;
  }, [sandboxReady, artifactPanelCollapsed]);

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      {expertTeamRelay && expertTeamRelay.chatId === currentChatId ? (
        <div className="absolute left-1/2 top-3 z-30 flex max-w-[min(92vw,560px)] -translate-x-1/2 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-md">
          <i className="fa-solid fa-people-group text-[12px] text-zinc-600" />
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-zinc-600">
            专家团「{expertTeamRelay.scenarioLabel}」接力中 · 第{' '}
            {expertTeamRelay.currentIndex + 1}/{expertTeamRelay.steps.length} 步 ·{' '}
            {expertTeamRelay.steps[expertTeamRelay.currentIndex]?.label ?? '—'}
            {expertTeamRelay.autoApprove ? '（计划自动确认）' : ''}
          </p>
          <button
            type="button"
            onClick={cancelStream}
            className="shrink-0 rounded-lg border border-zinc-200 px-2.5 py-1 text-[10px] font-medium text-zinc-600 hover:bg-zinc-50"
          >
            中止接力
          </button>
        </div>
      ) : focusBannerVisible ? (
        <div className="absolute left-1/2 top-3 z-30 flex max-w-[min(92vw,520px)] -translate-x-1/2 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-md">
          <i className="fa-solid fa-comments text-[12px] text-zinc-500" />
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-zinc-600">
            已进入对话专注：可在左侧「任务 / 群聊」切换历史；交付件就绪后可打开右侧预览。
          </p>
          <button
            type="button"
            onClick={dismissFocusBanner}
            className="shrink-0 rounded-lg bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-zinc-800"
          >
            知道了
          </button>
          <button
            type="button"
            onClick={dismissFocusBanner}
            className="shrink-0 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="关闭提示"
          >
            <i className="fa-solid fa-xmark text-[11px]" />
          </button>
        </div>
      ) : null}

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
            previewCollapsed={effectiveArtifactCollapsed}
          />

          <ArtifactPanel
            ready={sandboxReady}
            type={sandboxType}
            query={sandboxQuery}
            agentName={sandboxAgentName || (chat.agentId ? getAgentById(chat.agentId)?.name : undefined)}
            skills={sandboxSkills}
            agentReply={sandboxAgentReply}
            kbArtifact={kbArtifact}
            collapsed={effectiveArtifactCollapsed}
            onToggleCollapse={() => {
              if (!hasDeliverable) {
                useConversationStore.setState({
                  pushToast: '对话完成后将生成交付件，再打开右侧预览',
                });
                return;
              }
              toggleArtifactPanel();
            }}
            onPush={() => setPushOpen(true)}
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
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-[#86868b]">
          <p>在「AI任务」描述需求即可新建，或从左侧打开已有任务 / 群聊</p>
          <button
            type="button"
            onClick={() => openAiAssistantForNewTask()}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-zinc-800"
          >
            去「AI任务」新建
          </button>
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

      <PushDeliverableModal
        open={pushOpen}
        onClose={() => setPushOpen(false)}
        warrooms={Object.values(chats).filter((c) => isWarRoom(c))}
        members={getMembersByWorkspace(workspaceId)}
        onConfirm={(target) => {
          void pushToGroup(
            target.mode === 'warroom'
              ? { warroomIds: target.warroomIds }
              : { memberIds: target.memberIds },
          );
        }}
      />
    </div>
  );
}
