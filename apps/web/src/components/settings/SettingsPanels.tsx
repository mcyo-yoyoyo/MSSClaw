import { useState, type ReactNode } from 'react';
import type { Workspace } from '@/domain/workspace';
import {
  getRoleBadgeClass,
  MODULE_LABELS,
  PERMISSION_CLASSES,
  PERMISSION_LABELS,
  PlatformRoleSchema,
  RBAC_MATRIX,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type PlatformRole,
  type ResourceModule,
  type SettingsTab,
  type WorkspaceMember,
} from '@/domain/rbac';
import { cn } from '@/lib/utils';

const ROLES = PlatformRoleSchema.options.filter((r) => r !== 'super_admin');

interface SettingsContentProps {
  tab: SettingsTab;
  workspace: Workspace;
  members: WorkspaceMember[];
  onUpdateRole: (memberId: string, role: PlatformRole) => void;
  onInvite: (email: string, role: PlatformRole) => void;
}

export function SettingsContent({
  tab,
  workspace,
  members,
  onUpdateRole,
  onInvite,
}: SettingsContentProps) {
  if (tab === 'general') return <GeneralPanel workspace={workspace} memberCount={members.length} />;
  if (tab === 'members') return <MembersPanel members={members} onUpdateRole={onUpdateRole} onInvite={onInvite} />;
  if (tab === 'rbac') return <RbacMatrixPanel />;
  if (tab === 'namespace') return <NamespacePanel workspace={workspace} />;
  return <AuditPanel workspace={workspace} />;
}

function GeneralPanel({ workspace, memberCount }: { workspace: Workspace; memberCount: number }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Section title="Workspace 概览">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Field label="名称" value={workspace.name} />
          <Field label="Namespace" value={`ns/${workspace.namespace}`} />
          <Field label="成员数" value={`${memberCount} 人`} />
          <Field label="描述" value={workspace.description} />
        </dl>
      </Section>
      <Section title="平台信息">
        <p className="text-sm text-[#6e6e73]">
          MSS Claw 企业级 AI Employee OS · 当前 Workspace 资源按 Namespace 隔离，RBAC 控制各模块访问级别。
        </p>
      </Section>
    </div>
  );
}

function MembersPanel({
  members,
  onUpdateRole,
  onInvite,
}: {
  members: WorkspaceMember[];
  onUpdateRole: (id: string, role: PlatformRole) => void;
  onInvite: (email: string, role: PlatformRole) => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<PlatformRole>('developer');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Section title="邀请成员">
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@company.com"
            className="flex-grow rounded-lg border border-black/[0.06] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as PlatformRole)}
            className="rounded-lg border border-black/[0.06] px-3 py-2 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (email.trim()) {
                onInvite(email.trim(), role);
                setEmail('');
              }
            }}
            className="rounded-lg bg-claw-600 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800"
          >
            邀请
          </button>
        </div>
      </Section>

      <Section title={`成员列表 (${members.length})`}>
        <div className="overflow-hidden rounded-xl border border-black/[0.06]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/[0.06] bg-[#fafafa] text-[11px] font-bold uppercase text-[#86868b]">
              <tr>
                <th className="px-4 py-3">成员</th>
                <th className="px-4 py-3">角色</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">最近活跃</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-black/[0.05] last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white', member.avatar)}>
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-[#1d1d1f]">{member.name}</p>
                        <p className="text-[11px] text-[#aeaeb2]">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={member.role}
                      onChange={(e) => onUpdateRole(member.id, e.target.value as PlatformRole)}
                      className={cn('rounded border px-2 py-1 text-[11px] font-bold', getRoleBadgeClass(member.role))}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-[10px] font-bold capitalize',
                        member.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600',
                      )}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#86868b]">{member.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function RbacMatrixPanel() {
  const modules = Object.keys(MODULE_LABELS) as ResourceModule[];

  return (
    <div className="space-y-6">
      <Section title="RBAC 权限矩阵">
        <p className="mb-4 text-xs text-[#86868b]">
          定义各角色对平台模块的访问级别。Admin = 完全控制 · Write = 创建/编辑 · Execute = 运行 · R = 只读
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
              {ROLES.map((role) => (
                <tr key={role} className="border-b border-black/[0.05] last:border-0">
                  <td className="px-3 py-3 text-left">
                    <p className="font-bold text-[#1d1d1f]">{ROLE_LABELS[role]}</p>
                    <p className="text-[10px] text-[#aeaeb2]">{ROLE_DESCRIPTIONS[role]}</p>
                  </td>
                  {modules.map((mod) => {
                    const level = RBAC_MATRIX[role][mod];
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

function NamespacePanel({ workspace }: { workspace: Workspace }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Section title="Namespace 隔离">
        <dl className="space-y-4 text-sm">
          <Field label="Namespace ID" value={workspace.namespace} mono />
          <Field label="Full Path" value={`mss-claw://ws/${workspace.namespace}`} mono />
          <Field label="隔离策略" value="Workspace 级资源隔离 · Prompt / Skill / Agent / KB 按 ns 前缀" />
        </dl>
      </Section>
      <Section title="资源前缀规则">
        <pre className="rounded-xl bg-slate-900 p-4 font-mono text-[11px] text-green-400">
{`prompts/${workspace.namespace}/*
skills/${workspace.namespace}/*
agents/${workspace.namespace}/*
kb/${workspace.namespace}/*`}
        </pre>
      </Section>
    </div>
  );
}

function AuditPanel({ workspace }: { workspace: Workspace }) {
  const logs = [
    { time: '14:02', user: 'Mcyo', action: 'Agent 营销 Agent 上线', module: 'agent' },
    { time: '13:45', user: 'Bruce', action: 'Skill SQL_Generator Trace 调试', module: 'skill' },
    { time: '11:20', user: 'Jacky', action: 'Chat WarRoom 推送 Artifact', module: 'chat' },
    { time: '09:05', user: 'Mcyo', action: 'Prompt ENTERPRISE_QA_STRICT 发布 v3', module: 'prompt' },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Section title={`Audit Log · ${workspace.name}`}>
        <div className="space-y-2">
          {logs.map((log, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border border-black/[0.06] bg-white px-4 py-3 text-sm">
              <span className="font-mono text-[11px] text-[#aeaeb2]">{log.time}</span>
              <span className="font-bold text-[#424245]">{log.user}</span>
              <span className="flex-grow text-[#6e6e73]">{log.action}</span>
              <span className="rounded bg-black/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase text-[#86868b]">{log.module}</span>
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
