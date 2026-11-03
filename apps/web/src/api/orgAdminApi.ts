/**
 * 组织权限后台：成员 / 角色 / 部门（区域与领域）。对应 Nest /api/v1/admin/*。
 */

import { apiAuthHeaders, apiUrl, fetchWithTimeout } from '@/api/client';
import { useSessionStore } from '@/stores/sessionStore';

export interface OrgMember {
  id: string;
  name: string;
  email: string;
  roleId: string;
  status: 'active' | 'invited' | 'suspended';
  regionId: string | null;
  domainIds: string[];
  avatar: string;
  hasPassword: boolean;
  lastLoginAt: string | null;
  externalId: string | null;
  postName: string | null;
  orgPath: string | null;
}

export interface OrgRole {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  menuIds: string[];
  editMenuIds: string[];
  memberCount: number;
}

export interface OrgMenu {
  id: string;
  name: string;
  section: string;
  icon: string | null;
  sort: number;
  /** 为空的是一级分组 */
  parentId: string | null;
  /** 所有登录用户都有，不用分配 */
  fixed: boolean;
}

export interface OperationLogEntry {
  id: string;
  at: string;
  module: 'skill' | 'agent' | 'tool' | 'office-scene';
  action: 'create' | 'update' | 'delete';
  targetName: string;
  detail: string;
  userName: string;
  userEmail: string | null;
  role: string | null;
}

export interface DictionaryEntry {
  id: string;
  name: string;
  enabled: boolean;
  sort: number;
}

export interface OrgTaxonomy {
  regions: DictionaryEntry[];
  domains: DictionaryEntry[];
}

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface MemberImportRow {
  row: number;
  name?: string;
  email?: string;
  role?: string;
  region?: string;
  domains?: string;
  password?: string;
}

const ERROR_TEXT: Record<string, string> = {
  member_email_exists: '邮箱已被其他成员使用',
  email_invalid: '邮箱格式不对',
  email_required: '邮箱必填',
  name_required: '名称必填',
  super_admin_via_transfer_only: '超级管理员只能通过移交产生',
  super_admin_cannot_be_suspended: '超级管理员不能停用',
  super_admin_cannot_be_deleted: '超级管理员不能删除',
  cannot_suspend_self: '不能停用自己',
  cannot_delete_self: '不能删除自己',
  member_not_found: '成员不存在',
  password_required: '请输入密码',
  password_min_length_8: '密码至少 8 位',
  super_admin_required: '只有超级管理员本人能移交',
  already_super_admin: '对方已经是超级管理员',
  target_member_not_active: '只能移交给已启用的成员',
  role_exists: '角色编号已存在',
  role_id_invalid: '角色编号只能用小写字母、数字、- 和 _',
  role_not_found: '角色不存在',
  role_in_use: '还有成员在用这个角色，先把他们换到别的角色',
  system_role_cannot_be_deleted: '内置角色不能删除',
  default_role_cannot_be_deleted: '默认角色不能删除',
  super_admin_has_all_menus: '超级管理员默认拥有全部菜单',
  region_exists: '区域编号已存在',
  domain_exists: '领域编号已存在',
  region_id_invalid: '编号只能用小写字母、数字、- 和 _',
  domain_id_invalid: '编号只能用小写字母、数字、- 和 _',
  region_in_use: '还有成员属于这个区域，不能删除，可以先停用',
  domain_in_use: '还有成员属于这个领域，不能删除，可以先停用',
  rows_empty: '表格里没有数据行',
  rows_max_1000: '一次最多导入 1000 行',
  import_invalid: '表格有错误，整批未导入',
};

export class OrgApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly rowErrors: ImportRowError[] = [],
  ) {
    super(orgErrorText(code, status));
  }
}

export function orgErrorText(code: string, status = 400): string {
  if (ERROR_TEXT[code]) return ERROR_TEXT[code];
  if (code.startsWith('menu_forbidden')) return '当前角色没有这项操作的权限';
  const unknown = /^unknown_(role|region|domain|menu)_(.+)$/.exec(code);
  if (unknown) return `${{ role: '角色', region: '区域', domain: '领域', menu: '菜单' }[unknown[1]]}不存在：${unknown[2]}`;
  if (status === 401) return '登录已过期，请重新登录';
  return code || `请求失败（HTTP ${status}）`;
}

async function send(path: string, init: RequestInit): Promise<Response> {
  return fetchWithTimeout(
    apiUrl(`/api/v1/admin${path}`),
    {
      ...init,
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...apiAuthHeaders(), ...init.headers },
    },
    20_000,
  );
}

/** 访问令牌过期时续期一次再重试 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await send(path, init);
  if (res.status === 401 && (await useSessionStore.getState().refreshSession())) res = await send(path, init);
  const body = (await res.json().catch(() => null)) as
    | (T & { message?: unknown; error?: unknown; errors?: ImportRowError[] })
    | null;
  if (!res.ok) {
    const code = typeof body?.message === 'string' ? body.message : typeof body?.error === 'string' ? body.error : '';
    throw new OrgApiError(res.status, code, Array.isArray(body?.errors) ? body.errors : []);
  }
  return body as T;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const orgAdminApi = {
  listMembers: () => request<{ users: OrgMember[] }>('/users').then((r) => r.users),
  createMember: (body: Partial<OrgMember> & { password?: string }) => request<OrgMember>('/users', json('POST', body)),
  updateMember: (id: string, body: Partial<OrgMember>) => request<OrgMember>(`/users/${encodeURIComponent(id)}`, json('PUT', body)),
  deleteMember: (id: string) => request<{ ok: true }>(`/users/${encodeURIComponent(id)}`, json('DELETE')),
  setPassword: (id: string, password: string) =>
    request<unknown>(`/users/${encodeURIComponent(id)}/password`, json('PUT', { password })),
  clearPassword: (id: string) => request<unknown>(`/users/${encodeURIComponent(id)}/password`, json('DELETE')),
  forceLogout: (id: string) => request<{ ok: true }>(`/users/${encodeURIComponent(id)}/logout`, json('POST')),
  importMembers: (rows: MemberImportRow[]) =>
    request<{ created: number; updated: number; total: number }>('/users/import', json('POST', { rows })),
  transferSuperAdmin: (memberId: string) =>
    request<{ users: OrgMember[] }>('/super-admin/transfer', json('POST', { memberId })).then((r) => r.users),

  listRoles: () => request<{ roles: OrgRole[] }>('/roles').then((r) => r.roles),
  createRole: (body: { name: string; description?: string; menuIds?: string[]; editMenuIds?: string[] }) =>
    request<OrgRole>('/roles', json('POST', body)),
  updateRole: (id: string, body: { name?: string; description?: string | null }) =>
    request<OrgRole>(`/roles/${encodeURIComponent(id)}`, json('PUT', body)),
  deleteRole: (id: string) => request<{ ok: true }>(`/roles/${encodeURIComponent(id)}`, json('DELETE')),
  setRoleMenus: (id: string, menuIds: string[], editMenuIds: string[]) =>
    request<OrgRole>(`/roles/${encodeURIComponent(id)}/menus`, json('PUT', { menuIds, editMenuIds })),
  listMenus: () => request<{ menus: OrgMenu[] }>('/menus').then((r) => r.menus),
  listOperationLogs: (module?: string, query?: string, page = 1, pageSize = 20) => {
    const params = new URLSearchParams();
    if (module && module !== 'all') params.set('module', module);
    if (query?.trim()) params.set('q', query.trim());
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    return request<{ logs: OperationLogEntry[]; total: number; page: number; pageSize: number }>(
      `/operation-logs?${params.toString()}`,
    );
  },

  taxonomy: () => request<OrgTaxonomy>('/taxonomy'),
  createEntry: (kind: 'regions' | 'domains', body: { id: string; name: string }) =>
    request<DictionaryEntry>(`/${kind}`, json('POST', body)),
  updateEntry: (kind: 'regions' | 'domains', id: string, body: Partial<Omit<DictionaryEntry, 'id'>>) =>
    request<DictionaryEntry>(`/${kind}/${encodeURIComponent(id)}`, json('PUT', body)),
  deleteEntry: (kind: 'regions' | 'domains', id: string) =>
    request<{ ok: true }>(`/${kind}/${encodeURIComponent(id)}`, json('DELETE')),
};
