import { useMemo } from 'react';
import { SettingsNav } from '@/components/settings/SettingsNav';
import { SettingsContent } from '@/components/settings/SettingsPanels';
import { CenterPageHeader } from '@/components/center/CenterShell';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useWorkspaceConfigStore } from '@/stores/workspaceConfigStore';

export function SettingsPage() {
  const activeTab = useSettingsStore((s) => s.activeTab);
  const setActiveTab = useSettingsStore((s) => s.setActiveTab);
  const members = useSettingsStore((s) => s.members);
  const updateMemberRole = useSettingsStore((s) => s.updateMemberRole);
  const updateMemberOrg = useSettingsStore((s) => s.updateMemberOrg);
  const setMemberStatus = useSettingsStore((s) => s.setMemberStatus);
  const inviteMember = useSettingsStore((s) => s.inviteMember);
  const removeMember = useSettingsStore((s) => s.removeMember);
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const workspaceList = useWorkspaceStore((s) => s.workspaceList);
  const getConfig = useWorkspaceConfigStore((s) => s.getConfig);

  const workspace = useMemo(() => {
    const fromList = workspaceList.find((w) => w.id === workspaceId);
    const fromConfig = getConfig(workspaceId);
    return (
      fromList ??
      (fromConfig
        ? {
            id: fromConfig.id,
            name: fromConfig.name,
            namespace: fromConfig.namespace ?? 'default',
            description: fromConfig.description ?? '',
            memberCount: members.length,
          }
        : {
            id: workspaceId,
            name: '工作区',
            namespace: 'default',
            description: '',
            memberCount: members.length,
          })
    );
  }, [workspaceId, workspaceList, getConfig, members.length]);

  return (
    <div className="center-surface flex min-w-0 flex-grow overflow-hidden">
      <SettingsNav activeTab={activeTab} onChange={setActiveTab} />
      <div className="center-page scroll-hidden flex-grow overflow-y-auto">
        <div className="mx-auto max-w-5xl">
          <CenterPageHeader
            title="组织权限"
            subtitle="成员邀请 · 角色改派 · 激活登录 · 部门区域归属"
            tip={
              <>
                默认进入「成员管理」：邀请邮箱 → 指定角色与组织归属 → 激活后可用演示密码登录。权限矩阵随当前数字空间变化；组织概览可改显示名。
              </>
            }
          />
          <SettingsContent
            tab={activeTab}
            workspace={workspace}
            members={members}
            onUpdateRole={updateMemberRole}
            onUpdateOrg={updateMemberOrg}
            onSetStatus={setMemberStatus}
            onInvite={inviteMember}
            onRemove={removeMember}
          />
        </div>
      </div>
    </div>
  );
}
