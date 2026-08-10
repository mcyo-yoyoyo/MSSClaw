import { useEffect } from 'react';
import type { AppView } from '@/domain/appView';
import { isPlatformView } from '@/domain/appView';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useMemoryStore } from '@/stores/memoryStore';
import { usePromptStore } from '@/stores/promptStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

/**
 * Lazy-load expert platform stores when entering iteration-9 views.
 * agents / skills / tools 已走 marketplaceStore，不再双载 legacy center stores。
 */
export function usePlatformStoreLoader(appView: AppView) {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);

  useEffect(() => {
    if (!isPlatformView(appView)) return;

    switch (appView) {
      case 'workflow':
        useWorkflowStore.getState().loadWorkspace(workspaceId);
        break;
      case 'memory':
        useMemoryStore.getState().loadWorkspace(workspaceId);
        break;
      case 'prompts':
        usePromptStore.getState().loadWorkspace(workspaceId);
        break;
      case 'admin':
        useSettingsStore.getState().loadWorkspace(workspaceId);
        break;
      default:
        break;
    }
  }, [appView, workspaceId]);
}
