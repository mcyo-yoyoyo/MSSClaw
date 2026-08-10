import { useMemo, useRef, useState, type ReactNode } from 'react';
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
  normalizeSettingsTab,
  type PlatformRole,
  type ResourceModule,
  type SettingsTab,
  type WorkspaceMember,
} from '@/domain/rbac';
import { getDeptLabel, getRegionLabel, type DeptId, type RegionId } from '@/domain/orgTaxonomy';
import {
  AUDIT_CATEGORY_LABELS,
  matchAuditLog,
  type AuditCategory,
  type AuditLogQuery,
} from '@/domain/auditLog';
import { downloadAuditLogsExcel } from '@/domain/auditExport';
import {
  batchSetAccountPasswords,
  generateTempPassword,
  hasCredential,
  listCredentialEmails,
  loadAuthPolicy,
  setAccountPassword,
  setAllowDemoPassword,
} from '@/domain/accountCredentials';
import {
  buildMemberImportTemplateCsv,
  downloadMemberImportTemplate,
  readImportFileAsText,
} from '@/domain/memberImportTemplate';
import { getNavMetaLabel } from '@/domain/navPresentation';
import { cn } from '@/lib/utils';
import type { InviteMemberInput } from '@/stores/settingsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWorkspaceConfigStore } from '@/stores/workspaceConfigStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useOrgTaxonomyStore } from '@/stores/orgTaxonomyStore';
import { useAuditStore, recordAudit } from '@/stores/auditStore';

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
  const resolved = normalizeSettingsTab(tab);
  if (resolved === 'depts') return <DeptsPanel members={members} />;
  if (resolved === 'roles') return <RolesAndRbacPanel workspace={workspace} />;
  if (resolved === 'members') {
    return (
      <MembersAndOrgPanel
        workspace={workspace}
        members={members}
        onUpdateRole={onUpdateRole}
        onUpdateOrg={onUpdateOrg}
        onSetStatus={onSetStatus}
        onInvite={onInvite}
        onRemove={onRemove}
      />
    );
  }
  return <AuditPanel workspace={workspace} />;
}

function MembersAndOrgPanel({
  workspace,
  members,
  onUpdateRole,
  onUpdateOrg,
  onSetStatus,
  onInvite,
  onRemove,
}: {
  workspace: Workspace;
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
  const updateWorkspace = useWorkspaceConfigStore((s) => s.updateWorkspace);
  const depts = useOrgTaxonomyStore((s) => s.depts);
  const regions = useOrgTaxonomyStore((s) => s.regions);
  const currentUser = useSessionStore((s) => s.user);
  const canManage = currentUser?.platformRole === 'super_admin';

  const [nameDraft, setNameDraft] = useState(workspace.name);
  const [addMode, setAddMode] = useState<'single' | 'batch'>('single');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<PlatformRole>('business_user');
  const [deptId, setDeptId] = useState<DeptId | ''>('');
  const [regionId, setRegionId] = useState<RegionId | ''>('');
  const [pwdTick, setPwdTick] = useState(0);
  const [pwdOpen, setPwdOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-2xl border border-zinc-200/90 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[200px] flex-1 text-[11px] font-semibold text-zinc-500">
            组织名称
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              disabled={!canManage}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-[13px] font-medium text-zinc-900 disabled:bg-zinc-50"
            />
          </label>
          {canManage ? (
            <button
              type="button"
              onClick={() => {
                const next = nameDraft.trim();
                if (!next) return;
                updateWorkspace(workspace.id, { name: next });
                recordAudit({
                  category: 'org',
                  action: 'org.rename',
                  module: 'org',
                  detail: `更新组织显示名为「${next}」`,
                  workspaceId: workspace.id,
                });
              }}
              className="rounded-lg bg-zinc-900 px-3.5 py-2 text-[12px] font-semibold text-white"
            >
              保存
            </button>
          ) : null}
          <div className="flex flex-wrap gap-2 text-[12px] text-zinc-500">
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-700">
              {members.length} 人
            </span>
            <span className="rounded-full bg-zinc-50 px-2.5 py-1">
              ns/{workspace.namespace}
            </span>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
          三步：添加成员 → 指定角色与部门/区域归属 → 设密登录。归属短期不作菜单/数据权限裁剪。
        </p>
      </section>

      {canManage ? (
        <Section title="添加成员">
          <div className="mb-3 inline-flex rounded-full bg-zinc-100 p-0.5">
            {(
              [
                { id: 'single' as const, label: '单个添加' },
                { id: 'batch' as const, label: '批量导入' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setAddMode(m.id)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition',
                  addMode === m.id
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {addMode === 'single' ? (
            <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="邮箱 name@huawei.com"
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px]"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="姓名（可选）"
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px]"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as PlatformRole)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px]"
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
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px]"
                >
                  <option value="">部门（可选）</option>
                  {depts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <select
                  value={regionId}
                  onChange={(e) => setRegionId(e.target.value as RegionId | '')}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px]"
                >
                  <option value="">区域（可选）</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
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
                      activateNow: true,
                    });
                    setEmail('');
                    setName('');
                  }}
                  className="rounded-lg bg-claw-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-zinc-800"
                >
                  添加并激活
                </button>
              </div>
            </div>
          ) : (
            <BatchAccountImportSection />
          )}
        </Section>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          当前账号无成员管理权限（需平台运营），仅可查看。
        </p>
      )}

      <Section title={`成员列表 · ${members.length}`}>
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
                        {depts.map((d) => (
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
                        {regions.map((r) => (
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
                            void (async () => {
                              const temp = generateTempPassword();
                              const r = await setAccountPassword(member.email, temp);
                              if (r.ok) {
                                window.alert(
                                  `${member.email} 临时密码已重置为：\n${temp}\n\n请安全告知本人后立即销毁此提示。`,
                                );
                                setPwdTick((n) => n + 1);
                              } else {
                                window.alert(r.error);
                              }
                            })();
                          }}
                          className="rounded border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50"
                        >
                          重置密码
                        </button>
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

      {canManage ? (
        <section className="rounded-2xl border border-zinc-200/90 bg-white">
          <button
            type="button"
            onClick={() => setPwdOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span>
              <span className="text-[13px] font-semibold text-zinc-900">登录与密码</span>
              <span className="mt-0.5 block text-[11px] text-zinc-400">
                演示密码开关 · 单账号设密（高级）
              </span>
            </span>
            <i
              className={cn(
                'fa-solid fa-chevron-down text-[11px] text-zinc-400 transition',
                pwdOpen && 'rotate-180',
              )}
            />
          </button>
          {pwdOpen ? (
            <div className="border-t border-zinc-100 px-4 pb-4 pt-3">
              <AccountPasswordAdminSection
                members={members}
                tick={pwdTick}
                onChanged={() => setPwdTick((n) => n + 1)}
              />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function BatchAccountImportSection() {
  const batchImportAccounts = useSettingsStore((s) => s.batchImportAccounts);
  const setToast = useSettingsStore((s) => s.setToast);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5">
      <p className="text-[12px] leading-relaxed text-zinc-600">
        <strong className="font-semibold text-zinc-800">推荐流程：</strong>
        下载模板 → Excel 填写 → 上传或粘贴 → 一键导入。
        列：邮箱、密码、角色、姓名、部门、区域。
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            downloadMemberImportTemplate();
            setToast('已下载「MSS-成员导入模板.csv」，可用 Excel 打开填写');
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d1d1f] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#2c2c2e]"
        >
          <i className="fa-solid fa-download text-[10px]" />
          下载导入模板
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-[12px] font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          <i className="fa-solid fa-file-import text-[10px]" />
          上传已填模板
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            void (async () => {
              try {
                const content = await readImportFileAsText(file);
                setText(content);
                setToast(`已载入 ${file.name}，确认后点击「开始导入」`);
              } catch {
                setToast('读取文件失败，请改用粘贴');
              }
            })();
          }}
        />
        <button
          type="button"
          onClick={() => setText(buildMemberImportTemplateCsv())}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] font-medium text-zinc-600 hover:bg-zinc-50"
        >
          填入示例到下方
        </button>
      </div>
      <textarea
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'先点「下载导入模板」，填好后上传；也可直接粘贴 CSV 内容…'}
        className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 font-mono text-[11px] text-zinc-800"
        spellCheck={false}
      />
      <button
        type="button"
        disabled={busy || !text.trim()}
        onClick={() => {
          void (async () => {
            setBusy(true);
            const r = await batchImportAccounts(text);
            setBusy(false);
            if (r.fail.length) {
              setToast(
                `导入：新增 ${r.ok}、更新 ${r.updated}、失败 ${r.fail.length}（首条：${r.fail[0]?.error}）`,
              );
            } else if (r.ok + r.updated === 0) {
              setToast('没有可导入的数据行，请先下载模板填写');
            }
          })();
        }}
        className="rounded-lg bg-claw-600 px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
      >
        {busy ? '导入中…' : '开始导入'}
      </button>
    </div>
  );
}

function AccountPasswordAdminSection({
  members,
  tick,
  onChanged,
}: {
  members: WorkspaceMember[];
  tick: number;
  onChanged: () => void;
}) {
  const [allowDemo, setAllowDemo] = useState(() => loadAuthPolicy().allowDemoPassword);
  const [batchText, setBatchText] = useState(
    '# 每行：邮箱,密码\nmcyo@huawei.com,ChangeMe123\n',
  );
  const [singleEmail, setSingleEmail] = useState('');
  const [singlePwd, setSinglePwd] = useState('');
  const [busy, setBusy] = useState(false);
  const setToast = useSettingsStore((s) => s.setToast);

  void tick;
  const credCount = listCredentialEmails().length;
  const activeEmails = members.filter((m) => m.status === 'active').map((m) => m.email);

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-zinc-500">
        密码保存在本机浏览器。生产前请关闭演示密码，并为账号单独设密。已设密：{credCount}。
      </p>
      <label className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[12px] text-zinc-700">
        <input
          type="checkbox"
          className="mt-0.5 accent-claw-600"
          checked={allowDemo}
          onChange={(e) => {
            const next = e.target.checked;
            setAllowDemo(next);
            setAllowDemoPassword(next);
            setToast(
              next
                ? '已开启演示密码（未设密账号仍可用 mssclaw）'
                : '已关闭演示密码：必须为账号单独设密',
            );
          }}
        />
        <span>
          <span className="font-semibold">允许演示密码登录</span>
          <span className="mt-0.5 block text-[11px] text-zinc-400">
            默认开启便于试用；上线前请关闭。
          </span>
        </span>
      </label>

      <div className="flex flex-wrap gap-2">
        <select
          value={singleEmail}
          onChange={(e) => setSingleEmail(e.target.value)}
          className="min-w-[180px] rounded-lg border border-zinc-200 px-2 py-1.5 text-[12px]"
        >
          <option value="">选择成员设密</option>
          {activeEmails.map((em) => (
            <option key={em} value={em}>
              {em}
              {hasCredential(em) ? ' · 已设密' : ' · 未设密'}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={singlePwd}
          onChange={(e) => setSinglePwd(e.target.value)}
          placeholder="新密码（≥6 位）"
          className="min-w-[140px] flex-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-[12px]"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void (async () => {
              setBusy(true);
              const r = await setAccountPassword(singleEmail, singlePwd);
              setBusy(false);
              if (r.ok) {
                setToast(`已为 ${singleEmail} 设置密码`);
                setSinglePwd('');
                onChanged();
              } else setToast(r.error);
            })();
          }}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
        >
          保存密码
        </button>
      </div>

      <details className="rounded-xl border border-zinc-200 bg-white">
        <summary className="cursor-pointer px-3 py-2 text-[12px] font-semibold text-zinc-700">
          仅批量改密（已有账号）
        </summary>
        <div className="space-y-2 border-t border-zinc-100 px-3 py-2.5">
          <textarea
            rows={4}
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-2 font-mono text-[11px] text-zinc-800"
            spellCheck={false}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  const r = await batchSetAccountPasswords(batchText);
                  setBusy(false);
                  onChanged();
                  setToast(
                    r.fail.length
                      ? `成功 ${r.ok} 条，失败 ${r.fail.length} 条`
                      : `已批量设置 ${r.ok} 个账号密码`,
                  );
                })();
              }}
              className="rounded-lg bg-claw-600 px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              批量应用
            </button>
            <button
              type="button"
              onClick={() => {
                const lines = activeEmails.map((em) => `${em},${generateTempPassword()}`);
                setBatchText(`# 临时密码草稿\n${lines.join('\n')}\n`);
              }}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50"
            >
              生成草稿
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}

function DeptsPanel({ members }: { members: WorkspaceMember[] }) {
  const depts = useOrgTaxonomyStore((s) => s.depts);
  const regions = useOrgTaxonomyStore((s) => s.regions);
  const addDept = useOrgTaxonomyStore((s) => s.addDept);
  const updateDept = useOrgTaxonomyStore((s) => s.updateDept);
  const removeDept = useOrgTaxonomyStore((s) => s.removeDept);
  const addRegion = useOrgTaxonomyStore((s) => s.addRegion);
  const updateRegion = useOrgTaxonomyStore((s) => s.updateRegion);
  const removeRegion = useOrgTaxonomyStore((s) => s.removeRegion);
  const resetDefaults = useOrgTaxonomyStore((s) => s.resetDefaults);
  const toast = useOrgTaxonomyStore((s) => s.toast);
  const dismissToast = useOrgTaxonomyStore((s) => s.dismissToast);
  const currentUser = useSessionStore((s) => s.user);
  const canManage = currentUser?.platformRole === 'super_admin';

  const [newDept, setNewDept] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [editingDept, setEditingDept] = useState<{ id: string; label: string } | null>(null);
  const [editingRegion, setEditingRegion] = useState<{ id: string; label: string } | null>(null);

  const deptCounts = useMemo(() => {
    const map: Record<string, number> = {};
    depts.forEach((d) => {
      map[d.id] = 0;
    });
    members.forEach((m) => {
      (m.deptIds ?? []).forEach((id) => {
        map[id] = (map[id] ?? 0) + 1;
      });
    });
    return map;
  }, [members, depts]);

  const regionCounts = useMemo(() => {
    const map: Record<string, number> = {};
    regions.forEach((r) => {
      map[r.id] = 0;
    });
    members.forEach((m) => {
      if (m.regionId) map[m.regionId] = (map[m.regionId] ?? 0) + 1;
    });
    return map;
  }, [members, regions]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {toast ? (
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] text-zinc-700">
          <span>{toast}</span>
          <button type="button" onClick={dismissToast} className="text-zinc-400 hover:text-zinc-700">
            关闭
          </button>
        </div>
      ) : null}

      <Section title="部门（机关职能）">
        <p className="mb-3 text-[12px] text-[#6e6e73]">
          维护部门/区域名称，供成员归属标签与左侧浏览筛选使用。短期不做数据权限；删除前请先调整相关成员归属。
        </p>
        {!canManage ? (
          <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            仅平台运营可编辑部门/区域字典。
          </p>
        ) : (
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              placeholder="新部门名称，如 法务"
              className="min-w-[180px] flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                if (addDept(newDept)) {
                  recordAudit({
                    category: 'org',
                    action: 'dept.create',
                    module: 'org',
                    detail: `新增部门「${newDept.trim()}」`,
                  });
                  setNewDept('');
                }
              }}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-[12px] font-semibold text-white"
            >
              新增部门
            </button>
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-black/[0.06]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/[0.06] bg-[#fafafa] text-[11px] font-bold uppercase text-[#86868b]">
              <tr>
                <th className="px-4 py-3">部门</th>
                <th className="px-4 py-3">编码</th>
                <th className="px-4 py-3">成员数</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {depts.map((d) => (
                <tr key={d.id} className="border-b border-black/[0.05] last:border-0">
                  <td className="px-4 py-3">
                    {editingDept?.id === d.id ? (
                      <input
                        value={editingDept.label}
                        onChange={(e) => setEditingDept({ ...editingDept, label: e.target.value })}
                        className="w-full rounded border border-zinc-200 px-2 py-1 text-[13px]"
                      />
                    ) : (
                      <span className="font-semibold text-[#1d1d1f]">{d.label}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-zinc-500">{d.id}</td>
                  <td className="px-4 py-3 text-zinc-600">{deptCounts[d.id] ?? 0}</td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <div className="flex flex-wrap gap-1">
                        {editingDept?.id === d.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (updateDept(d.id, editingDept.label)) {
                                  recordAudit({
                                    category: 'org',
                                    action: 'dept.update',
                                    module: 'org',
                                    detail: `重命名部门 ${d.id} →「${editingDept.label.trim()}」`,
                                  });
                                  setEditingDept(null);
                                }
                              }}
                              className="rounded border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                            >
                              保存
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDept(null)}
                              className="rounded border border-zinc-200 px-2 py-0.5 text-[10px] text-zinc-600"
                            >
                              取消
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingDept({ id: d.id, label: d.label })}
                              className="rounded border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-600"
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const count = deptCounts[d.id] ?? 0;
                                if (count > 0) {
                                  removeDept(d.id, count);
                                  return;
                                }
                                if (!window.confirm(`确定删除部门「${d.label}」？`)) return;
                                if (removeDept(d.id, 0)) {
                                  recordAudit({
                                    category: 'org',
                                    action: 'dept.delete',
                                    module: 'org',
                                    detail: `删除部门「${d.label}」(${d.id})`,
                                  });
                                }
                              }}
                              className="rounded border border-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600"
                            >
                              删除
                            </button>
                          </>
                        )}
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

      <Section title="一线区域">
        <p className="mb-3 text-[12px] text-[#6e6e73]">
          区域与租户解耦，仅作归属标签；一线人员建议必填，机关可空。
        </p>
        {canManage ? (
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              value={newRegion}
              onChange={(e) => setNewRegion(e.target.value)}
              placeholder="新区域名称，如 北美"
              className="min-w-[180px] flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                if (addRegion(newRegion)) {
                  recordAudit({
                    category: 'org',
                    action: 'region.create',
                    module: 'org',
                    detail: `新增区域「${newRegion.trim()}」`,
                  });
                  setNewRegion('');
                }
              }}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-[12px] font-semibold text-white"
            >
              新增区域
            </button>
          </div>
        ) : null}
        <div className="overflow-hidden rounded-xl border border-black/[0.06]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/[0.06] bg-[#fafafa] text-[11px] font-bold uppercase text-[#86868b]">
              <tr>
                <th className="px-4 py-3">区域</th>
                <th className="px-4 py-3">编码</th>
                <th className="px-4 py-3">成员数</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {regions.map((r) => (
                <tr key={r.id} className="border-b border-black/[0.05] last:border-0">
                  <td className="px-4 py-3">
                    {editingRegion?.id === r.id ? (
                      <input
                        value={editingRegion.label}
                        onChange={(e) =>
                          setEditingRegion({ ...editingRegion, label: e.target.value })
                        }
                        className="w-full rounded border border-zinc-200 px-2 py-1 text-[13px]"
                      />
                    ) : (
                      <span className="font-semibold text-[#1d1d1f]">{r.label}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-zinc-500">{r.id}</td>
                  <td className="px-4 py-3 text-zinc-600">{regionCounts[r.id] ?? 0}</td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <div className="flex flex-wrap gap-1">
                        {editingRegion?.id === r.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (updateRegion(r.id, editingRegion.label)) {
                                  recordAudit({
                                    category: 'org',
                                    action: 'region.update',
                                    module: 'org',
                                    detail: `重命名区域 ${r.id} →「${editingRegion.label.trim()}」`,
                                  });
                                  setEditingRegion(null);
                                }
                              }}
                              className="rounded border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                            >
                              保存
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRegion(null)}
                              className="rounded border border-zinc-200 px-2 py-0.5 text-[10px] text-zinc-600"
                            >
                              取消
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingRegion({ id: r.id, label: r.label })}
                              className="rounded border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-600"
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const count = regionCounts[r.id] ?? 0;
                                if (count > 0) {
                                  removeRegion(r.id, count);
                                  return;
                                }
                                if (!window.confirm(`确定删除区域「${r.label}」？`)) return;
                                if (removeRegion(r.id, 0)) {
                                  recordAudit({
                                    category: 'org',
                                    action: 'region.delete',
                                    module: 'org',
                                    detail: `删除区域「${r.label}」(${r.id})`,
                                  });
                                }
                              }}
                              className="rounded border border-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600"
                            >
                              删除
                            </button>
                          </>
                        )}
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

      {canManage ? (
        <button
          type="button"
          onClick={() => {
            if (!window.confirm('恢复默认部门与区域字典？自定义项将被覆盖。')) return;
            resetDefaults();
            recordAudit({
              category: 'org',
              action: 'taxonomy.reset',
              module: 'org',
              detail: '恢复默认部门与区域字典',
            });
          }}
          className="text-[11px] font-medium text-zinc-500 underline-offset-2 hover:underline"
        >
          恢复默认字典
        </button>
      ) : null}
    </div>
  );
}

function RolesAndRbacPanel({ workspace }: { workspace: Workspace }) {
  const modules = Object.keys(MODULE_LABELS) as ResourceModule[];
  const matrix = getRbacMatrix(workspace.id);

  return (
    <div className="space-y-6">
      <Section title={`角色权限 · ${workspace.name}`}>
        <p className="mb-4 text-xs leading-relaxed text-[#86868b]">
          看懂这一表即可：改谁的权限 → 去「成员」改角色。Admin=完全控制 · Write=编辑 · Execute=运行 ·
          R=只读 · —=无。平台运营为系统预置，不可通过邀请创建。
        </p>
        <div className="overflow-x-auto rounded-xl border border-black/[0.06]">
          <table className="w-full min-w-[780px] text-center text-xs">
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
                    <span
                      className={cn(
                        'mb-1 inline-block rounded border px-2 py-0.5 text-[11px] font-bold',
                        getRoleBadgeClass(role),
                      )}
                    >
                      {ROLE_LABELS[role]}
                    </span>
                    <p className="mt-1 max-w-[220px] text-[10px] leading-relaxed text-[#86868b]">
                      {ROLE_DESCRIPTIONS[role]}
                    </p>
                  </td>
                  {modules.map((mod) => {
                    const level = matrix[role][mod];
                    return (
                      <td key={mod} className="px-2 py-3">
                        <span
                          className={cn(
                            'inline-block rounded px-2 py-1 font-bold',
                            PERMISSION_CLASSES[level],
                          )}
                        >
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
  const logs = useAuditStore((s) => s.logs);
  const filter = useAuditStore((s) => s.filter);
  const setFilter = useAuditStore((s) => s.setFilter);
  const clearLogs = useAuditStore((s) => s.clearLogs);
  const depts = useOrgTaxonomyStore((s) => s.depts);
  const regions = useOrgTaxonomyStore((s) => s.regions);
  const currentUser = useSessionStore((s) => s.user);
  const canManage = currentUser?.platformRole === 'super_admin';

  const [deptId, setDeptId] = useState<DeptId | ''>('');
  const [regionId, setRegionId] = useState<RegionId | '' | '__hq__'>('');
  const [accountQuery, setAccountQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const query: AuditLogQuery = useMemo(
    () => ({
      category: filter,
      deptId,
      regionId,
      accountQuery,
    }),
    [filter, deptId, regionId, accountQuery],
  );

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (l.workspaceId && l.workspaceId !== workspace.id) return false;
      return matchAuditLog(l, query);
    });
  }, [logs, query, workspace.id]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((l) => selectedIds.has(l.id));

  const selectedLogs = useMemo(
    () => filtered.filter((l) => selectedIds.has(l.id)),
    [filtered, selectedIds],
  );

  const filters: Array<AuditCategory | 'all'> = [
    'all',
    'auth',
    'browse',
    'task',
    'model',
    'members',
    'org',
    'asset',
  ];

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((l) => next.delete(l.id));
        return next;
      });
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filtered.forEach((l) => next.add(l.id));
      return next;
    });
  };

  const exportLogs = (mode: 'filtered' | 'selected') => {
    const payload = mode === 'selected' ? selectedLogs : filtered;
    if (!payload.length) {
      window.alert(mode === 'selected' ? '请先勾选要导出的日志' : '当前筛选结果为空');
      return;
    }
    downloadAuditLogsExcel(payload, {
      query,
      workspaceName: workspace.name,
    });
    recordAudit({
      category: 'org',
      action: 'audit.export',
      module: 'audit',
      detail: `导出审计日志 ${payload.length} 条（${mode === 'selected' ? '勾选' : '当前筛选'}）`,
      workspaceId: workspace.id,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Section title={`审计日志 · ${workspace.name}`}>
        <p className="mb-3 text-[12px] text-[#6e6e73]">
          支持按类别、领域（部门）、区域与账号搜索；可勾选批量导出 Excel，用于权限使用审计回溯。
        </p>

        <div className="mb-3 grid gap-2 rounded-xl border border-zinc-200 bg-white p-3 sm:grid-cols-3">
          <label className="text-[11px] font-semibold text-zinc-500">
            领域（部门）
            <select
              value={deptId}
              onChange={(e) => setDeptId(e.target.value as DeptId | '')}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-[12px] font-medium text-zinc-800"
            >
              <option value="">全部领域</option>
              {depts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-semibold text-zinc-500">
            区域
            <select
              value={regionId}
              onChange={(e) => setRegionId(e.target.value as RegionId | '' | '__hq__')}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-[12px] font-medium text-zinc-800"
            >
              <option value="">全部区域</option>
              <option value="__hq__">机关 / 未挂区域</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-semibold text-zinc-500">
            账号（姓名 / 邮箱）
            <input
              value={accountQuery}
              onChange={(e) => setAccountQuery(e.target.value)}
              placeholder="如 Dickson 或 @huawei.com"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-[12px] font-medium text-zinc-800"
            />
          </label>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {filters.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-medium',
                filter === key
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50',
              )}
            >
              {key === 'all' ? '全部' : AUDIT_CATEGORY_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAllFiltered}
              className="accent-claw-600"
            />
            全选当前结果（{filtered.length}）
          </label>
          <span className="text-[11px] text-zinc-400">已勾选 {selectedLogs.length}</span>
          <button
            type="button"
            onClick={() => exportLogs('filtered')}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            <i className="fa-solid fa-file-excel mr-1 text-emerald-600" />
            导出当前结果
          </button>
          <button
            type="button"
            onClick={() => exportLogs('selected')}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-zinc-800"
          >
            批量导出勾选
          </button>
          {canManage ? (
            <button
              type="button"
              onClick={() => {
                if (!window.confirm('清空本机审计日志？')) return;
                clearLogs();
                setSelectedIds(new Set());
              }}
              className="ml-auto text-[11px] text-zinc-400 underline-offset-2 hover:underline"
            >
              清空日志
            </button>
          ) : null}
        </div>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-[12px] text-zinc-400">
              暂无符合条件的审计记录
            </p>
          ) : (
            filtered.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-start gap-3 rounded-lg border border-black/[0.06] bg-white px-4 py-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(log.id)}
                  onChange={() => toggleSelect(log.id)}
                  className="mt-1 accent-claw-600"
                  aria-label={`选择 ${log.id}`}
                />
                <span className="shrink-0 font-mono text-[11px] text-[#aeaeb2]">
                  {formatAuditTime(log.at)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-[#424245]">{log.userName}</span>
                    {log.userEmail ? (
                      <span className="text-[11px] text-zinc-400">{log.userEmail}</span>
                    ) : null}
                    {log.role ? (
                      <span
                        className={cn(
                          'rounded border px-1.5 py-0.5 text-[10px] font-bold',
                          getRoleBadgeClass(log.role),
                        )}
                      >
                        {ROLE_LABELS[log.role]}
                      </span>
                    ) : null}
              <span className="rounded bg-black/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase text-[#86868b]">
                      {AUDIT_CATEGORY_LABELS[log.category]}
              </span>
                    {(log.deptIds?.length || log.regionId !== undefined) && (
                      <span className="rounded border border-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
                        {(log.deptIds ?? []).map(getDeptLabel).join('·') || '未指定领域'}
                        {' · '}
                        {log.regionId ? getRegionLabel(log.regionId) : '机关'}
                      </span>
                    )}
            </div>
                  <p className="mt-0.5 text-[13px] text-[#6e6e73]">{log.detail}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                    {log.action} · {log.module}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Section>
    </div>
  );
}

function formatAuditTime(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-bold text-[#1d1d1f]">{title}</h3>
      {children}
    </section>
  );
}

/** 供浏览审计使用：视图中文名 */
export function auditViewLabel(view: string): string {
  try {
    return getNavMetaLabel(view as never) || view;
  } catch {
    return view;
  }
}
