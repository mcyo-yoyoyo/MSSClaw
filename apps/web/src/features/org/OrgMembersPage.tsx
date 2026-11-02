import { useEffect, useMemo, useRef, useState } from 'react';
import { CenterModal, CenterPageHeader, CenterSearchInput, StatCardGrid } from '@/components/center/CenterShell';
import { FormField, FormInput, FormSelect, ModalActions } from '@/components/center/CenterFormFields';
import {
  orgAdminApi,
  OrgApiError,
  type ImportRowError,
  type MemberImportRow,
  type OrgMember,
  type OrgRole,
  type OrgTaxonomy,
} from '@/api/orgAdminApi';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores/sessionStore';
import { downloadMemberTemplate, IMPORT_COLUMNS, parseMemberSheet } from './memberImportSheet';
import { btn, ErrorBanner, errorText, notify, Pill, ReadOnlyHint, useOrgEditable } from './orgShared';

const SUPER_ADMIN = 'super_admin';
const DEFAULT_ROLE = 'member';
const STATUS_LABEL: Record<OrgMember['status'], string> = { active: '已启用', invited: '待激活', suspended: '已停用' };
const STATUS_TONE = { active: 'green', invited: 'amber', suspended: 'rose' } as const;

interface Draft {
  id?: string;
  name: string;
  email: string;
  roleId: string;
  regionId: string;
  domainIds: string[];
  status: OrgMember['status'];
  password: string;
}

const emptyDraft = (): Draft => ({ name: '', email: '', roleId: DEFAULT_ROLE, regionId: '', domainIds: [], status: 'active', password: '' });

function formatTime(iso: string | null) {
  if (!iso) return '从未登录';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN', { hour12: false });
}

export function OrgMembersPage() {
  const editable = useOrgEditable('org-members');
  const me = useSessionStore((s) => s.user);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [taxonomy, setTaxonomy] = useState<OrgTaxonomy>({ regions: [], domains: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [passwordFor, setPasswordFor] = useState<OrgMember | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextMembers, nextRoles, nextTaxonomy] = await Promise.all([
        orgAdminApi.listMembers(),
        orgAdminApi.listRoles(),
        orgAdminApi.taxonomy(),
      ]);
      setMembers(nextMembers);
      setRoles(nextRoles);
      setTaxonomy(nextTaxonomy);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const roleName = useMemo(() => new Map(roles.map((r) => [r.id, r.name])), [roles]);
  const regionName = useMemo(() => new Map(taxonomy.regions.map((r) => [r.id, r.name])), [taxonomy.regions]);
  const domainName = useMemo(() => new Map(taxonomy.domains.map((d) => [d.id, d.name])), [taxonomy.domains]);
  const assignableRoles = roles.filter((r) => r.id !== SUPER_ADMIN);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter(
      (m) =>
        (!q || m.name.toLowerCase().includes(q) || m.email.includes(q)) &&
        (!roleFilter || m.roleId === roleFilter) &&
        (!statusFilter || m.status === statusFilter),
    );
  }, [members, query, roleFilter, statusFilter]);

  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      notify(done);
      await reload();
      return true;
    } catch (e) {
      notify(errorText(e));
      return false;
    }
  };

  const save = async () => {
    if (!draft) return;
    const body = {
      name: draft.name.trim(),
      email: draft.email.trim(),
      roleId: draft.roleId,
      regionId: draft.regionId || null,
      domainIds: draft.domainIds.slice(0, 1),
      status: draft.status,
    };
    const editingSelf = Boolean(draft.id && draft.id === me?.id);
    const ok = draft.id
      ? await run(
          () => orgAdminApi.updateMember(draft.id!, draft.roleId === SUPER_ADMIN ? { ...body, roleId: undefined } : body),
          editingSelf ? '资料已更新，请重新登录' : '成员已更新，对方需要重新登录',
        )
      : await run(() => orgAdminApi.createMember({ ...body, password: draft.password || undefined }), '成员已创建');
    if (!ok) return;
    setDraft(null);
    if (editingSelf) void useSessionStore.getState().logout();
  };

  const remove = (m: OrgMember) => {
    if (!window.confirm(`删除成员「${m.name}」？删除后该账号无法登录，收藏等个人数据一并清除。`)) return;
    void run(() => orgAdminApi.deleteMember(m.id), '成员已删除');
  };

  const stats: [string, number][] = [
    ['成员', members.length],
    ['已启用', members.filter((m) => m.status === 'active').length],
    ['已停用', members.filter((m) => m.status === 'suspended').length],
    ['设了密码', members.filter((m) => m.hasPassword).length],
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto p-4 md:p-6">
      <CenterPageHeader
        title="成员"
        subtitle="管理登录账号、角色和所属区域 / 领域；区域和领域决定 AI工具Hub 里能看到哪些 Agent、Skill。"
        actions={
          <>
            <button type="button" className={btn.secondary} onClick={() => void reload()} disabled={loading}>
              {loading ? '刷新中…' : '刷新'}
            </button>
            {editable ? (
              <>
                <button
                  type="button"
                  className={btn.secondary}
                  onClick={() => downloadMemberTemplate({ regions: taxonomy.regions, domains: taxonomy.domains })}
                >
                  <i className="fa-solid fa-file-arrow-down mr-1.5" />
                  下载模板
                </button>
                <button type="button" className={btn.secondary} onClick={() => setImportOpen(true)}>
                  <i className="fa-solid fa-file-import mr-1.5" />
                  批量导入
                </button>
                <button type="button" className={btn.primary} onClick={() => setDraft(emptyDraft())}>
                  <i className="fa-solid fa-plus mr-1.5" />
                  新建成员
                </button>
              </>
            ) : null}
          </>
        }
      />
      {editable ? null : <ReadOnlyHint />}
      <ErrorBanner message={error} />
      <StatCardGrid items={stats} columns="four" />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <CenterSearchInput value={query} onChange={setQuery} placeholder="搜索姓名或邮箱" className="w-56" />
        <select className="apple-input w-40" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="按角色筛选">
          <option value="">全部角色</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select className="apple-input w-32" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="按状态筛选">
          <option value="">全部状态</option>
          {Object.entries(STATUS_LABEL).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <span className="text-[12px] text-zinc-400">共 {visible.length} 人</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[880px] text-left text-[13px]">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-[11px] text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">成员</th>
              <th className="px-3 py-2 font-medium">角色</th>
              <th className="px-3 py-2 font-medium">区域</th>
              <th className="px-3 py-2 font-medium">领域</th>
              <th className="px-3 py-2 font-medium">状态</th>
              <th className="px-3 py-2 font-medium">最近登录</th>
              {editable ? <th className="px-3 py-2 text-right font-medium">操作</th> : null}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-zinc-400">
                  没有符合条件的成员
                </td>
              </tr>
            ) : null}
            {visible.map((m) => {
              const isSuper = m.roleId === SUPER_ADMIN;
              const isSelf = m.id === me?.id;
              return (
                <tr key={m.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white', m.avatar)}>
                        {(m.name.trim()[0] ?? '?').toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-900">
                          {m.name}
                          {isSelf ? <span className="ml-1 text-[11px] font-normal text-zinc-400">（我）</span> : null}
                        </p>
                        <p className="truncate text-[11px] text-zinc-500">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Pill tone={isSuper ? 'blue' : 'zinc'}>{roleName.get(m.roleId) ?? m.roleId}</Pill>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-700">{m.regionId ? regionName.get(m.regionId) ?? m.regionId : <span className="text-zinc-400">—</span>}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex max-w-[16rem] flex-wrap gap-1">
                      {m.domainIds.length ? (
                        m.domainIds.map((id) => <Pill key={id}>{domainName.get(id) ?? id}</Pill>)
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Pill tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Pill>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-zinc-500">{formatTime(m.lastLoginAt)}</td>
                  {editable ? (
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          className={btn.link}
                          onClick={() =>
                            setDraft({
                              id: m.id,
                              name: m.name,
                              email: m.email,
                              roleId: m.roleId,
                              regionId: m.regionId ?? '',
                              domainIds: m.domainIds.slice(0, 1),
                              status: m.status,
                              password: '',
                            })
                          }
                        >
                          编辑
                        </button>
                        <button type="button" className={btn.link} onClick={() => setPasswordFor(m)}>
                          密码
                        </button>
                        <button type="button" className={btn.danger} disabled={isSuper || isSelf} onClick={() => remove(m)}>
                          删除
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {draft ? (
        <MemberEditor
          draft={draft}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSave={() => void save()}
          roles={assignableRoles}
          taxonomy={taxonomy}
          isSelf={draft.id === me?.id}
        />
      ) : null}
      {passwordFor ? (
        <PasswordDialog member={passwordFor} onClose={() => setPasswordFor(null)} onDone={() => void reload()} />
      ) : null}
      {importOpen ? (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setImportOpen(false);
            void reload();
          }}
        />
      ) : null}
    </div>
  );
}

function MemberEditor({
  draft,
  onChange,
  onClose,
  onSave,
  roles,
  taxonomy,
  isSelf,
}: {
  draft: Draft;
  onChange: (draft: Draft) => void;
  onClose: () => void;
  onSave: () => void;
  roles: OrgRole[];
  taxonomy: OrgTaxonomy;
  isSelf: boolean;
}) {
  const isSuper = draft.roleId === SUPER_ADMIN;
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  const domainId = draft.domainIds[0] ?? '';

  return (
    <CenterModal
      open
      size="lg"
      title={draft.id ? '编辑成员' : '新建成员'}
      onClose={onClose}
      actions={<ModalActions onCancel={onClose} onSave={onSave} saveLabel={draft.id ? '保存' : '创建'} cancelFirst />}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="姓名">
          <FormInput value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="张三" autoFocus />
        </FormField>
        <FormField label="邮箱（登录账号）">
          <FormInput value={draft.email} onChange={(e) => set({ email: e.target.value })} placeholder="zhangsan@huawei.com" />
        </FormField>
        <FormField label="角色" hint={isSuper ? '超级管理员的角色不能在这里修改' : undefined}>
          <FormSelect value={draft.roleId} onChange={(e) => set({ roleId: e.target.value })} disabled={isSuper}>
            {isSuper ? <option value={SUPER_ADMIN}>超级管理员</option> : null}
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="状态">
          <FormSelect
            value={draft.status}
            onChange={(e) => set({ status: e.target.value as Draft['status'] })}
            disabled={isSuper || isSelf}
          >
            {Object.entries(STATUS_LABEL).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="区域">
          <FormSelect value={draft.regionId} onChange={(e) => set({ regionId: e.target.value })}>
            <option value="">不设置</option>
            {taxonomy.regions.map((r) => (
              <option key={r.id} value={r.id} disabled={!r.enabled && r.id !== draft.regionId}>
                {r.name}
                {r.enabled ? '' : '（已停用）'}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="领域">
          <FormSelect value={domainId} onChange={(e) => set({ domainIds: e.target.value ? [e.target.value] : [] })}>
            <option value="">不设置</option>
            {taxonomy.domains.map((d) => (
              <option key={d.id} value={d.id} disabled={!d.enabled && d.id !== domainId}>
                {d.name}
                {d.enabled ? '' : '（已停用）'}
              </option>
            ))}
          </FormSelect>
        </FormField>
        {draft.id ? null : (
          <FormField label="初始密码（可选）" hint="至少 8 位；不填则只能用统一身份登录">
            <FormInput type="password" value={draft.password} onChange={(e) => set({ password: e.target.value })} autoComplete="new-password" />
          </FormField>
        )}
      </div>
    </CenterModal>
  );
}

function PasswordDialog({ member, onClose, onDone }: { member: OrgMember; onClose: () => void; onDone: () => void }) {
  const me = useSessionStore((s) => s.user);
  const [password, setPassword] = useState('');
  const submit = async (action: 'set' | 'clear') => {
    try {
      if (action === 'set') await orgAdminApi.setPassword(member.id, password);
      else await orgAdminApi.clearPassword(member.id);
      const editingSelf = member.id === me?.id;
      notify(
        editingSelf
          ? '密码已更新，请重新登录'
          : action === 'set'
            ? '密码已更新，对方需要重新登录'
            : '已清除密码，对方需要重新登录',
      );
      onDone();
      onClose();
      if (editingSelf) void useSessionStore.getState().logout();
    } catch (e) {
      notify(errorText(e));
    }
  };
  return (
    <CenterModal
      open
      title={`「${member.name}」的登录密码`}
      onClose={onClose}
      actions={
        <>
          {member.hasPassword && member.roleId !== SUPER_ADMIN ? (
            <button type="button" className={cn(btn.danger, 'mr-auto')} onClick={() => void submit('clear')}>
              清除密码
            </button>
          ) : null}
          <ModalActions onCancel={onClose} onSave={() => void submit('set')} saveLabel="设置新密码" cancelFirst />
        </>
      }
    >
      <p className="mb-3 text-[12px] text-zinc-500">
        {member.hasPassword ? '当前已设置密码。' : '当前没有设置密码。'}保存后该成员的现有登录会失效，需要重新登录。
      </p>
      <FormField label="新密码" hint="至少 8 位">
        <FormInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
      </FormField>
    </CenterModal>
  );
}

function ImportDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<MemberImportRow[]>([]);
  const [rowErrors, setRowErrors] = useState<ImportRowError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const errorsByRow = useMemo(() => {
    const map = new Map<number, ImportRowError[]>();
    for (const e of rowErrors) map.set(e.row, [...(map.get(e.row) ?? []), e]);
    return map;
  }, [rowErrors]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setRowErrors([]);
    const parsed = await parseMemberSheet(file);
    if (!parsed.ok) {
      setRows([]);
      setMessage(parsed.error);
      return;
    }
    setRows(parsed.rows);
    setMessage(null);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const result = await orgAdminApi.importMembers(rows);
      notify(`导入完成：新增 ${result.created} 人，更新 ${result.updated} 人`);
      onImported();
    } catch (e) {
      if (e instanceof OrgApiError && e.rowErrors.length) {
        setRowErrors(e.rowErrors);
        setMessage(`有 ${new Set(e.rowErrors.map((r) => r.row)).size} 行有问题，整批未导入。改好表格后重新选择文件。`);
      } else {
        setMessage(errorText(e));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <CenterModal
      open
      size="xl"
      fitContent
      title="批量导入成员"
      onClose={onClose}
      actions={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            取消
          </button>
          <button type="button" className={btn.primary} disabled={!rows.length || busy} onClick={() => void submit()}>
            {busy ? '导入中…' : `导入 ${rows.length} 行`}
          </button>
        </>
      }
    >
      <div className="space-y-3 p-5">
        <p className="text-[12px] leading-relaxed text-zinc-500">
          用「下载模板」得到的表格填写。区域和领域只能从下拉选择当前系统里的名称。邮箱已存在的按更新处理，空单元格保留原值。新成员不填密码时，初始密码为邮箱加 123456。任何一行有错整批都不导入。
        </p>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              void pick(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button type="button" className={btn.secondary} onClick={() => fileRef.current?.click()}>
            <i className="fa-solid fa-paperclip mr-1.5" />
            {fileName ? '重新选择文件' : '选择文件'}
          </button>
          {fileName ? <span className="truncate text-[12px] text-zinc-600">{fileName}</span> : null}
        </div>
        <ErrorBanner message={message} />
        {rows.length ? (
          <div className="max-h-[50vh] overflow-auto rounded-lg border border-zinc-200">
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 bg-zinc-50 text-[11px] text-zinc-500">
                <tr>
                  <th className="px-2 py-1.5 font-medium">行</th>
                  {IMPORT_COLUMNS.map((c) => (
                    <th key={c.key} className="px-2 py-1.5 font-medium">
                      {c.header}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 font-medium">问题</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const errs = errorsByRow.get(row.row) ?? [];
                  const bad = new Set(errs.map((e) => e.field));
                  return (
                    <tr key={row.row} className={cn('border-t border-zinc-100', errs.length && 'bg-rose-50/60')}>
                      <td className="px-2 py-1.5 tabular-nums text-zinc-400">{row.row}</td>
                      {IMPORT_COLUMNS.map((c) => (
                        <td key={c.key} className={cn('px-2 py-1.5 text-zinc-700', bad.has(c.key) && 'font-medium text-rose-700')}>
                          {row[c.key]}
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-rose-700">{errs.map((e) => e.message).join('；')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </CenterModal>
  );
}
