import type { PlatformRole } from '@/domain/rbac';
import type { DeptId, RegionId } from '@/domain/orgTaxonomy';

/** 权限使用与治理审计事件类型 */
export type AuditCategory =
  | 'auth'
  | 'browse'
  | 'task'
  | 'model'
  | 'members'
  | 'org'
  | 'rbac'
  | 'asset';

export interface AuditLogEntry {
  id: string;
  /** ISO timestamp */
  at: string;
  category: AuditCategory;
  /** 展示用短标签，如 login / browse / task.execute */
  action: string;
  module: string;
  detail: string;
  userName: string;
  userEmail?: string;
  role?: PlatformRole;
  workspaceId?: string;
  /** 操作时的机关职能（领域）归属，便于按组织轴回溯 */
  deptIds?: DeptId[];
  /** 操作时的一线区域归属 */
  regionId?: RegionId | null;
}

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  auth: '登录鉴权',
  browse: '页面浏览',
  task: '任务执行',
  model: '模型调用',
  members: '成员治理',
  org: '组织配置',
  rbac: '权限变更',
  asset: '资产操作',
};

/** 演示种子：覆盖登录 / 浏览 / 任务 / 模型等回溯场景 */
export const SEED_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-seed-1',
    at: new Date(Date.now() - 35 * 60_000).toISOString(),
    category: 'members',
    action: 'member.activate',
    module: 'members',
    detail: '激活成员 bruce@company.com',
    userName: 'Mcyo',
    userEmail: 'mcyo@company.com',
    role: 'super_admin',
    deptIds: ['quality'],
    regionId: null,
  },
  {
    id: 'aud-seed-2',
    at: new Date(Date.now() - 70 * 60_000).toISOString(),
    category: 'members',
    action: 'member.invite',
    module: 'members',
    detail: '邀请 jacky@company.com 为能力开发',
    userName: 'Mcyo',
    userEmail: 'mcyo@company.com',
    role: 'super_admin',
    deptIds: ['quality'],
    regionId: null,
  },
  {
    id: 'aud-seed-3',
    at: new Date(Date.now() - 2.5 * 3600_000).toISOString(),
    category: 'asset',
    action: 'skill.visibility',
    module: 'skill',
    detail: '调整 Skill 可见性为本组织',
    userName: 'Jacky',
    userEmail: 'jacky@company.com',
    role: 'capability_ops',
    deptIds: ['quality'],
    regionId: null,
  },
  {
    id: 'aud-seed-4',
    at: new Date(Date.now() - 4 * 3600_000).toISOString(),
    category: 'org',
    action: 'org.rename',
    module: 'org',
    detail: '更新组织显示名',
    userName: 'Mcyo',
    userEmail: 'mcyo@company.com',
    role: 'super_admin',
    deptIds: ['quality'],
    regionId: null,
  },
  {
    id: 'aud-seed-5',
    at: new Date(Date.now() - 5 * 3600_000).toISOString(),
    category: 'task',
    action: 'task.execute',
    module: 'task',
    detail: '执行任务「竞品周报初稿」',
    userName: 'Dickson',
    userEmail: 'dickson@company.com',
    role: 'business_user',
    deptIds: ['gtm'],
    regionId: 'apac',
  },
  {
    id: 'aud-seed-6',
    at: new Date(Date.now() - 5.2 * 3600_000).toISOString(),
    category: 'model',
    action: 'model.invoke',
    module: 'chat',
    detail: '模型调用 · gpt-4.1-mini · 约 2.1k tokens',
    userName: 'Dickson',
    userEmail: 'dickson@company.com',
    role: 'business_user',
    deptIds: ['gtm'],
    regionId: 'apac',
  },
  {
    id: 'aud-seed-7',
    at: new Date(Date.now() - 6 * 3600_000).toISOString(),
    category: 'browse',
    action: 'view.open',
    module: 'ai-map',
    detail: '浏览「案例样板间」',
    userName: 'Somebody',
    userEmail: 'somebody@company.com',
    role: 'viewer',
    deptIds: ['mkt'],
    regionId: 'europe',
  },
  {
    id: 'aud-seed-8',
    at: new Date(Date.now() - 7 * 3600_000).toISOString(),
    category: 'auth',
    action: 'auth.login',
    module: 'auth',
    detail: '登录成功',
    userName: 'Somebody',
    userEmail: 'somebody@company.com',
    role: 'viewer',
    deptIds: ['mkt'],
    regionId: 'europe',
  },
  {
    id: 'aud-seed-9',
    at: new Date(Date.now() - 8 * 3600_000).toISOString(),
    category: 'browse',
    action: 'view.open',
    module: 'task',
    detail: '浏览「任务记录」',
    userName: 'Dickson',
    userEmail: 'dickson@company.com',
    role: 'business_user',
    deptIds: ['gtm'],
    regionId: 'apac',
  },
  {
    id: 'aud-seed-10',
    at: new Date(Date.now() - 9 * 3600_000).toISOString(),
    category: 'task',
    action: 'task.execute',
    module: 'task',
    detail: '执行任务「区域促销话术」',
    userName: 'Somebody',
    userEmail: 'somebody@company.com',
    role: 'viewer',
    deptIds: ['mkt'],
    regionId: 'europe',
  },
];

export interface AuditLogQuery {
  category?: AuditCategory | 'all';
  deptId?: DeptId | '';
  regionId?: RegionId | '' | '__hq__';
  /** 姓名 / 邮箱模糊搜索 */
  accountQuery?: string;
}

export function matchAuditLog(entry: AuditLogEntry, query: AuditLogQuery): boolean {
  if (query.category && query.category !== 'all' && entry.category !== query.category) {
    return false;
  }
  if (query.deptId) {
    const depts = entry.deptIds ?? [];
    if (!depts.includes(query.deptId)) return false;
  }
  if (query.regionId === '__hq__') {
    if (entry.regionId) return false;
  } else if (query.regionId) {
    if (entry.regionId !== query.regionId) return false;
  }
  const q = query.accountQuery?.trim().toLowerCase();
  if (q) {
    const name = entry.userName.toLowerCase();
    const email = (entry.userEmail ?? '').toLowerCase();
    if (!name.includes(q) && !email.includes(q)) return false;
  }
  return true;
}
