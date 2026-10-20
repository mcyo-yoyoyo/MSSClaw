import { create } from 'zustand';
import {
  getSeedMembers,
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
  ensureMissingPasswords,
  hasCredential,
  hydrateAccountCredentials,
} from '@/domain/accountCredentials';
import {
  canUsePlatformDocsApi,
  fetchPlatformDoc,
  peekPlatformDocMemory,
  savePlatformDoc,
  setPlatformDocMemory,
} from '@/api/platformDocsApi';

function normalizeStoredMember(m: WorkspaceMember): WorkspaceMember {
  return {
    ...m,
    email: migrateDemoEmailDomain(m.email),
    role: normalizePlatformRole(m.role as string),
  };
}

/**
 * 为尚未设密的账号补默认口令。
 *
 * 只能由 super_admin 在「组织权限」里显式触发。严禁在模块加载或启动流程中自动调用：
 * 启动时 apiConnected 还没就绪，凭证读不到就会被判定为「全员缺密码」，一旦此时 API
 * 连上，就会把整份密码表覆盖成默认口令，抹掉管理员已配置的密码。
 * ensureMissingPasswords 内部同样要求 hydration 成功，读不到即放弃。
 */
export async function initMissingAccountPasswords(): Promise<number> {
  if (!(await hydrateAccountCredentials())) return 0;
  const emails = [
    ...SEED_MEMBERS.map((m) => m.email),
    ...buildLoginAccounts().map((a) => a.email),
  ];
  return ensureMissingPasswords(emails);
}

/** 合并种子账号（补齐核心种子；剔除已退役的 test1–10） */
function isRetiredDemoMemberEmail(email: string): boolean {
  return /^test([1-9]|10)@huawei\.com$/i.test(email.trim());
}

function mergeWithSeedMembers(stored: WorkspaceMember[]): WorkspaceMember[] {
  const seeds = getSeedMembers().map(normalizeStoredMember);
  const byEmail = new Map<string, WorkspaceMember>();
  for (const m of stored.map(normalizeStoredMember)) {
    const key = m.email.toLowerCase();
    if (!key || isRetiredDemoMemberEmail(key)) continue;
    byEmail.set(key, m);
  }
  for (const seed of seeds) {
    const key = seed.email.toLowerCase();
    if (!key || isRetiredDemoMemberEmail(key)) continue;
    if (!byEmail.has(key)) byEmail.set(key, seed);
  }
  return [...byEmail.values()];
}

function membersFromPayload(raw: unknown): WorkspaceMember[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { members?: unknown })?.members)
      ? ((raw as { members: WorkspaceMember[] }).members)
      : [];
  if (!list.length) return getSeedMembers().map(normalizeStoredMember);
  return mergeWithSeedMembers(list as WorkspaceMember[]);
}

function loadMembersSync(): WorkspaceMember[] {
  migrateCredentialEmailDomain();
  return getSeedMembers().map(normalizeStoredMember);
}

/**
 * 已知的服务端成员文档版本。写入携带它，由服务端做 compare-and-swap，
 * 避免两个管理员各自用陈旧快照整份覆盖（后写的会把先写的改动抹掉）。
 */
let knownMembersRevision: number | undefined;
/** 最近一次由服务端确认的成员快照；读/写失败时只允许回退展示，不能据此继续写。 */
let confirmedMembers: WorkspaceMember[] | undefined;
/** 成员写入串行化。 */
let membersWriteQueue: Promise<void> | undefined;
/** hydrate、409 或网络失败都会推进代次，使已经排队的旧快照自动失效。 */
let membersWriteGeneration = 0;
let membersHydrationInflight: Promise<WorkspaceMember[]> | undefined;

const MEMBERS_NOT_READY_ERROR =
  '尚未读取到服务端成员数据，已阻止保存以免覆盖现有成员。请刷新页面后重试。';

function cloneMembers(members: WorkspaceMember[]): WorkspaceMember[] {
  return members.map((member) => ({
    ...member,
    deptIds: [...(member.deptIds ?? [])],
  }));
}

function invalidateMembersAuthority(): number {
  membersWriteGeneration += 1;
  knownMembersRevision = undefined;
  return membersWriteGeneration;
}

function fallbackMembers(): WorkspaceMember[] {
  return confirmedMembers ? cloneMembers(confirmedMembers) : loadMembersSync();
}

function ensureMembersWritable(): boolean {
  if (canUsePlatformDocsApi() && knownMembersRevision !== undefined) return true;
  useSettingsStore.setState({ toast: MEMBERS_NOT_READY_ERROR });
  return false;
}

function revisionFromPayload(raw: unknown): number {
  const r = (raw as { revision?: unknown } | null)?.revision;
  return typeof r === 'number' && Number.isSafeInteger(r) && r >= 0 ? r : 0;
}

function isRevisionConflict(error: unknown): boolean {
  return error instanceof Error && /_409$/.test(error.message);
}

function persistMembers(members: WorkspaceMember[]): boolean {
  if (!ensureMembersWritable()) return false;

  const generation = membersWriteGeneration;
  const previous = membersWriteQueue ?? Promise.resolve();
  let queued: Promise<void>;
  queued = previous
    .catch(() => undefined)
    .then(async () => {
      // 409、重新 hydrate 或网络失败后，旧队列里的整表快照一律作废。
      if (membersWriteGeneration !== generation) return;
      const revision = knownMembersRevision;
      if (revision === undefined) return;

      try {
        await savePlatformDoc('members', { members, revision });
        if (membersWriteGeneration !== generation) return;

        const canonical = peekPlatformDocMemory<unknown>('members');
        knownMembersRevision = revisionFromPayload(canonical);
        confirmedMembers = cloneMembers(membersFromPayload(canonical ?? { members }));
      } catch (error) {
        invalidateMembersAuthority();
        if (!isRevisionConflict(error)) {
          useSettingsStore.setState({
            members: fallbackMembers(),
            toast: '成员改动保存失败，已恢复到最近一次服务端数据，请重试',
          });
          return;
        }

        // 服务端已有更新的版本：拉回最新数据。代次已经推进，后续已排队的旧快照
        // 会直接跳过，不能借用新的 revision 再次覆盖对方改动。
        const fresh = await hydrateMembersFromServer();
        useSettingsStore.setState({
          members: fresh,
          toast: knownMembersRevision !== undefined
            ? '成员数据已被其他管理员更新，已刷新为最新版本，请重新操作'
            : '成员数据发生冲突，但刷新失败；已禁止继续保存，请刷新页面后重试',
        });
      }
    })
    .finally(() => {
      if (membersWriteQueue === queued) membersWriteQueue = undefined;
    });
  membersWriteQueue = queued;
  return true;
}

export async function hydrateMembersFromServer(): Promise<WorkspaceMember[]> {
  if (membersHydrationInflight) return membersHydrationInflight;

  // hydrate 开始即冻结写入并淘汰旧队列；只有成功拿到服务端快照后才重新开放。
  const generation = invalidateMembersAuthority();
  const promise = (async () => {
    try {
      const remote = await fetchPlatformDoc<unknown>('members', { fresh: true });
      if (remote == null) throw new Error('members_not_loaded');
      if (membersWriteGeneration !== generation) return fallbackMembers();

      const revision = revisionFromPayload(remote);
      const members = membersFromPayload(remote);
      knownMembersRevision = revision;
      confirmedMembers = cloneMembers(members);
      setPlatformDocMemory('members', { members, revision });
      return members;
    } catch {
      if (membersWriteGeneration === generation) knownMembersRevision = undefined;
      return fallbackMembers();
    }
  })();
  membersHydrationInflight = promise;
  void promise.finally(() => {
    if (membersHydrationInflight === promise) membersHydrationInflight = undefined;
  });
  return promise;
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
  activeTab: SettingsTab;
  members: WorkspaceMember[];
  toast: string | null;

  load: () => void;
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
  activeTab: 'members',
  members: loadMembersSync(),
  toast: null,

  load: () => {
    set({ members: loadMembersSync(), activeTab: 'members' });
    void hydrateMembersFromServer().then((members) => set({ members }));
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  updateMemberRole: (memberId, role) => {
    if (!ensureMembersWritable()) return;
    const member = get().members.find((m) => m.id === memberId);
    const members = get().members.map((m) => (m.id === memberId ? { ...m, role } : m));
    if (!persistMembers(members)) return;
    set({
      members,
      toast: member ? `已将 ${member.name} 的角色更新为 ${ROLE_LABELS[role]}` : '角色已更新',
    });
  },

  updateMemberOrg: (memberId, patch) => {
    if (!ensureMembersWritable()) return;
    const members = get().members.map((m) =>
      m.id === memberId
        ? {
            ...m,
            ...(patch.deptIds !== undefined ? { deptIds: patch.deptIds } : {}),
            ...(patch.regionId !== undefined ? { regionId: patch.regionId } : {}),
          }
        : m,
    );
    if (!persistMembers(members)) return;
    set({ members, toast: '成员组织归属已更新' });
  },

  setMemberStatus: (memberId, status) => {
    void (async () => {
      if (!ensureMembersWritable()) return;
      const member = get().members.find((m) => m.id === memberId);
      const members = get().members.map((m) => (m.id === memberId ? { ...m, status } : m));
      if (!persistMembers(members)) return;
      // 只有「首次激活且从未设过密码」才发临时密码。对已激活成员或已设密账号再点启用，
      // 绝不能把管理员配置好的密码换成随机串。
      if (status === 'active' && member && member.status !== 'active') {
        const hydrated = await hydrateAccountCredentials();
        if (hydrated && !hasCredential(member.email)) {
          const temp = generateTempPassword();
          const pwd = await setAccountPassword(member.email, temp);
          set({
            members,
            toast: pwd.ok
              ? `已激活 ${member.email}，临时密码：${temp}（请另行告知用户）`
              : `已激活 ${member.email}，但设密失败：${pwd.error}`,
          });
          return;
        }
        set({
          members,
          toast: hydrated
            ? `已激活 ${member.email}（沿用原有密码）`
            : `已激活 ${member.email}，密码配置未加载，如需设密请刷新后在「修改密码」中设置`,
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
      if (!ensureMembersWritable()) return;
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
      if (!persistMembers(members)) return;

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
    if (!ensureMembersWritable()) {
      return { ok: 0, updated: 0, fail: [{ line: '', error: MEMBERS_NOT_READY_ERROR }] };
    }
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

    if (!persistMembers(members)) {
      return { ok: 0, updated: 0, fail: [{ line: '', error: MEMBERS_NOT_READY_ERROR }] };
    }
    set({
      members,
      toast: fail.length
        ? `导入完成：新增 ${ok}、更新 ${updated}、失败 ${fail.length}`
        : `导入完成：新增 ${ok}、更新 ${updated}`,
    });
    return { ok, updated, fail };
  },

  removeMember: (memberId) => {
    if (!ensureMembersWritable()) return;
    const member = get().members.find((m) => m.id === memberId);
    if (!member) return;
    if (migrateDemoEmailDomain(member.email).toLowerCase() === 'mcyo@huawei.com') {
      set({ toast: '不能移除演示超级管理员账号' });
      return;
    }
    const members = get().members.filter((m) => m.id !== memberId);
    if (!persistMembers(members)) return;
    set({ members, toast: `已移除成员 ${member.name}` });
  },

  setToast: (toast) => set({ toast }),
  dismissToast: () => set({ toast: null }),
}));
