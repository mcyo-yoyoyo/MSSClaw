import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

import { SettingsDrawerBody } from '@/components/settings/SettingsDrawerBody';

import { useAppViewStore } from '@/stores/appViewStore';

import { useSettingsStore } from '@/stores/settingsStore';

import { useWorkspaceStore } from '@/stores/workspaceStore';

import { useFocusTrap } from '@/hooks/useFocusTrap';



/**
 * Quick settings drawer: members, KB sync, Skill export, security toggles, Runtime API.
 * For full-screen RBAC matrix and platform admin tabs, see features/_legacy/settings/SettingsPage (iteration 9.5).
 */
export function SettingsDrawer() {

  const { settingsOpen, closeSettings } = useAppViewStore();

  const loadSettingsWorkspace = useSettingsStore((s) => s.loadWorkspace);

  const workspaceId = useWorkspaceStore((s) => s.workspaceId);

  const drawerRef = useRef<HTMLElement>(null);

  useFocusTrap(settingsOpen, drawerRef);



  useEffect(() => {

    if (settingsOpen) loadSettingsWorkspace(workspaceId);

  }, [settingsOpen, workspaceId, loadSettingsWorkspace]);



  if (!settingsOpen) return null;



  return (

    <>

      <button

        type="button"

        aria-label="关闭设置"

        className="fixed inset-0 top-12 z-[80] bg-black/20 backdrop-blur-[1px]"

        onClick={closeSettings}

      />

      <aside

        ref={drawerRef}

        className={cn(

          'settings-drawer open fixed bottom-0 right-0 top-12 z-[85] flex w-[min(400px,100vw)] flex-col border-l border-black/[0.06] bg-white/98 shadow-2xl backdrop-blur-xl',

        )}

      >

        <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-5 py-3.5">

          <div>

            <h2 className="text-[15px] font-semibold text-[#1d1d1f]">偏好设置</h2>

            <p className="text-[11px] text-[#86868b]">成员 · 安全 · Runtime</p>

          </div>

          <button

            type="button"

            onClick={closeSettings}

            className="flex h-8 w-8 items-center justify-center rounded-full text-[#86868b] transition hover:bg-black/[0.05] hover:text-[#1d1d1f]"

          >

            <i className="fa-solid fa-xmark" />

          </button>

        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-hidden p-5">

          <SettingsDrawerBody onClose={closeSettings} />

        </div>

      </aside>

    </>

  );

}


