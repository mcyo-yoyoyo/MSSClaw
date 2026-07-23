import { z } from 'zod';
import type { DeptId, RegionId } from '@/domain/orgTaxonomy';
import { PROTOTYPE_WORKSPACE_ID } from '@/domain/prototype/constants';

/** 四角色：超管（含原空间管理）· 能力运营 · 业务用户 · 只读访客 */
export const PlatformRoleSchema = z.enum([
  'super_admin',
  'capability_ops',
  'business_user',
  'viewer',
]);
export type PlatformRole = z.infer<typeof PlatformRoleSchema>;

/** 兼容旧角色 id（成员表 / session localStorage） */
export function normalizePlatformRole(raw: string | undefined | null): PlatformRole {
  switch (raw) {
    case 'super_admin':
    case 'workspace_admin':
      return 'super_admin';
    case 'capability_ops':
    case 'developer':
      return 'capability_ops';
    case 'business_user':
      return 'business_user';
    case 'viewer':
      return 'viewer';
    default:
      return 'business_user';
  }
}

export const PermissionLevelSchema = z.enum(['none', 'read', 'execute', 'write', 'admin']);
export type PermissionLevel = z.infer<typeof PermissionLevelSchema>;

export const ResourceModuleSchema = z.enum([
  'chat',
  'prompt',
  'skill',
  'workflow',
  'agent',
  'knowledge',
  'tool',
  'memory',
  'settings',
]);
export type ResourceModule = z.infer<typeof ResourceModuleSchema>;

export const WorkspaceMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: PlatformRoleSchema,
  avatar: z.string(),
  lastActive: z.string(),
  status: z.enum(['active', 'invited', 'suspended']),
  deptIds: z.array(z.string()).optional(),
  regionId: z.string().nullable().optional(),
});
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema> & {
  deptIds?: DeptId[];
  regionId?: RegionId | null;
};

export const ROLE_LABELS: Record<PlatformRole, string> = {
  super_admin: '超级管理员',
  capability_ops: '能力运营',
  business_user: '业务用户',
  viewer: '只读访客',
};

export const ROLE_DESCRIPTIONS: Record<PlatformRole, string> = {
  super_admin: '管人、管空间、管租户/门户/展示；拥有平台与本空间全部治理权',
  capability_ops: '运营壳：工作平台 + 能力配置（专家/技能/工具等）；完整产品能力在此配置',
  business_user: '业务壳：仅工作平台（找案例/做任务/任务记录；协作空间在完整产品可开）',
  viewer: '业务壳：工作平台仅找案例，不可发起执行或修改配置',
};

/** 可邀请角色（超管由种子/白名单产生，不通过邀请下发） */
export const INVITEABLE_ROLES: PlatformRole[] = [
  'capability_ops',
  'business_user',
  'viewer',
];

export const MEMBER_STATUS_LABELS: Record<WorkspaceMember['status'], string> = {
  active: '已激活',
  invited: '待激活',
  suspended: '已停用',
};

export const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  none: '—',
  read: 'R',
  execute: 'Execute',
  write: 'Write',
  admin: 'Admin',
};

export const PERMISSION_CLASSES: Record<PermissionLevel, string> = {
  none: 'bg-slate-100 text-slate-400',
  read: 'bg-blue-50 text-blue-600',
  execute: 'bg-emerald-50 text-emerald-600',
  write: 'bg-amber-50 text-amber-700',
  admin: 'bg-indigo-50 text-indigo-700',
};

export type RolePermissionMatrix = Record<PlatformRole, Record<ResourceModule, PermissionLevel>>;

const FULL_ADMIN: Record<ResourceModule, PermissionLevel> = {
  chat: 'admin',
  prompt: 'admin',
  skill: 'admin',
  workflow: 'admin',
  agent: 'admin',
  knowledge: 'admin',
  tool: 'admin',
  memory: 'admin',
  settings: 'admin',
};

function matrix(
  capabilityOps: Record<ResourceModule, PermissionLevel>,
  businessUser: Record<ResourceModule, PermissionLevel>,
  viewer: Record<ResourceModule, PermissionLevel>,
): RolePermissionMatrix {
  return {
    super_admin: { ...FULL_ADMIN },
    capability_ops: capabilityOps,
    business_user: businessUser,
    viewer,
  };
}

/** 统一四角色矩阵（各数据空间共享；细粒度差异留给后续） */
export const RBAC_MATRIX: RolePermissionMatrix = matrix(
  {
    chat: 'execute',
    prompt: 'write',
    skill: 'write',
    workflow: 'write',
    agent: 'write',
    knowledge: 'write',
    tool: 'write',
    memory: 'write',
    settings: 'read',
  },
  {
    chat: 'execute',
    prompt: 'read',
    skill: 'execute',
    workflow: 'execute',
    agent: 'read',
    knowledge: 'read',
    tool: 'read',
    memory: 'read',
    settings: 'none',
  },
  {
    chat: 'read',
    prompt: 'read',
    skill: 'read',
    workflow: 'read',
    agent: 'read',
    knowledge: 'read',
    tool: 'none',
    memory: 'none',
    settings: 'none',
  },
);

export const RBAC_MATRIX_BY_WORKSPACE: Record<string, RolePermissionMatrix> = {};

export function getRbacMatrix(_workspaceId: string): RolePermissionMatrix {
  return RBAC_MATRIX;
}

export const MODULE_LABELS: Record<ResourceModule, string> = {
  chat: 'Chat',
  prompt: 'Prompt',
  skill: 'Skill',
  workflow: 'Workflow',
  agent: 'Agent',
  knowledge: 'Knowledge',
  tool: 'Tool',
  memory: 'Memory',
  settings: 'Settings',
};

/** 全数据空间共用的四位种子成员（清除旧预设） */
export const SEED_MEMBERS: WorkspaceMember[] = [
  {
    id: 'u-mcyo',
    name: 'Mcyo',
    email: 'mcyo@company.com',
    role: 'super_admin',
    avatar: 'bg-indigo-600',
    lastActive: '刚刚',
    status: 'active',
    deptIds: ['quality'],
    regionId: null,
  },
  {
    id: 'u-jacky',
    name: 'Jacky',
    email: 'jacky@company.com',
    role: 'capability_ops',
    avatar: 'bg-teal-600',
    lastActive: '1 小时前',
    status: 'active',
    deptIds: ['quality'],
    regionId: null,
  },
  {
    id: 'u-dickson',
    name: 'Dickson',
    email: 'dickson@company.com',
    role: 'business_user',
    avatar: 'bg-amber-500',
    lastActive: '今天',
    status: 'active',
    deptIds: ['gtm'],
    regionId: 'apac',
  },
  {
    id: 'u-somebody',
    name: 'Somebody',
    email: 'somebody@company.com',
    role: 'viewer',
    avatar: 'bg-slate-500',
    lastActive: '昨天',
    status: 'active',
    deptIds: ['mkt'],
    regionId: 'europe',
  },
];

/** 内置数据空间 id → 成员表（均指向同一套种子） */
export const BUILTIN_WORKSPACE_IDS = [
  PROTOTYPE_WORKSPACE_ID,
  'ws-apac',
  'ws-3c-latam',
  'ws-mea',
  'ws-eurasia',
  'ws-europe',
] as const;

export const MEMBERS_BY_WORKSPACE: Record<string, WorkspaceMember[]> = Object.fromEntries(
  BUILTIN_WORKSPACE_IDS.map((id) => [id, SEED_MEMBERS.map((m) => ({ ...m, deptIds: [...(m.deptIds ?? [])] }))]),
);

export function getMembersByWorkspace(workspaceId: string): WorkspaceMember[] {
  return MEMBERS_BY_WORKSPACE[workspaceId] ?? SEED_MEMBERS.map((m) => ({ ...m }));
}

/** @deprecated 请使用 getCurrentPlatformRole()（domain/currentUser） */
export const CURRENT_USER_PLATFORM_ROLE: PlatformRole = 'super_admin';

export function getRoleBadgeClass(role: PlatformRole) {
  const classes: Record<PlatformRole, string> = {
    super_admin: 'bg-red-50 text-red-700 border-red-200',
    capability_ops: 'bg-blue-50 text-blue-700 border-blue-200',
    business_user: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    viewer: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return classes[role];
}

export type SettingsTab = 'org' | 'depts' | 'roles' | 'members' | 'rbac' | 'audit';

export const SETTINGS_TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'members', label: '成员管理', icon: 'fa-users' },
  { id: 'roles', label: '角色说明', icon: 'fa-user-shield' },
  { id: 'rbac', label: '权限矩阵', icon: 'fa-table-cells' },
  { id: 'org', label: '组织概览', icon: 'fa-sitemap' },
  { id: 'depts', label: '部门区域', icon: 'fa-building' },
  { id: 'audit', label: '审计日志', icon: 'fa-clipboard-list' },
];
