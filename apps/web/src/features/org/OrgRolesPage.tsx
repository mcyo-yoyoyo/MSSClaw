import { useEffect, useMemo, useState } from 'react';
import { CenterModal, CenterPageHeader } from '@/components/center/CenterShell';
import { FormField, FormInput, FormTextarea, ModalActions } from '@/components/center/CenterFormFields';
import { orgAdminApi, type OrgMenu, type OrgRole } from '@/api/orgAdminApi';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores/sessionStore';
import { btn, ErrorBanner, errorText, notify, Pill, ReadOnlyHint, useOrgEditable } from './orgShared';

const SUPER_ADMIN = 'super_admin';
const DEFAULT_ROLE = 'member';
/** 有其中任一分组的菜单，顶栏才出现「管理后台」 */
const ADMIN_GROUPS = new Set(['group-platform', 'group-ops', 'group-system', 'group-org']);

interface Grants {
  view: Set<string>;
  edit: Set<string>;
}

const grantsOf = (role: OrgRole): Grants => ({ view: new Set(role.menuIds), edit: new Set(role.editMenuIds) });
const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((id) => b.has(id));

export function OrgRolesPage() {
  const editable = useOrgEditable('org-roles');
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [menus, setMenus] = useState<OrgMenu[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [grants, setGrants] = useState<Grants>({ view: new Set(), edit: new Set() });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState<{ copyFrom: OrgRole | null } | null>(null);

  const selected = roles.find((r) => r.id === selectedId) ?? null;

  const reload = async (keepId?: string) => {
    setError(null);
    try {
      const [nextRoles, nextMenus] = await Promise.all([orgAdminApi.listRoles(), orgAdminApi.listMenus()]);
      setRoles(nextRoles);
      setMenus(nextMenus);
      const target = nextRoles.find((r) => r.id === (keepId ?? selectedId)) ?? nextRoles.find((r) => r.id !== SUPER_ADMIN) ?? nextRoles[0];
      select(target ?? null);
    } catch (e) {
      setError(errorText(e));
    }
  };

  const select = (role: OrgRole | null) => {
    setSelectedId(role?.id ?? null);
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setGrants(role ? grantsOf(role) : { view: new Set(), edit: new Set() });
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 首次进入加载
  }, []);

  const groups = useMemo(
    () =>
      menus
        .filter((m) => !m.parentId)
        .map((group) => ({ group, items: menus.filter((m) => m.parentId === group.id) }))
        .filter((g) => g.items.length),
    [menus],
  );

  const isSuper = selected?.id === SUPER_ADMIN;
  const locked = !editable || isSuper;
  const dirty =
    selected !== null &&
    !isSuper &&
    (name.trim() !== selected.name ||
      (description.trim() || null) !== (selected.description ?? null) ||
      !sameSet(grants.view, new Set(selected.menuIds)) ||
      !sameSet(grants.edit, new Set(selected.editMenuIds)));

  const hasAdmin = groups.some((g) => ADMIN_GROUPS.has(g.group.id) && g.items.some((m) => grants.view.has(m.id)));

  const toggle = (ids: string[], kind: 'view' | 'edit', on: boolean) => {
    setGrants((prev) => {
      const view = new Set(prev.view);
      const edit = new Set(prev.edit);
      for (const id of ids) {
        if (kind === 'view') {
          if (on) {
            view.add(id);
            edit.add(id);
          } else {
            view.delete(id);
            edit.delete(id);
          }
        } else if (on) {
          view.add(id);
          edit.add(id);
        } else {
          edit.delete(id);
        }
      }
      return { view, edit };
    });
  };

  const save = async () => {
    if (!selected) return;
    if (!name.trim()) {
      notify('角色名称不能为空');
      return;
    }
    setSaving(true);
    try {
      if (name.trim() !== selected.name || (description.trim() || null) !== (selected.description ?? null)) {
        await orgAdminApi.updateRole(selected.id, { name: name.trim(), description: description.trim() || null });
      }
      await orgAdminApi.setRoleMenus(selected.id, [...grants.view], [...grants.edit]);
      notify('角色已保存，成员下次打开页面时生效');
      await reload(selected.id);
      if (useSessionStore.getState().user?.roleId === selected.id) await useSessionStore.getState().hydrateFromServer();
    } catch (e) {
      notify(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected || !window.confirm(`删除角色「${selected.name}」？`)) return;
    try {
      await orgAdminApi.deleteRole(selected.id);
      notify('角色已删除');
      setSelectedId(null);
      await reload('');
    } catch (e) {
      notify(errorText(e));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto p-4 md:p-6">
      <CenterPageHeader
        title="角色"
        subtitle="角色决定成员能看到哪些菜单、能否新增修改删除。每个成员只有一个角色，新成员默认是「普通用户」。"
        actions={
          editable ? (
            <button type="button" className={btn.primary} onClick={() => setCreating({ copyFrom: null })}>
              <i className="fa-solid fa-plus mr-1.5" />
              新建角色
            </button>
          ) : null
        }
      />
      {editable ? null : <ReadOnlyHint />}
      <ErrorBanner message={error} />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="space-y-1">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => select(role)}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition',
                role.id === selectedId ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white hover:border-zinc-300',
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold">{role.name}</span>
                <span className={cn('block truncate text-[11px]', role.id === selectedId ? 'text-zinc-300' : 'text-zinc-400')}>
                  {role.id === SUPER_ADMIN ? '全部菜单' : `${role.menuIds.length} 个菜单`} · {role.memberCount} 人
                </span>
              </span>
              {role.id === DEFAULT_ROLE ? <Pill tone="green">默认</Pill> : role.isSystem ? <Pill>内置</Pill> : null}
            </button>
          ))}
        </aside>

        {selected ? (
          <section className="min-w-0 rounded-xl border border-zinc-200 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 p-4">
              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                <FormField label="角色名称">
                  <FormInput value={name} onChange={(e) => setName(e.target.value)} disabled={locked} />
                </FormField>
                <FormField label="说明">
                  <FormTextarea rows={1} value={description} onChange={(e) => setDescription(e.target.value)} disabled={locked} />
                </FormField>
                <p className="text-[11px] text-zinc-400 sm:col-span-2">
                  编号 {selected.id} · {selected.memberCount} 名成员
                  {isSuper ? ' · 超级管理员拥有全部菜单，不能修改' : hasAdmin ? ' · 有管理后台菜单，顶栏会显示「管理后台」' : ' · 没有管理后台菜单'}
                </p>
              </div>
              {editable ? (
                <div className="flex shrink-0 items-center gap-2">
                  {isSuper ? null : (
                    <button type="button" className={btn.secondary} onClick={() => setCreating({ copyFrom: selected })}>
                      复制
                    </button>
                  )}
                  <button type="button" className={btn.secondary} onClick={() => void remove()}>
                    删除
                  </button>
                  {isSuper ? null : (
                    <button type="button" className={btn.primary} disabled={!dirty || saving} onClick={() => void save()}>
                      {saving ? '保存中…' : '保存'}
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            <div className="divide-y divide-zinc-100">
              {groups.map(({ group, items }) => {
                const assignable = items.filter((m) => !m.fixed).map((m) => m.id);
                const allView = assignable.every((id) => (isSuper ? true : grants.view.has(id)));
                const allEdit = assignable.every((id) => (isSuper ? true : grants.edit.has(id)));
                return (
                  <div key={group.id} className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="flex items-center gap-2 text-[13px] font-semibold text-zinc-900">
                        {group.icon ? <i className={cn('fa-solid text-[12px] text-zinc-400', group.icon)} /> : null}
                        {group.name}
                        {ADMIN_GROUPS.has(group.id) ? <span className="text-[11px] font-normal text-zinc-400">管理后台</span> : null}
                      </p>
                      <div className="flex items-center gap-4 text-[11px] text-zinc-500">
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" checked={allView} disabled={locked} onChange={(e) => toggle(assignable, 'view', e.target.checked)} />
                          全部可见
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" checked={allEdit} disabled={locked} onChange={(e) => toggle(assignable, 'edit', e.target.checked)} />
                          全部可编辑
                        </label>
                      </div>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map((menu) => {
                        const view = isSuper || menu.fixed || grants.view.has(menu.id);
                        const edit = isSuper || menu.fixed || grants.edit.has(menu.id);
                        return (
                          <div
                            key={menu.id}
                            className={cn(
                              'flex items-center justify-between gap-2 rounded-lg border px-3 py-2',
                              view ? 'border-zinc-200 bg-zinc-50/60' : 'border-dashed border-zinc-200',
                            )}
                          >
                            <span className={cn('min-w-0 truncate text-[12px]', view ? 'text-zinc-900' : 'text-zinc-400')}>
                              {menu.icon ? <i className={cn('fa-solid mr-1.5 w-3.5 text-center text-[11px] text-zinc-400', menu.icon)} /> : null}
                              {menu.name}
                              {menu.fixed ? <span className="ml-1 text-[10px] text-zinc-400">所有人</span> : null}
                            </span>
                            <span className="flex shrink-0 items-center gap-3 text-[11px] text-zinc-500">
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={view}
                                  disabled={locked || menu.fixed}
                                  onChange={(e) => toggle([menu.id], 'view', e.target.checked)}
                                />
                                可见
                              </label>
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={edit}
                                  disabled={locked || menu.fixed}
                                  onChange={(e) => toggle([menu.id], 'edit', e.target.checked)}
                                />
                                可编辑
                              </label>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <p className="text-[13px] text-zinc-400">选择左侧的角色查看菜单权限</p>
        )}
      </div>

      {creating ? (
        <CreateRoleDialog
          copyFrom={creating.copyFrom}
          onClose={() => setCreating(null)}
          onCreated={(role) => {
            setCreating(null);
            void reload(role.id);
          }}
        />
      ) : null}
    </div>
  );
}

function CreateRoleDialog({
  copyFrom,
  onClose,
  onCreated,
}: {
  copyFrom: OrgRole | null;
  onClose: () => void;
  onCreated: (role: OrgRole) => void;
}) {
  const [name, setName] = useState(copyFrom ? `${copyFrom.name}（副本）` : '');
  const [description, setDescription] = useState(copyFrom?.description ?? '');
  const submit = async () => {
    if (!name.trim()) {
      notify('请输入角色名称');
      return;
    }
    try {
      const role = await orgAdminApi.createRole({
        name: name.trim(),
        description: description.trim() || undefined,
        menuIds: copyFrom?.menuIds ?? ['home', 'ai-brief', 'market-external', 'market-internal', 'market-projects'],
        editMenuIds: copyFrom?.editMenuIds ?? ['home', 'ai-brief', 'market-external', 'market-internal', 'market-projects'],
      });
      notify(`已创建角色「${role.name}」`);
      onCreated(role);
    } catch (e) {
      notify(errorText(e));
    }
  };
  return (
    <CenterModal
      open
      title={copyFrom ? `复制角色「${copyFrom.name}」` : '新建角色'}
      onClose={onClose}
      actions={<ModalActions onCancel={onClose} onSave={() => void submit()} saveLabel="创建" cancelFirst />}
    >
      <div className="space-y-3">
        <FormField label="角色名称">
          <FormInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </FormField>
        <FormField label="说明（可选）">
          <FormTextarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        <p className="text-[12px] text-zinc-500">
          {copyFrom ? '菜单权限从原角色复制，创建后可以再调整。' : '新角色默认只有顶部五个菜单，创建后在右侧勾选更多菜单。'}
        </p>
      </div>
    </CenterModal>
  );
}
