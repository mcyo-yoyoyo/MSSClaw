import { create } from 'zustand';
import {
  getMembersByWorkspace,
  MEMBER_STATUS_LABELS,
  normalizePlatformRole,
  ROLE_LABELS,
  SEED_MEMBERS,
  type PlatformRole,
  type SettingsTab,
  type WorkspaceMember,
} from '@/domain/rbac';
import type { DeptId, RegionId } from '@/domain/orgTaxonomy';
import { HQ_DEPTS, REGIONS } from '@/domain/orgTaxonomy';
import {
  buildLoginAccounts,
  migrateDemoEmailDomain,
} from '@/domain/authAccounts';
import {
  generateTempPassword,
  setAccountPassword,
  migrateCredentialEmailDomain,
  migrateInitAllPasswordsToMssclaw,
  ensureMissingPasswords,
  hydrateAccountCredentials,
} from '@/domain/accountCredentials';
import { PROTOTYPE_WORKSPACE_ID } from '@/domain/prototype/constants';
import {
  canUsePlatformDocsApi,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
  setPlatformDocMemory,
} from '@/api/platformDocsApi';

function normalizeStoredMember(m: WorkspaceMember): WorkspaceMember {
  return {
    ...m,
    email: migrateDemoEmailDomain(m.email),
    role: normalizePlatformRole(m.role as string),
  };
}

/** 启动时：当前角色账号密码统一初始化 / 补齐为 mssclaw */
let accountPasswordsReady: Promise<void> | null = null;

export function ensureAccountPasswordsReady(): Promise<void> {
  if (!accountPasswordsReady) {
    accountPasswordsReady = (async () => {
      await hydrateAccountCredentials();
      const emails = [
        ...SEED_MEMBERS.map((m) => m.email),
        ...buildLoginAccounts().map((a) => a.email),
      ];
      await migrateInitAllPasswordsToMssclaw(emails);
      await ensureMissingPasswords(emails);
    })();
  }
  return accountPasswordsReady;
}

void ensureAccountPasswordsReady();

/** 合并种子账号（补齐 test1–10 / 域名迁移后的缺失项） */
function mergeWithSeedMembers(
  workspaceId: string,
  stored: WorkspaceMember[],
): WorkspaceMember[] {
  const seeds = getMembersByWorkspace(workspaceId).map(normalizeStoredMember);
  const byEmail = new Map<string, WorkspaceMember>();
  for (const m of stored.map(normalizeStoredMember)) {
    const key = m.email.toLowerCase();
    if (!key) continue;
    byEmail.set(key, m);
  }
  for (const seed of seeds) {
    const key = seed.email.toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, seed);
  }
  return [...byEmail.values()];
}

function membersFromPayload(raw: unknown, workspaceId: string): WorkspaceMember[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { members?: unknown })?.members)
      ? ((raw as { members: WorkspaceMember[] }).members)
      : [];
  if (!list.length) return getMembersByWorkspace(workspaceId).map(normalizeStoredMember);
  return mergeWithSeedMembers(workspaceId, list as WorkspaceMember[]);
}

function loadMembersSync(workspaceId: string): WorkspaceMember[] {
  migrateCredentialEmailDomain();
  return getMembersByWorkspace(workspaceId).map(normalizeStoredMember);
}

function persistMembers(workspaceId: string, members: WorkspaceMember[]) {
  const payload = { members };
  setPlatformDocMemory(workspaceId, 'members', payload);
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(workspaceId, 'members', payload).catch(() => {
    /* toast via caller if needed */
  });
}

export async function hydrateMembersFromServer(workspaceId: string): Promise<WorkspaceMember[]> {
  try {
    const remote = await fetchPlatformDoc<unknown>(workspaceId, 'members');
    const members = membersFromPayload(remote, workspaceId);
    setPlatformDocMemory(workspaceId, 'members', { members });
    return members;
  } catch {
    return loadMembersSync(workspaceId);
  }
}

export interface InviteMemberInput {
  email: string;
  role: PlatformRole;
  name?: string;
  deptIds?: DeptId[];
  regionId?: RegionId | null;
  /** 邀请后立即激活，并生成临时密码 */
  activateNow?: boolean;
  /** 指定密码（批量导入时使用，跳过随机临时密码） */
  password?: string;
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
  /** 批量导入：每行 邮箱,密码[,角色][,姓名] */
  batchImportAccounts: (text: string) => Promise<{
    ok: number;
    updated: number;
    fail: { line: string; error: string }[];
  }>;
  removeMember: (memberId: string) => void;
  setToast: (toast: string | null) => void;
  dismissToast: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  workspaceId: PROTOTYPE_WORKSPACE_ID,
  activeTab: 'members',
  members: loadMembersSync(PROTOTYPE_WORKSPACE_ID),
  toast: null,

  loadWorkspace: (workspaceId) => {
    set({
      workspaceId,
      members: loadMembersSync(workspaceId),
      activeTab: 'members',
    });
    void hydrateMembersFromServer(workspaceId).then((members) => {
      set({ workspaceId, members });
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
    void (async () => {
      const member = get().members.find((m) => m.id === memberId);
      const members = get().members.map((m) => (m.id === memberId ? { ...m, status } : m));
      persistMembers(get().workspaceId, members);
      if (status === 'active' && member) {
        const temp = generateTempPassword();
        await setAccountPassword(member.email, temp);
        set({
          members,
          toast: `已激活 ${member.email}，临时密码：${temp}（请另行告知用户）`,
        });
        return;
      }
      set({
        members,
        toast: member
          ? `${member.name} 状态：${MEMBER_STATUS_LABELS[status]}`
          : '状态已更新',
      });
    })();
  },

  inviteMember: (input, roleArg) => {
    void (async () => {
      const payload: InviteMemberInput =
        typeof input === 'string'
          ? { email: input, role: roleArg ?? 'business_user' }
          : input;

      const trimmed = migrateDemoEmailDomain(payload.email.trim());
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

      if (payload.activateNow) {
        const temp = payload.password?.trim() || generateTempPassword();
        const pwdResult = await setAccountPassword(trimmed, temp);
        if (!pwdResult.ok) {
          set({ members, toast: `已添加 ${trimmed}，但设密失败：${pwdResult.error}` });
          return;
        }
        set({
          members,
          toast: payload.password?.trim()
            ? `已邀请并激活 ${trimmed}（已按导入密码设密）`
            : `已邀请并激活 ${trimmed}，临时密码：${temp}（请另行告知用户）`,
        });
        return;
      }
      set({
        members,
        toast: `邀请已发送至 ${trimmed}（待管理员激活后方可登录）`,
      });
    })();
  },

  batchImportAccounts: async (text) => {
    const roleAlias: Record<string, PlatformRole> = {
      super_admin: 'super_admin',
      平台运营: 'super_admin',
      capability_ops: 'capability_ops',
      能力开发: 'capability_ops',
      business_user: 'business_user',
      业务用户: 'business_user',
      viewer: 'viewer',
      只读访客: 'viewer',
      只读: 'viewer',
    };

    const resolveDeptId = (raw: string): DeptId | null => {
      const v = raw.trim();
      if (!v) return null;
      const hit = HQ_DEPTS.find(
        (d) => d.id === v || d.label.toLowerCase() === v.toLowerCase(),
      );
      return (hit?.id as DeptId) ?? null;
    };

    const resolveRegionId = (raw: string): RegionId | null => {
      const v = raw.trim();
      if (!v || v === '机关' || v === 'hq') return null;
      const hit = REGIONS.find(
        (r) => r.id === v || r.label.toLowerCase() === v.toLowerCase(),
      );
      return (hit?.id as RegionId) ?? null;
    };

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.replace(/^\uFEFF/, '').trim())
      .filter((l) => l && !l.startsWith('#'))
      .filter((l) => !/^邮箱\s*[,，\t]/.test(l));

    let ok = 0;
    let updated = 0;
    const fail: { line: string; error: string }[] = [];
    let members = [...get().members];

    for (const line of lines) {
      const parts = line.includes(',')
        ? line.split(',').map((p) => p.trim())
        : line.includes('\t')
          ? line.split('\t').map((p) => p.trim())
          : line.split(/\s+/).map((p) => p.trim());
      const email = migrateDemoEmailDomain(parts[0] ?? '');
      const password = parts[1] ?? '';
      const roleRaw = (parts[2] ?? 'business_user').trim();
      const name = (parts[3] ?? '').trim();
      const deptId = resolveDeptId(parts[4] ?? '');
      const regionId = resolveRegionId(parts[5] ?? '');
      const role = roleAlias[roleRaw] ?? normalizePlatformRole(roleRaw);

      if (!email.includes('@')) {
        fail.push({ line, error: '邮箱无效' });
        continue;
      }
      if (!password || password.length < 6) {
        fail.push({ line, error: '密码至少 6 位' });
        continue;
      }
      if (role === 'super_admin' && email.toLowerCase() !== 'mcyo@huawei.com') {
        fail.push({ line, error: '批量导入不可创建平台运营角色' });
        continue;
      }

      const existingIdx = members.findIndex((m) => m.email.toLowerCase() === email.toLowerCase());
      if (existingIdx >= 0) {
        const prev = members[existingIdx]!;
        members[existingIdx] = {
          ...prev,
          name: name || prev.name,
          role: role === 'super_admin' ? prev.role : role,
          status: 'active',
          lastActive: '刚刚',
          deptIds: deptId ? [deptId] : prev.deptIds,
          regionId: parts[5] !== undefined && parts[5] !== '' ? regionId : prev.regionId,
        };
        const pwd = await setAccountPassword(email, password);
        if (!pwd.ok) {
          fail.push({ line, error: pwd.error });
          continue;
        }
        updated += 1;
        continue;
      }

      members = [
        ...members,
        {
          id: `imp_${Date.now()}_${ok}`,
          name: name || email.split('@')[0] || '新成员',
          email,
          role,
          avatar: 'bg-zinc-700',
          lastActive: '刚刚',
          status: 'active',
          deptIds: deptId ? [deptId] : [],
          regionId,
        },
      ];
      const pwd = await setAccountPassword(email, password);
      if (!pwd.ok) {
        fail.push({ line, error: pwd.error });
        members = members.filter((m) => m.email.toLowerCase() !== email.toLowerCase());
        continue;
      }
      ok += 1;
    }

    persistMembers(get().workspaceId, members);
    set({
      members,
      toast: fail.length
        ? `导入完成：新增 ${ok}、更新 ${updated}、失败 ${fail.length}`
        : `导入完成：新增 ${ok}、更新 ${updated}`,
    });
    return { ok, updated, fail };
  },

  removeMember: (memberId) => {
    const member = get().members.find((m) => m.id === memberId);
    if (!member) return;
    if (migrateDemoEmailDomain(member.email).toLowerCase() === 'mcyo@huawei.com') {
      set({ toast: '不能移除演示超级管理员账号' });
      return;
    }
    const members = get().members.filter((m) => m.id !== memberId);
    persistMembers(get().workspaceId, members);
    set({ members, toast: `已移除成员 ${member.name}` });
  },

  setToast: (toast) => set({ toast }),
  dismissToast: () => set({ toast: null }),
}));
