import { useEffect } from 'react';
import type { AppView } from '@/domain/appView';
import { isPlatformView } from '@/domain/appView';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useMemoryStore } from '@/stores/memoryStore';
import { usePromptStore } from '@/stores/promptStore';
import { useSettingsStore } from '@/stores/settingsStore';

/**
 * Lazy-load expert platform stores when entering iteration-9 views.
 * agents / skills / tools 已走 marketplaceStore，不再双载 legacy center stores。
 */
export function usePlatformStoreLoader(appView: AppView) {

  useEffect(() => {
    if (!isPlatformView(appView)) return;

    switch (appView) {
      case 'workflow':
        useWorkflowStore.getState().load();
        break;
      case 'memory':
        useMemoryStore.getState().load();
        break;
      case 'prompts':
        usePromptStore.getState().load();
        break;
      case 'admin':
        useSettingsStore.getState().load();
        break;
      default:
        break;
    }
  }, [appView]);
}
