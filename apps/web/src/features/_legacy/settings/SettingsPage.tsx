import { useMemo } from 'react';
import { SettingsNav } from '@/components/settings/SettingsNav';
import { SettingsContent } from '@/components/settings/SettingsPanels';
import { CenterPageHeader } from '@/components/center/CenterShell';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export function SettingsPage() {
  const activeTab = useSettingsStore((s) => s.activeTab);
  const setActiveTab = useSettingsStore((s) => s.setActiveTab);
  const members = useSettingsStore((s) => s.members);
  const updateMemberRole = useSettingsStore((s) => s.updateMemberRole);
  const inviteMember = useSettingsStore((s) => s.inviteMember);
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const workspaceList = useWorkspaceStore((s) => s.workspaceList);
  const workspace = useMemo(
    () => workspaceList.find((w) => w.id === workspaceId) ?? workspaceList[0] ?? {
      id: workspaceId,
      name: '工作区',
      namespace: 'default',
      description: '',
      memberCount: 0,
    },
    [workspaceId, workspaceList],
  );

  return (
    <div className="center-surface flex min-w-0 flex-grow overflow-hidden">
      <SettingsNav activeTab={activeTab} onChange={setActiveTab} />
      <div className="center-page scroll-hidden flex-grow overflow-y-auto">
        <div className="mx-auto max-w-5xl">
          <CenterPageHeader
            title="权限管理"
            subtitle="RBAC 角色矩阵 · 成员邀请 · 审计与连接器治理"
          />
          <SettingsContent
            tab={activeTab}
            workspace={workspace}
            members={members}
            onUpdateRole={updateMemberRole}
            onInvite={inviteMember}
          />
        </div>
      </div>
    </div>
  );
}
