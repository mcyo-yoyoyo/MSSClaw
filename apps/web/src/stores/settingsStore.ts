import { create } from 'zustand';
import {
  getMembersByWorkspace,
  ROLE_LABELS,
  type PlatformRole,
  type SettingsTab,
  type WorkspaceMember,
} from '@/domain/rbac';

const MEMBERS_LS_PREFIX = 'mssclaw_members_';

function loadMembers(workspaceId: string): WorkspaceMember[] {
  const raw = localStorage.getItem(`${MEMBERS_LS_PREFIX}${workspaceId}`);
  if (!raw) return getMembersByWorkspace(workspaceId);
  try {
    const parsed = JSON.parse(raw) as WorkspaceMember[];
    return Array.isArray(parsed) && parsed.length ? parsed : getMembersByWorkspace(workspaceId);
  } catch {
    return getMembersByWorkspace(workspaceId);
  }
}

function persistMembers(workspaceId: string, members: WorkspaceMember[]) {
  localStorage.setItem(`${MEMBERS_LS_PREFIX}${workspaceId}`, JSON.stringify(members));
}

interface SettingsState {
  workspaceId: string;
  activeTab: SettingsTab;
  members: WorkspaceMember[];
  toast: string | null;

  loadWorkspace: (workspaceId: string) => void;
  setActiveTab: (tab: SettingsTab) => void;
  updateMemberRole: (memberId: string, role: PlatformRole) => void;
  inviteMember: (email: string, role: PlatformRole) => void;
  dismissToast: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  workspaceId: 'ws-3c-latam',
  activeTab: 'general',
  members: loadMembers('ws-3c-latam'),
  toast: null,

  loadWorkspace: (workspaceId) => {
    set({
      workspaceId,
      members: loadMembers(workspaceId),
      activeTab: 'general',
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

  inviteMember: (email, role) => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      set({ toast: '请输入有效邮箱' });
      return;
    }
    if (get().members.some((m) => m.email.toLowerCase() === trimmed.toLowerCase())) {
      set({ toast: '该成员已在工作区中' });
      return;
    }

    const id = `inv_${Date.now()}`;
    const members = [
      ...get().members,
      {
        id,
        name: trimmed.split('@')[0],
        email: trimmed,
        role,
        avatar: 'bg-slate-500',
        lastActive: '—',
        status: 'invited' as const,
      },
    ];
    persistMembers(get().workspaceId, members);
    set({
      members,
      toast: `邀请已发送至 ${trimmed}`,
    });
  },

  dismissToast: () => set({ toast: null }),
}));
