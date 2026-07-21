import {
  MEMBERS_BY_WORKSPACE,
  normalizePlatformRole,
  type PlatformRole,
  type WorkspaceMember,
} from '@/domain/rbac';
import { PROTOTYPE_WORKSPACE_ID } from '@/domain/prototype/constants';
import {
  formatOrgAffiliation,
  normalizeOrgAffiliation,
  type DeptId,
  type OrgAffiliation,
  type RegionId,
} from '@/domain/orgTaxonomy';

/** 演示环境统一密码（对接成员权限管理账号） */
export const DEMO_PASSWORD = 'mssclaw';

export interface LoginAccount {
  id: string;
  name: string;
  email: string;
  platformRole: PlatformRole;
  avatar: string;
  status: WorkspaceMember['status'];
  workspaceIds: string[];
  deptIds: DeptId[];
  regionId: RegionId | null;
}

const ROLE_RANK: Record<PlatformRole, number> = {
  super_admin: 4,
  capability_ops: 3,
  business_user: 2,
  viewer: 1,
};

/** 平台级超级管理员邮箱（可管理租户配置） */
const SUPER_ADMIN_EMAILS = new Set(['mcyo@company.com']);

/** 与 settingsStore 同步的成员持久化前缀 */
export const MEMBERS_LS_PREFIX = 'mssclaw_members_v6_';

function mergeAffiliation(
  existing: OrgAffiliation,
  incoming: OrgAffiliation,
): OrgAffiliation {
  return normalizeOrgAffiliation({
    deptIds: [...existing.deptIds, ...incoming.deptIds],
    regionId: existing.regionId ?? incoming.regionId,
  });
}

function memberAffiliation(member: WorkspaceMember): OrgAffiliation {
  return normalizeOrgAffiliation({
    deptIds: (member.deptIds as DeptId[] | undefined) ?? [],
    regionId: (member.regionId as RegionId | null | undefined) ?? null,
  });
}

function loadPersistedMembers(): WorkspaceMember[] {
  const out: WorkspaceMember[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(MEMBERS_LS_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        parsed.forEach((row) => {
          if (row && typeof row === 'object' && 'email' in row && 'id' in row) {
            const m = row as WorkspaceMember;
            out.push({ ...m, role: normalizePlatformRole(m.role as string) });
          }
        });
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

/** 从成员权限管理数据构建可登录账号目录 */
export function buildLoginAccounts(): LoginAccount[] {
  const byEmail = new Map<string, LoginAccount>();

  const pushMember = (member: WorkspaceMember, workspaceId?: string) => {
    const email = member.email.trim().toLowerCase();
    if (!email) return;

    const normalizedRole = normalizePlatformRole(member.role as string);
    const platformRole: PlatformRole = SUPER_ADMIN_EMAILS.has(email)
      ? 'super_admin'
      : normalizedRole;
    const aff = memberAffiliation(member);

    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, {
        id: member.id,
        name: member.name,
        email: member.email.trim(),
        platformRole,
        avatar: member.avatar,
        status: member.status,
        workspaceIds: workspaceId ? [workspaceId] : [],
        deptIds: aff.deptIds,
        regionId: aff.regionId ?? null,
      });
      return;
    }

    if (member.status === 'active' && existing.status !== 'active') {
      existing.status = 'active';
    }
    if (ROLE_RANK[platformRole] > ROLE_RANK[existing.platformRole]) {
      existing.platformRole = platformRole;
    }
    if (workspaceId && !existing.workspaceIds.includes(workspaceId)) {
      existing.workspaceIds.push(workspaceId);
    }
    const merged = mergeAffiliation(
      { deptIds: existing.deptIds, regionId: existing.regionId },
      aff,
    );
    existing.deptIds = merged.deptIds;
    existing.regionId = merged.regionId ?? null;

    // 默认空间成员优先展示名
    if (workspaceId === PROTOTYPE_WORKSPACE_ID) {
      existing.id = member.id;
      existing.name = member.name;
      existing.avatar = member.avatar;
    }
  };

  Object.entries(MEMBERS_BY_WORKSPACE).forEach(([wsId, members]) => {
    members.forEach((m) => pushMember(m, wsId));
  });
  loadPersistedMembers().forEach((m) => pushMember(m));

  return [...byEmail.values()].sort((a, b) => {
    const rankDiff = ROLE_RANK[b.platformRole] - ROLE_RANK[a.platformRole];
    if (rankDiff !== 0) return rankDiff;
    return a.name.localeCompare(b.name, 'zh-CN');
  });
}

export type AuthResult =
  | { ok: true; account: LoginAccount }
  | { ok: false; error: string };

export function authenticate(emailInput: string, password: string): AuthResult {
  const email = emailInput.trim().toLowerCase();
  if (!email) return { ok: false, error: '请输入邮箱账号' };
  if (!password) return { ok: false, error: '请输入密码' };

  const account = buildLoginAccounts().find((a) => a.email.toLowerCase() === email);
  if (!account) {
    return { ok: false, error: '账号不存在，请使用成员权限管理中的邮箱登录' };
  }
  if (account.status === 'invited') {
    return { ok: false, error: '该成员尚未激活，请联系管理员完成邀请' };
  }
  if (account.status === 'suspended') {
    return { ok: false, error: '账号已停用，无法登录' };
  }
  if (password !== DEMO_PASSWORD) {
    return { ok: false, error: '密码错误（演示密码：mssclaw）' };
  }
  return { ok: true, account };
}

/** 登录页展示的演示账号提示（按角色排序的四位种子） */
export function getDemoAccountHints(): {
  email: string;
  name: string;
  role: PlatformRole;
  orgLabel?: string;
}[] {
  return buildLoginAccounts()
    .filter((a) => a.status === 'active')
    .slice(0, 4)
    .map((a) => ({
      email: a.email,
      name: a.name,
      role: a.platformRole,
      orgLabel: formatAccountOrg(a),
    }));
}

function formatAccountOrg(a: LoginAccount): string {
  return formatOrgAffiliation({ deptIds: a.deptIds, regionId: a.regionId });
}
