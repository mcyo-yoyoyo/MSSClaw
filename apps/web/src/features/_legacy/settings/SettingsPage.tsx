import { SettingsNav } from '@/components/settings/SettingsNav';
import { SettingsContent } from '@/components/settings/SettingsPanels';
import { CenterPageHeader } from '@/components/center/CenterShell';
import { useSettingsStore } from '@/stores/settingsStore';

export function SettingsPage() {
  const activeTab = useSettingsStore((s) => s.activeTab);
  const setActiveTab = useSettingsStore((s) => s.setActiveTab);
  const members = useSettingsStore((s) => s.members);
  const updateMemberRole = useSettingsStore((s) => s.updateMemberRole);
  const updateMemberOrg = useSettingsStore((s) => s.updateMemberOrg);
  const setMemberStatus = useSettingsStore((s) => s.setMemberStatus);
  const inviteMember = useSettingsStore((s) => s.inviteMember);
  const removeMember = useSettingsStore((s) => s.removeMember);

  return (
    <div className="center-surface flex min-w-0 flex-grow overflow-hidden">
      <SettingsNav activeTab={activeTab} onChange={setActiveTab} />
      <div className="center-page scroll-hidden flex-grow overflow-y-auto">
        <div className="mx-auto max-w-5xl">
          <CenterPageHeader
            title="组织权限"
            subtitle="成员 · 角色 · 部门 · 审计"
            tip={
              <>
                成员：添加账号 → 指定角色与部门/区域归属标签 → 设密登录。部门/区域短期只做归属与左侧浏览筛选，不做菜单或数据权限裁剪；后续若启用，仅 MSS
                集市 Agent/Skill 按「全员 / 本组织」可见性匹配。
              </>
            }
          />
          <SettingsContent
            tab={activeTab}
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
