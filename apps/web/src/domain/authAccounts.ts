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

/**
 * 遗留演示密码。仅当「允许演示密码」开启且该账号尚未单独设密时可用。
 * 生产请在组织权限中关闭演示密码，并为账号批量设密。
 */
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
const SUPER_ADMIN_EMAILS = new Set(['mcyo@huawei.com', 'mcyo@company.com']);

/** @company.com → @huawei.com（兼容旧本地缓存） */
export function migrateDemoEmailDomain(email: string): string {
  return email.trim().replace(/@company\.com$/i, '@huawei.com');
}

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
  return [];
}

/** 从成员权限管理数据构建可登录账号目录 */
export function buildLoginAccounts(): LoginAccount[] {
  const byEmail = new Map<string, LoginAccount>();

  const pushMember = (member: WorkspaceMember, workspaceId?: string) => {
    const email = migrateDemoEmailDomain(member.email).toLowerCase();
    if (!email) return;

    const normalizedRole = normalizePlatformRole(member.role as string);
    const platformRole: PlatformRole = SUPER_ADMIN_EMAILS.has(email)
      ? 'super_admin'
      : normalizedRole;
    const aff = memberAffiliation(member);
    const displayEmail = migrateDemoEmailDomain(member.email);

    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, {
        id: member.id,
        name: member.name,
        email: displayEmail,
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

export async function authenticate(
  emailInput: string,
  password: string,
): Promise<AuthResult> {
  const email = emailInput.trim().toLowerCase();
  if (!email) return { ok: false, error: '请输入邮箱账号' };
  if (!password) return { ok: false, error: '请输入密码' };

  // 优先走 Nest 鉴权（成员与密码均在服务端）
  try {
    const { isApiEnabled } = await import('@/api/client');
    const { loginWithApi } = await import('@/api/platformDocsApi');
    const { useWorkspaceStore } = await import('@/stores/workspaceStore');
    if (isApiEnabled()) {
      // 尽量先探活；失败则仍尝试 login（健康检查可能超时）
      const ws = useWorkspaceStore.getState().workspaceId || 'ws-mss-ai';
      const remote = await loginWithApi({ email, password, workspaceId: ws });
      if (remote.ok) {
        const u = remote.user;
        if ('token' in remote && typeof remote.token === 'string' && remote.token) {
          try {
            sessionStorage.setItem('mssclaw_auth_token', remote.token);
          } catch {
            /* ignore */
          }
        }
        return {
          ok: true,
          account: {
            id: u.id,
            name: u.name,
            email: u.email,
            platformRole: normalizePlatformRole(u.platformRole),
            avatar: u.avatar,
            status: 'active',
            workspaceIds: [u.workspaceId || ws],
            deptIds: (u.deptIds ?? []) as never[],
            regionId: (u.regionId as never) ?? null,
          },
        };
      }
      // 服务明确拒绝时直接返回，避免被本地缓存账号绕过
      if (useWorkspaceStore.getState().apiConnected) {
        return { ok: false, error: remote.error || '登录失败' };
      }
    }
  } catch {
    /* fall through to local seed auth when API unreachable */
  }

  const account = buildLoginAccounts().find((a) => a.email.toLowerCase() === email);
  if (!account) {
    return { ok: false, error: '账号不存在，请使用组织权限中的邮箱登录' };
  }
  if (account.status === 'invited') {
    return { ok: false, error: '该成员尚未激活，请联系管理员完成邀请' };
  }
  if (account.status === 'suspended') {
    return { ok: false, error: '账号已停用，无法登录' };
  }

  const { loadAuthPolicy, verifyAccountPassword } = await import(
    '@/domain/accountCredentials'
  );
  const policy = loadAuthPolicy();
  const verified = await verifyAccountPassword(email, password);

  if (verified === 'match') return { ok: true, account };
  if (verified === 'mismatch') {
    return { ok: false, error: '密码错误' };
  }

  if (policy.allowDemoPassword && password === DEMO_PASSWORD) {
    return { ok: true, account };
  }
  if (!policy.allowDemoPassword) {
    return {
      ok: false,
      error: '该账号尚未设置密码，请联系平台运营在「组织权限」中配置',
    };
  }
  return { ok: false, error: '密码错误' };
}

/** 登录页展示的演示账号提示（种子角色各取一位） */
export function getDemoAccountHints(): {
  email: string;
  name: string;
  role: PlatformRole;
  orgLabel?: string;
}[] {
  const accounts = buildLoginAccounts().filter((a) => a.status === 'active');
  const preferred = [
    'mcyo@huawei.com',
    'jacky@huawei.com',
    'dickson@huawei.com',
    'somebody@huawei.com',
  ];
  const picked = preferred
    .map((em) => accounts.find((a) => a.email.toLowerCase() === em))
    .filter((a): a is LoginAccount => Boolean(a));
  const list = picked.length ? picked : accounts.slice(0, 4);
  return list.map((a) => ({
    email: a.email,
    name: a.name,
    role: a.platformRole,
    orgLabel: formatAccountOrg(a),
  }));
}

function formatAccountOrg(a: LoginAccount): string {
  return formatOrgAffiliation({ deptIds: a.deptIds, regionId: a.regionId });
}
