import { normalizeSettingsTab, SETTINGS_TABS, type SettingsTab } from '@/domain/rbac';
import { cn } from '@/lib/utils';
import { StudioListPanelHeader } from '@/components/studio/StudioShell';

interface SettingsNavProps {
  activeTab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

export function SettingsNav({ activeTab, onChange }: SettingsNavProps) {
  const current = normalizeSettingsTab(activeTab);
  return (
    <aside className="studio-list-panel w-[220px]">
      <StudioListPanelHeader title="组织权限" subtitle="四步管好人与权" />
      <nav className="flex-grow p-2">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'mb-0.5 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition',
              current === tab.id
                ? 'bg-claw-50 font-semibold text-zinc-700'
                : 'text-[#6e6e73] hover:bg-black/[0.03]',
            )}
          >
            <i className={cn('fa-solid w-4 shrink-0 text-xs', tab.icon)} />
            <span className="min-w-0">
              <span className="block text-[13px]">{tab.label}</span>
              <span className="mt-0.5 block text-[10px] font-normal text-zinc-400">{tab.hint}</span>
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
