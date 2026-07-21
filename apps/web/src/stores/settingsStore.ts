import { create } from 'zustand';
import {
  getMembersByWorkspace,
  MEMBER_STATUS_LABELS,
  normalizePlatformRole,
  ROLE_LABELS,
  type PlatformRole,
  type SettingsTab,
  type WorkspaceMember,
} from '@/domain/rbac';
import type { DeptId, RegionId } from '@/domain/orgTaxonomy';
import { DEMO_PASSWORD, MEMBERS_LS_PREFIX } from '@/domain/authAccounts';
import { PROTOTYPE_WORKSPACE_ID } from '@/domain/prototype/constants';

function loadMembers(workspaceId: string): WorkspaceMember[] {
  const raw = localStorage.getItem(`${MEMBERS_LS_PREFIX}${workspaceId}`);
  if (!raw) return getMembersByWorkspace(workspaceId);
  try {
    const parsed = JSON.parse(raw) as WorkspaceMember[];
    if (!Array.isArray(parsed) || !parsed.length) return getMembersByWorkspace(workspaceId);
    return parsed.map((m) => ({ ...m, role: normalizePlatformRole(m.role as string) }));
  } catch {
    return getMembersByWorkspace(workspaceId);
  }
}

function persistMembers(workspaceId: string, members: WorkspaceMember[]) {
  localStorage.setItem(`${MEMBERS_LS_PREFIX}${workspaceId}`, JSON.stringify(members));
}

export interface InviteMemberInput {
  email: string;
  role: PlatformRole;
  name?: string;
  deptIds?: DeptId[];
  regionId?: RegionId | null;
  /** 邀请后立即激活，可直接用演示密码登录 */
  activateNow?: boolean;
}

interface SettingsState {
  workspaceId: string;
  activeTab: SettingsTab;
  members: WorkspaceMember[];
  toast: string | null;

  loadWorkspace: (workspaceId: string) => void;
  setActiveTab: (tab: SettingsTab) => void;
  updateMemberRole: (memberId: string, role: PlatformRole) => void;
  updateMemberOrg: (
    memberId: string,
    patch: { deptIds?: DeptId[]; regionId?: RegionId | null },
  ) => void;
  setMemberStatus: (memberId: string, status: WorkspaceMember['status']) => void;
  inviteMember: (input: InviteMemberInput | string, role?: PlatformRole) => void;
  removeMember: (memberId: string) => void;
  dismissToast: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  workspaceId: PROTOTYPE_WORKSPACE_ID,
  activeTab: 'members',
  members: loadMembers(PROTOTYPE_WORKSPACE_ID),
  toast: null,

  loadWorkspace: (workspaceId) => {
    set({
      workspaceId,
      members: loadMembers(workspaceId),
      activeTab: 'members',
    });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  updateMemberRole: (memberId, role) => {
    const member = get().members.find((m) => m.id === memberId);
    const members = get().members.map((m) => (m.id === memberId ? { ...m, role } : m));
    persistMembers(get().workspaceId, members);
    set({
      members,
      toast: member ? `已将 ${member.name} 的角色更新为 ${ROLE_LABELS[role]}` : '角色已更新',
    });
  },

  updateMemberOrg: (memberId, patch) => {
    const members = get().members.map((m) =>
      m.id === memberId
        ? {
            ...m,
            ...(patch.deptIds !== undefined ? { deptIds: patch.deptIds } : {}),
            ...(patch.regionId !== undefined ? { regionId: patch.regionId } : {}),
          }
        : m,
    );
    persistMembers(get().workspaceId, members);
    set({ members, toast: '成员组织归属已更新' });
  },

  setMemberStatus: (memberId, status) => {
    const member = get().members.find((m) => m.id === memberId);
    const members = get().members.map((m) => (m.id === memberId ? { ...m, status } : m));
    persistMembers(get().workspaceId, members);
    const tip =
      status === 'active' && member
        ? `已激活 ${member.email}，可用演示密码 ${DEMO_PASSWORD} 登录`
        : member
          ? `${member.name} 状态：${MEMBER_STATUS_LABELS[status]}`
          : '状态已更新';
    set({ members, toast: tip });
  },

  inviteMember: (input, roleArg) => {
    const payload: InviteMemberInput =
      typeof input === 'string'
        ? { email: input, role: roleArg ?? 'business_user' }
        : input;

    const trimmed = payload.email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      set({ toast: '请输入有效邮箱' });
      return;
    }
    if (get().members.some((m) => m.email.toLowerCase() === trimmed.toLowerCase())) {
      set({ toast: '该成员已在工作区中' });
      return;
    }

    const id = `inv_${Date.now()}`;
    const status: WorkspaceMember['status'] = payload.activateNow ? 'active' : 'invited';
    const members = [
      ...get().members,
      {
        id,
        name: payload.name?.trim() || trimmed.split('@')[0] || '新成员',
        email: trimmed,
        role: normalizePlatformRole(payload.role),
        avatar: 'bg-zinc-700',
        lastActive: '刚刚',
        status,
        deptIds: payload.deptIds ?? [],
        regionId: payload.regionId ?? null,
      },
    ];
    persistMembers(get().workspaceId, members);
    set({
      members,
      toast: payload.activateNow
        ? `已邀请并激活 ${trimmed}，可用密码 ${DEMO_PASSWORD} 登录`
        : `邀请已发送至 ${trimmed}（待管理员激活后方可登录）`,
    });
  },

  removeMember: (memberId) => {
    const member = get().members.find((m) => m.id === memberId);
    if (!member) return;
    if (member.email.toLowerCase() === 'mcyo@company.com') {
      set({ toast: '不能移除演示超级管理员账号' });
      return;
    }
    const members = get().members.filter((m) => m.id !== memberId);
    persistMembers(get().workspaceId, members);
    set({ members, toast: `已移除成员 ${member.name}` });
  },

  dismissToast: () => set({ toast: null }),
}));
