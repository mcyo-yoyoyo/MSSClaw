import { useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  CONFIGURABLE_ROLES,
  NAV_PRESENTATION_META,
  NAV_PRESET_LABELS,
  type NavPresetId,
} from '@/domain/navPresentation';
import { isSystemAdmin } from '@/domain/currentUser';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/domain/rbac';
import { NAV_SECTION_LABELS, type NavSection } from '@/domain/appView';
import { CenterPageHeader } from '@/components/center/CenterShell';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useAppViewStore } from '@/stores/appViewStore';

const PRESET_ORDER: Exclude<NavPresetId, 'custom'>[] = ['customer', 'standard', 'full'];

export function PresentationConfigPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    preset,
    applyPreset,
    setSlotEnabled,
    resetToFull,
    exportConfig,
    importConfig,
    enabledCount,
    isSlotEnabled,
    editingRole,
    setEditingRole,
  } = useNavPresentationStore();
  const setAppView = useAppViewStore((s) => s.setAppView);

  const notify = (msg: string) => useConversationStore.setState({ pushToast: msg });

  if (!isSystemAdmin()) {
    return (
      <div className="center-surface center-page flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-medium text-zinc-800">展示配置仅超级管理员可访问</p>
        <p className="max-w-sm text-[12px] leading-relaxed text-zinc-500">
          侧栏菜单由超级管理员按角色统一配置，其他角色按配置使用。
        </p>
        <button
          type="button"
          onClick={() => setAppView('home')}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-zinc-800"
        >
          返回广场
        </button>
      </div>
    );
  }

  const grouped = (['workspace', 'platform', 'ops', 'system'] as NavSection[]).map((section) => ({
    section,
    label: NAV_SECTION_LABELS[section],
    items: NAV_PRESENTATION_META.filter((m) => {
      if (m.section !== section) return false;
      if (m.hiddenFromSidebar) return false;
      // 非超管角色不展示治理项开关（始终关闭）
      if (m.adminOnly && editingRole !== 'super_admin') return false;
      return true;
    }),
  }));

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importConfig(String(reader.result ?? ''));
      notify(ok ? '展示配置已导入' : '导入失败，请检查 JSON 格式');
    };
    reader.readAsText(file);
  };

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl">
        <CenterPageHeader
          title="展示配置"
          subtitle="按角色控制侧栏菜单与界面入口；其他人只消费你配置的结果"
          actions={
            <button
              type="button"
              onClick={() => {
                resetToFull();
                useAppViewStore.getState().setNavSectionCollapsed('system', false);
                notify('已恢复完整版（各角色）');
              }}
              className="apple-btn-secondary rounded-lg px-3 py-2 text-[12px] font-semibold"
            >
              恢复完整版
            </button>
          }
        />

        <div className="mb-5 rounded-xl border border-zinc-200/80 bg-white p-4">
          <p className="text-[12px] text-zinc-600">
            当前方案：
            <span className="font-semibold text-zinc-900">{NAV_PRESET_LABELS[preset].title}</span>
            <span className="mx-2 text-zinc-300">·</span>
            正在编辑「{ROLE_LABELS[editingRole]}」· 侧栏可见{' '}
            <span className="font-semibold text-zinc-900">{enabledCount(editingRole)}</span> 项
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">{NAV_PRESET_LABELS[preset].description}</p>
        </div>

        <section className="mb-6">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            快速方案
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PRESET_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  applyPreset(id);
                  useAppViewStore.getState().setNavSectionCollapsed('system', id === 'customer');
                  notify(`已切换为「${NAV_PRESET_LABELS[id].title}」`);
                }}
                className={cn(
                  'rounded-xl border p-3 text-left transition',
                  preset === id
                    ? 'border-zinc-900 bg-zinc-50 shadow-sm'
                    : 'border-zinc-200 bg-white hover:border-zinc-300',
                )}
              >
                <p className="text-[13px] font-semibold text-zinc-900">
                  {NAV_PRESET_LABELS[id].title}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  {NAV_PRESET_LABELS[id].description}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-4">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            配置角色
          </h3>
          <div className="flex flex-wrap gap-1.5 rounded-xl bg-zinc-100/90 p-1">
            {CONFIGURABLE_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setEditingRole(role)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[12px] font-semibold transition',
                  editingRole === role
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800',
                )}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            {ROLE_DESCRIPTIONS[editingRole]}
          </p>
        </section>

        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              「{ROLE_LABELS[editingRole]}」菜单项
            </h3>
            {preset !== 'custom' && (
              <span className="text-[10px] text-zinc-400">修改任意开关将切换为「自定义」</span>
            )}
          </div>
          <div className="space-y-4">
            {grouped.map(({ section, label, items }) =>
              items.length === 0 ? null : (
                <div key={section} className="apple-card overflow-hidden">
                  <div className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-2">
                    <span className="text-[11px] font-semibold text-zinc-600">{label}</span>
                  </div>
                  <ul className="divide-y divide-zinc-100">
                    {items.map((item) => {
                      const on = isSlotEnabled(item.id, editingRole);
                      const locked = Boolean(item.locked && item.id === 'presentation');
                      return (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                              <i className={cn('fa-solid text-sm', item.icon)} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-zinc-900">{item.label}</p>
                              <p className="truncate text-[11px] text-zinc-500">{item.subtitle}</p>
                            </div>
                          </div>
                          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={on}
                              disabled={locked}
                              onChange={(e) =>
                                setSlotEnabled(editingRole, item.id, e.target.checked)
                              }
                            />
                            <span
                              className={cn(
                                'h-6 w-10 rounded-full transition',
                                locked
                                  ? 'bg-zinc-300 opacity-60'
                                  : on
                                    ? 'bg-zinc-900'
                                    : 'bg-zinc-200',
                                'after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4',
                                locked && 'cursor-not-allowed',
                              )}
                            />
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ),
            )}
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
              a.download = 'mssclaw-nav-by-role.json';
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
