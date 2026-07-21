import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { SettingsDrawerBody } from '@/components/settings/SettingsDrawerBody';
import { useAppViewStore } from '@/stores/appViewStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';

/**
 * 偏好设置抽屉：个人模型配置；超级管理员额外可见平台治理快捷入口。
 * 成员 / RBAC 全屏页见组织权限；侧栏菜单见展示配置。
 */
export function SettingsDrawer() {
  const { settingsOpen, closeSettings } = useAppViewStore();
  const drawerRef = useRef<HTMLElement>(null);
  useFocusTrap(settingsOpen, drawerRef);

  if (!settingsOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="关闭偏好设置"
        className="fixed inset-0 z-[80] bg-black/25 backdrop-blur-[2px]"
        onClick={closeSettings}
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prefs-drawer-title"
        className={cn(
          'fixed inset-y-0 right-0 z-[90] flex w-full max-w-md flex-col border-l border-black/5 bg-[#fbfbfd] shadow-apple-lg',
        )}
      >
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
          <h2 id="prefs-drawer-title" className="text-[15px] font-semibold text-[#1d1d1f]">
            偏好设置
          </h2>
          <button
            type="button"
            onClick={closeSettings}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="关闭"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 scroll-hidden">
          <SettingsDrawerBody onClose={closeSettings} />
        </div>
      </aside>
    </>
  );
}
