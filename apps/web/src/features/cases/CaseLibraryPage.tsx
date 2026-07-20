import { useEffect } from 'react';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';

/**
 * 旧「案例库」入口已并入侧栏「案例 · 样板间」（ai-map）。
 * 保留本页仅作深链兼容：若有 pendingCaseId 则原样交给 AiMapPage。
 */
export function CaseLibraryPage() {
  const setAppView = useAppViewStore((s) => s.setAppView);
  const pendingCaseId = useNavigationIntentStore((s) => s.pendingCaseId);

  useEffect(() => {
    // pendingCaseId 由 AiMapPage 消费，此处不要 consume
    void pendingCaseId;
    setAppView('ai-map');
  }, [setAppView, pendingCaseId]);

  return (
    <div className="center-surface center-page flex flex-1 items-center justify-center">
      <p className="text-[12px] text-zinc-500">正在进入案例 · 样板间…</p>
    </div>
  );
}
