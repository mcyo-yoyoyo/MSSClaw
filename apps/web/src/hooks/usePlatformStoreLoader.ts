import { useEffect } from 'react';
import type { AppView } from '@/domain/appView';
import { isPlatformView } from '@/domain/appView';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useToolStore } from '@/stores/toolStore';
import { useMemoryStore } from '@/stores/memoryStore';
import { usePromptStore } from '@/stores/promptStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAgentStore } from '@/stores/agentStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

/** Lazy-load expert platform stores when entering iteration-9 views */
export function usePlatformStoreLoader(appView: AppView) {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);

  useEffect(() => {
    if (!isPlatformView(appView)) return;

    switch (appView) {
      case 'agent-studio':
        useAgentStore.getState().loadWorkspace(workspaceId);
        break;
      case 'workflow':
        useWorkflowStore.getState().loadWorkspace(workspaceId);
        break;
      case 'tools':
        useToolStore.getState().loadWorkspace(workspaceId);
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
    }
  }, [appView, workspaceId]);
}
