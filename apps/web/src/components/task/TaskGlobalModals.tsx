import { CreateTaskDialog } from '@/components/task/CreateTaskDialog';
import { TaskResourceExplorer } from '@/components/task/TaskResourceExplorer';
import { useAppViewStore } from '@/stores/appViewStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useTaskStore } from '@/stores/taskStore';

interface TaskGlobalModalsProps {
  onWorkspaceSwitch?: (workspaceId: string) => void;
}

/** 侧栏「新建群聊 / 资源」入口：挂在 App 级；Agent 新建走 AI任务页 */
export function TaskGlobalModals({ onWorkspaceSwitch }: TaskGlobalModalsProps) {
  const createDialogOpen = useTaskStore((s) => s.createDialogOpen);
  const closeCreateDialog = useTaskStore((s) => s.closeCreateDialog);
  const createWarRoomSession = useConversationStore((s) => s.createWarRoomSession);
  const setAppView = useAppViewStore((s) => s.setAppView);

  return (
    <>
      {onWorkspaceSwitch ? <TaskResourceExplorer onWorkspaceSwitch={onWorkspaceSwitch} /> : null}
      <CreateTaskDialog
        open={createDialogOpen}
        onClose={closeCreateDialog}
        onCreateWarRoom={(title) => {
          createWarRoomSession(title);
          setAppView('task');
        }}
      />
    </>
  );
}
