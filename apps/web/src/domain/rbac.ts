import { z } from 'zod';
import type { DeptId, RegionId } from '@/domain/orgTaxonomy';

export const PlatformRoleSchema = z.enum([
  'super_admin',
  'workspace_admin',
  'developer',
  'business_user',
  'viewer',
]);
export type PlatformRole = z.infer<typeof PlatformRoleSchema>;

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
  /** 所属机关职能 */
  deptIds: z.array(z.string()).optional(),
  /** 所属一线区域 */
  regionId: z.string().nullable().optional(),
});
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema> & {
  deptIds?: DeptId[];
  regionId?: RegionId | null;
};

export const ROLE_LABELS: Record<PlatformRole, string> = {
  super_admin: '超级管理员',
  workspace_admin: '工作区管理员',
  developer: '开发者',
  business_user: '业务用户',
  viewer: '只读访客',
};

export const ROLE_DESCRIPTIONS: Record<PlatformRole, string> = {
  super_admin: '平台级全权限，可管理租户、菜单展示与跨工作区配置',
  workspace_admin: '工作区内成员邀请、角色调整与资产治理',
  developer: '可创建/编辑 Agent、Skill、Tool，并发布到团队',
  business_user: '可在智能助理与任务中心执行，配置只读',
  viewer: '只读浏览，不可执行或修改',
};

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

/** 权限矩阵：role → module → level */
export const RBAC_MATRIX: Record<PlatformRole, Record<ResourceModule, PermissionLevel>> = {
  super_admin: {
    chat: 'admin', prompt: 'admin', skill: 'admin', workflow: 'admin',
    agent: 'admin', knowledge: 'admin', tool: 'admin', memory: 'admin', settings: 'admin',
  },
  workspace_admin: {
    chat: 'admin', prompt: 'admin', skill: 'admin', workflow: 'admin',
    agent: 'admin', knowledge: 'admin', tool: 'admin', memory: 'admin', settings: 'admin',
  },
  developer: {
    chat: 'execute', prompt: 'write', skill: 'write', workflow: 'read',
    agent: 'write', knowledge: 'read', tool: 'read', memory: 'read', settings: 'read',
  },
  business_user: {
    chat: 'execute', prompt: 'read', skill: 'execute', workflow: 'execute',
    agent: 'read', knowledge: 'read', tool: 'none', memory: 'read', settings: 'none',
  },
  viewer: {
    chat: 'read', prompt: 'read', skill: 'read', workflow: 'read',
    agent: 'read', knowledge: 'read', tool: 'read', memory: 'read', settings: 'read',
  },
};

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

export const MEMBERS_BY_WORKSPACE: Record<string, WorkspaceMember[]> = {
  'ws-3c-latam': [
    {
      id: 'm1',
      name: 'Mcyo',
      email: 'mcyo@company.com',
      role: 'workspace_admin',
      avatar: 'bg-indigo-600',
      lastActive: '刚刚',
      status: 'active',
      deptIds: ['gtm', 'mkt', 'quality'],
      regionId: 'latam',
    },
    {
      id: 'm2',
      name: 'Bruce',
      email: 'bruce@company.com',
      role: 'developer',
      avatar: 'bg-pink-500',
      lastActive: '2 小时前',
      status: 'active',
      deptIds: ['ecommerce', 'channel'],
      regionId: 'europe',
    },
    {
      id: 'm3',
      name: 'Jacky',
      email: 'jacky@company.com',
      role: 'business_user',
      avatar: 'bg-orange-500',
      lastActive: '昨天',
      status: 'active',
      deptIds: ['retail'],
      regionId: 'latam',
    },
    {
      id: 'm4',
      name: 'Sarah',
      email: 'sarah@company.com',
      role: 'viewer',
      avatar: 'bg-violet-500',
      lastActive: '3 天前',
      status: 'invited',
      deptIds: ['mkt'],
      regionId: 'europe',
    },
  ],
  'ws-global-marketing': [
    {
      id: 'g1',
      name: 'Sarah',
      email: 'sarah@company.com',
      role: 'workspace_admin',
      avatar: 'bg-violet-500',
      lastActive: '1 小时前',
      status: 'active',
      deptIds: ['mkt', 'service'],
      regionId: 'europe',
    },
    {
      id: 'g2',
      name: 'Mcyo',
      email: 'mcyo@company.com',
      role: 'developer',
      avatar: 'bg-indigo-600',
      lastActive: '今天',
      status: 'active',
      deptIds: ['gtm', 'mkt', 'quality'],
      regionId: 'latam',
    },
  ],
  'ws-rd-knowledge': [
    {
      id: 'r1',
      name: 'RD-Team',
      email: 'rd@company.com',
      role: 'workspace_admin',
      avatar: 'bg-cyan-600',
      lastActive: '5 小时前',
      status: 'active',
      deptIds: ['hr', 'quality'],
      regionId: 'apac',
    },
    {
      id: 'r2',
      name: 'Mcyo',
      email: 'mcyo@company.com',
      role: 'viewer',
      avatar: 'bg-indigo-600',
      lastActive: '上周',
      status: 'active',
      deptIds: ['gtm', 'mkt', 'quality'],
      regionId: 'latam',
    },
  ],
};

export function getMembersByWorkspace(workspaceId: string): WorkspaceMember[] {
  return MEMBERS_BY_WORKSPACE[workspaceId] ?? [];
}

/** @deprecated 请使用 getCurrentPlatformRole()（domain/currentUser） */
export const CURRENT_USER_PLATFORM_ROLE: PlatformRole = 'super_admin';

export function getRoleBadgeClass(role: PlatformRole) {
  const classes: Record<PlatformRole, string> = {
    super_admin: 'bg-red-50 text-red-700 border-red-200',
    workspace_admin: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    developer: 'bg-blue-50 text-blue-700 border-blue-200',
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
