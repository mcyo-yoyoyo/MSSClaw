import { useMemo, useState, type ReactNode } from 'react';
import type { Workspace } from '@/domain/workspace';
import {
  getRoleBadgeClass,
  MEMBER_STATUS_LABELS,
  MODULE_LABELS,
  PERMISSION_CLASSES,
  PERMISSION_LABELS,
  INVITEABLE_ROLES,
  PlatformRoleSchema,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  getRbacMatrix,
  type PlatformRole,
  type ResourceModule,
  type SettingsTab,
  type WorkspaceMember,
} from '@/domain/rbac';
import { HQ_DEPTS, REGIONS, getDeptLabel, getRegionLabel, type DeptId, type RegionId } from '@/domain/orgTaxonomy';
import { DEMO_PASSWORD } from '@/domain/authAccounts';
import { cn } from '@/lib/utils';
import type { InviteMemberInput } from '@/stores/settingsStore';
import { useWorkspaceConfigStore } from '@/stores/workspaceConfigStore';
import { useSessionStore } from '@/stores/sessionStore';

const ROLES = PlatformRoleSchema.options;

interface SettingsContentProps {
  tab: SettingsTab;
  workspace: Workspace;
  members: WorkspaceMember[];
  onUpdateRole: (memberId: string, role: PlatformRole) => void;
  onUpdateOrg: (
    memberId: string,
    patch: { deptIds?: DeptId[]; regionId?: RegionId | null },
  ) => void;
  onSetStatus: (memberId: string, status: WorkspaceMember['status']) => void;
  onInvite: (input: InviteMemberInput) => void;
  onRemove: (memberId: string) => void;
}

export function SettingsContent({
  tab,
  workspace,
  members,
  onUpdateRole,
  onUpdateOrg,
  onSetStatus,
  onInvite,
  onRemove,
}: SettingsContentProps) {
  if (tab === 'org') return <OrgPanel workspace={workspace} members={members} />;
  if (tab === 'depts') return <DeptsPanel members={members} />;
  if (tab === 'roles') return <RolesPanel />;
  if (tab === 'members') {
    return (
      <MembersPanel
        members={members}
        onUpdateRole={onUpdateRole}
        onUpdateOrg={onUpdateOrg}
        onSetStatus={onSetStatus}
        onInvite={onInvite}
        onRemove={onRemove}
      />
    );
  }
  if (tab === 'rbac') return <RbacMatrixPanel workspace={workspace} />;
  return <AuditPanel workspace={workspace} />;
}

function OrgPanel({ workspace, members }: { workspace: Workspace; members: WorkspaceMember[] }) {
  const updateWorkspace = useWorkspaceConfigStore((s) => s.updateWorkspace);
  const [nameDraft, setNameDraft] = useState(workspace.name);
  const deptCount = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => m.deptIds?.forEach((d) => set.add(d)));
    return set.size || HQ_DEPTS.length;
  }, [members]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Section title="组织概览 · 可编辑">
        <p className="mb-3 text-[12px] text-[#6e6e73]">
          组织名称用于侧栏与登录视角展示。成员邀请后写入本地账号目录，激活即可用演示密码登录。
        </p>
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <label className="min-w-[220px] flex-1 text-[11px] font-semibold text-zinc-500">
            组织显示名
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-[13px] font-medium text-zinc-900"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              const next = nameDraft.trim();
              if (!next) return;
              updateWorkspace(workspace.id, { name: next });
            }}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white"
          >
            保存名称
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <Field label="当前组织 / 租户" value={workspace.name} />
          <Field label="Namespace" value={`ns/${workspace.namespace}`} mono />
          <Field label="成员" value={`${members.length} 人`} />
          <Field label="覆盖部门" value={`${deptCount} 个`} />
        </dl>
      </Section>
      <Section title="组织双轴结构">
        <p className="mb-3 text-[12px] text-[#6e6e73]">
          MSS 组织按「机关职能 × 一线区域」划分；资产可见性与场景案例推荐均基于此结构。在「成员管理」中可为每人指定归属。
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-black/[0.06] bg-white p-4">
            <p className="mb-2 text-[11px] font-semibold text-zinc-500">机关职能（部门）</p>
            <ul className="space-y-1.5">
              {HQ_DEPTS.map((d) => (
                <li key={d.id} className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-zinc-800">{d.label}</span>
                  <span className="font-mono text-[10px] text-zinc-400">{d.id}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-black/[0.06] bg-white p-4">
            <p className="mb-2 text-[11px] font-semibold text-zinc-500">一线区域</p>
            <ul className="space-y-1.5">
              {REGIONS.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-zinc-800">{r.label}</span>
                  <span className="font-mono text-[10px] text-zinc-400">{r.id}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
      <Section title="鉴权链路">
        <ol className="list-decimal space-y-1.5 pl-4 text-[12px] leading-relaxed text-zinc-600">
          <li>管理员在「成员管理」邀请邮箱并指定角色 / 部门 / 区域</li>
          <li>激活后账号进入登录目录（与种子成员合并）</li>
          <li>登录页使用邮箱 + 演示密码 <code className="rounded bg-zinc-100 px-1">{DEMO_PASSWORD}</code></li>
          <li>会话携带角色与组织归属，驱动菜单、资产可见性与场景推荐</li>
        </ol>
      </Section>
    </div>
  );
}

function DeptsPanel({ members }: { members: WorkspaceMember[] }) {
  const counts = useMemo(() => {
    const map = Object.fromEntries(HQ_DEPTS.map((d) => [d.id, 0])) as Record<string, number>;
    members.forEach((m) => {
      (m.deptIds ?? []).forEach((id) => {
        map[id] = (map[id] ?? 0) + 1;
      });
    });
    return map;
  }, [members]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Section title="部门（机关职能）">
        <p className="mb-3 text-[12px] text-[#6e6e73]">
          部门字典由平台预置。成员归属请在「成员管理」中编辑；此处展示人数分布，便于核对组织覆盖。
        </p>
        <div className="overflow-hidden rounded-xl border border-black/[0.06]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/[0.06] bg-[#fafafa] text-[11px] font-bold uppercase text-[#86868b]">
              <tr>
                <th className="px-4 py-3">部门</th>
                <th className="px-4 py-3">编码</th>
                <th className="px-4 py-3">成员数</th>
              </tr>
            </thead>
            <tbody>
              {HQ_DEPTS.map((d) => (
                <tr key={d.id} className="border-b border-black/[0.05] last:border-0">
                  <td className="px-4 py-3 font-semibold text-[#1d1d1f]">{d.label}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-zinc-500">{d.id}</td>
                  <td className="px-4 py-3 text-zinc-600">{counts[d.id] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="一线区域">
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <span
              key={r.id}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[12px] font-medium text-zinc-700"
            >
              {r.label}
              <span className="ml-1.5 font-mono text-[10px] text-zinc-400">{r.id}</span>
            </span>
          ))}
        </div>
      </Section>
    </div>
  );
}

function RolesPanel() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Section title="平台角色">
        <p className="mb-3 text-[12px] text-[#6e6e73]">
          角色决定模块访问级别；与部门/区域正交——同一角色可归属不同组织单元。在「成员管理」中可随时改派角色。
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ROLES.map((role) => (
            <div key={role} className="rounded-xl border border-black/[0.06] bg-white p-4">
              <span className={cn('rounded border px-2 py-0.5 text-[11px] font-bold', getRoleBadgeClass(role))}>
                {ROLE_LABELS[role]}
              </span>
              <p className="mt-2 text-[12px] leading-relaxed text-zinc-600">{ROLE_DESCRIPTIONS[role]}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function MembersPanel({
  members,
  onUpdateRole,
  onUpdateOrg,
  onSetStatus,
  onInvite,
  onRemove,
}: {
  members: WorkspaceMember[];
  onUpdateRole: (id: string, role: PlatformRole) => void;
  onUpdateOrg: (
    id: string,
    patch: { deptIds?: DeptId[]; regionId?: RegionId | null },
  ) => void;
  onSetStatus: (id: string, status: WorkspaceMember['status']) => void;
  onInvite: (input: InviteMemberInput) => void;
  onRemove: (id: string) => void;
}) {
  const currentUser = useSessionStore((s) => s.user);
  const canManage = currentUser?.platformRole === 'super_admin';

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<PlatformRole>('business_user');
  const [deptId, setDeptId] = useState<DeptId | ''>('');
  const [regionId, setRegionId] = useState<RegionId | ''>('');
  const [activateNow, setActivateNow] = useState(true);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Section title="邀请成员">
        <p className="mb-3 text-[12px] text-[#6e6e73]">
          邀请写入工作区成员表，并进入登录账号目录。勾选「立即激活」后可用演示密码{' '}
          <code className="rounded bg-zinc-100 px-1">{DEMO_PASSWORD}</code> 登录；未激活则登录会被拒绝。
        </p>
        {!canManage ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            当前账号无成员管理权限（需超级管理员），仅可查看。
          </p>
        ) : (
          <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="邮箱 email@company.com"
                className="rounded-lg border border-black/[0.06] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="显示名（可选）"
                className="rounded-lg border border-black/[0.06] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as PlatformRole)}
                className="rounded-lg border border-black/[0.06] px-3 py-2 text-sm"
              >
                {INVITEABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <select
                value={deptId}
                onChange={(e) => setDeptId(e.target.value as DeptId | '')}
                className="rounded-lg border border-black/[0.06] px-3 py-2 text-sm"
              >
                <option value="">部门（可选）</option>
                {HQ_DEPTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
              <select
                value={regionId}
                onChange={(e) => setRegionId(e.target.value as RegionId | '')}
                className="rounded-lg border border-black/[0.06] px-3 py-2 text-sm"
              >
                <option value="">区域（可选）</option>
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-[12px] text-zinc-700">
                <input
                  type="checkbox"
                  checked={activateNow}
                  onChange={(e) => setActivateNow(e.target.checked)}
                  className="accent-claw-600"
                />
                立即激活
              </label>
              <button
                type="button"
                onClick={() => {
                  if (!email.trim()) return;
                  onInvite({
                    email: email.trim(),
                    role,
                    name: name.trim() || undefined,
                    deptIds: deptId ? [deptId] : [],
                    regionId: regionId || null,
                    activateNow,
                  });
                  setEmail('');
                  setName('');
                }}
                className="rounded-lg bg-claw-600 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800"
              >
                邀请
              </button>
            </div>
          </div>
        )}
      </Section>

      <Section title={`成员列表 (${members.length})`}>
        <div className="overflow-x-auto rounded-xl border border-black/[0.06]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-black/[0.06] bg-[#fafafa] text-[11px] font-bold uppercase text-[#86868b]">
              <tr>
                <th className="px-4 py-3">成员</th>
                <th className="px-4 py-3">部门</th>
                <th className="px-4 py-3">区域</th>
                <th className="px-4 py-3">角色</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-black/[0.05] last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white',
                          member.avatar,
                        )}
                      >
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-[#1d1d1f]">{member.name}</p>
                        <p className="text-[11px] text-[#aeaeb2]">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <select
                        value={(member.deptIds ?? [])[0] ?? ''}
                        onChange={(e) =>
                          onUpdateOrg(member.id, {
                            deptIds: e.target.value ? [e.target.value as DeptId] : [],
                          })
                        }
                        className="max-w-[120px] rounded border border-zinc-200 px-1.5 py-1 text-[11px]"
                      >
                        <option value="">—</option>
                        {HQ_DEPTS.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[11px] text-zinc-600">
                        {(member.deptIds ?? []).map(getDeptLabel).join(' · ') || '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <select
                        value={member.regionId ?? ''}
                        onChange={(e) =>
                          onUpdateOrg(member.id, {
                            regionId: (e.target.value || null) as RegionId | null,
                          })
                        }
                        className="max-w-[110px] rounded border border-zinc-200 px-1.5 py-1 text-[11px]"
                      >
                        <option value="">机关</option>
                        {REGIONS.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[11px] text-zinc-600">
                        {member.regionId ? getRegionLabel(member.regionId) : '机关'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={member.role}
                      disabled={!canManage || member.role === 'super_admin'}
                      onChange={(e) => onUpdateRole(member.id, e.target.value as PlatformRole)}
                      className={cn(
                        'rounded border px-2 py-1 text-[11px] font-bold disabled:opacity-60',
                        getRoleBadgeClass(member.role),
                      )}
                    >
                      {(member.role === 'super_admin'
                        ? PlatformRoleSchema.options
                        : INVITEABLE_ROLES
                      ).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-[10px] font-bold',
                        member.status === 'active'
                          ? 'bg-green-50 text-green-600'
                          : member.status === 'suspended'
                            ? 'bg-zinc-100 text-zinc-500'
                            : 'bg-amber-50 text-amber-600',
                      )}
                    >
                      {MEMBER_STATUS_LABELS[member.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <div className="flex flex-wrap gap-1">
                        {member.status === 'invited' ? (
                          <button
                            type="button"
                            onClick={() => onSetStatus(member.id, 'active')}
                            className="rounded border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            激活
                          </button>
                        ) : null}
                        {member.status === 'active' ? (
                          <button
                            type="button"
                            onClick={() => onSetStatus(member.id, 'suspended')}
                            className="rounded border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50"
                          >
                            停用
                          </button>
                        ) : null}
                        {member.status === 'suspended' ? (
                          <button
                            type="button"
                            onClick={() => onSetStatus(member.id, 'active')}
                            className="rounded border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            恢复
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`确定移除 ${member.name}？`)) onRemove(member.id);
                          }}
                          className="rounded border border-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50"
                        >
                          移除
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function RbacMatrixPanel({ workspace }: { workspace: Workspace }) {
  const modules = Object.keys(MODULE_LABELS) as ResourceModule[];
  const matrix = getRbacMatrix(workspace.id);

  return (
    <div className="space-y-6">
      <Section title={`RBAC 权限矩阵 · ${workspace.name}`}>
        <p className="mb-4 text-xs text-[#86868b]">
          当前数字空间的角色×模块访问级别（演示只读，随工作区切换而变化）。Admin = 完全控制 · Write =
          创建/编辑 · Execute = 运行 · R = 只读 · — = 无权限。实际授权请通过「成员管理」改派角色。
        </p>
        <div className="overflow-x-auto rounded-xl border border-black/[0.06]">
          <table className="w-full min-w-[720px] text-center text-xs">
            <thead>
              <tr className="border-b border-black/[0.06] bg-[#fafafa]">
                <th className="px-3 py-3 text-left font-bold text-[#86868b]">角色</th>
                {modules.map((m) => (
                  <th key={m} className="px-2 py-3 font-bold text-[#86868b]">
                    {MODULE_LABELS[m]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.filter((r) => r !== 'super_admin').map((role) => (
                <tr key={role} className="border-b border-black/[0.05] last:border-0">
                  <td className="px-3 py-3 text-left">
                    <p className="font-bold text-[#1d1d1f]">{ROLE_LABELS[role]}</p>
                    <p className="text-[10px] text-[#aeaeb2]">{ROLE_DESCRIPTIONS[role]}</p>
                  </td>
                  {modules.map((mod) => {
                    const level = matrix[role][mod];
                    return (
                      <td key={mod} className="px-2 py-3">
                        <span className={cn('inline-block rounded px-2 py-1 font-bold', PERMISSION_CLASSES[level])}>
                          {PERMISSION_LABELS[level]}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function AuditPanel({ workspace }: { workspace: Workspace }) {
  const logs = [
    { time: '14:02', user: 'Mcyo', action: '激活成员 bruce@company.com', module: 'members' },
    { time: '13:45', user: 'Mcyo', action: '邀请 jacky@company.com 为业务用户', module: 'members' },
    { time: '11:20', user: 'Bruce', action: '调整 Skill 可见性', module: 'skill' },
    { time: '09:05', user: 'Mcyo', action: '更新组织显示名', module: 'org' },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Section title={`审计日志 · ${workspace.name}`}>
        <div className="space-y-2">
          {logs.map((log, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-lg border border-black/[0.06] bg-white px-4 py-3 text-sm"
            >
              <span className="font-mono text-[11px] text-[#aeaeb2]">{log.time}</span>
              <span className="font-bold text-[#424245]">{log.user}</span>
              <span className="flex-grow text-[#6e6e73]">{log.action}</span>
              <span className="rounded bg-black/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase text-[#86868b]">
                {log.module}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-bold text-[#1d1d1f]">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase text-[#aeaeb2]">{label}</dt>
      <dd className={cn('mt-1 text-[#1d1d1f]', mono && 'font-mono text-sm')}>{value}</dd>
    </div>
  );
}
