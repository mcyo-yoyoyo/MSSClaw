import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CenterPageHeader } from '@/components/center/CenterShell';
import { isSystemAdmin } from '@/domain/currentUser';
import { HQ_DEPTS, REGIONS } from '@/domain/orgTaxonomy';
import { ROLE_LABELS } from '@/domain/rbac';
import { WORKSPACE_LOCALE_LABELS } from '@/domain/workspaceConfig';
import type { WorkspaceLocale } from '@/domain/workspaceLocale';
import { useAppViewStore } from '@/stores/appViewStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useWorkspaceConfigStore } from '@/stores/workspaceConfigStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const LOCALES: WorkspaceLocale[] = ['zh-CN', 'en', 'es'];
const inputClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10';

export function WorkspaceConfigPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNamespace, setNewNamespace] = useState('');
  const [newLocale, setNewLocale] = useState<WorkspaceLocale>('zh-CN');
  const [newDescription, setNewDescription] = useState('');

  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const defaultWorkspaceId = useWorkspaceConfigStore((s) => s.defaultWorkspaceId);
  const items = useWorkspaceConfigStore((s) => s.items);
  const setDefaultWorkspaceId = useWorkspaceConfigStore((s) => s.setDefaultWorkspaceId);
  const setEnabled = useWorkspaceConfigStore((s) => s.setEnabled);
  const updateWorkspace = useWorkspaceConfigStore((s) => s.updateWorkspace);
  const moveWorkspace = useWorkspaceConfigStore((s) => s.moveWorkspace);
  const addTenant = useWorkspaceConfigStore((s) => s.addTenant);
  const removeTenant = useWorkspaceConfigStore((s) => s.removeTenant);
  const resetToDefaults = useWorkspaceConfigStore((s) => s.resetToDefaults);
  const exportConfig = useWorkspaceConfigStore((s) => s.exportConfig);
  const importConfig = useWorkspaceConfigStore((s) => s.importConfig);
  const setAppView = useAppViewStore((s) => s.setAppView);

  const notify = (msg: string) => useConversationStore.setState({ pushToast: msg });
  const configs = useMemo(
    () => [...items].sort((a, b) => a.sortOrder - b.sortOrder),
    [items],
  );
  const enabledCount = configs.filter((c) => c.enabled).length;

  if (!isSystemAdmin()) {
    return (
      <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
            <i className="fa-solid fa-lock text-xl" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900">无权访问组织与租户</h2>
          <p className="mt-2 text-[13px] text-zinc-500">仅系统管理员（Super Admin）可添加、删除与管理租户及组织架构。</p>
          <button
            type="button"
            onClick={() => setAppView('home')}
            className="apple-btn-secondary mt-6 rounded-lg px-4 py-2 text-[12px] font-semibold"
          >
            返回智能助理
          </button>
        </div>
      </div>
    );
  }

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importConfig(String(reader.result ?? ''));
      notify(ok ? '租户配置已导入' : '导入失败，请检查 JSON 格式');
    };
    reader.readAsText(file);
  };

  const handleAdd = () => {
    const id = addTenant({
      name: newName,
      namespace: newNamespace || undefined,
      description: newDescription || undefined,
      locale: newLocale,
    });
    if (!id) {
      notify('请填写租户名称');
      return;
    }
    notify(`已添加租户「${newName.trim()}」`);
    setNewName('');
    setNewNamespace('');
    setNewDescription('');
    setNewLocale('zh-CN');
    setShowAdd(false);
  };

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl">
        <CenterPageHeader
          title="组织与租户"
          subtitle="租户生命周期 · 组织双轴（部门 × 区域）· 语言与顶栏可见性"
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowAdd((v) => !v)}
                className="apple-btn-primary rounded-lg px-3 py-2 text-[12px] font-semibold"
              >
                <i className="fa-solid fa-plus mr-1.5 text-[10px]" />
                添加租户
              </button>
              <button
                type="button"
                onClick={() => {
                  resetToDefaults();
                  notify('已恢复默认租户配置');
                }}
                className="apple-btn-secondary rounded-lg px-3 py-2 text-[12px] font-semibold"
              >
                恢复默认
              </button>
            </div>
          }
        />

        {showAdd && (
          <div className="mb-5 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-[13px] font-semibold text-zinc-900">新建租户</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="租户名称 *">
                <input
                  type="text"
                  value={newName}
                  placeholder="例如：欧洲区营销"
                  onChange={(e) => setNewName(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Namespace（可选）">
                <input
                  type="text"
                  value={newNamespace}
                  placeholder="自动生成"
                  onChange={(e) => setNewNamespace(e.target.value)}
                  className={cn(inputClass, 'font-mono text-[12px]')}
                />
              </Field>
              <Field label="语言标签">
                <select
                  value={newLocale}
                  onChange={(e) => setNewLocale(e.target.value as WorkspaceLocale)}
                  className={inputClass}
                >
                  {LOCALES.map((loc) => (
                    <option key={loc} value={loc}>
                      {WORKSPACE_LOCALE_LABELS[loc]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="描述" className="sm:col-span-2">
                <textarea
                  value={newDescription}
                  rows={2}
                  placeholder="可选"
                  onChange={(e) => setNewDescription(e.target.value)}
                  className={cn(inputClass, 'resize-none')}
                />
              </Field>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="apple-btn-secondary rounded-lg px-3 py-2 text-[12px] font-semibold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAdd}
                className="apple-btn-primary rounded-lg px-3 py-2 text-[12px] font-semibold"
              >
                确认添加
              </button>
            </div>
          </div>
        )}

        <div className="mb-5 rounded-xl border border-zinc-200/80 bg-white p-4">
          <p className="text-[12px] text-zinc-600">
            顶栏可见 <span className="font-semibold text-zinc-900">{enabledCount}</span> 个租户
            <span className="mx-2 text-zinc-300">·</span>
            当前租户：
            <span className="font-semibold text-zinc-900">
              {configs.find((c) => c.id === workspaceId)?.name ?? workspaceId}
            </span>
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            自定义租户可删除；内置租户仅可隐藏。隐藏后不会出现在顶栏下拉。
          </p>
        </div>

        <section className="mb-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            组织架构（部门 × 区域）
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="apple-card p-4">
              <p className="mb-2 text-[12px] font-semibold text-zinc-800">机关部门</p>
              <div className="flex flex-wrap gap-1.5">
                {HQ_DEPTS.map((d) => (
                  <span
                    key={d.id}
                    className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-700"
                  >
                    {d.label}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-zinc-400">
                与「组织权限」共用同一套部门字典；成员归属影响场景推荐与资产可见性。
              </p>
            </div>
            <div className="apple-card p-4">
              <p className="mb-2 text-[12px] font-semibold text-zinc-800">一线区域</p>
              <div className="flex flex-wrap gap-1.5">
                {REGIONS.map((r) => (
                  <span
                    key={r.id}
                    className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-700"
                  >
                    {r.label}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-zinc-400">
                区域与租户解耦：区域是标签轴，不单独成租户。
              </p>
            </div>
          </div>
          <div className="apple-card mt-3 p-4">
            <p className="mb-2 text-[12px] font-semibold text-zinc-800">平台角色</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[]).map((role) => (
                <span
                  key={role}
                  className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700"
                >
                  {ROLE_LABELS[role]}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-zinc-400">
              角色在「组织权限」中配置；此处展示租户可挂载的角色全集。
            </p>
          </div>
        </section>

        <section className="mb-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">默认租户</h3>
          <div className="apple-card p-4">
            <label className="block text-[11px] font-medium text-zinc-500">用户首次进入或刷新时优先打开</label>
            <select
              value={defaultWorkspaceId}
              onChange={(e) => {
                setDefaultWorkspaceId(e.target.value);
                notify('默认租户已更新');
              }}
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            >
              {configs
                .filter((c) => c.enabled)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
        </section>

        <section className="mb-6">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">租户列表</h3>
          <div className="space-y-3">
            {configs.map((cfg, index) => (
              <div
                key={cfg.id}
                className={cn('apple-card overflow-hidden transition', !cfg.enabled && 'opacity-75')}
              >
                <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/80 px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                      <i className="fa-solid fa-building text-xs" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-semibold text-zinc-900">{cfg.name}</p>
                        {cfg.custom ? (
                          <span className="shrink-0 rounded bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                            自定义
                          </span>
                        ) : (
                          <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                            内置
                          </span>
                        )}
                      </div>
                      <p className="truncate font-mono text-[10px] text-zinc-400">{cfg.id}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveWorkspace(cfg.id, 'up')}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-200/60 disabled:opacity-30"
                      title="上移"
                    >
                      <i className="fa-solid fa-chevron-up text-[10px]" />
                    </button>
                    <button
                      type="button"
                      disabled={index === configs.length - 1}
                      onClick={() => moveWorkspace(cfg.id, 'down')}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-200/60 disabled:opacity-30"
                      title="下移"
                    >
                      <i className="fa-solid fa-chevron-down text-[10px]" />
                    </button>
                    {cfg.custom && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm(`确定删除租户「${cfg.name}」？此操作不可恢复。`)) return;
                          const ok = removeTenant(cfg.id);
                          notify(ok ? `已删除租户「${cfg.name}」` : '删除失败（至少保留一个租户）');
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50"
                        title="删除租户"
                      >
                        <i className="fa-solid fa-trash text-[10px]" />
                      </button>
                    )}
                    <label className="relative ml-1 inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={cfg.enabled}
                        onChange={(e) => {
                          if (!e.target.checked && enabledCount <= 1) {
                            notify('至少保留一个可见租户');
                            return;
                          }
                          setEnabled(cfg.id, e.target.checked);
                        }}
                      />
                      <span className="relative h-6 w-10 rounded-full bg-zinc-200 transition peer-checked:bg-zinc-900 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
                    </label>
                  </div>
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  <Field label="显示名称">
                    <input
                      type="text"
                      value={cfg.name}
                      onChange={(e) => updateWorkspace(cfg.id, { name: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="语言标签">
                    <select
                      value={cfg.locale}
                      onChange={(e) =>
                        updateWorkspace(cfg.id, { locale: e.target.value as WorkspaceLocale })
                      }
                      className={inputClass}
                    >
                      {LOCALES.map((loc) => (
                        <option key={loc} value={loc}>
                          {WORKSPACE_LOCALE_LABELS[loc]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Namespace">
                    <input
                      type="text"
                      value={cfg.namespace}
                      onChange={(e) => updateWorkspace(cfg.id, { namespace: e.target.value })}
                      className={cn(inputClass, 'font-mono text-[12px]')}
                    />
                  </Field>
                  <Field label="成员数（展示）">
                    <input
                      type="number"
                      min={0}
                      value={cfg.memberCount}
                      onChange={(e) =>
                        updateWorkspace(cfg.id, { memberCount: Number(e.target.value) || 0 })
                      }
                      className={inputClass}
                    />
                  </Field>
                  <Field label="描述" className="sm:col-span-2">
                    <textarea
                      value={cfg.description}
                      rows={2}
                      onChange={(e) => updateWorkspace(cfg.id, { description: e.target.value })}
                      className={cn(inputClass, 'resize-none')}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-wrap gap-2 border-t border-zinc-200/80 pt-5">
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([exportConfig()], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'mssclaw-tenant-config.json';
              a.click();
              URL.revokeObjectURL(url);
              notify('配置已导出');
            }}
            className="apple-btn-secondary rounded-lg px-3 py-2 text-[12px] font-semibold"
          >
            导出 JSON
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="apple-btn-secondary rounded-lg px-3 py-2 text-[12px] font-semibold"
          >
            导入 JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.target.value = '';
            }}
          />
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-[11px] font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
